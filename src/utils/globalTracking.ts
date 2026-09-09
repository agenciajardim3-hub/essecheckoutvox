// Configuração global de rastreamento (Pixel/GA4 aplicados a todos os checkouts).
// Antes ficava só em localStorage — ou seja, existia apenas no navegador do admin e
// nunca chegava ao visitante. Agora a fonte da verdade é o Supabase; o localStorage
// segue como cache para o pixel subir rápido, antes da resposta do banco.

export interface GlobalTrackingSettings {
  globalPixelId: string;
  globalGa4Id: string;
  pixelEnabled: boolean;
  ga4Enabled: boolean;
}

export const GLOBAL_TRACKING_CACHE_KEY = 'vox_global_tracking_settings';
const TABLE = 'global_tracking_settings';
const ROW_ID = 'default';

export const DEFAULT_GLOBAL_TRACKING: GlobalTrackingSettings = {
  globalPixelId: '',
  globalGa4Id: '',
  pixelEnabled: true,
  ga4Enabled: true,
};

export const readCachedGlobalTracking = (): GlobalTrackingSettings => {
  try {
    const raw = localStorage.getItem(GLOBAL_TRACKING_CACHE_KEY);
    if (!raw) return DEFAULT_GLOBAL_TRACKING;
    return { ...DEFAULT_GLOBAL_TRACKING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GLOBAL_TRACKING;
  }
};

const cache = (settings: GlobalTrackingSettings): void => {
  try {
    localStorage.setItem(GLOBAL_TRACKING_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // storage bloqueado — segue só com o valor do banco em memória
  }
};

export const loadGlobalTrackingSettings = async (supabase: any): Promise<GlobalTrackingSettings> => {
  if (!supabase) return readCachedGlobalTracking();
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', ROW_ID).maybeSingle();
    if (error) throw error;
    if (!data) return readCachedGlobalTracking();

    const settings: GlobalTrackingSettings = {
      globalPixelId: data.global_pixel_id || '',
      globalGa4Id: data.global_ga4_id || '',
      pixelEnabled: data.pixel_enabled !== false,
      ga4Enabled: data.ga4_enabled !== false,
    };
    cache(settings);
    return settings;
  } catch (err) {
    // Tabela ainda não criada ou offline: cai no cache local sem quebrar o checkout.
    console.warn('Não foi possível carregar configurações globais de rastreamento:', err);
    return readCachedGlobalTracking();
  }
};

export const saveGlobalTrackingSettings = async (
  supabase: any,
  settings: GlobalTrackingSettings
): Promise<void> => {
  cache(settings);
  if (!supabase) throw new Error('Supabase indisponível');

  const { error } = await supabase.from(TABLE).upsert({
    id: ROW_ID,
    global_pixel_id: settings.globalPixelId,
    global_ga4_id: settings.globalGa4Id,
    pixel_enabled: settings.pixelEnabled,
    ga4_enabled: settings.ga4Enabled,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
};
