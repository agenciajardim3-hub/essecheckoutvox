import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client';
import { env } from '../config/env';
import { webhookDispatcher } from '../services/webhookDispatcher';
import { sendMetaCapiServerEvent } from './tracking';

export async function paymentsRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/v1/payments/preference
     * Cria preferência de pagamento no Mercado Pago
     */
    fastify.post('/preference', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const { title, unit_price, quantity = 1, payer, external_reference, metadata = {} } = body;

        if (!title || !unit_price) {
            return reply.status(400).send({ success: false, error: 'title e unit_price são obrigatórios' });
        }

        try {
            // Chamada direta para a API oficial do Mercado Pago
            const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: [
                        {
                            title,
                            unit_price: Number(unit_price),
                            quantity: Number(quantity),
                            currency_id: 'BRL',
                        },
                    ],
                    payer: {
                        name: payer?.name || '',
                        email: payer?.email || '',
                    },
                    external_reference,
                    metadata,
                    back_urls: {
                        success: body.success_url || '',
                        failure: body.failure_url || '',
                        pending: body.pending_url || '',
                    },
                    auto_return: 'approved',
                }),
            });

            const data: any = await mpRes.json();
            if (!mpRes.ok) {
                return reply.status(mpRes.status).send({ success: false, error: data });
            }

            return reply.send({
                success: true,
                id: data.id,
                init_point: data.init_point,
                sandbox_init_point: data.sandbox_init_point,
            });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message || 'Erro ao criar preferência MP' });
        }
    });

    /**
     * POST /api/v1/payments/webhook
     * Recebe notificações IPN / Webhooks do Mercado Pago
     */
    fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const query: any = request.query || {};

        const paymentId = body?.data?.id || body?.id || query['data.id'] || query?.id;
        const topic = body?.type || body?.topic || query?.topic;

        // Responde de imediato ao Mercado Pago para evitar timeouts
        reply.status(200).send({ received: true });

        if (paymentId && (topic === 'payment' || !topic)) {
            try {
                // Consulta o pagamento na API do MP
                const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` },
                });

                if (!mpRes.ok) return;
                const payment: any = await mpRes.json();

                const status = payment.status; // approved, pending, rejected, refunded
                const externalReference = payment.external_reference; // ID do lead
                const transactionAmount = payment.transaction_amount || 0;
                const feeDetails = payment.fee_details || [];
                const totalFee = feeDetails.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0);
                const netAmount = payment.net_received_amount || (transactionAmount - totalFee);
                const paymentMethod = payment.payment_method_id === 'pix' ? 'Pix' : 'Cartão';

                if (externalReference && (status === 'approved' || status === 'refunded')) {
                    const newStatus = status === 'approved' ? 'Pago' : 'Devolvido';

                    // Atualiza o lead no banco de dados
                    const updateRes = await db.query(
                        `UPDATE leads
                         SET status = $1,
                             paid_amount = $2,
                             mp_payment_id = $3,
                             mp_fee_amount = $4,
                             mp_net_amount = $5,
                             payment_method = $6,
                             submitted_at = NOW()
                         WHERE id = $7
                         RETURNING *`,
                        [newStatus, transactionAmount, paymentId, totalFee, netAmount, paymentMethod, externalReference]
                    );

                    const updatedLead = updateRes.rows[0];

                    if (updatedLead) {
                        // Se houve cupom aplicado e pagamento foi aprovado, incrementa o uso na tabela coupons
                        if (status === 'approved' && updatedLead.coupon_code) {
                            try {
                                await db.query(
                                    `UPDATE coupons 
                                     SET current_uses = COALESCE(current_uses, 0) + 1 
                                     WHERE UPPER(TRIM(code)) = UPPER(TRIM($1))`,
                                    [updatedLead.coupon_code]
                                );
                            } catch (couponErr) {
                                console.warn('[PaymentsWebhook] Erro ao incrementar uso do cupom:', couponErr);
                            }
                        }

                        // Busca dados do checkout / turma para enriquecer o evento
                        const checkoutRes = await db.query(
                            `SELECT * FROM checkouts WHERE id = $1 LIMIT 1`,
                            [updatedLead.product_id]
                        );
                        const checkout = checkoutRes.rows[0];

                        const cleanPhone = (updatedLead.phone || '').replace(/\D/g, '');
                        const fullPhone = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
                        const baseUrl = env.FRONTEND_URL || 'https://checkout.voxcontrol.com';
                        const ticketUrl = `${baseUrl}/?mode=ticket&checkout=${encodeURIComponent(checkout?.id || updatedLead.product_id || '')}&cpf=${encodeURIComponent(updatedLead.cpf || '')}`;
                        const qrCodeData = updatedLead.id;

                        // 1. Envio Server-Side para Meta Conversions API (CAPI) com deduplicação via fb_event_id
                        if (status === 'approved') {
                            const [firstName, ...lastNameParts] = String(updatedLead.name || '').trim().split(/\s+/);
                            sendMetaCapiServerEvent({
                                pixelId: checkout?.meta_pixel_id || env.META_PIXEL_ID,
                                eventName: 'Purchase',
                                eventId: updatedLead.fb_event_id || `lead_${updatedLead.id}`,
                                eventTime: Math.floor(Date.now() / 1000),
                                eventSourceUrl: `${baseUrl}/?checkout=${encodeURIComponent(checkout?.id || updatedLead.product_id || '')}`,
                                actionSource: 'website',
                                useRequestClient: false,
                                userData: {
                                    email: updatedLead.email,
                                    phone: updatedLead.phone,
                                    firstName,
                                    lastName: lastNameParts.join(' '),
                                    city: updatedLead.city,
                                    cpf: updatedLead.cpf,
                                    fbp: updatedLead.fbp,
                                    fbc: updatedLead.fbc,
                                },
                                customData: {
                                    value: transactionAmount,
                                    currency: payment.currency_id || 'BRL',
                                    content_type: 'product',
                                    content_ids: [checkout?.id || updatedLead.product_id].filter(Boolean),
                                    content_name: checkout?.productName || updatedLead.product_name || '',
                                    order_id: String(paymentId),
                                }
                            }).catch(err => console.warn('[PaymentsWebhook] Meta CAPI falhou ao enviar Purchase:', err));
                        }

                        // 2. Enfileira evento de webhook outbound padronizado para o n8n (com dados para UAZAPI/WhatsApp)
                        const eventType = status === 'approved' ? 'payment.approved' : 'payment.refunded';
                        await webhookDispatcher.enqueue({
                            eventType,
                            idempotencyKey: `mp_${paymentId}_${status}`,
                            turmaId: checkout?.id || updatedLead.product_id,
                            turmaName: checkout?.productName || updatedLead.product_name,
                            notionPageId: checkout?.notion_page_id,
                            grossAmount: transactionAmount,
                            netAmount,
                            feeAmount: totalFee,
                            payload: {
                                ticket_url: ticketUrl,
                                qr_code_data: qrCodeData,
                                lead: {
                                    id: updatedLead.id,
                                    name: updatedLead.name,
                                    email: updatedLead.email,
                                    phone: updatedLead.phone,
                                    whatsapp: fullPhone,
                                    cpf: updatedLead.cpf,
                                    city: updatedLead.city,
                                    status: newStatus,
                                    paid_amount: transactionAmount,
                                    coupon_code: updatedLead.coupon_code || null,
                                },
                                turma: {
                                    id: checkout?.id || updatedLead.product_id,
                                    name: checkout?.productName || updatedLead.product_name,
                                    turma: checkout?.turma,
                                    event_date: checkout?.event_date,
                                    event_location: checkout?.event_location,
                                    city: checkout?.city,
                                },
                                tracking: {
                                    utm_source: updatedLead.utm_source,
                                    utm_medium: updatedLead.utm_medium,
                                    utm_campaign: updatedLead.utm_campaign,
                                    fbp: updatedLead.fbp,
                                    fbc: updatedLead.fbc,
                                    gclid: updatedLead.gclid,
                                    ttclid: updatedLead.ttclid,
                                    event_id: updatedLead.fb_event_id,
                                },
                                external_ids: {
                                    ...(checkout?.external_ids || {}),
                                    ...(updatedLead?.external_ids || {}),
                                    mp_payment_id: paymentId,
                                }
                            }
                        });
                    }
                }
            } catch (err) {
                console.error('[PaymentsWebhook] Erro no processamento do webhook MP:', err);
            }
        }
    });
}
