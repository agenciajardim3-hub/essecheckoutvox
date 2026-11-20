
import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://db-checkout.voxmarketingacademy.com';
export const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0ODQyODkyLCJleHAiOjE5NTI1MjI4OTJ9.MXOgUwS-KEmxoNKUH1Hwdp2XOdEL2L6GGkLaiArmDsw';

export function useSupabase() {
    const getSafeUrl = () => {
        const stored = localStorage.getItem('supabase_url');
        if (stored && stored.includes('emdsgvuqrhpjdgrgaslo')) {
            localStorage.setItem('supabase_url', DEFAULT_SUPABASE_URL);
            return DEFAULT_SUPABASE_URL;
        }
        return stored || DEFAULT_SUPABASE_URL;
    };

    const getSafeKey = () => {
        const stored = localStorage.getItem('supabase_key');
        if (stored && (stored.includes('Landing Page') || stored.includes('Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0'))) {
            localStorage.setItem('supabase_key', DEFAULT_SUPABASE_KEY);
            return DEFAULT_SUPABASE_KEY;
        }
        return stored || DEFAULT_SUPABASE_KEY;
    };

    const [supabaseUrl] = useState(getSafeUrl);
    const [supabaseKey] = useState(getSafeKey);

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
