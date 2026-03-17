// supabase/functions/mp-create-preference/index.ts
// Deploy this to Supabase Edge Functions

const MP_ACCESS_TOKEN = 'YOUR_MP_ACCESS_TOKEN'; // Replace with your Mercado Pago Access Token

Deno.serve(async (req) => {
  try {
    const preference = await req.json();

    // Create payment preference via Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preference)
    });

    if (!mpResponse.ok) {
      const error = await mpResponse.text();
      console.error('Mercado Pago error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create preference' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const mpData = await mpResponse.json();
    
    return new Response(JSON.stringify({
      id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
