import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { emailService } from '../services/emailService';
import { db } from '../db/client';
import { webhookDispatcher } from '../services/webhookDispatcher';

export async function ticketsRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/v1/tickets/send
     * Envia ingresso para aluno via E-mail, WhatsApp (via webhook para n8n) ou Ambos
     */
    fastify.post('/send', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        let {
            leadId,
            to,
            name,
            phone,
            ticketUrl,
            productName,
            turma,
            eventDate,
            eventLocation,
            channel = 'email',
            customMessage,
            message,
            subject: customSubject,
            imageUrl,
            certificateUrl,
        } = body;

        let lead: any = null;
        if (leadId) {
            try {
                const leadRes = await db.query(`SELECT * FROM leads WHERE id = $1 LIMIT 1`, [leadId]);
                lead = leadRes.rows[0];
                if (lead) {
                    to = to || lead.email;
                    name = name || lead.name;
                    phone = phone || lead.phone;
                    turma = turma || lead.turma;
                    productName = productName || lead.product_name;
                }
            } catch (err) {
                console.warn('[TicketsSend] Erro ao buscar lead:', err);
            }
        }

        const baseUrl = process.env.FRONTEND_URL || 'https://checkout.voxcontrol.com';
        if (!ticketUrl && lead) {
            ticketUrl = `${baseUrl}/?mode=ticket&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`;
        }

        if (!to && !leadId) {
            return reply.status(400).send({
                success: false,
                error: 'to (e-mail) ou leadId é obrigatório.',
            });
        }

        const normalizedPhone = (phone || '').replace(/\D/g, '');
        const fullWhatsapp = normalizedPhone.length <= 11 && !normalizedPhone.startsWith('55') ? `55${normalizedPhone}` : normalizedPhone;

        const results: { email?: any; whatsapp?: any } = {};

        // 1. Envio por E-mail
        if (channel === 'email' || channel === 'both') {
            if (to) {
                const subject = customSubject || `Seu Ingresso: ${productName || turma || 'Evento Vox'}`;
                const contentHtml = message || customMessage || (ticketUrl ? '<p>Sua vaga está confirmada. Abaixo estão os detalhes do seu evento:</p>' : '<p>Mensagem sobre o seu evento:</p>');

                const html = body.preserveCertificateLayout || body.html
                    ? (body.html || contentHtml)
                    : `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background: #ffffff;">
                        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800;">${ticketUrl ? 'Ingresso Confirmado! 🎟️' : (productName || 'Vox Marketing Academy')}</h1>
                            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">${productName || turma || 'Vox Marketing Academy'}</p>
                        </div>
                        <div style="padding: 32px 24px; color: #1f2937; line-height: 1.6;">
                            <p style="font-size: 16px;">Olá, <b>${name || 'Aluno'}</b>!</p>
                            <div style="margin: 20px 0;">
                                ${contentHtml.includes('<p') || contentHtml.includes('<div') ? contentHtml : `<p style="background: #f1f5f9; padding: 12px; border-radius: 8px;">${contentHtml.replace(/\n/g, '<br />')}</p>`}
                            </div>
                            ${(eventDate || eventLocation || turma) ? `
                            <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 8px;">
                                ${turma ? `<p style="margin: 4px 0;"><b>Turma:</b> ${turma}</p>` : ''}
                                ${eventDate ? `<p style="margin: 4px 0;"><b>Data:</b> ${eventDate}</p>` : ''}
                                ${eventLocation ? `<p style="margin: 4px 0;"><b>Local:</b> ${eventLocation}</p>` : ''}
                            </div>` : ''}
                            ${imageUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${imageUrl}" style="max-width: 100%; border-radius: 12px;" /></div>` : ''}
                            ${ticketUrl ? `
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${ticketUrl}" target="_blank" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                                    VISUALIZAR E BAIXAR MEU INGRESSO
                                </a>
                            </div>
                            <p style="font-size: 13px; color: #6b7280; text-align: center;">Apresente este ingresso com o QR Code na recepção para fazer seu check-in.</p>
                            ` : ''}
                            ${certificateUrl ? `
                            <div style="text-align: center; margin: 24px 0;">
                                <a href="${certificateUrl}" target="_blank" style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block;">
                                    VISUALIZAR CERTIFICADO
                                </a>
                            </div>
                            ` : ''}
                        </div>
                        <div style="background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #f3f4f6;">
                            Vox Marketing Academy &bull; Todos os direitos reservados.
                        </div>
                    </div>
                `;

                results.email = await emailService.sendEmail({
                    to,
                    name,
                    subject,
                    html,
                });
            } else {
                results.email = { success: false, error: 'E-mail não informado para o aluno.' };
            }
        }

        if (channel === 'email' && results.email && !results.email.success) {
            return reply.status(400).send({
                success: false,
                error: results.email.error || 'Erro ao enviar e-mail via SMTP',
                results,
            });
        }

        // 2. Disparo de Webhook para WhatsApp (n8n / UAZAPI)
        if (channel === 'whatsapp' || channel === 'both') {
            await webhookDispatcher.enqueue({
                eventType: 'ticket.dispatch_whatsapp',
                turmaName: turma || productName,
                turmaId: lead?.product_id,
                payload: {
                    leadId: leadId || lead?.id,
                    name: name || 'Aluno',
                    phone: fullWhatsapp,
                    whatsapp: fullWhatsapp,
                    ticket_url: ticketUrl,
                    qr_code_data: leadId || lead?.id || ticketUrl,
                    turma: turma || productName,
                    event_date: eventDate,
                    event_location: eventLocation,
                    custom_message: customMessage || null,
                    image_url: imageUrl || null
                }
            });
            results.whatsapp = { success: true, queued_for_n8n: true };
        }

        if (leadId) {
            await db.query(
                `UPDATE leads SET ticket_generated = true, emission_date = NOW() WHERE id = $1`,
                [leadId]
            ).catch(() => {});

            await webhookDispatcher.enqueue({
                eventType: 'ticket.generated',
                turmaName: turma,
                turmaId: lead?.product_id,
                payload: {
                    leadId,
                    email: to,
                    name,
                    phone: fullWhatsapp,
                    ticket_url: ticketUrl,
                    channel
                }
            });
        }

        return reply.send({
            success: true,
            channel,
            ticketUrl,
            results
        });
    });
}
