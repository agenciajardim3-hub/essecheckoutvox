// supabase/functions/mp-create-preference/index.ts
// Cria uma preferência de pagamento no Mercado Pago sem expor o Access Token no frontend.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Aceita tanto os nomes injetados pela plataforma quanto os configurados à mão
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || Deno.env.get('MP_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');

    if (!mpAccessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN/MP_ACCESS_TOKEN não configurado');
      return new Response(JSON.stringify({ error: 'Mercado Pago token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const preference = await req.json();

    if (!preference?.items?.length) {
      return new Response(JSON.stringify({ error: 'Preference items are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!preference.external_reference) {
      return new Response(JSON.stringify({ error: 'external_reference is required to identify the lead/order' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safePreference = {
      ...preference,
      notification_url:
        preference.notification_url ||
        (supabaseUrl ? `${supabaseUrl}/functions/v1/mp-webhook` : undefined),
      metadata: {
        ...(preference.metadata || {}),
        lead_id: preference.external_reference,
        source: 'checkoutvox',
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(safePreference),
    });

    const mpData = await mpResponse.json().catch(async () => ({ raw: await mpResponse.text() }));

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return new Response(JSON.stringify({ error: 'Failed to create preference', details: mpData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      external_reference: safePreference.external_reference,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
