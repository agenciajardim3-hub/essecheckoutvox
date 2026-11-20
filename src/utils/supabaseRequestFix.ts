const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0ODQyODkyLCJleHAiOjE5NTI1MjI4OTJ9.MXOgUwS-KEmxoNKUH1Hwdp2XOdEL2L6GGkLaiArmDsw';

const getSupabaseKey = () => {
  const stored = localStorage.getItem('supabase_key');
  if (stored && (stored.includes('Landing Page') || stored.includes('Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0'))) {
    localStorage.setItem('supabase_key', FALLBACK_SUPABASE_KEY);
    return FALLBACK_SUPABASE_KEY;
  }
  return stored ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_KEY ||
    FALLBACK_SUPABASE_KEY;
};

const getApiUrl = () =>
  import.meta.env.VITE_API_URL ||
  localStorage.getItem('vox_api_url') ||
  (typeof window !== 'undefined' && window.location.hostname.includes('voxmarketingacademy.com') ? window.location.origin : '');

const patchFlag = '__voxSupabaseRequestFixInstalled';
const globalWindow = window as unknown as Window & Record<string, unknown>;

if (!globalWindow[patchFlag]) {
  globalWindow[patchFlag] = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const apiUrl = getApiUrl().replace(/\/+$/, '');

    // 1. Chaveamento automático de Edge Functions antigas para o Backend Fastify da Contabo
    if (apiUrl) {
      if (rawUrl.includes('/functions/v1/send-ticket-email')) {
        return originalFetch(`${apiUrl}/api/v1/tickets/send`, init);
      }
      if (rawUrl.includes('/functions/v1/send-email')) {
        return originalFetch(`${apiUrl}/api/v1/messaging/send-email`, init);
      }
      if (rawUrl.includes('/functions/v1/meta-capi')) {
        return originalFetch(`${apiUrl}/api/v1/tracking/meta-capi`, init);
      }
      if (rawUrl.includes('/functions/v1/mp-create-preference')) {
        return originalFetch(`${apiUrl}/api/v1/payments/preference`, init);
      }
    }

    // 2. Compatibilidade legada com tabelas
    const rewrittenUrl = rawUrl.includes('/rest/v1/modelos_de_email')
      ? rawUrl.replace('/rest/v1/modelos_de_email', '/rest/v1/email_templates')
      : rawUrl;

    if (!rewrittenUrl.includes('/functions/v1/send-ticket-email')) {
      return originalFetch(rewrittenUrl, init);
    }

    const key = getSupabaseKey();
    const existingHeaders = input instanceof Request
      ? new Headers(input.headers)
      : new Headers();

    new Headers(init.headers || {}).forEach((value, name) => {
      existingHeaders.set(name, value);
    });

    existingHeaders.set('Authorization', `Bearer ${key}`);
    existingHeaders.set('apikey', key);
    if (!existingHeaders.has('Content-Type')) {
      existingHeaders.set('Content-Type', 'application/json');
    }

    return originalFetch(rewrittenUrl, {
      ...init,
      headers: existingHeaders,
    });
  };
}

export {};
