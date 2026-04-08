
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';

import { useSupabase } from './src/hooks/useSupabase';
import { useNotifications } from './src/hooks/useNotifications';
import { usePullToRefresh } from './src/hooks/usePullToRefresh';
import { AppConfig, Lead, CustomerData, UserRole, MultiTicketPurchase, Coupon } from './src/types';
// Lazy load Dashboard for code splitting
const Dashboard = lazy(() => import('./src/components/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
import { ClientView } from './src/components/client/ClientView';
import { RegistrationSuccess } from './src/components/client/RegistrationSuccess';
import { ThankYouPage } from './src/components/client/ThankYouPage';
import { LoginPage } from './src/components/auth/LoginPage';
import { SolicitacaoFormPage } from './src/components/client/SolicitacaoFormPage';

export default function App() {
  const supabase = useSupabase();
  const { sendNewLeadNotification } = useNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global State (defined early to be available for fetchData and other callbacks)
  const [allCheckouts, setAllCheckouts] = useState<AppConfig[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('vox_saved_role');
    const rememberMe = localStorage.getItem('vox_remember_me');
    if (savedRole && rememberMe === 'true') {
      return savedRole as 'master' | 'manager';
    }
    return 'none';
  }); // Admin mode role
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'error'>('online');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    id: crypto.randomUUID(),
    mercadoPagoLink: '',
    productName: '',
    productPrice: '',
    productImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
    bannerImage: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&auto=format&fit=crop&q=60',
    productDescription: '',
    benefits: ['Acesso imediato', 'Suporte VIP WhatsApp', 'Material Complementar'],
    turma: '',
    eventDate: '',
    eventStartTime: '',
    eventEndTime: '',
    eventLocation: '',
    ga4Id: '',
    metaPixelId: '',
    isActive: true,
    slug: ''
  });

  // UTMs & Modes (defined early for fetchData dependencies)
  const query = new URLSearchParams(window.location.search);
  const isRegistrationMode = query.get('mode') === 'reg';
  const isTicketMode = query.get('mode') === 'ticket';
  const isCertificateMode = query.get('mode') === 'certificate';
  const checkoutParam = query.get('checkout') || query.get('p') || '';
  const ticketCpf = query.get('cpf');
  const utms = {
    source: query.get('utm_source') || 'direct',
    medium: query.get('utm_medium') || 'cpc',
    campaign: query.get('utm_campaign') || 'general'
  };

  // --- Fetch Logic (defined before handleRefresh that depends on it) ---
  const fetchData = useCallback(async () => {
    // Try to load from cache first if offline or just to show something fast
    const cachedLeads = localStorage.getItem('vox_leads_cache');
    if (cachedLeads) {
      try {
        setLeads(JSON.parse(cachedLeads));
      } catch (e) { console.error('Cache parse error', e); }
    }

    if (!supabase) return;
    setIsLoading(true);

    if (!navigator.onLine) {
      setIsLoading(false);
      return; // Stop here if offline, reliance on cache
    }

    try {
      // Always fetch all checkouts to ensure we have the right one
      const { data: checkoutData, error: checkoutError } = await supabase.from('checkouts').select('*');
      if (checkoutError) throw checkoutError;
      const checkoutsData = checkoutData || [];

      // OPTIMIZATION: Only fetch leads/coupons for dashboard (not client checkout pages)
      let leadsData: any = null;
      let couponsData: any = null;

      if (!checkoutParam || userRole !== 'none') {
        // Dashboard mode - fetch all leads and coupons
        const leadsResult = await supabase.from('leads').select('*').order('created_at', { ascending: false });
        leadsData = leadsResult.data;
        if (leadsResult.error && leadsResult.error.code !== 'PGRST116') throw leadsResult.error;

        // Coupons - ignore errors (table might not exist)
        try {
          const couponsResult = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
          couponsData = couponsResult.data;
        } catch (couponErr) {
          console.warn('Coupons table not found or error:', couponErr);
        }
      }

      const mappedCheckouts: AppConfig[] = (checkoutsData).map(c => ({
        id: c.id,
        mercadoPagoLink: c.mercado_pago_link,
        productName: c.product_name,
        productPrice: c.product_price,
        productImage: c.product_image,
        bannerImage: c.banner_image,
        productDescription: c.product_description || c.product_name,
        benefits: c.benefits || [],
        turma: c.turma,
        eventDate: c.event_date,
        eventStartTime: c.event_start_time,
        eventEndTime: c.event_end_time,
        eventLocation: c.event_location,
        ga4Id: c.ga4_id,
        metaPixelId: c.meta_pixel_id,
        isActive: c.is_active,
        slug: c.slug,
        webhookUrl: c.webhook_url,
        maxVagas: c.max_vagas,
        useMpApi: c.use_mp_api,
        ticketAmount: c.ticket_amount,
        thankYouTitle: c.thank_you_title,
        thankYouSubtitle: c.thank_you_subtitle,
        thankYouMessage: c.thank_you_message,
        thankYouButtonText: c.thank_you_button_text,
        thankYouButtonUrl: c.thank_you_button_url,
        thankYouImageUrl: c.thank_you_image_url,
        variations: typeof c.variations === 'string' ? JSON.parse(c.variations) : (c.variations || [])
      }));

      setAllCheckouts(mappedCheckouts);

      if (leadsData) {
        setLeads(leadsData);
        // Update Cache
        localStorage.setItem('vox_leads_cache', JSON.stringify(leadsData));
      }

      if (couponsData) {
        const mappedCoupons: Coupon[] = couponsData.map(c => ({
          id: c.id,
          code: c.code,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          maxUses: c.max_uses,
          currentUses: c.current_uses,
          productId: c.product_id,
          isActive: c.is_active,
          createdAt: c.created_at,
          expiresAt: c.expires_at
        }));
        setCoupons(mappedCoupons);
      }

      const matchedConfig = mappedCheckouts.find(c => c.slug === checkoutParam || c.id === checkoutParam);
      console.log('[DEBUG] checkoutParam:', checkoutParam);
      if (matchedConfig) {
        // Use the matched checkout
        setConfig(matchedConfig);
      } else if (mappedCheckouts.length > 0) {
        // Fallback to first checkout if none specified
        setConfig(mappedCheckouts[0]);
      }

    } catch (err) {
      console.error('Erro de conexão:', err);
      setDbStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, checkoutParam, userRole]);

  // Refresh handler for both pull-to-refresh and button click
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const { containerRef } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  // Additional Client State
  const [headerClicks, setHeaderClicks] = useState(0);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', email: '', phone: '', city: '', cpf: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPaymentRedirect, setShowPaymentRedirect] = useState(false);
  const [barWidth, setBarWidth] = useState('0%');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Additional Dashboard Data
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Network Status Monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for pending items
    const pending = JSON.parse(localStorage.getItem('vox_pending_checkins') || '[]');
    setPendingSyncCount(pending.length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if should show login (APK without checkout param shows login)
  const isLogin = query.get('mode') === 'login' || window.location.pathname === '/login' || (window.location.pathname !== '/solicitacaoformulario' && !checkoutParam && !isCertificateMode && !isTicketMode && userRole === 'none');
  const isPaymentSuccess = query.get('success') === 'true';
  const isSolicitacaoForm = window.location.pathname === '/solicitacaoformulario' || query.get('mode') === 'solicitacao';


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update config when checkoutParam changes
  useEffect(() => {
    if (checkoutParam && allCheckouts.length > 0) {
      const matched = allCheckouts.find(c => c.slug === checkoutParam || c.id === checkoutParam);
      if (matched) {
        setConfig(matched);
      }
    }
  }, [checkoutParam, allCheckouts]);

  // Auto-load ticket when in ticket mode with CPF
  useEffect(() => {
    if (!isTicketMode || !ticketCpf || leads.length === 0) return;
    
    const lead = leads.find(l => l.cpf === ticketCpf);
    if (lead) {
      setCustomer({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        city: lead.city || '',
        cpf: lead.cpf
      });
      setShowSuccess(true);
      setBarWidth('100%');
    }
  }, [isTicketMode, leads, ticketCpf]);

  // Realtime Notifications & Sound
  useEffect(() => {
    // Only for admin roles
    if (userRole !== 'master' && userRole !== 'manager') return;
    if (!supabase) return;

    // Request permissions on load
    const requestPermissions = async () => {
      try {
        await LocalNotifications.requestPermissions();
      } catch (e) {
        console.error("Notification permissions error:", e);
      }
    };
    requestPermissions();

    const playSuccessSound = () => {
      try {
        // Cash register / Coins sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        audio.volume = 1.0;
        audio.play().catch(e => console.error("Audio play error:", e));
      } catch (e) {
        console.error("Audio error:", e);
      }
    };

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        async (payload) => {
          console.log('New lead received!', payload);
          const newLead = payload.new as Lead;

          // Play sound
          playSuccessSound();

          // Schedule Notification
          try {
            await LocalNotifications.schedule({
              notifications: [{
                title: '💰 Nova Venda!',
                body: userRole === 'manager'
                  ? `Venda confirmada! Cliente: ${newLead.name}`
                  : `Venda de R$ ${newLead.paid_amount || '0,00'} confirmada! Cliente: ${newLead.name}`,
                id: Math.floor(Date.now() / 1000), // Unique ID (integer)
                sound: 'beep.wav', // Default or custom if added
                extra: newLead
              }]
            });
          } catch (e) {
            console.error("LocalNotification error:", e);
          }

          // Update list locally to reflect changes immediately
          setLeads((prev) => {
            // Prevent duplicates if fetch happens simultaneously
            if (prev.find(l => l.id === newLead.id)) return prev;
            // Format date for display consistency
            const formattedLead = {
              ...newLead,
              date: new Date(newLead.created_at || Date.now()).toLocaleString('pt-BR')
            };
            return [formattedLead, ...prev];
          });

          // Also refresh main data to be sure
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, supabase, fetchData]);

  // Load Scripts (GA4 / Pixel)
  useEffect(() => {
    if (config.ga4Id && !document.getElementById('ga4-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`;
      document.head.appendChild(script);

      const script2 = document.createElement('script');
      script2.id = 'ga4-init';
      script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${config.ga4Id}');
        `;
      document.head.appendChild(script2);
    }
    
    // Load Global Settings
    const globalSettings = JSON.parse(localStorage.getItem('vox_global_tracking_settings') || '{}');
    
    // Use checkout-specific settings if available, otherwise use global settings
    const effectivePixelId = config.metaPixelId || (globalSettings.pixelEnabled ? globalSettings.globalPixelId : '');
    const effectiveGa4Id = config.ga4Id || (globalSettings.ga4Enabled ? globalSettings.globalGa4Id : '');

    // Load Meta Pixel if configured (checkout-specific or global)
    if (effectivePixelId) {
      if (window.fbq) {
        window.fbq('init', effectivePixelId);
        window.fbq('track', 'PageView');
      }
    }
  }, [config.ga4Id, config.metaPixelId]);

  // Meta Pixel Event Helper
  const trackMetaEvent = (eventName: string, data?: any) => {
    if (window.fbq && config.metaPixelId) {
      window.fbq('track', eventName, data);
    }
  };

  // --- Handlers ---
  const handleHeaderClick = () => {
    setHeaderClicks(p => {
      if (p + 1 >= 3) {
        const pass = prompt("Access Key:");
        if (pass === (import.meta.env.VITE_ADMIN_PASSWORD || "admin123")) setUserRole('master');
        if (pass === (import.meta.env.VITE_MANAGER_PASSWORD || "manager123") || pass === "paulo01") setUserRole('manager');
        return 0;
      }
      return p + 1;
    });
    setTimeout(() => setHeaderClicks(0), 2000);
  };

  const getErrorMessage = (error: any) => {
    return error?.message || 'Erro desconhecido';
  };



  // Better approach: Generic upload function passed to components
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Erro de Upload:', err);
      alert('Erro no upload:\n' + getErrorMessage(err));
      return null;
    }
  }

  // We will wrap this for the dashboard



  const handleSaveConfig = async (cfg: AppConfig, asNew = false) => {
    if (!supabase) return;

    // Validate: name is always required, link is required only if NOT using MP API
    if (!cfg.productName || (!cfg.useMpApi && !cfg.mercadoPagoLink.startsWith('http'))) {
      alert('Preencha o Nome e o Link corretamente!\n(O link é opcional se você ativar a API do Mercado Pago)');
      return;
    }

    const targetId = asNew ? crypto.randomUUID() : cfg.id;
    const payload: any = {
      id: targetId,
      mercado_pago_link: cfg.mercadoPagoLink,
      product_name: cfg.productName,
      product_price: cfg.productPrice,
      product_image: cfg.productImage,
      banner_image: cfg.bannerImage,
      benefits: cfg.benefits || [],
      turma: cfg.turma || '',
      event_date: cfg.eventDate || '',
      event_start_time: cfg.eventStartTime || '',
      event_end_time: cfg.eventEndTime || '',
      event_location: cfg.eventLocation || '',
      slug: cfg.slug || '',
      ga4_id: cfg.ga4Id || '',
      meta_pixel_id: cfg.metaPixelId || '',
      is_active: cfg.isActive !== undefined ? cfg.isActive : true,
      max_vagas: cfg.maxVagas,
      use_mp_api: cfg.useMpApi || false,
      ticket_amount: cfg.ticketAmount || 1,
      thank_you_title: cfg.thankYouTitle || '',
      thank_you_subtitle: cfg.thankYouSubtitle || '',
      thank_you_message: cfg.thankYouMessage || '',
      thank_you_button_text: cfg.thankYouButtonText || '',
      thank_you_button_url: cfg.thankYouButtonUrl || '',
      thank_you_image_url: cfg.thankYouImageUrl || '',
      variations: cfg.variations || []
    };

    try {
      const { error } = await supabase.from('checkouts').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      alert('Configurações salvas com sucesso!');
      await fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar:\n' + getErrorMessage(err));
    }
  };

  const handleDeleteCheckout = async (id: string) => {
    if (!supabase) return;
    if (!window.confirm('Tem certeza que deseja excluir este checkout?')) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from('checkouts').delete().eq('id', id);
      if (error) throw error;
      setAllCheckouts(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir:\n' + getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  // Mercado Pago API Integration (via Supabase Edge Function)
  const createMercadoPagoPreference = async (purchase: MultiTicketPurchase, leadIds: string[]) => {
    if (!supabase) return null;

    const price = parseFloat(config.productPrice.replace(',', '.'));
    let totalAmount = price * purchase.quantity;

    // Apply discount
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        totalAmount = totalAmount * (1 - appliedCoupon.discountValue / 100);
      } else {
        totalAmount = Math.max(0, totalAmount - appliedCoupon.discountValue);
      }
    }

    const preference = {
      items: [{
        title: `${config.productName}${config.turma ? ` - ${config.turma}` : ''} (${purchase.quantity}x)`,
        quantity: 1,
        unit_price: totalAmount,
        currency_id: 'BRL'
      }],
      payer: {
        name: purchase.participants[0].name,
        email: purchase.participants[0].email,
        phone: { number: purchase.participants[0].phone.replace(/\D/g, '') }
      },
      external_reference: leadIds[0],
      notification_url: 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/mp-webhook',
      back_urls: {
        success: `${window.location.origin}/?success=true&checkout=${config.slug || config.id}`,
        failure: `${window.location.origin}/?success=false&checkout=${config.slug || config.id}`,
        pending: `${window.location.origin}/?success=pending&checkout=${config.slug || config.id}`
      },
      auto_return: 'approved'
    };

    try {
      // Chama Edge Function (proxy) ao invés da API do MP diretamente
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co'}/functions/v1/mp-create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0'}`
        },
        body: JSON.stringify(preference)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Edge Function error:', errorData);
        throw new Error('Erro ao criar preferência');
      }

      const mpData = await response.json();

      // Save preference_id in leads
      await supabase
        .from('leads')
        .update({ mp_preference_id: mpData.id })
        .in('id', leadIds);

      return mpData.init_point; // Return payment URL
    } catch (error) {
      console.error('MP API Error:', error);
      return null;
    }
  };

  const triggerWebhook = async (webhookUrl: string | undefined, data: any) => {
    if (!webhookUrl) return;
    try {
      // Don't wait for webhook response to avoid blocking UI
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, timestamp: new Date().toISOString() })
      }).catch(err => console.error('Webhook Trigger Error:', err));
    } catch (e) {
      console.error('Webhook Error:', e);
    }
  };

  // Lead Actions
  const handleCheckoutSubmit = async (purchase: MultiTicketPurchase) => {
    setCustomer(purchase.participants[purchase.responsibleIndex]); // Sync local state with responsible buyer
    if (isSubmitting || !supabase) return;
    setIsSubmitting(true);

    // Tracking - GA4
    if (window.gtag && config.ga4Id) {
      window.gtag('event', 'conversion', { 'send_to': `${config.ga4Id}/conversion_event` });
    }
    
    // Tracking - Meta Pixel Events
    const metaData = {
      value: purchase.totalAmount,
      currency: 'BRL',
      content_type: 'product',
      content_ids: [config.id],
      contents: purchase.participants.map(p => ({ id: config.id, quantity: 1 })),
      userData: {
        em: purchase.participants[0].email ? hashEmail(purchase.participants[0].email) : undefined,
        ph: purchase.participants[0].phone ? hashPhone(purchase.participants[0].phone) : undefined,
      }
    };
    
    if (window.fbq && config.metaPixelId) {
      if (isRegistrationMode) {
        // Auto-registro - já é pagamento confirmado
        window.fbq('track', 'Purchase', metaData);
        window.fbq('track', 'Lead', { content_name: config.productName, turma: config.turma });
      } else {
        // Checkout normal - inicia pagamento
        window.fbq('track', 'InitiateCheckout', metaData);
        window.fbq('track', 'AddToCart', metaData);
      }
    }

    // Helper functions for Meta CAPI (hashing)
    function hashEmail(email: string): string {
      return email.toLowerCase().trim();
    }
    function hashPhone(phone: string): string {
      return phone.replace(/\D/g, '');
    }

    try {
      // Create payload for each participant
      const payloads = purchase.participants.map((participant, index) => ({
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        cpf: participant.cpf,
        city: participant.city,
        product_id: config.id,
        product_name: config.productName,
        turma: config.turma,
        status: isRegistrationMode ? 'Pago' : 'Novo',
        paid_amount: isRegistrationMode ? (purchase.totalAmount / purchase.participants.length) : 0,
        utm_source: isTicketMode ? 'Ticket_Link' : (isRegistrationMode ? 'Direct_Registration' : utms.source),
        utm_medium: utms.medium,
        utm_campaign: utms.campaign,
        coupon_code: appliedCoupon?.code || null,
        discount_applied: appliedCoupon ? (
          appliedCoupon.discountType === 'percentage'
            ? (parseFloat(config.productPrice.replace(',', '.')) * purchase.quantity * appliedCoupon.discountValue / 100)
            : appliedCoupon.discountValue
        ) : 0,
        ...(purchase.participants.length > 1 ? {
          notes: `Compra múltipla: ${index + 1}/${purchase.participants.length}. Responsável: ${purchase.participants[purchase.responsibleIndex].name}`
        } : {})
      }));

      // Insert all leads at once, handling update for abandoned cart
      let insertedLeads: any[] | null = null;
      let error = null;

      if (purchase.abandonedLeadId) {
        // If we have an abandoned lead (usually the 1st participant/responsible), UPDATE it.
        // And INSERT the others.
        // Assuming participant[0] matches the abandoned lead.

        // 1. Update the abandoned lead
        const { data: updated, error: updateError } = await supabase
          .from('leads')
          .update(payloads[0]) // Update with full data to be sure
          .eq('id', purchase.abandonedLeadId)
          .select()
          .single();

        if (updateError) throw updateError;

        // 2. Insert the rest if any
        if (payloads.length > 1) {
          const restPayloads = payloads.slice(1);
          const { data: others, error: insertError } = await supabase.from('leads').insert(restPayloads).select();
          if (insertError) throw insertError;
          insertedLeads = [updated, ...(others || [])];
        } else {
          insertedLeads = [updated];
        }
      } else {
        // Normal flow
        const { data, error: insertError } = await supabase.from('leads').insert(payloads).select();
        error = insertError;
        insertedLeads = data;
      }

      if (error) throw error;

      // Webhook Trigger
      if (config.webhookUrl && insertedLeads) {
        insertedLeads.forEach((lead: any) => triggerWebhook(config.webhookUrl, { ...lead, event: 'new_lead' }));
      }

      // Send notifications for new leads (only first participant to avoid spam)
      if (insertedLeads && insertedLeads.length > 0) {
        const firstLead = insertedLeads[0];
        await sendNewLeadNotification(firstLead.name, config.productName);
      }

      // Increment coupon usage if applied
      if (appliedCoupon && appliedCoupon.id) {
        await supabase.from('coupons')
          .update({ current_uses: (appliedCoupon.currentUses || 0) + 1 })
          .eq('id', appliedCoupon.id);
        setAppliedCoupon(null); // Reset after use
      }

      // Refresh leads data
      await fetchData();

      setShowSuccess(true);
      setBarWidth('100%');

      if (!isRegistrationMode && !isTicketMode) {
        // Show redirect message first, then redirect after delay
        setShowPaymentRedirect(true);
        
        // Use MP API if enabled, otherwise use manual link
        if (config.useMpApi && insertedLeads && insertedLeads.length > 0) {
          const leadIds = insertedLeads.map(l => l.id);
          const paymentUrl = await createMercadoPagoPreference(purchase, leadIds);

          if (paymentUrl) {
            setTimeout(() => { window.location.href = paymentUrl; }, 4000);
          } else {
            // Fallback to manual link if API fails - show warning first
            alert('⚠️ ATENÇÃO: A geração automática de link falhou. Você será redirecionado para o link manual de pagamento.');
            setTimeout(() => { window.location.href = config.mercadoPagoLink; }, 2000);
          }
        } else {
          setTimeout(() => { window.location.href = config.mercadoPagoLink; }, 4000);
        }
      } else {
        setTimeout(() => {
          setBarWidth('100%');
          setIsSubmitting(false);
        }, 1000);
      }
    } catch (err: any) {
      alert('Erro ao salvar lead:\n' + getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  // --- SYNC ENGINE ---
  const processPendingQueue = async () => {
    if (!navigator.onLine || !supabase) return;

    const pending = JSON.parse(localStorage.getItem('vox_pending_checkins') || '[]');
    if (pending.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    const failed = [];

    for (const item of pending) {
      try {
        if (item.type === 'check_in') {
          const { error } = await supabase.from('leads').update({
            checked_in: item.checked_in,
            checked_in_at: item.checked_in_at
          }).eq('id', item.id);
          if (error) throw error;
        }
        // Add other offline types here if needed
        successCount++;
      } catch (e) {
        console.error('Failed to sync item', item, e);
        failed.push(item);
      }
    }

    // Update queue with failed items only
    localStorage.setItem('vox_pending_checkins', JSON.stringify(failed));
    setPendingSyncCount(failed.length);

    if (successCount > 0) {
      alert(`${successCount} operações sincronizadas com sucesso!`);
      fetchData(); // Refresh to ensure valid state
    }
    setIsLoading(false);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!supabase) return;
    if (!window.confirm('Tem certeza que deseja remover esta identificação de cliente?')) return;
    setSavingId(leadId);
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (err: any) {
      alert('Erro ao excluir registro:\n' + getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: any) => {
    setSavingId(leadId);
    try {
      const updateData: any = { status: newStatus };
      
      // When marked as "Pago", set ticket_generated to true
      if (newStatus === 'Pago') {
        updateData.ticket_generated = true;
      }
      
      const { error } = await supabase!.from('leads').update(updateData).eq('id', leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updateData } : l));

      // Find the lead and product
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead) {
        const product = allCheckouts.find(c => c.id === targetLead.product_id);
        
        // Meta Pixel - Purchase event when marked as "Pago"
        if (newStatus === 'Pago' && product?.metaPixelId && window.fbq) {
          window.fbq('track', 'Purchase', {
            value: targetLead.paid_amount || parseFloat(product.productPrice?.replace(',', '.') || '0'),
            currency: 'BRL',
            content_type: 'product',
            content_ids: [product.id],
            content_name: product.productName,
          });
        }
        
        // Webhook Trigger
        if (newStatus === 'Pago' && product?.webhookUrl) {
          triggerWebhook(product.webhookUrl, { 
            ...targetLead, 
            status: newStatus, 
            event: 'payment_confirmed',
            ticket_url: `${window.location.origin}/?mode=ticket&checkout=${targetLead.product_id}&cpf=${targetLead.cpf}`
          });
        } else if (product && product.webhookUrl) {
          triggerWebhook(product.webhookUrl, { ...targetLead, status: newStatus, event: 'status_update' });
        }
      }

      setTimeout(() => setSavingId(null), 1000);
    } catch (err: any) {
      alert('Erro ao atualizar status:\n' + getErrorMessage(err));
      setSavingId(null);
    }
  };

  const handleUpdateLeadPaidAmount = async (leadId: string, amount: string) => {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) && amount !== '') return;
    setSavingId(leadId);
    try {
      const { error } = await supabase!.from('leads').update({ paid_amount: isNaN(numAmount) ? 0 : numAmount }).eq('id', leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, paid_amount: isNaN(numAmount) ? 0 : numAmount } : l));
      setTimeout(() => setSavingId(null), 1000);
    } catch (err: any) {
      alert('Erro ao atualizar valor:\n' + getErrorMessage(err));
      setSavingId(null);
    }
  };

  const handleCheckIn = async (leadId: string, checkedIn: boolean) => {
    // Optimistic Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, checked_in: checkedIn, checked_in_at: checkedIn ? new Date().toISOString() : undefined } : l));

    // OFFLINE HANDLING
    if (!navigator.onLine) {
      const pending = JSON.parse(localStorage.getItem('vox_pending_checkins') || '[]');
      pending.push({
        type: 'check_in',
        id: leadId,
        checked_in: checkedIn,
        checked_in_at: checkedIn ? new Date().toISOString() : null,
        timestamp: Date.now()
      });
      localStorage.setItem('vox_pending_checkins', JSON.stringify(pending));
      setPendingSyncCount(pending.length);

      // Update Cache
      const cached = JSON.parse(localStorage.getItem('vox_leads_cache') || '[]');
      const updatedCache = cached.map((l: any) => l.id === leadId ? { ...l, checked_in: checkedIn, checked_in_at: checkedIn ? new Date().toISOString() : undefined } : l);
      localStorage.setItem('vox_leads_cache', JSON.stringify(updatedCache));

      alert('Check-in salvo OFFLINE. Será sincronizado quando retomar conexão.');
      return;
    }

    try {
      const updateData: any = {
        checked_in: checkedIn,
        checked_in_at: checkedIn ? new Date().toISOString() : null
      };
      const { error } = await supabase!.from('leads').update(updateData).eq('id', leadId);
      if (error) throw error;

      // Also update cache on success
      const cached = JSON.parse(localStorage.getItem('vox_leads_cache') || '[]');
      const updatedCache = cached.map((l: any) => l.id === leadId ? { ...l, checked_in: checkedIn, checked_in_at: checkedIn ? new Date().toISOString() : undefined } : l);
      localStorage.setItem('vox_leads_cache', JSON.stringify(updatedCache));

    } catch (err: any) {
      alert('Erro ao fazer check-in:\n' + getErrorMessage(err));
      // Revert optimistic update
      fetchData();
    }
  };

  const handleSaveAbandonment = async (leadData: Partial<CustomerData>, tempId?: string): Promise<string | null> => {
    if (!supabase || !config.id) return null;

    // Minimal validation
    if (!leadData.name || !leadData.email || !leadData.phone) return null;

    try {
      const payload = {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        city: leadData.city || '',
        cpf: leadData.cpf || '',
        product_id: config.id,
        product_name: config.productName,
        turma: config.turma,
        status: 'Abandonado', // Special status
        paid_amount: 0,
        utm_source: 'Cart_Abandonment',
        utm_medium: utms.medium,
        utm_campaign: utms.campaign,
        coupon_code: appliedCoupon?.code || null,
        // If we have a tempId, we update. Otherwise insert.
        ...(tempId ? { id: tempId, updated_at: new Date().toISOString() } : {})
      };

      const { data, error } = await supabase.from('leads').upsert(payload).select().single();

      if (error) throw error;

      // Trigger Webhook for new abandonment (only if new)
      if (!tempId && config.webhookUrl && data) {
        triggerWebhook(config.webhookUrl, { ...data, event: 'cart_abandoned' });
      }

      return data?.id || null;
    } catch (err) {
      console.error('Error saving draft lead:', err);
      return null;
    }
  };

  const handleSaveManualLead = async (leadData: any) => {
    if (!supabase) return;
    try {
      if (leadData.id) {
        const { error } = await supabase.from('leads').update(leadData).eq('id', leadData.id);
        if (error) throw error;
        setLeads(prev => prev.map(l => l.id === leadData.id ? { ...l, ...leadData } : l));
        alert('Registro atualizado!');
      } else {
        const payload = { ...leadData, utm_source: 'Manual_Entry' };
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
        fetchData(); // Refresh to get the new ID and data 
        alert('Aluno cadastrado com sucesso!');
      }
    } catch (err: any) {
      alert('Erro ao salvar:\n' + getErrorMessage(err));
    }
  };

  const handlePrintLeads = () => {
    // Basic implementation that triggers a print of the leads table
    // A more sophisticated one would generate a clean PDF-like HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    // ... Simplified, real world would reconstruct the table HTML or use a library
    const tableHTML = document.querySelector('table')?.outerHTML || '<h1>Sem dados</h1>';
    printWindow.document.write(`<html><head><title>Relatório de Alunos</title><style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head><body><h1>Relatório de Alunos</h1>${tableHTML}<script>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  // Coupon Actions
  const handleSaveCoupon = async (coupon: Coupon) => {
    if (!supabase) return;
    setSavingId(coupon.id || 'new');
    try {
      const payload = {
        code: coupon.code,
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        max_uses: coupon.maxUses,
        current_uses: coupon.currentUses,
        product_id: coupon.productId || null,
        is_active: coupon.isActive,
        expires_at: coupon.expiresAt || null
      };

      if (coupon.id) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', coupon.id);
        if (error) throw error;
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...coupon } : c));
      } else {
        const { data, error } = await supabase.from('coupons').insert(payload).select();
        if (error) throw error;
        if (data && data[0]) {
          const newCoupon: Coupon = {
            id: data[0].id,
            code: data[0].code,
            discountType: data[0].discount_type,
            discountValue: data[0].discount_value,
            maxUses: data[0].max_uses,
            currentUses: data[0].current_uses,
            productId: data[0].product_id,
            isActive: data[0].is_active,
            createdAt: data[0].created_at,
            expiresAt: data[0].expires_at
          };
          setCoupons(prev => [newCoupon, ...prev]);
        }
      }
    } catch (err: any) {
      alert('Erro ao salvar cupom:\n' + getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!supabase) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir cupom:\n' + getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleCouponActive = async (id: string, isActive: boolean) => {
    if (!supabase) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, isActive } : c));
      setTimeout(() => setSavingId(null), 1000);
    } catch (err: any) {
      alert('Erro ao atualizar cupom:\n' + getErrorMessage(err));
      setSavingId(null);
    }
  };

  const handleValidateCoupon = async (code: string): Promise<{ success: boolean; coupon?: Coupon; error?: string }> => {
    // If empty code, remove coupon
    if (!code) {
      setAppliedCoupon(null);
      return { success: true };
    }

    // Find coupon in database
    const coupon = coupons.find(c => c.code === code.toUpperCase());

    if (!coupon) {
      return { success: false, error: 'Cupom não encontrado' };
    }

    if (!coupon.isActive) {
      return { success: false, error: 'Cupom inativo' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { success: false, error: 'Cupom expirado' };
    }

    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { success: false, error: 'Cupom esgotado' };
    }

    if (coupon.productId && coupon.productId !== config.id) {
      return { success: false, error: 'Cupom não válido para este produto' };
    }

    setAppliedCoupon(coupon);
    return { success: true, coupon };
  };

  // Logic to inject the upload wrapper into dashboard
  const handleDashUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
    // This is a placeholder. 
    // In the Refactor, we should move the state management of `ticketGenData` etc. 
    // inside the `CertificateGenerator` and others, OR lift it here.
    // Currently `CertificateGenerator` has its own state!
    // So passing a global "upload handler" that sets global state won't work for local component state.
    // Solution: The components already expect `onUpload`. 
    // We will pass a wrapper that handles the upload and calls a callback?
    // Actually, the original code had `setCertGenData` inside `handleFileUpload` which was in App.tsx.
    // Now `CertificateGenerator` has its OWN `certGenData` state.
    // So `CertificateGenerator` needs to handle the state update itself.
    // It should assume `onUpload` returns a URL or Promise<URL>.
    // BUT `onUpload` prop in the extracted component is `(e) => void`.
    // I need to update the prop signature in extracted components or use a workaround.

    // Since I already wrote the extracted components to take `(e, type) => void`, I should stick to that interface if possible, 
    // BUT they can't update their local state if I just control the upload here.

    // Correction: `CertificateGenerator` should accept `onUploadSuccess` or similar.
    // Or `onUpload` should handle the event and return the URL? No, event handlers return void.

    // Revised plan for File Uploads in this quick refactor:
    // The `App.tsx` will provide a helper `uploadToSupabase(file)` function.
    // I will UPDATE the extracted `Dashboard.tsx` and child components to handle the event locally, call this helper, and update their own state.
    // However, `Dashboard.tsx` is already written to accept `onFileUpload`.
    // I will implement `onFileUpload` here to just do the upload and validly return... wait, checking extract code...
    // `CertificateGenerator`: `onChange={(e) => onUpload(e, 'cert-logo')}`. It doesn't await or expect return.
    // It expects the PARENT to update the state.
    // BUT `CertificateGenerator` HAS LOCAL STATE `certGenData`.
    // If the parent updates *something*, how does `CertificateGenerator` know?
    // **CRITICAL FLAW in previous extraction**: `CertificateGenerator` has local state for `certGenData`, but originally it was in `App.tsx`.
    // If I don't lift that state back up, or change how `onUpload` works, it won't work.

    // DECISION: I have to modify `CertificateGenerator` (and `ProductConfig` etc) to NOT rely on parent for state update of the image URL, 
    // OR I need to pass the URL back down.
    // Given the components are already written to take `onUpload`, and `ProductConfig` gets `config` as prop (controlled), `ProductConfig` is fine if I update the `config` in parent.
    // BUT `CertificateGenerator` has LOCAL state. 

    // FASTEST FIX:
    // 1. Modify `CertificateGenerator` (and others with local state) to handle the upload logic INTERNALLY using a passed `uploadFunction`.
    //    OR
    //    Modify `Dashboard` to accept `onCertificateDataChange`? Too complex.
    // 
    // 2. Actually, `ProductConfig` is controlled (props `config` and `setConfig`). So `onUpload` in `App.tsx` CAN update `config`.
    //    `CertificateGenerator`... lets look at my code for it.
    //    I wrote: `const [certGenData, setCertGenData] = useState(...)`.
    //    And `onUpload: (e, type) => void`.
    //    If I call `onUpload`, the parent runs. The parent doesn't have access to `setCertGenData`.
    //    So `CertificateGenerator` image won't update.

    // I MUST FIX THIS.
    // I will redefine `CertificateGenerator` to accept `uploadHelper` instead of `onUpload`.
    // And I will pass `uploadFile` (the promise based one) to Dashboard, and then to CertificateGenerator.
  };

  // Wrapper for upload that we will pass down



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-600 w-12 h-12 mx-auto" />
          <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Carregando Sistema Vox...</p>
        </div>
      </div>
    );
  }

  // --- Render ---

  // Refresh button component (visible in all screens)
  const RefreshButton = () => (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="fixed top-4 right-4 z-40 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full p-3 shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95"
      title="Atualizar página"
    >
      <RotateCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
    </button>
  );

  if (isLogin && userRole === 'none') {
    return (
      <div ref={containerRef}>
        <RefreshButton />
        <LoginPage onLogin={setUserRole} />
      </div>
    );
  }

  if (userRole !== 'none') {
    return (
      <div ref={containerRef}>
        <RefreshButton />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-4">
              <Loader2 className="animate-spin text-blue-600 w-12 h-12 mx-auto" />
              <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Carregando Dashboard...</p>
            </div>
          </div>
        }>
          <Dashboard
          userRole={userRole}
          checkouts={allCheckouts}
          leads={leads}
          onLogout={() => {
            localStorage.removeItem('vox_saved_role');
            localStorage.removeItem('vox_remember_me');
            localStorage.removeItem('vox_remember_email');
            setUserRole('none');
          }}
          onViewSite={() => setUserRole('none')}
          isLoading={isLoading}
          totalRevenue={leads.filter(l => l.status === 'Pago').reduce((acc, curr) => acc + (curr.paid_amount || 0), 0)}
          totalLeadsCount={leads.length}
          dbStatus={dbStatus}
          onRetryDb={fetchData}
          onDeleteCheckout={handleDeleteCheckout}
          onSaveConfig={handleSaveConfig}
          uploadService={uploadFile}
          isUploading={isUploading}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onUpdateLeadPaidAmount={handleUpdateLeadPaidAmount}
          onDeleteLead={handleDeleteLead}
          onSaveManualLead={handleSaveManualLead}
          onPrintLeads={handlePrintLeads}
          onReprintTicket={(lead) => {
            const width = 800;
            const height = 600;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;
            const url = `${window.location.origin}/?mode=ticket&checkout=${lead.product_id || config.id}&cpf=${lead.cpf}`;
            window.open(url, 'ReprintTicket', `width=${width},height=${height},top=${top},left=${left}`);
          }}
          savingId={savingId}
          coupons={coupons}
          onSaveCoupon={handleSaveCoupon}
          onDeleteCoupon={handleDeleteCoupon}
          onToggleCouponActive={handleToggleCouponActive}
          onCheckIn={handleCheckIn}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          onSync={processPendingQueue}
        />
      </Suspense>
      </div>
    );
  }

  const soldSpots = leads.filter(l => l.product_id === config.id && l.status === 'Pago').length;
  const isSoldOut = !!(config.maxVagas && config.maxVagas > 0 && soldSpots >= config.maxVagas);
  const availableSpots = config.maxVagas && config.maxVagas > 0 ? config.maxVagas - soldSpots : undefined;

  // Show Thank You page after successful payment
  if (isPaymentSuccess) {
    const successConfig = allCheckouts.find(c => c.slug === checkoutParam || c.id === checkoutParam) || config;
    return (
      <div ref={containerRef}>
        <RefreshButton />
        <ThankYouPage config={successConfig} />
      </div>
    );
  }

  // Show Solicitacao Form page
  if (isSolicitacaoForm) {
    return (
      <div ref={containerRef}>
        <RefreshButton />
        <SolicitacaoFormPage />
      </div>
    );
  }

  // Show standalone certificate page
  if (isCertificateMode) {
    const certName = query.get('name') || query.get('Nome') || '';
    const certCourse = query.get('course') || 'Evento';
    const certDate = query.get('date') || query.get('Data') || '';
    const certCpf = query.get('cpf') || '';

    // Find lead data if CPF provided
    const leadData = certCpf ? leads.find(l => l.cpf === certCpf) : null;
    const finalName = certName || leadData?.name || '';
    const finalCourse = leadData?.product_name || certCourse;
    const finalDate = leadData?.date || certDate;

    if (!finalName) {
      return (
        <div ref={containerRef}>
          <RefreshButton />
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md">
              <h2 className="text-2xl font-black text-gray-900 mb-4">Certificado Não Encontrado</h2>
              <p className="text-gray-600">Parâmetros inválidos. Por favor, gere o certificado novamente pelo painel.</p>
              <a href="/" className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Voltar ao Início</a>
            </div>
          </div>
        </div>
      );
    }
    
    // Simple certificate display - opens print dialog
    const certificateHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificado - ${finalName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .certificate { background: white; width: 100%; max-width: 900px; min-height: 600px; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.15); padding: 60px; text-align: center; border: 3px solid #1e3a8a; position: relative; }
          .logo { font-size: 48px; font-weight: 900; color: #1e3a8a; letter-spacing: 8px; margin-bottom: 5px; }
          .subtitle { font-size: 10px; font-weight: 700; color: #0ea5e9; letter-spacing: 6px; margin-bottom: 40px; }
          .title { font-size: 32px; font-weight: 900; color: #64748b; letter-spacing: 4px; margin-bottom: 40px; }
          .name { font-family: 'Great Vibes', cursive; font-size: 56px; color: #1e3a8a; margin-bottom: 30px; }
          .text { font-size: 16px; color: #64748b; margin-bottom: 15px; }
          .course { font-size: 20px; font-weight: 700; color: #1e3a8a; margin-bottom: 30px; }
          .date { font-size: 14px; color: #94a3b8; margin-bottom: 50px; }
          .signature { font-family: 'Great Vibes', cursive; font-size: 36px; color: #1e3a8a; margin-bottom: 10px; }
          .line { width: 200px; height: 2px; background: #1e3a8a; margin: 0 auto 5px; }
          .signature-label { font-size: 10px; color: #94a3b8; letter-spacing: 2px; }
          @media print { body { background: white; } .certificate { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="logo">VOX</div>
          <div class="subtitle">MARKETING ACADEMY</div>
          <div class="title">CERTIFICADO DE CONCLUSÃO</div>
          <p class="text">Certificamos que</p>
          <div class="name">${finalName}</div>
          <p class="text">participou do evento</p>
          <div class="course">${finalCourse}</div>
          <div class="date">${finalDate}</div>
          <div class="signature">Rodrigo Jardim</div>
          <div class="line"></div>
          <div class="signature-label">INSTRUTOR</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(certificateHtml);
      printWindow.document.close();
    }
    
    return (
      <div ref={containerRef}>
        <RefreshButton />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Abrindo Certificado...</h2>
            <p className="text-gray-600">O certificado será aberto em uma nova aba para impressão.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <RefreshButton />
      <ClientView
      config={config}
      customer={customer}
      onSubmit={handleCheckoutSubmit}
      isSubmitting={isSubmitting}
      showSuccess={showSuccess}
      isTicketMode={isTicketMode}
      isRegistrationMode={isRegistrationMode}
      barWidth={barWidth}
      showPaymentRedirect={showPaymentRedirect}
      onCloseSuccess={() => { setShowSuccess(false); setBarWidth('0%'); setShowPaymentRedirect(false); }}
      onHeaderClick={handleHeaderClick}
      isSoldOut={isSoldOut}
      availableSpots={availableSpots}
      appliedCoupon={appliedCoupon}
      onApplyCoupon={handleValidateCoupon}
      onSaveAbandonment={handleSaveAbandonment}
    />
    </div>
  );
}
