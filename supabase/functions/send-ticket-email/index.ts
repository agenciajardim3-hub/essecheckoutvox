// supabase/functions/send-ticket-email/index.ts
// Envia e-mail de ingresso/certificado usando Resend.
// Secrets necessários no Supabase:
// RESEND_API_KEY
// EMAIL_FROM

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Vox Marketing Academy <onboarding@resend.dev>';

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada no Supabase' }), {
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

    const studentName = payload.name || 'aluno';
    const productName = payload.productName || 'Curso Vox Marketing Academy';
    const subject = payload.subject || `Seu ingresso - ${productName}`;
    const ticketUrl = payload.ticketUrl || '';
    const certificateUrl = payload.certificateUrl || '';

    const text = payload.message || [
      `Olá ${studentName},`,
      '',
      `Segue seu acesso para ${productName}.`,
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
              <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 22px; border-radius: 14px; font-weight: bold;">
                Acessar ingresso
              </a>
            </p>
          ` : ''}

          ${certificateUrl ? `
            <p style="margin: 24px 0;">
              <a href="${certificateUrl}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 14px 22px; border-radius: 14px; font-weight: bold;">
                Acessar certificado
              </a>
            </p>
          ` : ''}

          <p style="font-size: 14px; color: #6b7280; margin-top: 28px;">
            Caso o botão não funcione, copie e cole este link no navegador:<br />
            ${ticketUrl ? `<span>${ticketUrl}</span>` : ''}
            ${certificateUrl ? `<br /><span>${certificateUrl}</span>` : ''}
          </p>
        </div>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [payload.to],
        subject,
        html,
        text,
      }),
    });

    const result = await resendResponse.json().catch(async () => ({ raw: await resendResponse.text() }));

    if (!resendResponse.ok) {
      console.error('Erro Resend:', result);
      return new Response(JSON.stringify({ error: 'Falha ao enviar e-mail', details: result }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-ticket-email error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erro inesperado' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
