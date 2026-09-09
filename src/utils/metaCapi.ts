// Relay do navegador para a Conversions API (Edge Function meta-capi).
// Serve para recuperar os eventos que o Pixel perde por adblock/iOS: quando o fbevents.js
// nem carrega, esta chamada continua saindo. O event_id é o mesmo do Pixel, então quando
// os dois chegam o Meta deduplica e conta uma venda só.

import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from '../hooks/useSupabase';
import { getFbc, getFbp, MetaUserData } from './metaPixel';

export interface CapiEventParams {
  eventName: string;
  eventId: string;
  pixelId?: string;
  userData?: MetaUserData;
  customData?: Record<string, unknown>;
  /**
   * true (padrão): o evento é do próprio comprador — a função usa o IP, o user-agent
   * e os cookies _fbp/_fbc desta aba. false: o evento está sendo registrado por um
   * terceiro (ex.: admin marcando "Pago" no painel), então nada do navegador atual
   * pode ir junto, senão o Meta atribui a venda a quem está no painel.
   */
  fromBuyerBrowser?: boolean;
}

/** Dispara sem bloquear a UI. Falha de rede aqui nunca pode atrapalhar o checkout. */
export const sendMetaCapiEvent = (params: CapiEventParams): void => {
  if (typeof window === 'undefined' || !params.eventId) return;

  const supabaseUrl = localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL;
  const supabaseKey = localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY;

  const fromBuyerBrowser = params.fromBuyerBrowser !== false;

  const payload = {
    eventName: params.eventName,
    eventId: params.eventId,
    pixelId: params.pixelId,
    eventTime: Math.floor(Date.now() / 1000),
    eventSourceUrl: fromBuyerBrowser ? window.location.href : undefined,
    actionSource: fromBuyerBrowser ? 'website' : 'system_generated',
    useRequestClient: fromBuyerBrowser,
    userData: fromBuyerBrowser
      ? { ...(params.userData || {}), fbp: getFbp(), fbc: getFbc() }
      : { ...(params.userData || {}) },
    customData: params.customData || {},
  };

  fetch(`${supabaseUrl}/functions/v1/meta-capi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify(payload),
    keepalive: true, // o evento continua saindo mesmo se a página navegar para o Mercado Pago
  }).catch((err) => console.warn('Meta CAPI (browser) falhou:', err));
};
