import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { emailService } from '../services/emailService';

export async function messagingRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/v1/messaging/send-email
     * Dispara e-mails com suporte a tags inteligentes e proteção EMAIL_TEST_REDIRECT
     */
    fastify.post('/send-email', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const { to, name, subject, html, text, certificateUrl, ticketUrl, attachments } = body;

        const recipient = to || body.email;

        if (!recipient || !subject || (!html && !text)) {
            return reply.status(400).send({
                success: false,
                error: 'to (email), subject e html/text são obrigatórios.',
            });
        }

        // Interpolação de variáveis dinâmicas se fornecidas
        let processedHtml = html || text;
        if (name) processedHtml = processedHtml.replace(/\{name\}/g, name).replace(/\{\{nome\}\}/g, name);
        if (ticketUrl) processedHtml = processedHtml.replace(/\{\{link_ingresso\}\}/g, ticketUrl);
        if (certificateUrl) processedHtml = processedHtml.replace(/\{\{link_certificado\}\}/g, certificateUrl);

        const result = await emailService.sendEmail({
            to: recipient,
            name,
            subject,
            html: processedHtml,
            text,
            attachments,
        });

        if (!result.success) {
            return reply.status(500).send(result);
        }

        return reply.send(result);
    });
}
