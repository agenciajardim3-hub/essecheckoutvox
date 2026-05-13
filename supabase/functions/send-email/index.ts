import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

serve(async (req) => {
  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Apenas POST é permitido"
      }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Extract data from body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Corpo da requisição inválido. Certifique-se de enviar JSON válido."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, name, subject, body, certificateUrl, ticketUrl, imageUrl, type } = requestBody;

    // Validate required fields
    if (!email || !subject || !body) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email, subject e body são obrigatórios"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email inválido"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get SMTP credentials from Supabase Secrets
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPortStr = Deno.env.get("SMTP_PORT") || "587";
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const fromName = Deno.env.get("SMTP_FROM_NAME") || "Vox Marketing Academy";

    // Validate SMTP configuration
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP credentials not configured", {
        hasHost: !!smtpHost,
        hasUser: !!smtpUser,
        hasPassword: !!smtpPassword,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Serviço de email não configurado. Configure as variáveis SMTP_HOST, SMTP_USER e SMTP_PASSWORD nas Supabase Secrets.",
          debug: {
            hasSmtpHost: !!smtpHost,
            hasSmtpUser: !!smtpUser,
            hasSmtpPassword: !!smtpPassword
          }
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const smtpPort = parseInt(smtpPortStr);

    // Build HTML email template
    const htmlBody = buildEmailTemplate(
      name,
      body,
      certificateUrl,
      ticketUrl,
      imageUrl,
      fromName
    );

    // Send email via SMTP
    const client = new SmtpClient();

    try {
      await client.connect({
        hostname: smtpHost,
        port: smtpPort,
        username: smtpUser,
        password: smtpPassword,
        tls: true,
      });

      await client.send({
        from: `${fromName} <${smtpUser}>`,
        to: email,
        subject: subject,
        content: body,
        html: htmlBody,
      });

      await client.close();

      // Log success
      console.log(`Email sent successfully to ${email} (type: ${type || 'custom'})`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email enviado com sucesso!",
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (smtpError) {
      console.error("SMTP connection/send error:", smtpError);
      throw smtpError;
    }
  } catch (error) {
    console.error("Email send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(
      JSON.stringify({
        success: false,
        message: `Erro ao enviar email: ${errorMessage}`
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildEmailTemplate(
  name: string,
  body: string,
  certificateUrl?: string,
  ticketUrl?: string,
  imageUrl?: string,
  brandName?: string
): string {
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            line-height: 1.6;
            color: #333;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }

          .email-wrapper {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }

          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .header p {
            font-size: 14px;
            opacity: 0.9;
          }

          .content {
            padding: 40px 30px;
          }

          .content p {
            margin-bottom: 16px;
            font-size: 15px;
            line-height: 1.7;
          }

          .content h2 {
            font-size: 20px;
            margin: 24px 0 16px 0;
            color: #222;
          }

          .cta-buttons {
            margin: 30px 0;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .cta-button {
            display: inline-block;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .cta-certificate {
            background: #f59e0b;
            color: white;
          }

          .cta-certificate:hover {
            background: #d97706;
          }

          .cta-ticket {
            background: #10b981;
            color: white;
          }

          .cta-ticket:hover {
            background: #059669;
          }

          .cta-custom {
            background: #667eea;
            color: white;
          }

          .cta-custom:hover {
            background: #5568d3;
          }

          .image-container {
            margin: 30px 0;
            text-align: center;
          }

          .image-container img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
          }

          .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 30px 0;
          }

          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }

          .footer p {
            margin: 8px 0;
          }

          @media (max-width: 600px) {
            .container {
              padding: 10px;
            }

            .content {
              padding: 20px;
            }

            .cta-buttons {
              flex-direction: column;
            }

            .cta-button {
              width: 100%;
              text-align: center;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-wrapper">
            <!-- Header -->
            <div class="header">
              <h1>Olá, ${escapeHtml(name)}! 👋</h1>
              <p>${brandName || 'Vox Marketing Academy'}</p>
            </div>

            <!-- Content -->
            <div class="content">
              ${body.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                return `<p>${escapeHtml(trimmed)}</p>`;
              }).join('')}

              <!-- Action Buttons -->
              <div class="cta-buttons">
                ${certificateUrl ? `
                  <a href="${escapeHtml(certificateUrl)}" class="cta-button cta-certificate">
                    📜 Ver Certificado
                  </a>
                ` : ''}
                ${ticketUrl ? `
                  <a href="${escapeHtml(ticketUrl)}" class="cta-button cta-ticket">
                    🎫 Ver Ingresso
                  </a>
                ` : ''}
              </div>

              <!-- Image if provided -->
              ${imageUrl ? `
                <div class="image-container">
                  <img src="${escapeHtml(imageUrl)}" alt="Imagem" />
                </div>
              ` : ''}
            </div>

            <!-- Divider -->
            <div class="divider"></div>

            <!-- Footer -->
            <div class="footer">
              <p>Este é um email automático. Não responda a este email.</p>
              <p>© ${currentYear} ${escapeHtml(brandName || 'Vox Marketing Academy')}</p>
              <p>Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
