// supabase/functions/mp-webhook/index.ts
// Recebe notificações do Mercado Pago, consulta o pagamento e libera o lead quando aprovado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type MercadoPagoNotification = {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string };
  id?: string;
  resource?: string;
};

const getPaymentId = (payload: MercadoPagoNotification, url: URL) => {
  return (
    payload?.data?.id ||
    payload?.id ||
    url.searchParams.get('data.id') ||
    url.searchParams.get('id') ||
    url.searchParams.get('payment_id') ||
    null
  );
};

const getMoneyValue = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.replace(',', '.')) || 0;
  return 0;
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

  if (!supabaseUrl || !supabaseServiceRoleKey || !mpAccessToken) {
    console.error('Variáveis obrigatórias ausentes');
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const payload = await req.json().catch(() => ({}));
    const paymentId = getPaymentId(payload, url);

    if (!paymentId) {
      console.warn('Notificação sem paymentId:', payload);
      return new Response(JSON.stringify({ received: true, ignored: 'missing_payment_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('Erro ao consultar pagamento no Mercado Pago:', payment);
      return new Response(JSON.stringify({ error: 'Failed to fetch payment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const leadId = payment.external_reference || payment.metadata?.lead_id || null;
    const status = payment.status;
    const paidAmount = getMoneyValue(payment.transaction_amount);

    if (!leadId) {
      console.warn('Pagamento sem external_reference/lead_id:', paymentId);
      // Futuro: salvar em uma tabela de pagamentos não identificados.
      return new Response(JSON.stringify({ received: true, ignored: 'missing_external_reference', payment_id: paymentId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const updatePayload: Record<string, unknown> = {
      mp_payment_id: String(paymentId),
      payment_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      updatePayload.status = 'Pago';
      updatePayload.paid_amount = paidAmount;
      updatePayload.paid_at = payment.date_approved || new Date().toISOString();
    } else if (status === 'rejected' || status === 'cancelled') {
      updatePayload.status = 'Pagamento recusado';
    } else {
      updatePayload.status = 'Pagamento pendente';
    }

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId);

    if (error) {
      console.error('Erro ao atualizar lead:', error);
      return new Response(JSON.stringify({ error: 'Failed to update lead', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      received: true,
      payment_id: paymentId,
      lead_id: leadId,
      status,
      lead_updated: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
