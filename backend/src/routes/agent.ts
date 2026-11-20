import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client';
import { verifyAgentKey } from '../middleware/authAgent';
import { webhookDispatcher } from '../services/webhookDispatcher';
import { emailService } from '../services/emailService';
import { env } from '../config/env';
import { sendMetaCapiServerEvent } from './tracking';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export async function agentRoutes(fastify: FastifyInstance) {
    // Aplica o middleware de autenticação da chave x-vox-agent-key em todas as rotas deste plugin
    fastify.addHook('preHandler', verifyAgentKey);

    /**
     * GET /api/v1/agent/cohorts
     * Lista turmas/checkouts com status de sincronização do Notion
     */
    fastify.get('/cohorts', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await db.query(
                `SELECT c.*,
                        COUNT(l.id) FILTER (WHERE l.status IN ('Pago', 'Aprovado')) as paid_count,
                        COUNT(l.id) as total_leads,
                        COALESCE(SUM(l.paid_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as total_revenue
                 FROM checkouts c
                 LEFT JOIN leads l ON (l.product_id = c.id OR l.turma = c.turma)
                 GROUP BY c.id
                 ORDER BY c.created_at DESC`
            );
            return reply.send({ success: true, count: result.rows.length, cohorts: result.rows });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * POST /api/v1/agent/cohorts
     * Cria uma nova turma / checkout
     */
    fastify.post('/cohorts', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const {
            productName,
            productPrice = '0',
            turma,
            eventDate,
            eventLocation,
            city,
            maxVagas,
            notion_page_id,
            external_ids = {},
            skip_webhook = false
        } = body;

        const id = body.id || crypto.randomUUID();

        try {
            const insertResult = await db.query(
                `INSERT INTO checkouts (
                    id, "productName", "productPrice", turma, event_date, event_location,
                    city, "maxVagas", notion_page_id, external_ids, "isActive"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
                RETURNING *`,
                [id, productName, productPrice, turma, eventDate, eventLocation, city, maxVagas, notion_page_id, JSON.stringify(external_ids)]
            );

            const createdCohort = insertResult.rows[0];

            await webhookDispatcher.enqueue({
                eventType: 'cohort.created',
                turmaId: createdCohort.id,
                turmaName: createdCohort.turma || createdCohort.productName,
                notionPageId: createdCohort.notion_page_id,
                payload: createdCohort,
                skipWebhook: Boolean(skip_webhook || request.headers['x-skip-webhook'] === 'true')
            });

            return reply.status(201).send({ success: true, cohort: createdCohort });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * PATCH /api/v1/agent/cohorts/:id
     * Atualiza dados de uma turma (incluindo notion_page_id e external_ids com flag anti-loop)
     */
    fastify.patch('/cohorts/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        const body: any = request.body || {};
        const skipWebhook = Boolean(body.skip_webhook || request.headers['x-skip-webhook'] === 'true');

        try {
            // Atualiza campos dinâmicos fornecidos
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (body.notion_page_id !== undefined) {
                fields.push(`notion_page_id = $${idx++}`);
                values.push(body.notion_page_id);
            }
            if (body.external_ids !== undefined) {
                fields.push(`external_ids = COALESCE(external_ids, '{}'::jsonb) || $${idx++}::jsonb`);
                values.push(JSON.stringify(body.external_ids));
            }
            if (body.eventDate !== undefined) {
                fields.push(`event_date = $${idx++}`);
                values.push(body.eventDate);
            }
            if (body.eventLocation !== undefined) {
                fields.push(`event_location = $${idx++}`);
                values.push(body.eventLocation);
            }
            if (body.isActive !== undefined) {
                fields.push(`"isActive" = $${idx++}`);
                values.push(body.isActive);
            }

            if (fields.length === 0) {
                return reply.status(400).send({ success: false, error: 'Nenhum campo fornecido para atualização.' });
            }

            values.push(id);
            const updateResult = await db.query(
                `UPDATE checkouts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
                values
            );

            if (updateResult.rows.length === 0) {
                return reply.status(404).send({ success: false, error: 'Turma não encontrada.' });
            }

            const updatedCohort = updateResult.rows[0];

            await webhookDispatcher.enqueue({
                eventType: 'cohort.updated',
                turmaId: updatedCohort.id,
                turmaName: updatedCohort.turma || updatedCohort.productName,
                notionPageId: updatedCohort.notion_page_id,
                payload: updatedCohort,
                skipWebhook
            });

            return reply.send({ success: true, cohort: updatedCohort });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * GET /api/v1/agent/leads
     * Consulta alunos por filtros (turma, status, busca textual por cpf/email/nome)
     */
    fastify.get('/leads', async (request: FastifyRequest, reply: FastifyReply) => {
        const query: any = request.query || {};
        const { turma_id, status, search, limit = 50 } = query;

        try {
            let sql = `SELECT * FROM leads WHERE 1=1`;
            const params: any[] = [];
            let idx = 1;

            if (turma_id) {
                sql += ` AND product_id = $${idx++}`;
                params.push(turma_id);
            }
            if (status) {
                sql += ` AND status = $${idx++}`;
                params.push(status);
            }
            if (search) {
                sql += ` AND (name ILIKE $${idx} OR email ILIKE $${idx} OR cpf ILIKE $${idx} OR phone ILIKE $${idx})`;
                params.push(`%${search}%`);
                idx++;
            }

            sql += ` ORDER BY created_at DESC LIMIT $${idx}`;
            params.push(Number(limit));

            const result = await db.query(sql, params);
            return reply.send({ success: true, count: result.rows.length, leads: result.rows });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * GET /api/v1/agent/financial/break-even
     * Retorna o ponto de equilíbrio consolidado de todas as turmas para os agentes de IA
     */
    fastify.get('/financial/break-even', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const query = `
                SELECT
                    c.id, c."productName", c.turma, c.city, c."productPrice",
                    COUNT(l.id) FILTER (WHERE l.status IN ('Pago', 'Aprovado')) as confirmed_students,
                    COALESCE(SUM(l.paid_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as gross_revenue,
                    COALESCE(SUM(l.mp_fee_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as fee_amount,
                    COALESCE(SUM(l.mp_net_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as net_revenue,
                    COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.checkout_id = c.id), 0) as total_expenses
                FROM checkouts c
                LEFT JOIN leads l ON (l.product_id = c.id OR l.turma = c.turma)
                WHERE c."isActive" IS NOT FALSE
                GROUP BY c.id
            `;
            const result = await db.query(query);

            const report = result.rows.map((row) => {
                const totalExpenses = Number(row.total_expenses);
                const netRevenue = Number(row.net_revenue) || (Number(row.gross_revenue) - Number(row.fee_amount));
                const confirmed = Number(row.confirmed_students);
                const catalogPrice = parseFloat(String(row.productPrice || '0').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
                const estimatedTicket = catalogPrice * 0.95;
                const averageNetTicket = confirmed > 0 ? netRevenue / confirmed : estimatedTicket;

                const studentsNeeded = averageNetTicket > 0 && totalExpenses > 0
                    ? Math.ceil(totalExpenses / averageNetTicket)
                    : 0;

                const remainingToBreakEven = Math.max(0, studentsNeeded - confirmed);
                const netProfit = netRevenue - totalExpenses;
                const progressPercent = studentsNeeded > 0
                    ? Math.min(100, Math.round((confirmed / studentsNeeded) * 100))
                    : 100;

                return {
                    cohort_id: row.id,
                    cohort_name: row.productName,
                    turma: row.turma,
                    city: row.city,
                    total_expenses: totalExpenses,
                    net_revenue: netRevenue,
                    confirmed_students: confirmed,
                    average_net_ticket: averageNetTicket,
                    students_needed_to_break_even: studentsNeeded,
                    remaining_students_to_break_even: remainingToBreakEven,
                    net_profit: netProfit,
                    break_even_progress_percent: progressPercent,
                    status: netProfit > 0 ? 'lucro' : remainingToBreakEven === 0 ? 'equilibrio' : 'prejuizo'
                };
            });

            return reply.send({ success: true, count: report.length, report });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * POST /api/v1/agent/coupons/personal-link
     * Gera um link exclusivo com desconto individual (cupom de uso único max_uses = 1)
     */
    fastify.post('/coupons/personal-link', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const {
            turma_id,
            discount_value,
            discount_type = 'fixed', // 'fixed' | 'percentage'
            code_prefix = 'VIP',
            base_url = env.FRONTEND_URL || 'https://checkout.voxcontrol.com'
        } = body;

        if (!turma_id || discount_value === undefined) {
            return reply.status(400).send({
                success: false,
                error: 'turma_id e discount_value são obrigatórios.'
            });
        }

        try {
            // Busca dados da turma
            const checkoutRes = await db.query(`SELECT * FROM checkouts WHERE id = $1 LIMIT 1`, [turma_id]);
            if (checkoutRes.rows.length === 0) {
                return reply.status(404).send({ success: false, error: 'Turma não encontrada.' });
            }
            const checkout = checkoutRes.rows[0];

            const prefix = String(code_prefix || 'VIP').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
            const code = `${prefix}_${randomCode}`;

            const couponId = crypto.randomUUID();
            const insertResult = await db.query(
                `INSERT INTO coupons (
                    id, code, discount_type, discount_value, max_uses, current_uses, product_id, is_active, created_at
                ) VALUES ($1, $2, $3, $4, 1, 0, $5, true, NOW())
                RETURNING *`,
                [couponId, code, discount_type, Number(discount_value), turma_id]
            );

            const createdCoupon = insertResult.rows[0];
            const paramSlug = checkout.slug || checkout.id;
            const checkoutUrl = `${base_url}/?p=${encodeURIComponent(paramSlug)}&cupom=${encodeURIComponent(code)}`;

            return reply.status(201).send({
                success: true,
                coupon: createdCoupon,
                checkout_url: checkoutUrl,
                turma: {
                    id: checkout.id,
                    name: checkout.productName,
                    price: checkout.productPrice
                }
            });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * GET /api/v1/agent/coupons
     * Lista todos os cupons com filtros
     */
    fastify.get('/coupons', async (request: FastifyRequest, reply: FastifyReply) => {
        const query: any = request.query || {};
        const { turma_id, is_active } = query;

        try {
            let sql = `SELECT * FROM coupons WHERE 1=1`;
            const params: any[] = [];
            let idx = 1;

            if (turma_id) {
                sql += ` AND (product_id = $${idx++} OR product_id IS NULL)`;
                params.push(turma_id);
            }
            if (is_active !== undefined) {
                sql += ` AND is_active = $${idx++}`;
                params.push(is_active === 'true' || is_active === true);
            }

            sql += ` ORDER BY created_at DESC`;
            const result = await db.query(sql, params);
            return reply.send({ success: true, count: result.rows.length, coupons: result.rows });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * POST /api/v1/agent/coupons
     * Criação de cupom manual por agentes de IA
     */
    fastify.post('/coupons', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const { code, discount_type = 'fixed', discount_value, max_uses = null, product_id = null, expires_at = null } = body;

        if (!code || discount_value === undefined) {
            return reply.status(400).send({ success: false, error: 'code e discount_value são obrigatórios.' });
        }

        try {
            const cleanCode = String(code).trim().toUpperCase();
            const id = body.id || crypto.randomUUID();

            const insertResult = await db.query(
                `INSERT INTO coupons (
                    id, code, discount_type, discount_value, max_uses, current_uses, product_id, is_active, expires_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, 0, $6, true, $7, NOW())
                RETURNING *`,
                [id, cleanCode, discount_type, Number(discount_value), max_uses, product_id, expires_at]
            );

            return reply.status(201).send({ success: true, coupon: insertResult.rows[0] });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * DELETE /api/v1/agent/coupons/:id
     * Exclui ou desativa um cupom
     */
    fastify.delete('/coupons/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        try {
            await db.query(`DELETE FROM coupons WHERE id = $1`, [id]);
            return reply.send({ success: true, message: 'Cupom removido com sucesso.' });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * PATCH /api/v1/agent/leads/:id
     * Atualiza dados de um lead (status, check-in presencial, etc.) e dispara webhooks correspondentes
     */
    fastify.patch('/leads/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        const body: any = request.body || {};
        const { status, checked_in, paid_amount, notes } = body;

        try {
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (status !== undefined) {
                fields.push(`status = $${idx++}`);
                values.push(status);
                if (status === 'Pago') {
                    fields.push(`ticket_generated = true`);
                }
            }

            let wasCheckedInNow = false;
            if (checked_in !== undefined) {
                fields.push(`checked_in = $${idx++}`);
                values.push(Boolean(checked_in));
                if (checked_in) {
                    fields.push(`checked_in_at = NOW()`);
                    wasCheckedInNow = true;
                } else {
                    fields.push(`checked_in_at = NULL`);
                }
            }

            if (paid_amount !== undefined) {
                fields.push(`paid_amount = $${idx++}`);
                values.push(Number(paid_amount));
            }

            if (fields.length === 0) {
                return reply.status(400).send({ success: false, error: 'Nenhum campo fornecido para atualização.' });
            }

            values.push(id);
            const updateResult = await db.query(
                `UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
                values
            );

            if (updateResult.rows.length === 0) {
                return reply.status(404).send({ success: false, error: 'Lead não encontrado.' });
            }

            const updatedLead = updateResult.rows[0];

            // Se o lead foi marcado como Pago (ex: venda offline, recuperação Deskcomm/CRM),
            // dispara a Conversions API do Meta server-side com fbp/fbc/event_id originais da captura!
            if (status === 'Pago' && !body.skip_capi) {
                const checkoutRes = await db.query(`SELECT * FROM checkouts WHERE id = $1 LIMIT 1`, [updatedLead.product_id]);
                const checkout = checkoutRes.rows[0];
                const [firstName, ...lastNameParts] = String(updatedLead.name || '').trim().split(/\s+/);
                sendMetaCapiServerEvent({
                    pixelId: checkout?.meta_pixel_id || env.META_PIXEL_ID,
                    eventName: 'Purchase',
                    eventId: updatedLead.fb_event_id || `lead_${updatedLead.id}`,
                    eventTime: Math.floor(Date.now() / 1000),
                    eventSourceUrl: `${env.FRONTEND_URL}/?checkout=${encodeURIComponent(checkout?.id || updatedLead.product_id || '')}`,
                    actionSource: 'system_generated',
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
                        value: Number(updatedLead.paid_amount) || 0,
                        currency: 'BRL',
                        content_type: 'product',
                        content_ids: [checkout?.id || updatedLead.product_id].filter(Boolean),
                        content_name: checkout?.productName || updatedLead.product_name || '',
                    }
                }).catch(err => console.warn('[AgentLeadUpdate] Meta CAPI Purchase falhou:', err));
            }

            // Se foi marcado check-in agora, dispara webhook checkin.completed
            if (wasCheckedInNow) {
                await webhookDispatcher.enqueue({
                    eventType: 'checkin.completed',
                    turmaId: updatedLead.product_id,
                    turmaName: updatedLead.turma || updatedLead.product_name,
                    payload: {
                        lead_id: updatedLead.id,
                        name: updatedLead.name,
                        email: updatedLead.email,
                        phone: updatedLead.phone,
                        cpf: updatedLead.cpf,
                        checked_in_at: updatedLead.checked_in_at || new Date().toISOString()
                    }
                });
            }

            return reply.send({ success: true, lead: updatedLead });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * GET /api/v1/agent/expenses
     * Consulta despesas por turma, categoria ou período, com agrupamento financeiro
     */
    fastify.get('/expenses', async (request: FastifyRequest, reply: FastifyReply) => {
        const query: any = request.query || {};
        const { turma_id, checkout_id, category, start_date, end_date, limit = 100 } = query;
        const targetCohortId = turma_id || checkout_id;

        try {
            let sql = `SELECT e.*, c."productName", c.turma, c.city 
                       FROM expenses e 
                       LEFT JOIN checkouts c ON c.id = e.checkout_id 
                       WHERE 1=1`;
            const params: any[] = [];
            let idx = 1;

            if (targetCohortId) {
                if (targetCohortId === 'global') {
                    sql += ` AND (e.checkout_id IS NULL OR e.checkout_id = 'global')`;
                } else {
                    sql += ` AND e.checkout_id = $${idx++}`;
                    params.push(targetCohortId);
                }
            }
            if (category) {
                sql += ` AND e.category ILIKE $${idx++}`;
                params.push(`%${category}%`);
            }
            if (start_date) {
                sql += ` AND e.date >= $${idx++}`;
                params.push(start_date);
            }
            if (end_date) {
                sql += ` AND e.date <= $${idx++}`;
                params.push(end_date);
            }

            sql += ` ORDER BY e.date DESC, e.created_at DESC LIMIT $${idx}`;
            params.push(Number(limit));

            const result = await db.query(sql, params);
            const expensesList = result.rows;
            const totalAmount = expensesList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

            // Agrupamento por categoria
            const byCategory: Record<string, number> = {};
            expensesList.forEach(e => {
                const cat = e.category || 'Taxas / Outros';
                byCategory[cat] = (byCategory[cat] || 0) + (Number(e.amount) || 0);
            });

            return reply.send({
                success: true,
                count: expensesList.length,
                total_amount: totalAmount,
                by_category: byCategory,
                expenses: expensesList
            });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * POST /api/v1/agent/expenses
     * Cadastra nova despesa (com categorias padronizadas) e dispara webhook outbound expense.created
     */
    fastify.post('/expenses', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const {
            checkout_id,
            turma_id,
            category = 'Taxas / Outros',
            description,
            amount,
            date = new Date().toISOString().split('T')[0]
        } = body;

        const effectiveCheckoutId = (turma_id || checkout_id) === 'global' ? null : (turma_id || checkout_id || null);

        if (!amount || !description) {
            return reply.status(400).send({ success: false, error: 'amount e description são obrigatórios.' });
        }

        try {
            const id = body.id || crypto.randomUUID();
            const insertResult = await db.query(
                `INSERT INTO expenses (id, checkout_id, category, description, amount, date, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 RETURNING *`,
                [id, effectiveCheckoutId, category, description, Number(amount), date]
            );

            const createdExpense = insertResult.rows[0];

            // Busca turma e recalcula o Break-Even atualizado da turma
            let breakEvenInfo: any = null;
            let checkoutData: any = null;

            if (effectiveCheckoutId) {
                const calcRes = await db.query(
                    `SELECT 
                        c.id, c."productName", c."productPrice", c.turma, c.city, c.notion_page_id,
                        COUNT(l.id) FILTER (WHERE l.status IN ('Pago', 'Aprovado')) as confirmed_students,
                        COALESCE(SUM(l.paid_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as gross_revenue,
                        COALESCE(SUM(l.mp_net_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as net_revenue,
                        COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.checkout_id = c.id), 0) as total_expenses
                     FROM checkouts c
                     LEFT JOIN leads l ON (l.product_id = c.id OR l.turma = c.turma)
                     WHERE c.id = $1
                     GROUP BY c.id`,
                    [effectiveCheckoutId]
                );

                const row = calcRes.rows[0];
                if (row) {
                    checkoutData = row;
                    const totalExpenses = Number(row.total_expenses);
                    const netRevenue = Number(row.net_revenue) || Number(row.gross_revenue);
                    const confirmed = Number(row.confirmed_students);
                    const catalogPrice = parseFloat(String(row.productPrice || '0').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
                    const averageNetTicket = confirmed > 0 ? netRevenue / confirmed : (catalogPrice * 0.95);
                    const studentsNeeded = averageNetTicket > 0 && totalExpenses > 0 ? Math.ceil(totalExpenses / averageNetTicket) : 0;
                    const remaining = Math.max(0, studentsNeeded - confirmed);
                    const netProfit = netRevenue - totalExpenses;

                    breakEvenInfo = {
                        total_expenses: totalExpenses,
                        net_revenue: netRevenue,
                        net_profit: netProfit,
                        confirmed_students: confirmed,
                        students_needed_to_break_even: studentsNeeded,
                        remaining_to_break_even: remaining,
                        status: netProfit > 0 ? 'lucro' : remaining === 0 ? 'equilibrio' : 'prejuizo'
                    };
                }
            }

            // Dispara webhook outbound expense.created para n8n e OpenClaw
            await webhookDispatcher.enqueue({
                eventType: 'expense.created',
                turmaId: effectiveCheckoutId || undefined,
                turmaName: checkoutData?.turma || checkoutData?.productName || 'Custo Global',
                notionPageId: checkoutData?.notion_page_id,
                payload: {
                    expense: createdExpense,
                    is_global: !effectiveCheckoutId,
                    turma: checkoutData ? {
                        id: checkoutData.id,
                        name: checkoutData.productName,
                        turma: checkoutData.turma,
                        city: checkoutData.city
                    } : null,
                    break_even: breakEvenInfo
                }
            });

            return reply.status(201).send({
                success: true,
                expense: createdExpense,
                break_even: breakEvenInfo
            });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * PATCH /api/v1/agent/expenses/:id
     * Atualiza uma despesa e dispara webhook expense.updated com Break-Even recalculado
     */
    fastify.patch('/expenses/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        const body: any = request.body || {};
        const { description, amount, category, date, checkout_id, turma_id } = body;

        try {
            const fields: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (description !== undefined) {
                fields.push(`description = $${idx++}`);
                values.push(description);
            }
            if (amount !== undefined) {
                fields.push(`amount = $${idx++}`);
                values.push(Number(amount));
            }
            if (category !== undefined) {
                fields.push(`category = $${idx++}`);
                values.push(category);
            }
            if (date !== undefined) {
                fields.push(`date = $${idx++}`);
                values.push(date);
            }
            if (checkout_id !== undefined || turma_id !== undefined) {
                const effectiveCid = (turma_id || checkout_id) === 'global' ? null : (turma_id || checkout_id || null);
                fields.push(`checkout_id = $${idx++}`);
                values.push(effectiveCid);
            }

            if (fields.length === 0) {
                return reply.status(400).send({ success: false, error: 'Nenhum campo fornecido para atualização.' });
            }

            values.push(id);
            const updateResult = await db.query(
                `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
                values
            );

            if (updateResult.rows.length === 0) {
                return reply.status(404).send({ success: false, error: 'Despesa não encontrada.' });
            }

            const updatedExpense = updateResult.rows[0];
            const effectiveCheckoutId = updatedExpense.checkout_id;

            // Recalcula Break-Even se associada a turma
            let breakEvenInfo: any = null;
            let checkoutData: any = null;

            if (effectiveCheckoutId) {
                const calcRes = await db.query(
                    `SELECT 
                        c.id, c."productName", c."productPrice", c.turma, c.city, c.notion_page_id,
                        COUNT(l.id) FILTER (WHERE l.status IN ('Pago', 'Aprovado')) as confirmed_students,
                        COALESCE(SUM(l.paid_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as gross_revenue,
                        COALESCE(SUM(l.mp_net_amount) FILTER (WHERE l.status IN ('Pago', 'Aprovado')), 0) as net_revenue,
                        COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.checkout_id = c.id), 0) as total_expenses
                     FROM checkouts c
                     LEFT JOIN leads l ON (l.product_id = c.id OR l.turma = c.turma)
                     WHERE c.id = $1
                     GROUP BY c.id`,
                    [effectiveCheckoutId]
                );

                const row = calcRes.rows[0];
                if (row) {
                    checkoutData = row;
                    const totalExpenses = Number(row.total_expenses);
                    const netRevenue = Number(row.net_revenue) || Number(row.gross_revenue);
                    const confirmed = Number(row.confirmed_students);
                    const catalogPrice = parseFloat(String(row.productPrice || '0').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
                    const averageNetTicket = confirmed > 0 ? netRevenue / confirmed : (catalogPrice * 0.95);
                    const studentsNeeded = averageNetTicket > 0 && totalExpenses > 0 ? Math.ceil(totalExpenses / averageNetTicket) : 0;
                    const remaining = Math.max(0, studentsNeeded - confirmed);
                    const netProfit = netRevenue - totalExpenses;

                    breakEvenInfo = {
                        total_expenses: totalExpenses,
                        net_revenue: netRevenue,
                        net_profit: netProfit,
                        confirmed_students: confirmed,
                        students_needed_to_break_even: studentsNeeded,
                        remaining_to_break_even: remaining,
                        status: netProfit > 0 ? 'lucro' : remaining === 0 ? 'equilibrio' : 'prejuizo'
                    };
                }
            }

            // Dispara webhook outbound expense.updated
            await webhookDispatcher.enqueue({
                eventType: 'expense.updated',
                turmaId: effectiveCheckoutId || undefined,
                turmaName: checkoutData?.turma || checkoutData?.productName || 'Custo Global',
                notionPageId: checkoutData?.notion_page_id,
                payload: {
                    expense: updatedExpense,
                    is_global: !effectiveCheckoutId,
                    turma: checkoutData ? {
                        id: checkoutData.id,
                        name: checkoutData.productName,
                        turma: checkoutData.turma,
                        city: checkoutData.city
                    } : null,
                    break_even: breakEvenInfo
                }
            });

            return reply.send({ success: true, expense: updatedExpense, break_even: breakEvenInfo });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * DELETE /api/v1/agent/expenses/:id
     * Exclui uma despesa e dispara webhook expense.deleted
     */
    fastify.delete('/expenses/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        try {
            const deleteResult = await db.query(`DELETE FROM expenses WHERE id = $1 RETURNING *`, [id]);
            if (deleteResult.rows.length === 0) {
                return reply.status(404).send({ success: false, error: 'Despesa não encontrada.' });
            }

            const deletedExpense = deleteResult.rows[0];

            await webhookDispatcher.enqueue({
                eventType: 'expense.deleted',
                turmaId: deletedExpense.checkout_id || undefined,
                payload: {
                    deleted_expense: deletedExpense
                }
            });

            return reply.send({ success: true, message: 'Despesa removida com sucesso.', deleted: deletedExpense });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });

    /**
     * POST /api/v1/agent/certificates/send
     * Gera certificados 100% server-side com pdf-lib e dispara por e-mail e webhook (WhatsApp/UAZAPI)
     */
    fastify.post('/certificates/send', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const { lead_id, turma_id, only_checked_in = false, instructor_name = 'Instrutor Vox', course_hours = '16' } = body;

        if (!lead_id && !turma_id) {
            return reply.status(400).send({ success: false, error: 'lead_id ou turma_id é obrigatório.' });
        }

        try {
            // Busca os alunos elegíveis
            let query = `SELECT l.*, c."productName", c.turma, c.event_date, c.city, c.event_location
                         FROM leads l
                         LEFT JOIN checkouts c ON (c.id = l.product_id OR c.turma = l.turma)
                         WHERE 1=1`;
            const params: any[] = [];
            let idx = 1;

            if (lead_id) {
                query += ` AND l.id = $${idx++}`;
                params.push(lead_id);
            } else if (turma_id) {
                query += ` AND (l.product_id = $${idx} OR l.turma = (SELECT turma FROM checkouts WHERE id = $${idx} LIMIT 1))`;
                params.push(turma_id);
                idx++;
                query += ` AND l.status IN ('Pago', 'Aprovado')`;
                if (only_checked_in) {
                    query += ` AND l.checked_in = true`;
                }
            }

            const leadsRes = await db.query(query, params);
            if (leadsRes.rows.length === 0) {
                return reply.status(404).send({ success: false, error: 'Nenhum aluno elegível encontrado para emissão.' });
            }

            // Diretório de certificados
            const certsDir = path.resolve(__dirname, '../../uploads/certificates');
            if (!fs.existsSync(certsDir)) {
                fs.mkdirSync(certsDir, { recursive: true });
            }

            const results: any[] = [];

            for (const student of leadsRes.rows) {
                try {
                    // 1. Gera PDF do Certificado via pdf-lib (A4 Paisagem: 841.89 x 595.28 pt)
                    const pdfDoc = await PDFDocument.create();
                    const page = pdfDoc.addPage([841.89, 595.28]);
                    const { width, height } = page.getSize();

                    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    const fontTimesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

                    // Moldura externa elegante (borda azul marinho e dourado suave)
                    page.drawRectangle({
                        x: 20,
                        y: 20,
                        width: width - 40,
                        height: height - 40,
                        borderColor: rgb(0.1, 0.2, 0.45),
                        borderWidth: 4,
                        color: rgb(0.99, 0.99, 1.0)
                    });
                    page.drawRectangle({
                        x: 26,
                        y: 26,
                        width: width - 52,
                        height: height - 52,
                        borderColor: rgb(0.85, 0.70, 0.20),
                        borderWidth: 1.5,
                    });

                    // Topo: Nome da Instituição
                    const brandText = 'VOX MARKETING ACADEMY';
                    const brandWidth = fontHelveticaBold.widthOfTextAtSize(brandText, 14);
                    page.drawText(brandText, {
                        x: (width - brandWidth) / 2,
                        y: height - 70,
                        size: 14,
                        font: fontHelveticaBold,
                        color: rgb(0.1, 0.2, 0.45),
                    });

                    // Título: CERTIFICADO DE CONCLUSÃO
                    const titleText = 'CERTIFICADO DE CONCLUSÃO';
                    const titleWidth = fontHelveticaBold.widthOfTextAtSize(titleText, 28);
                    page.drawText(titleText, {
                        x: (width - titleWidth) / 2,
                        y: height - 120,
                        size: 28,
                        font: fontHelveticaBold,
                        color: rgb(0.12, 0.15, 0.2),
                    });

                    // Texto de introdução
                    const introText = 'Certificamos com mérito que';
                    const introWidth = fontTimesItalic.widthOfTextAtSize(introText, 16);
                    page.drawText(introText, {
                        x: (width - introWidth) / 2,
                        y: height - 170,
                        size: 16,
                        font: fontTimesItalic,
                        color: rgb(0.35, 0.4, 0.45),
                    });

                    // Nome do Aluno (Destaque Principal)
                    const studentName = (student.name || 'Aluno Concluinte').toUpperCase();
                    const nameSize = studentName.length > 30 ? 22 : 26;
                    const studentWidth = fontHelveticaBold.widthOfTextAtSize(studentName, nameSize);
                    page.drawText(studentName, {
                        x: (width - studentWidth) / 2,
                        y: height - 215,
                        size: nameSize,
                        font: fontHelveticaBold,
                        color: rgb(0.08, 0.15, 0.35),
                    });

                    // Linha decorativa abaixo do nome
                    page.drawLine({
                        start: { x: (width - 400) / 2, y: height - 225 },
                        end: { x: (width + 400) / 2, y: height - 225 },
                        thickness: 1.5,
                        color: rgb(0.85, 0.70, 0.20),
                    });

                    // Descrição do Treinamento
                    const courseName = student.product_name || student.productName || student.turma || 'Treinamento de Alta Performance';
                    const bodyText = `concluiu com êxito o treinamento prático "${courseName}", totalizando uma carga horária`;
                    const bodyText2 = `de ${course_hours} horas de formação e aperfeiçoamento profissional.`;
                    const bodyWidth1 = fontHelvetica.widthOfTextAtSize(bodyText, 13);
                    const bodyWidth2 = fontHelvetica.widthOfTextAtSize(bodyText2, 13);

                    page.drawText(bodyText, {
                        x: (width - bodyWidth1) / 2,
                        y: height - 275,
                        size: 13,
                        font: fontHelvetica,
                        color: rgb(0.2, 0.25, 0.3),
                    });
                    page.drawText(bodyText2, {
                        x: (width - bodyWidth2) / 2,
                        y: height - 295,
                        size: 13,
                        font: fontHelvetica,
                        color: rgb(0.2, 0.25, 0.3),
                    });

                    // Data e Local
                    const dateFormatted = student.event_date || new Date().toLocaleDateString('pt-BR');
                    const locationFormatted = student.city || student.event_location || 'São Paulo - SP';
                    const footerInfo = `${locationFormatted} • Emissão: ${dateFormatted}`;
                    const footerWidth = fontHelvetica.widthOfTextAtSize(footerInfo, 11);
                    page.drawText(footerInfo, {
                        x: (width - footerWidth) / 2,
                        y: height - 350,
                        size: 11,
                        font: fontHelvetica,
                        color: rgb(0.4, 0.45, 0.5),
                    });

                    // Assinatura do Instrutor
                    page.drawLine({
                        start: { x: (width - 240) / 2, y: 90 },
                        end: { x: (width + 240) / 2, y: 90 },
                        thickness: 1,
                        color: rgb(0.2, 0.25, 0.3),
                    });
                    const signName = instructor_name;
                    const signNameWidth = fontHelveticaBold.widthOfTextAtSize(signName, 12);
                    page.drawText(signName, {
                        x: (width - signNameWidth) / 2,
                        y: 72,
                        size: 12,
                        font: fontHelveticaBold,
                        color: rgb(0.1, 0.15, 0.2),
                    });
                    const signRole = 'Diretoria Vox Academy';
                    const signRoleWidth = fontHelvetica.widthOfTextAtSize(signRole, 10);
                    page.drawText(signRole, {
                        x: (width - signRoleWidth) / 2,
                        y: 58,
                        size: 10,
                        font: fontHelvetica,
                        color: rgb(0.5, 0.55, 0.6),
                    });

                    // Código de Validação Único
                    const validationCode = `ID: ${student.id.slice(0, 8).toUpperCase()}`;
                    page.drawText(validationCode, {
                        x: 40,
                        y: 35,
                        size: 8,
                        font: fontHelvetica,
                        color: rgb(0.6, 0.65, 0.7),
                    });

                    const pdfBytes = await pdfDoc.save();
                    const fileName = `cert_${student.id}.pdf`;
                    const filePath = path.join(certsDir, fileName);
                    fs.writeFileSync(filePath, pdfBytes);

                    const baseUrl = env.FRONTEND_URL || 'https://checkout.voxcontrol.com';
                    const certUrl = `${baseUrl}/uploads/certificates/${fileName}`;

                    // 2. Disparo de E-mail
                    if (student.email) {
                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background: #ffffff;">
                                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 32px 24px; text-align: center; color: white;">
                                    <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Parabéns pela Conclusão! 🎓</h1>
                                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Seu Certificado Oficial está disponível</p>
                                </div>
                                <div style="padding: 32px 24px; color: #1f2937; line-height: 1.6;">
                                    <p style="font-size: 16px;">Olá, <b>${student.name}</b>!</p>
                                    <p>É com grande orgulho que disponibilizamos o seu certificado de conclusão do treinamento <strong>${courseName}</strong>.</p>
                                    <div style="text-align: center; margin: 32px 0;">
                                        <a href="${certUrl}" target="_blank" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                                            BAIXAR MEU CERTIFICADO (PDF)
                                        </a>
                                    </div>
                                    <p style="font-size: 13px; color: #6b7280; text-align: center;">Guarde este documento com carinho para comprovação de horas e qualificação profissional.</p>
                                </div>
                                <div style="background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #f3f4f6;">
                                    Vox Marketing Academy &bull; Certificado Oficial Autenticado
                                </div>
                            </div>
                        `;

                        await emailService.sendEmail({
                            to: student.email,
                            name: student.name,
                            subject: `Seu Certificado de Conclusão: ${courseName}`,
                            html: emailHtml,
                            attachments: [
                                {
                                    filename: `Certificado_${(student.name || 'Aluno').replace(/\s+/g, '_')}.pdf`,
                                    path: filePath
                                }
                            ]
                        });
                    }

                    // 3. Webhook outbound certificate.generated (para n8n / UAZAPI)
                    const cleanPhone = (student.phone || '').replace(/\D/g, '');
                    const fullWhatsapp = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;

                    await webhookDispatcher.enqueue({
                        eventType: 'certificate.generated',
                        turmaId: student.product_id,
                        turmaName: courseName,
                        payload: {
                            lead_id: student.id,
                            name: student.name,
                            email: student.email,
                            phone: fullWhatsapp,
                            whatsapp: fullWhatsapp,
                            certificate_url: certUrl,
                            course_name: courseName,
                            event_date: student.event_date
                        }
                    });

                    // Marca no banco que certificado foi emitido
                    await db.query(`UPDATE leads SET certificate_generated = true WHERE id = $1`, [student.id]).catch(() => {});

                    results.push({
                        lead_id: student.id,
                        name: student.name,
                        certificate_url: certUrl,
                        status: 'emitted'
                    });
                } catch (certErr: any) {
                    console.error(`Erro ao emitir certificado para ${student.name}:`, certErr);
                    results.push({
                        lead_id: student.id,
                        name: student.name,
                        status: 'error',
                        error: certErr?.message
                    });
                }
            }

            return reply.send({
                success: true,
                count: results.length,
                certificates: results
            });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message });
        }
    });
}
