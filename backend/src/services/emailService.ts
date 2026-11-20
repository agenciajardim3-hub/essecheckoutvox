import nodemailer from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailOptions {
    to: string;
    name?: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content?: any;
        path?: string;
        contentType?: string;
    }>;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    originalRecipient: string;
    effectiveRecipient: string;
    isTestMode: boolean;
    error?: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    private getTransporter(): nodemailer.Transporter {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                secure: env.SMTP_SECURE,
                auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASSWORD,
                },
                tls: {
                    rejectUnauthorized: env.NODE_ENV === 'production',
                },
            });
        }
        return this.transporter;
    }

    async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
        const { to, name, subject, html, text, attachments } = options;
        const originalRecipient = to;
        const isTestMode = Boolean(env.EMAIL_TEST_REDIRECT && env.EMAIL_TEST_REDIRECT.trim().length > 0);

        // Se a variável de redirecionamento de teste estiver ativa, protege o envio real
        const effectiveRecipient = isTestMode ? env.EMAIL_TEST_REDIRECT.trim() : originalRecipient;
        const effectiveSubject = isTestMode
            ? `[TESTE] [Destinatário Original: ${originalRecipient}] ${subject}`
            : subject;

        let effectiveHtml = html;
        if (isTestMode) {
            const warningBanner = `
                <div style="background-color: #fef3c7; border: 2px dashed #f59e0b; padding: 14px 18px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #92400e; border-radius: 12px; line-height: 1.5;">
                    <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        ⚠️ AMBIENTE DE TESTE / HOMOLOGAÇÃO (EMAIL_TEST_REDIRECT ATIVO)
                    </div>
                    <div>Este e-mail seria enviado originalmente para: <b>${originalRecipient}</b> ${name ? `(${name})` : ''}</div>
                    <div style="font-size: 11px; color: #b45309; margin-top: 4px;">Redirecionado com segurança para o endereço de testes configurado. Aluno real <b>NÃO</b> recebeu este e-mail.</div>
                </div>
            `;
            effectiveHtml = warningBanner + html;
        }

        try {
            const transporter = this.getTransporter();
            const fromField = `"${env.SMTP_FROM_NAME}" <${env.EMAIL_FROM}>`;

            const info = await transporter.sendMail({
                from: fromField,
                to: effectiveRecipient,
                subject: effectiveSubject,
                html: effectiveHtml,
                text: text || html.replace(/<[^>]*>?/gm, ''),
                attachments,
            });

            console.log(`[EmailService] E-mail enviado com sucesso! MessageId: ${info.messageId} | Destino: ${effectiveRecipient} ${isTestMode ? '(MODO TESTE)' : ''}`);

            return {
                success: true,
                messageId: info.messageId,
                originalRecipient,
                effectiveRecipient,
                isTestMode,
            };
        } catch (err: any) {
            console.error('[EmailService] Falha ao enviar e-mail via SMTP:', err);
            return {
                success: false,
                originalRecipient,
                effectiveRecipient,
                isTestMode,
                error: err?.message || 'Erro desconhecido ao disparar e-mail',
            };
        }
    }
}

export const emailService = new EmailService();
