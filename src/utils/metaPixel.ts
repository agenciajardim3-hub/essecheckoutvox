// Camada única de rastreamento Meta (Pixel + Conversions API).
// Resolve três problemas do fluxo antigo:
// 1. Eventos disparados antes do fbq('init') eram descartados pelo Meta -> aqui ficam em fila.
// 2. Sem event_id não havia como deduplicar Pixel x CAPI -> todo evento nasce com um.
// 3. PII ia em texto puro no custom_data -> agora só sai hasheada em SHA-256 no Advanced Matching.

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: unknown;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  externalId?: string;
}

export interface MetaEventOptions {
  eventId?: string;
}

interface QueuedEvent {
  eventName: string;
  customData: Record<string, unknown>;
  eventId: string;
}

const isBrowser = typeof window !== 'undefined';
const MAX_QUEUE = 20;

let activePixelId = '';
let pageViewSent = false;
const queue: QueuedEvent[] = [];

export const newEventId = (): string => {
  if (isBrowser && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// --- Cookies de atribuição (usados pela CAPI para casar o evento com o clique no anúncio) ---

const readCookie = (name: string): string => {
  if (!isBrowser) return '';
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : '';
};

export const getFbp = (): string => readCookie('_fbp');

export const getFbc = (): string => {
  const fromCookie = readCookie('_fbc');
  if (fromCookie) return fromCookie;
  if (!isBrowser) return '';
  // Primeiro acesso vindo do anúncio: o cookie ainda não existe, mas o fbclid está na URL.
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : '';
};

// --- Normalização + hash (especificação de Advanced Matching do Meta) ---

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Meta espera o telefone com código do país; números BR chegam com 10-11 dígitos.
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
};

const normalizeName = (name: string): string =>
  stripAccents(name).trim().toLowerCase().replace(/[^a-z]/g, '');

const normalizeCity = (city: string): string =>
  stripAccents(city).trim().toLowerCase().replace(/[^a-z]/g, '');

const sha256Hex = async (value: string): Promise<string> => {
  if (!value || !isBrowser || !crypto?.subtle) return '';
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return ''; // crypto.subtle não existe fora de contexto seguro (http) — melhor não enviar nada.
  }
};

/** Monta o objeto de Advanced Matching já hasheado. Nada aqui sai em texto puro. */
export const buildAdvancedMatching = async (userData: MetaUserData): Promise<Record<string, string>> => {
  const [em, ph, fn, ln, ct, externalId] = await Promise.all([
    sha256Hex(userData.email ? normalizeEmail(userData.email) : ''),
    sha256Hex(userData.phone ? normalizePhone(userData.phone) : ''),
    sha256Hex(userData.firstName ? normalizeName(userData.firstName) : ''),
    sha256Hex(userData.lastName ? normalizeName(userData.lastName) : ''),
    sha256Hex(userData.city ? normalizeCity(userData.city) : ''),
    sha256Hex(userData.externalId ? userData.externalId.replace(/\D/g, '') : ''),
  ]);

  const matching: Record<string, string> = {};
  if (em) matching.em = em;
  if (ph) matching.ph = ph;
  if (fn) matching.fn = fn;
  if (ln) matching.ln = ln;
  if (ct) matching.ct = ct;
  if (externalId) matching.external_id = externalId;
  return matching;
};

/**
 * Extrai o ID numérico do pixel a partir do que estiver salvo no checkout.
 * Aceita o ID puro e também o bloco `<script>` inteiro do Meta colado por engano
 * (erro comum: o campo antes aceitava qualquer texto, e o fbq('init') falhava
 * silenciosamente com o script inteiro no lugar do número).
 * Retorna '' para qualquer coisa que não seja um ID plausível.
 */
export const normalizePixelId = (raw: string): string => {
  if (!raw) return '';
  const value = String(raw).trim();

  // ID puro
  if (/^\d{10,20}$/.test(value)) return value;

  // Script do Meta colado inteiro: pega o argumento do fbq('init', '...')
  const fromInit = value.match(/init['"\s,]+['"](\d{10,20})['"]/);
  if (fromInit) return fromInit[1];

  // Variante com a tag <noscript><img src="...?id=123...">
  const fromImg = value.match(/[?&]id=(\d{10,20})/);
  if (fromImg) return fromImg[1];

  return '';
};

// --- Init / fila ---

const flushQueue = (): void => {
  if (!activePixelId || !window.fbq) return;
  while (queue.length > 0) {
    const event = queue.shift()!;
    window.fbq('track', event.eventName, event.customData, { eventID: event.eventId });
  }
};

/**
 * Inicializa o pixel. Idempotente: chamar de novo com o mesmo id não reinicializa
 * nem duplica o PageView. Ao inicializar, esvazia a fila de eventos pendentes.
 */
export const initMetaPixel = (rawPixelId: string): boolean => {
  if (!isBrowser || !window.fbq) return false;

  const pixelId = normalizePixelId(rawPixelId);
  if (!pixelId) {
    if (rawPixelId) console.warn('Meta Pixel ID inválido, evento não será rastreado:', rawPixelId);
    return false;
  }

  if (activePixelId === pixelId) {
    flushQueue();
    return true;
  }
  activePixelId = pixelId;
  window.fbq('init', pixelId);
  flushQueue();
  return true;
};

/** Dispara o PageView uma única vez por carregamento de página. */
export const trackMetaPageView = (): void => {
  if (!isBrowser || !activePixelId || !window.fbq || pageViewSent) return;
  pageViewSent = true;
  window.fbq('track', 'PageView');
};

/** Anexa Advanced Matching hasheado ao pixel já inicializado. */
export const setMetaUserData = async (userData: MetaUserData): Promise<void> => {
  if (!isBrowser || !activePixelId || !window.fbq) return;
  const matching = await buildAdvancedMatching(userData);
  if (Object.keys(matching).length === 0) return;
  window.fbq('init', activePixelId, matching);
};

/**
 * Dispara um evento padrão. Se o pixel ainda não inicializou, o evento entra na fila
 * e sai assim que o init acontecer — em vez de ser descartado pelo Meta.
 * Retorna o event_id, que deve ser reaproveitado pela CAPI para deduplicar.
 */
export const trackMeta = (
  eventName: string,
  customData: Record<string, unknown> = {},
  options: MetaEventOptions = {}
): string => {
  const eventId = options.eventId || newEventId();
  if (!isBrowser) return eventId;

  if (!activePixelId || !window.fbq) {
    if (queue.length < MAX_QUEUE) queue.push({ eventName, customData, eventId });
    return eventId;
  }

  window.fbq('track', eventName, customData, { eventID: eventId });
  return eventId;
};

export const isMetaPixelReady = (): boolean => !!activePixelId;
