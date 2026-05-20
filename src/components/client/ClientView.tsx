import React, { useEffect, useRef } from 'react';
import { Check, GraduationCap, Loader2 } from 'lucide-react';
import { AppConfig, CustomerData, MultiTicketPurchase, Coupon } from '../../types';
import { CheckoutForm } from './CheckoutForm';
import { RegistrationSuccess } from './RegistrationSuccess';
import { useSupabase } from '../../hooks/useSupabase';

interface ClientViewProps {
    config: AppConfig;
    customer: CustomerData;
    onSubmit: (purchase: MultiTicketPurchase) => Promise<void>;
    isSubmitting: boolean;
    showSuccess: boolean;
    showPaymentRedirect?: boolean;
    isTicketMode: boolean;
    isRegistrationMode: boolean;
    barWidth: string;
    onCloseSuccess: () => void;
    onHeaderClick: () => void;
    isSoldOut?: boolean;
    availableSpots?: number;
    appliedCoupon?: Coupon | null;
    onApplyCoupon?: (code: string) => Promise<{ success: boolean; coupon?: Coupon; error?: string }>;
    onSaveAbandonment?: (leadData: Partial<CustomerData>, tempId?: string) => Promise<string | null>;
}

export const ClientView: React.FC<ClientViewProps> = ({
    config,
    customer,
    onSubmit,
    isSubmitting,
    showSuccess,
    showPaymentRedirect,
    isTicketMode,
    isRegistrationMode,
    barWidth,
    onCloseSuccess,
    onHeaderClick,
    isSoldOut,
    availableSpots,
    appliedCoupon,
    onApplyCoupon,
    onSaveAbandonment
}) => {
    const supabase = useSupabase();
    const hasTrackedView = useRef(false);

    const effectiveConfig = React.useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const variantId = params.get('variant');
        const checkoutSlug = params.get('p') || params.get('checkout') || params.get('slug') || '';

        if (config.variations && config.variations.length > 0) {
            const selectedVariation = config.variations.find(v =>
                (!!variantId && v.id === variantId) ||
                (!!checkoutSlug && v.slug === checkoutSlug)
            );

            if (selectedVariation) {
                return {
                    ...config,
                    productName: selectedVariation.name
                        ? `${config.productName} - ${selectedVariation.name}`
                        : config.productName,
                    productPrice: selectedVariation.price,
                    ticketAmount: selectedVariation.ticketAmount || config.ticketAmount || 1,
                    mercadoPagoLink: selectedVariation.mercadoPagoLink || config.mercadoPagoLink,
                    useMpApi: selectedVariation.useMpApi !== undefined ? selectedVariation.useMpApi : config.useMpApi,
                    slug: selectedVariation.slug || config.slug,
                    _selectedVariationName: selectedVariation.name
                } as AppConfig & { _selectedVariationName?: string };
            }
        }

        return config;
    }, [config]);

    const handleSubmitWithVariation = async (purchase: MultiTicketPurchase) => {
        const purchaseWithConfig = {
            ...purchase,
            checkoutConfig: effectiveConfig
        } as MultiTicketPurchase & { checkoutConfig: AppConfig };

        sessionStorage.setItem('vox_effective_checkout_config', JSON.stringify({
            id: effectiveConfig.id,
            productName: effectiveConfig.productName,
            productPrice: effectiveConfig.productPrice,
            mercadoPagoLink: effectiveConfig.mercadoPagoLink,
            useMpApi: effectiveConfig.useMpApi,
            slug: effectiveConfig.slug,
            turma: effectiveConfig.turma
        }));

        await onSubmit(purchaseWithConfig);

        const isManualVariationPayment =
            !isTicketMode &&
            !isRegistrationMode &&
            !effectiveConfig.useMpApi &&
            !!effectiveConfig.mercadoPagoLink &&
            effectiveConfig.mercadoPagoLink !== config.mercadoPagoLink;

        if (isManualVariationPayment) {
            setTimeout(() => {
                window.location.href = effectiveConfig.mercadoPagoLink;
            }, 800);
        }
    };

    useEffect(() => {
        if (hasTrackedView.current || !supabase || !effectiveConfig.id) return;

        const trackingKey = `vox_checkout_view_tracked_${effectiveConfig.id}_${effectiveConfig.slug || 'main'}`;
        if (sessionStorage.getItem(trackingKey) === 'true') {
            hasTrackedView.current = true;
            return;
        }

        hasTrackedView.current = true;
        sessionStorage.setItem(trackingKey, 'true');

        const trackView = async () => {
            try {
                const query = new URLSearchParams(window.location.search);
                await supabase.from('checkout_views').insert({
                    checkout_id: effectiveConfig.id,
                    checkout_slug: effectiveConfig.slug,
                    utm_source: query.get('utm_source') || 'direct',
                    utm_medium: query.get('utm_medium') || 'cpc',
                    utm_campaign: query.get('utm_campaign') || 'general',
                    referrer: document.referrer || null,
                    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                });
            } catch (err) {
                sessionStorage.removeItem(trackingKey);
                console.error('Error tracking view:', err);
            }
        };

        trackView();

        if (window.fbq && effectiveConfig.metaPixelId) {
            window.fbq('track', 'ViewContent', {
                content_type: 'product',
                content_ids: [effectiveConfig.id],
                content_name: effectiveConfig.productName,
                value: parseFloat(effectiveConfig.productPrice?.replace(',', '.') || '0'),
                currency: 'BRL',
            });
        }
    }, [effectiveConfig, supabase]);

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-start lg:justify-center py-4 sm:py-8 lg:py-12 px-3 sm:px-6 overflow-x-hidden">
            {showSuccess && (
                <RegistrationSuccess
                    customer={customer}
                    config={effectiveConfig}
                    isTicketMode={isTicketMode}
                    isRegistrationMode={isRegistrationMode}
                    barWidth={barWidth}
                    onClose={onCloseSuccess}
                />
            )}

            {showPaymentRedirect && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl max-w-lg w-full text-center animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6">
                            <Loader2 className="text-amber-600 w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-3 sm:mb-4 leading-tight">Redirecionando para o Mercado Pago</h2>
                        <p className="text-sm sm:text-base text-gray-600 font-medium mb-5 sm:mb-6 leading-relaxed">
                            Você será redirecionado em alguns segundos para finalizar o pagamento.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 sm:mb-6">
                            <p className="text-sm text-amber-800 font-bold leading-relaxed">
                                <span className="block mb-1">⚠️ Importante:</span>
                                A sua inscrição <span className="underline">NÃO</span> é válida como matrícula.
                                A matrícula só será confirmada após a aprovação do pagamento.
                            </p>
                        </div>
                        <p className="text-xs text-gray-500">
                            Caso não seja redirecionado, clique no botão abaixo:
                        </p>
                        <a
                            href={effectiveConfig.mercadoPagoLink || '#'}
                            className="inline-block mt-4 bg-green-600 text-white px-6 sm:px-8 py-4 rounded-2xl font-black text-sm uppercase hover:bg-green-700 transition-all"
                        >
                            Ir para o Mercado Pago
                        </a>
                    </div>
                </div>
            )}

            {/* Inner wrapper: groups card + form and caps total width */}
            <div className="w-full max-w-5xl flex flex-col lg:flex-row lg:items-start gap-5 sm:gap-6 lg:gap-8">

                {/* Left product card */}
                <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0 animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="bg-white p-8 xl:p-10 rounded-[3rem] shadow-2xl border border-gray-100 sticky top-8">
                        <div className="relative group">
                            <img src={effectiveConfig.productImage} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800'; }} className="w-full aspect-square object-cover rounded-[2rem] mb-8 shadow-xl shadow-blue-200/40 group-hover:scale-[1.02] transition-transform duration-500" alt="Produto" />
                        </div>
                        <div className="mb-5">
                            {effectiveConfig.turma && <span className="bg-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-gray-500 flex w-fit items-center gap-2 mb-3"><GraduationCap size={13} className="text-blue-500" /> {effectiveConfig.turma}</span>}
                            <h2 className="text-2xl xl:text-3xl font-black text-gray-900 leading-tight tracking-tight">{effectiveConfig.productName}</h2>
                        </div>
                        <div className="p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100 mb-7 text-center">
                            <span className="text-4xl xl:text-5xl font-black text-blue-600 tracking-tighter">R$ {effectiveConfig.productPrice}</span>
                        </div>
                        <div className="space-y-3">
                            {(effectiveConfig.benefits || []).filter(b => b.trim() !== '').map((benefit, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                    <span className="text-gray-600 font-bold text-sm tracking-tight leading-snug">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: checkout form */}
                <div className="flex-1 min-w-0">
                    <CheckoutForm
                        config={effectiveConfig}
                        onSubmit={handleSubmitWithVariation}
                        isSubmitting={isSubmitting}
                        isTicketMode={isTicketMode}
                        isRegistrationMode={isRegistrationMode}
                        onClickHeader={onHeaderClick}
                        isSoldOut={isSoldOut}
                        availableSpots={availableSpots}
                        appliedCoupon={appliedCoupon}
                        onApplyCoupon={onApplyCoupon}
                        onSaveAbandonment={onSaveAbandonment}
                    />
                </div>

            </div>
        </div>
    );
};
