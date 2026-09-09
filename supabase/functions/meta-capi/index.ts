// supabase/functions/meta-capi/index.ts
// Envia eventos para a Conversions API do Meta (server-side).
// Existe porque o Pixel sozinho perde 20-40% dos eventos (iOS/ITP/adblock) e porque
// pagamentos PIX/boleto só são confirmados depois que o cliente já saiu do site.
// Todo evento carrega o mesmo event_id do Pixel para o Meta deduplicar.
//
// Secrets necessários: META_PIXEL_ID, META_CAPI_TOKEN
// Opcional: META_TEST_EVENT_CODE (para validar em Eventos de Teste), META_API_VERSION

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Só aceitamos eventos padrão do funil — evita que a função vire um relay aberto.
const ALLOWED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Lead',
  'CompleteRegistration',
  'Purchase',
]);

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const sha256Hex = async (value: string): Promise<string> => {
  if (!value) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
};

const normalizeAlpha = (value: string): string =>
  stripAccents(value).trim().toLowerCase().replace(/[^a-z]/g, '');

/** Hasheia o que o Meta exige em SHA-256 e repassa fbp/fbc/ip/ua em texto puro (é o esperado). */
const buildUserData = async (input: Record<string, string | undefined>) => {
  const userData: Record<string, unknown> = {};

  const email = (input.email || '').trim().toLowerCase();
  const phone = normalizePhone(input.phone || '');
  const firstName = normalizeAlpha(input.firstName || '');
  const lastName = normalizeAlpha(input.lastName || '');
  const city = normalizeAlpha(input.city || '');
  const externalId = (input.externalId || '').replace(/\D/g, '');

  if (email) userData.em = [await sha256Hex(email)];
  if (phone) userData.ph = [await sha256Hex(phone)];
  if (firstName) userData.fn = [await sha256Hex(firstName)];
  if (lastName) userData.ln = [await sha256Hex(lastName)];
  if (city) userData.ct = [await sha256Hex(city)];
  if (externalId) userData.external_id = [await sha256Hex(externalId)];

  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;

  return userData;
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
    const META_CAPI_TOKEN = Deno.env.get('META_CAPI_TOKEN');
    const DEFAULT_PIXEL_ID = Deno.env.get('META_PIXEL_ID');
    const TEST_EVENT_CODE = Deno.env.get('META_TEST_EVENT_CODE');
    const API_VERSION = Deno.env.get('META_API_VERSION') || 'v21.0';

    if (!META_CAPI_TOKEN) {
      return new Response(JSON.stringify({
        error: 'META_CAPI_TOKEN não configurado no Supabase Secrets',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const eventName = String(body?.eventName || '');
    const pixelId = String(body?.pixelId || DEFAULT_PIXEL_ID || '');

    if (!ALLOWED_EVENTS.has(eventName)) {
      return new Response(JSON.stringify({ error: `Evento não permitido: ${eventName}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pixelId) {
      return new Response(JSON.stringify({
        error: 'pixelId ausente e META_PIXEL_ID não configurado',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body?.eventId) {
      return new Response(JSON.stringify({
        error: 'eventId obrigatório (usado para deduplicar com o Pixel)',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawUserData = { ...(body.userData || {}) } as Record<string, string | undefined>;

    // Chamadas vindas do navegador do cliente: IP e user-agent reais vêm da própria requisição.
    // Chamadas do mp-webhook NÃO usam isso (o IP seria o do Mercado Pago, o que piora o match).
    if (body.useRequestClient) {
      const forwarded = req.headers.get('x-forwarded-for') || '';
      rawUserData.clientIpAddress = rawUserData.clientIpAddress || forwarded.split(',')[0].trim();
      rawUserData.clientUserAgent = rawUserData.clientUserAgent || req.headers.get('user-agent') || '';
    }

    const userData = await buildUserData(rawUserData);

    const event: Record<string, unknown> = {
      event_name: eventName,
      event_time: Number(body.eventTime) || Math.floor(Date.now() / 1000),
      event_id: String(body.eventId),
      action_source: body.actionSource || (body.useRequestClient ? 'website' : 'system_generated'),
      user_data: userData,
    };

    if (body.eventSourceUrl) event.event_source_url = body.eventSourceUrl;
    if (body.customData && Object.keys(body.customData).length > 0) event.custom_data = body.customData;

    const payload: Record<string, unknown> = { data: [event] };
    if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

    const metaResponse = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(META_CAPI_TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const metaData = await metaResponse.json().catch(async () => ({ raw: await metaResponse.text() }));

    if (!metaResponse.ok) {
      console.error('Meta CAPI error:', metaData);
      return new Response(JSON.stringify({ error: 'Falha ao enviar evento para o Meta', details: metaData }), {
        status: metaResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      event_name: eventName,
      event_id: body.eventId,
      meta: metaData,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
