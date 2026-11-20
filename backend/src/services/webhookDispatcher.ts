import { db } from '../db/client';
import { env } from '../config/env';

export interface EnqueueWebhookParams {
    eventType: string;
    idempotencyKey?: string;
    turmaId?: string;
    turmaName?: string;
    notionPageId?: string | null;
    grossAmount?: number;
    netAmount?: number;
    feeAmount?: number;
    currency?: string;
    payload: Record<string, any>;
    skipWebhook?: boolean;
    destinationUrl?: string;
}

export class WebhookDispatcher {
    /**
     * Enfileira um novo evento de webhook e tenta o envio imediato
     */
    async enqueue(params: EnqueueWebhookParams): Promise<void> {
        const {
            eventType,
            idempotencyKey = `${eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            turmaId,
            turmaName,
            notionPageId,
            grossAmount = 0,
            netAmount = 0,
            feeAmount = 0,
            currency = 'BRL',
            payload,
            skipWebhook = false,
            destinationUrl = env.N8N_WEBHOOK_URL
        } = params;

        // Se skipWebhook estiver ativo (ex: chamada originada pelo n8n/Notion), grava como 'skipped' para evitar loop
        const initialStatus = skipWebhook ? 'skipped' : 'pending';

        try {
            const insertResult = await db.query(
                `INSERT INTO webhook_events (
                    event_type, idempotency_key, turma_id, turma_name, notion_page_id,
                    gross_amount, net_amount, fee_amount, currency, payload, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
                RETURNING id`,
                [
                    eventType, idempotencyKey, turmaId, turmaName, notionPageId,
                    grossAmount, netAmount, feeAmount, currency, JSON.stringify(payload), initialStatus
                ]
            );

            const eventId = insertResult.rows[0]?.id;

            if (skipWebhook) {
                console.log(`[WebhookDispatcher] Evento ${eventType} (${idempotencyKey}) ignorado devido a skip_webhook: true.`);
                return;
            }

            if (eventId && destinationUrl) {
                // Tenta envio imediato sem bloquear a resposta da requisição principal
                void this.deliver(eventId, destinationUrl, {
                    event: eventType,
                    idempotency_key: idempotencyKey,
                    turma_id: turmaId,
                    turma_name: turmaName,
                    notion_page_id: notionPageId,
                    gross_amount: grossAmount,
                    net_amount: netAmount,
                    fee_amount: feeAmount,
                    currency,
                    ...payload,
                });
            }
        } catch (err) {
            console.error('[WebhookDispatcher] Erro ao enfileirar evento de webhook:', err);
        }
    }

    /**
     * Tenta entregar o webhook no destino (n8n / agentes) e registra logs
     */
    async deliver(eventId: string, destinationUrl: string, payload: any): Promise<boolean> {
        const startTime = Date.now();
        let statusCode: number | null = null;
        let responseBody: string | null = null;
        let errorMessage: string | null = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const res = await fetch(destinationUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-vox-event': payload.event || 'unknown',
                    'x-vox-idempotency': payload.idempotency_key || '',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            statusCode = res.status;
            responseBody = await res.text().catch(() => '');

            if (res.ok) {
                await db.query(
                    `UPDATE webhook_events SET status = 'sent', updated_at = NOW() WHERE id = $1`,
                    [eventId]
                );
            } else {
                errorMessage = `HTTP ${statusCode}: ${responseBody?.slice(0, 500)}`;
                await this.handleFailure(eventId, errorMessage);
            }
        } catch (err: any) {
            errorMessage = err?.message || 'Falha de conexão / timeout';
            await this.handleFailure(eventId, errorMessage);
        } finally {
            const durationMs = Date.now() - startTime;
            await db.query(
                `INSERT INTO webhook_logs (
                    webhook_event_id, destination_url, status_code, response_body, execution_time_ms, error_message
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [eventId, destinationUrl, statusCode, responseBody?.slice(0, 1000), durationMs, errorMessage]
            ).catch((logErr) => console.error('[WebhookDispatcher] Erro ao gravar webhook_log:', logErr));
        }

        return statusCode !== null && statusCode >= 200 && statusCode < 300;
    }

    private async handleFailure(eventId: string, errorMessage: string | null): Promise<void> {
        await db.query(
            `UPDATE webhook_events
             SET retry_count = retry_count + 1,
                 last_error = $2,
                 status = CASE WHEN retry_count + 1 >= max_retries THEN 'dead_letter' ELSE 'failed' END,
                 updated_at = NOW()
             WHERE id = $1`,
            [eventId, errorMessage || 'Erro desconhecido']
        );
    }

    /**
     * Inicia o worker em background para reprocessar falhas
     */
    startRetryWorker(): void {
        setInterval(async () => {
            if (!env.N8N_WEBHOOK_URL) return;
            try {
                const pending = await db.query(
                    `SELECT id, event_type, idempotency_key, turma_id, turma_name, notion_page_id,
                            gross_amount, net_amount, fee_amount, currency, payload
                     FROM webhook_events
                     WHERE status IN ('pending', 'failed')
                       AND retry_count < max_retries
                       AND updated_at < NOW() - INTERVAL '30 seconds'
                     LIMIT 10`
                );

                for (const row of pending.rows) {
                    const parsedPayload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
                    await this.deliver(row.id, env.N8N_WEBHOOK_URL, {
                        event: row.event_type,
                        idempotency_key: row.idempotency_key,
                        turma_id: row.turma_id,
                        turma_name: row.turma_name,
                        notion_page_id: row.notion_page_id,
                        gross_amount: row.gross_amount,
                        net_amount: row.net_amount,
                        fee_amount: row.fee_amount,
                        currency: row.currency,
                        ...parsedPayload,
                    });
                }
            } catch (err) {
                // Silently handle retry worker error to keep server alive
            }
        }, 30000); // Cada 30s
    }
}

export const webhookDispatcher = new WebhookDispatcher();
