
import React, { useEffect, useRef } from 'react';
import { Check, GraduationCap, Loader2 } from 'lucide-react';
import { AppConfig, CustomerData, MultiTicketPurchase, Coupon } from '../../shared';
import { CheckoutForm } from './CheckoutForm';
import { RegistrationSuccess } from './RegistrationSuccess';
import { useSupabase } from '../../services/useSupabase';

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

    useEffect(() => {
        // Track checkout view
        if (hasTrackedView.current || !supabase || !config.id) return;
        hasTrackedView.current = true;

        const trackView = async () => {
            try {
                const query = new URLSearchParams(window.location.search);
                await supabase.from('checkout_views').insert({
                    checkout_id: config.id,
                    checkout_slug: config.slug,
                    utm_source: query.get('utm_source') || 'direct',
                    utm_medium: query.get('utm_medium') || 'cpc',
                    utm_campaign: query.get('utm_campaign') || 'general',
                    referrer: document.referrer || null,
                    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
                });
            } catch (err) {
                console.error('Error tracking view:', err);
            }
        };

        trackView();

        // Meta Pixel - ViewContent event
        if (window.fbq && config.metaPixelId) {
            window.fbq('track', 'ViewContent', {
                content_type: 'product',
                content_ids: [config.id],
                content_name: config.productName,
                value: parseFloat(config.productPrice?.replace(',', '.') || '0'),
                currency: 'BRL',
            });
        }
    }, [config]);
    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 gap-10 lg:gap-20 py-16">
            {showSuccess && (
                <RegistrationSuccess
                    customer={customer}
                    config={config}
                    isTicketMode={isTicketMode}
                    isRegistrationMode={isRegistrationMode}
                    barWidth={barWidth}
                    onClose={onCloseSuccess}
                />
            )}

            {/* Payment Redirect Warning Overlay */}
            {showPaymentRedirect && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl max-w-lg w-full text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="text-amber-600 w-10 h-10 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">Redirecionando para o Mercado Pago</h2>
                        <p className="text-gray-600 font-medium mb-6">
                            Você será redirecionado em alguns segundos para finalizar o pagamento.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                            <p className="text-sm text-amber-800 font-bold">
                                <span className="block mb-1">⚠️ Importante:</span>
                                A sua inscrição <span className="underline">NÃO</span> é válida como matrícula. 
                                A matrícula só será confirmada após a aprovação do pagamento.
                            </p>
                        </div>
                        <p className="text-xs text-gray-500">
                            Caso não seja redirecionado, clique no botão abaixo:
                        </p>
                        <a 
                            href={config.mercadoPagoLink || '#'}
                            className="inline-block mt-4 bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase hover:bg-green-700 transition-all"
                        >
                            Ir para o Mercado Pago
                        </a>
                    </div>
                </div>
            )}

            {/* Left Column - Product Info */}
            <div className="hidden lg:block max-w-md w-full animate-in fade-in slide-in-from-left-8 duration-700">
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100">
                    <div className="relative group">
                        <img src={config.productImage} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800'; }} className="w-full aspect-square object-cover rounded-[3rem] mb-10 shadow-2xl shadow-blue-200/40 group-hover:scale-[1.02] transition-transform duration-500" alt="Produto" />
                    </div>
                    <div className="mb-6">
                        {config.turma && <span className="bg-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-gray-500 flex w-fit items-center gap-2 mb-4"><GraduationCap size={14} className="text-blue-500" /> {config.turma}</span>}
                        <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">{config.productName}</h2>
                    </div>
                    <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 mb-10 text-center">
                        <span className="text-5xl font-black text-blue-600 tracking-tighter">R$ {config.productPrice}</span>
                    </div>
                    <div className="space-y-4">
                        {(config.benefits || []).filter(b => b.trim() !== '').map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                                <span className="text-gray-600 font-bold text-sm tracking-tight leading-snug">{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <CheckoutForm
                config={config}
                onSubmit={onSubmit}
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
    );
};
