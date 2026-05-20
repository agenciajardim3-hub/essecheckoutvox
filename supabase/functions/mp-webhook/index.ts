// supabase/functions/mp-webhook/index.ts
// Recebe notificações do Mercado Pago e atualiza o lead para Pago quando o pagamento for aprovado.
// Configure os secrets PROJECT_URL, SERVICE_ROLE_KEY e MP_ACCESS_TOKEN.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const PROJECT_URL = Deno.env.get('PROJECT_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');

    if (!PROJECT_URL || !SERVICE_ROLE_KEY || !MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Secrets ausentes. Configure PROJECT_URL, SERVICE_ROLE_KEY e MP_ACCESS_TOKEN.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    let paymentId = url.searchParams.get('id') || url.searchParams.get('data.id');
    let topic = url.searchParams.get('topic') || url.searchParams.get('type');

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      paymentId = paymentId || body?.data?.id || body?.id;
      topic = topic || body?.type || body?.topic;
    }

    if (!paymentId) {
      return new Response(JSON.stringify({ received: true, message: 'Notificação sem paymentId' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (topic && !String(topic).includes('payment')) {
      return new Response(JSON.stringify({ received: true, ignored: topic }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('Erro ao consultar pagamento:', payment);
      return new Response(JSON.stringify({ error: 'Erro ao consultar pagamento no Mercado Pago', details: payment }), {
        status: paymentResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const leadId = payment.external_reference;
    const status = payment.status;
    const statusDetail = payment.status_detail;
    const paidAmount = payment.transaction_amount;
    const paymentMethod = payment.payment_method_id;

    if (!leadId) {
      return new Response(JSON.stringify({ received: true, message: 'Pagamento sem external_reference' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedLeadStatus = status === 'approved'
      ? 'Pago'
      : status === 'rejected'
        ? 'Cancelado'
        : status === 'cancelled'
          ? 'Cancelado'
          : 'Pendente';

    const updatePayload: Record<string, unknown> = {
      status: normalizedLeadStatus,
      paid_amount: status === 'approved' ? paidAmount : 0,
      payment_location: 'Mercado Pago API'
    };

    const updateResponse = await fetch(`${PROJECT_URL}/rest/v1/leads?id=eq.${leadId}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updatePayload),
    });

    const updatedLead = await updateResponse.json().catch(() => null);

    if (!updateResponse.ok) {
      console.error('Erro ao atualizar lead:', updatedLead);
      return new Response(JSON.stringify({ error: 'Erro ao atualizar lead', details: updatedLead }), {
        status: updateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se o pagamento for aprovado ('Pago'), dispara automações (WhatsApp via UazAPI e e-mail)
    const lead = Array.isArray(updatedLead) && updatedLead.length > 0 ? updatedLead[0] : null;
    if (lead && normalizedLeadStatus === 'Pago') {
      const UAZAPI_URL = Deno.env.get('UAZAPI_URL');
      const UAZAPI_KEY = Deno.env.get('UAZAPI_KEY');
      const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://payvoxmarketingacademy.online';

      const ticketUrl = `${FRONTEND_URL}/?mode=ticket&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`;

      // 1. Envia mensagem via WhatsApp usando UazAPI se os secrets estiverem configurados
      if (UAZAPI_URL && UAZAPI_KEY && lead.phone) {
        try {
          let cleanPhone = lead.phone.replace(/\D/g, '');
          if (cleanPhone.length > 0) {
            if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10 && cleanPhone.length <= 11) {
              cleanPhone = '55' + cleanPhone;
            }

            const messageText = `Olá ${lead.name || 'aluno'}!\n\nSeu pagamento para *${lead.product_name || 'Curso'}* foi confirmado com sucesso. 🎉\n\n🎫 *Seu Ingresso:* ${ticketUrl}\n\nObrigado por confiar na Vox Marketing Academy! 🙏`;

            const uazBaseUrl = UAZAPI_URL.replace(/\/$/, '');
            const waResponse = await fetch(`${uazBaseUrl}/send/text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': UAZAPI_KEY,
              },
              body: JSON.stringify({
                number: cleanPhone,
                text: messageText,
                delay: 0,
                linkPreview: false,
              }),
            });

            if (!waResponse.ok) {
              console.error('Erro ao enviar WhatsApp via UazAPI:', await waResponse.text());
            } else {
              console.log('WhatsApp enviado com sucesso para:', cleanPhone);
            }
          }
        } catch (waError) {
          console.error('Erro ao processar envio de WhatsApp:', waError);
        }
      }

      // 2. Envia email com ingresso usando a edge function send-ticket-email
      if (lead.email) {
        try {
          const emailResponse = await fetch(`${PROJECT_URL}/functions/v1/send-ticket-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'apikey': SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({
              to: lead.email,
              name: lead.name || 'Aluno',
              subject: `Seu ingresso - ${lead.product_name || 'Curso Vox Marketing Academy'}`,
              productName: lead.product_name || 'Curso Vox Marketing Academy',
              ticketUrl: ticketUrl,
            }),
          });

          if (!emailResponse.ok) {
            console.error('Erro ao enviar email de ingresso:', await emailResponse.text());
          } else {
            console.log('Email de ingresso enviado com sucesso para:', lead.email);
          }
        } catch (emailError) {
          console.error('Erro ao processar envio de email:', emailError);
        }
      }
    }

    return new Response(JSON.stringify({
      received: true,
      payment_id: paymentId,
      payment_status: status,
      lead_status: normalizedLeadStatus,
      lead: updatedLead,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
