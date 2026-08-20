
import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co';
export const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';

export function useSupabase() {
    const [supabaseUrl] = useState(localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL);
    const [supabaseKey] = useState(localStorage.getItem('supabase_key') || DEFAULT_SUPABASE_KEY);

    const supabase = useMemo(() => {
        try {
            if (!supabaseUrl || !supabaseKey || supabaseKey.includes('Landing Page')) {
                throw new Error('Configuração de chave inválida');
            }
            return createClient(supabaseUrl, supabaseKey);
        } catch (e) {
            console.error('Erro ao inicializar cliente Supabase:', e);
            return null;
        }
    }, [supabaseUrl, supabaseKey]);

    return supabase;
}
