import { useEffect, useRef } from 'react';

type RealtimeTable = 'checkouts' | 'leads' | 'coupons' | 'expenses';

interface UseSupabaseRealtimeOptions {
  supabase: any;
  tables: RealtimeTable[];
  enabled?: boolean;
  channelName: string;
  onChange: () => void | Promise<void>;
}

/** Keeps a screen synchronized with Supabase without creating one channel per render. */
export function useSupabaseRealtime({
  supabase,
  tables,
  enabled = true,
  channelName,
  onChange,
}: UseSupabaseRealtimeOptions) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!supabase || !enabled || tables.length === 0) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshInFlight = false;
    let refreshQueued = false;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refresh();
      }, 300);
    };

    const refresh = async () => {
      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }

      refreshInFlight = true;
      try {
        await onChangeRef.current();
      } catch (error) {
        console.warn('[Realtime] Falha ao atualizar dados:', error);
      } finally {
        refreshInFlight = false;
        if (refreshQueued) {
          refreshQueued = false;
          scheduleRefresh();
        }
      }
    };

    const channel = tables.reduce((currentChannel: any, table) => (
      currentChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      )
    ), supabase.channel(channelName));

    channel.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[Realtime] Canal ${channelName} indisponível: ${status}`);
      }
    });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  // `tables` is a value array; joining keeps the subscription stable between renders.
  }, [supabase, enabled, channelName, tables.join('|')]);
}
