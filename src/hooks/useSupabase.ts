
import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useSupabase() {
    const defaultUrl = import.meta.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co';
    const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';

    const [supabaseUrl] = useState(localStorage.getItem('supabase_url') || defaultUrl);
    const [supabaseKey] = useState(localStorage.getItem('supabase_key') || defaultKey);

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
