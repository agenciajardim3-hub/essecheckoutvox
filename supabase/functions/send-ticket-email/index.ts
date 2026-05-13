// supabase/functions/send-ticket-email/index.ts
// Envia e-mail de ingresso/certificado usando SMTP da Hostinger via Nodemailer.
// Secrets necessários no Supabase:
// SMTP_HOST=smtp.hostinger.com
// SMTP_PORT=465
// SMTP_SECURE=true
// SMTP_USER=seuemail@seudominio.com
// SMTP_PASS=senha_do_email
// EMAIL_FROM=Vox Marketing Academy <seuemail@seudominio.com>

import nodemailer from 'npm:nodemailer@6.9.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type EmailPayload = {
  to?: string;
  name?: string;
  subject?: string;
  message?: string;
  ticketUrl?: string;
  productName?: string;
  certificateUrl?: string;
};

const isEmail = (value?: string) => {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const smtpHost = Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com';
    const smtpPort = Number(Deno.env.get('SMTP_PORT') || '465');
    const smtpSecure = (Deno.env.get('SMTP_SECURE') || 'true') === 'true';
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const emailFrom = Deno.env.get('EMAIL_FROM') || (smtpUser ? `Vox Marketing Academy <${smtpUser}>` : '');

    if (!smtpUser || !smtpPass || !emailFrom) {
      return new Response(JSON.stringify({
        error: 'SMTP não configurado no Supabase',
        requiredSecrets: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'],
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as EmailPayload;

    if (!isEmail(payload.to)) {
      return new Response(JSON.stringify({ error: 'E-mail de destino inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const studentName = escapeHtml(payload.name || 'aluno');
    const productName = escapeHtml(payload.productName || 'Curso Vox Marketing Academy');
    const subject = payload.subject || `Seu ingresso - ${payload.productName || 'Curso Vox Marketing Academy'}`;
    const ticketUrl = payload.ticketUrl || '';
    const certificateUrl = payload.certificateUrl || '';

    const text = payload.message || [
      `Olá ${payload.name || 'aluno'},`,
      '',
      `Segue seu acesso para ${payload.productName || 'Curso Vox Marketing Academy'}.`,
      ticketUrl ? `Ingresso: ${ticketUrl}` : '',
      certificateUrl ? `Certificado: ${certificateUrl}` : '',
      '',
      'Atenciosamente,',
      'Vox Marketing Academy',
    ].filter(Boolean).join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
        <div style="background: linear-gradient(135deg, #06b6d4, #7c3aed); padding: 24px; border-radius: 20px; color: white; text-align: center;">
          <h1 style="margin: 0; font-size: 26px;">Vox Marketing Academy</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: .9;">Seu acesso está pronto</p>
        </div>

        <div style="padding: 28px 4px;">
          <h2 style="font-size: 22px; margin: 0 0 12px;">Olá, ${studentName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 18px;">
            Segue seu acesso para <strong>${productName}</strong>.
          </p>

          ${ticketUrl ? `
            <p style="margin: 24px 0;">
              <a href="${escapeHtml(ticketUrl)}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 22px; border-radius: 14px; font-weight: bold;">
                Acessar ingresso
              </a>
            </p>
          ` : ''}

          ${certificateUrl ? `
            <p style="margin: 24px 0;">
              <a href="${escapeHtml(certificateUrl)}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 22px; border-radius: 14px; font-weight: bold;">
                Acessar certificado
              </a>
            </p>
          ` : ''}

          <p style="font-size: 14px; color: #6b7280; margin-top: 28px;">
            Caso o botão não funcione, copie e cole este link no navegador:<br />
            ${ticketUrl ? `<span>${escapeHtml(ticketUrl)}</span>` : ''}
            ${certificateUrl ? `<br /><span>${escapeHtml(certificateUrl)}</span>` : ''}
          </p>
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const result = await transporter.sendMail({
      from: emailFrom,
      to: payload.to,
      subject,
      html,
      text,
    });

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-ticket-email SMTP error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erro inesperado ao enviar e-mail' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
