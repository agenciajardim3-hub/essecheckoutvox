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
      payment_method: paymentMethod || 'Mercado Pago',
      payment_location: 'Mercado Pago API',
      mp_payment_id: String(paymentId),
      mp_status: status,
      mp_status_detail: statusDetail,
      ticket_generated: status === 'approved',
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
