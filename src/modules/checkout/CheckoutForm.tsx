import React, { useState, useEffect } from 'react';
import { Loader2, BadgeCheck, ShoppingCart, Clock, Users, ChevronRight, ChevronLeft, Tag, X, Check } from 'lucide-react';
import { Input } from '../../shared/components/Input';
import { AppConfig, CustomerData, MultiTicketPurchase, Coupon } from '../../shared';

interface CheckoutFormProps {
    config: AppConfig;
    onSubmit: (purchase: MultiTicketPurchase) => Promise<void>;
    isSubmitting: boolean;
    isTicketMode: boolean;
    isRegistrationMode: boolean;
    onClickHeader: () => void;
    isSoldOut?: boolean;
    availableSpots?: number;
    appliedCoupon?: Coupon | null;
    onApplyCoupon?: (code: string) => Promise<{ success: boolean; coupon?: Coupon; error?: string }>;
    onSaveAbandonment?: (leadData: Partial<CustomerData>, tempId?: string) => Promise<string | null>;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
    config,
    onSubmit,
    isSubmitting,
    isTicketMode,
    isRegistrationMode,
    onClickHeader,
    isSoldOut,
    availableSpots,
    appliedCoupon,
    onApplyCoupon,
    onSaveAbandonment
}) => {
    const [quantity, setQuantity] = useState(1);
    const [currentParticipant, setCurrentParticipant] = useState(0);
    const [participants, setParticipants] = useState<CustomerData[]>([{
        name: '',
        email: '',
        phone: '',
        city: '',
        cpf: ''
    }]);
    const [tempLeadId, setTempLeadId] = useState<string | undefined>(undefined);
    const [couponCode, setCouponCode] = useState('');
    const [showCouponSection, setShowCouponSection] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Calculate total participants based on bundles
    const ticketAmount = config.ticketAmount || 1;
    const totalParticipants = quantity * ticketAmount;

    // Auto-save logic for Cart Recovery
    useEffect(() => {
        const p0 = participants[0];
        // Only auto-save if we have the basics for the main buyer
        if (!p0.name || !p0.email || !p0.phone || !onSaveAbandonment) return;

        const timer = setTimeout(async () => {
            // Check again inside timeout
            if (!p0.name || !p0.email || !p0.phone) return;
            const id = await onSaveAbandonment(p0, tempLeadId);
            if (id) setTempLeadId(id);
        }, 1500); // 1.5s debounce to avoid too many requests

        return () => clearTimeout(timer);
    }, [participants[0].name, participants[0].email, participants[0].phone, onSaveAbandonment]); // Intentionally not including tempLeadId in dependency to avoid loop, though it should be fine if logic is correct. Actually better to simple dependency.

    // Update participants array when quantity changes
    useEffect(() => {
        const newParticipants = [...participants];
        if (totalParticipants > participants.length) {
            // Add new empty participants
            for (let i = participants.length; i < totalParticipants; i++) {
                newParticipants.push({ name: '', email: '', phone: '', city: '', cpf: '' });
            }
        } else if (totalParticipants < participants.length) {
            // Remove excess participants
            newParticipants.splice(totalParticipants);
        }
        setParticipants(newParticipants);
        // Reset to first participant if current is out of bounds
        if (currentParticipant >= totalParticipants) {
            setCurrentParticipant(totalParticipants - 1);
        }
    }, [totalParticipants]);

    const updateParticipant = (index: number, field: keyof CustomerData, value: string) => {
        const updated = [...participants];
        updated[index] = { ...updated[index], [field]: value };
        setParticipants(updated);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !onApplyCoupon) return;
        setIsApplyingCoupon(true);
        setCouponError('');
        try {
            const result = await onApplyCoupon(couponCode.trim().toUpperCase());
            if (result.success) {
                setCouponCode('');
            } else {
                setCouponError(result.error || 'Cupom inválido');
            }
        } catch (error) {
            setCouponError('Erro ao aplicar cupom');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!termsAccepted) {
            alert('Por favor, leia e aceite os Termos de Uso para continuar.');
            return;
        }

        // Validate all participants
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            if (!p.name || !p.email || !p.phone || !p.cpf) {
                alert(`Por favor, preencha todos os campos do participante ${i + 1}.`);
                setCurrentParticipant(i);
                return;
            }
        }

        const price = parseFloat(config.productPrice.replace(',', '.')) || 0;
        let totalAmount = price * quantity;

        // Apply discount if coupon is applied
        if (appliedCoupon) {
            if (appliedCoupon.discountType === 'percentage') {
                totalAmount = totalAmount * (1 - appliedCoupon.discountValue / 100);
            } else {
                totalAmount = Math.max(0, totalAmount - appliedCoupon.discountValue);
            }
        }

        const purchase: MultiTicketPurchase = {
            participants,
            quantity,
            totalAmount,
            responsibleIndex: 0,
            abandonedLeadId: tempLeadId
        };

        onSubmit(purchase);
    };

    const maxQuantity = availableSpots !== undefined ? Math.min(availableSpots, 10) : 10;
    const currentP = participants[currentParticipant];

    return (
        <div className="max-w-xl w-full bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div onClick={onClickHeader} className="relative h-[240px] lg:h-[300px] flex flex-col items-center justify-center text-white text-center cursor-pointer select-none overflow-hidden" >
                <img src={config.bannerImage} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200'; }} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="relative z-10 px-8 py-10 text-center">
                    <h1 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none mb-3 uppercase">
                        {isTicketMode ? 'Solicitar Ingresso' : isRegistrationMode ? 'Cadastro de Aluno' : 'Checkout Seguro'}
                    </h1>
                    {!isRegistrationMode && !isTicketMode && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <Clock size={14} className="text-amber-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Oferta expira em: 09:57</span>
                        </div>
                    )}
                </div>
            </div>
            <form onSubmit={handleSubmit} className="p-10 lg:p-16 space-y-6 relative">
                {/* Quantity Selector */}
                {!isTicketMode && !isRegistrationMode && (
                    <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
                                <Users size={20} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase text-blue-900 tracking-widest">{ticketAmount > 1 ? 'Quantidade de Pacotes' : 'Quantidade de Ingressos'}</label>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">
                                    {ticketAmount > 1 ? `Cada pacote contém ${ticketAmount} ingressos` : (availableSpots !== undefined ? `${availableSpots} vagas disponíveis` : 'Selecione a quantidade')}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    disabled={num > maxQuantity}
                                    onClick={() => setQuantity(num)}
                                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${quantity === num
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : num > maxQuantity
                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-white text-blue-600 hover:bg-blue-100'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        {quantity > 1 && (
                            <div className="pt-4 border-t border-blue-100">
                                <div className="flex justify-between items-center text-blue-900">
                                    <span className="text-xs font-black uppercase">Valor Total:</span>
                                    <span className="text-2xl font-black">
                                        {config.productPrice ? `R$ ${(parseFloat(config.productPrice.replace(',', '.')) * quantity).toFixed(2).replace('.', ',')}` : 'Consulte'}
                                    </span>
                                </div>
                            </div>
                        )}
                        {quantity === 1 && (
                            <div className="pt-4 border-t border-blue-100">
                                <div className="flex justify-between items-center text-blue-900">
                                    <span className="text-xs font-black uppercase">Valor:</span>
                                    <span className="text-2xl font-black">
                                        {config.productPrice ? `R$ ${parseFloat(config.productPrice.replace(',', '.')).toFixed(2).replace('.', ',')}` : 'Consulte'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Coupon Section */}
                {!isTicketMode && !isRegistrationMode && onApplyCoupon && (
                    <div>
                        {!showCouponSection && !appliedCoupon ? (
                            <button
                                type="button"
                                onClick={() => setShowCouponSection(true)}
                                className="w-full py-3 text-emerald-600 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition-all flex items-center justify-center gap-2 hover:bg-emerald-50 rounded-xl"
                            >
                                <Tag size={14} />
                                Tem um cupom de desconto?
                            </button>
                        ) : (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-[2rem] border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center">
                                        <Tag size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black uppercase text-emerald-900 tracking-widest">Cupom de Desconto</label>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Digite seu código promocional</p>
                                    </div>
                                    {!appliedCoupon && (
                                        <button
                                            type="button"
                                            onClick={() => setShowCouponSection(false)}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {!appliedCoupon ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                placeholder="EX: PROMO20"
                                                disabled={isApplyingCoupon}
                                                className="flex-1 px-5 py-3 rounded-xl border-2 border-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500 font-black text-sm bg-white uppercase"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                disabled={!couponCode.trim() || isApplyingCoupon}
                                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                            >
                                                {isApplyingCoupon ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                Aplicar
                                            </button>
                                        </div>
                                        {couponError && (
                                            <p className="text-red-600 text-xs font-bold flex items-center gap-1">
                                                <X size={14} /> {couponError}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl p-4 border-2 border-emerald-500">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black text-sm">
                                                    {appliedCoupon.code}
                                                </div>
                                                <div className="text-emerald-900">
                                                    <p className="text-xs font-black">
                                                        {appliedCoupon.discountType === 'percentage'
                                                            ? `${appliedCoupon.discountValue}% OFF`
                                                            : `R$ ${appliedCoupon.discountValue.toFixed(2)} OFF`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onApplyCoupon('')}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remover cupom"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Participant Navigation */}
                {quantity > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentParticipant(Math.max(0, currentParticipant - 1))}
                            disabled={currentParticipant === 0}
                            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex-1 flex gap-1">
                            {participants.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setCurrentParticipant(idx)}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${currentParticipant === idx
                                        ? 'bg-emerald-600 text-white'
                                        : participants[idx].name && participants[idx].cpf
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    {idx === 0 ? 'Comprador' : `Particip. ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentParticipant(Math.min(totalParticipants - 1, currentParticipant + 1))}
                            disabled={currentParticipant === totalParticipants - 1}
                            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Current Participant Form */}
                <div className="space-y-6 relative z-10 animate-in fade-in duration-300">
                    {quantity > 1 && (
                        <div className="text-center pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-black text-gray-900">
                                {currentParticipant === 0 ? '👤 Dados do Comprador (Responsável)' : `👥 Participante ${currentParticipant + 1}`}
                            </h3>
                        </div>
                    )}
                    <Input label="Nome Completo" type="text" placeholder="Ex: Rodrigo Mesquita" value={currentP.name} onChange={v => updateParticipant(currentParticipant, 'name', v)} />
                    <Input label="E-mail Principal" type="email" placeholder="nome@exemplo.com" value={currentP.email} onChange={v => updateParticipant(currentParticipant, 'email', v)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="WhatsApp" type="tel" placeholder="(00) 00000-0000" mask="phone" value={currentP.phone} onChange={v => updateParticipant(currentParticipant, 'phone', v)} />
                        <Input label="CPF" type="text" placeholder="000.000.000-00" mask="cpf" value={currentP.cpf} onChange={v => updateParticipant(currentParticipant, 'cpf', v)} />
                    </div>
                    <Input label="Sua Cidade" type="text" placeholder="Ex: São Paulo" value={currentP.city} onChange={v => updateParticipant(currentParticipant, 'city', v)} />
                </div>

                <div className="pt-6 relative z-10">
                    <div className="flex items-start gap-3 mb-6 px-1">
                        <div className="relative flex items-center mt-0.5">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                            <Check size={12} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                        </div>
                        <label htmlFor="terms" className="text-[11px] text-gray-500 font-medium cursor-pointer leading-tight select-none">
                            Declaro que li e concordo com os <a href="#" className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors">Termos de Uso</a> e <a href="#" className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors">Políticas de Privacidade</a>.
                        </label>
                    </div>

                    <button disabled={isSubmitting || isSoldOut} className={`w-full py-8 lg:py-10 rounded-[3rem] ${isSoldOut ? 'bg-gray-400 cursor-not-allowed' : (isRegistrationMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700')} text-white font-black text-2xl lg:text-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group`}>
                        {isSubmitting ? <Loader2 className="animate-spin" size={36} /> : (
                            <>
                                {isSoldOut ? <Loader2 size={32} className="opacity-0" /> : (isRegistrationMode ? <BadgeCheck size={32} /> : <ShoppingCart size={32} strokeWidth={2.5} />)}
                                {isSoldOut ? 'VAGAS ESGOTADAS' : (isTicketMode ? 'PEGAR MEU INGRESSO' : isRegistrationMode ? 'CONFIRMAR MEU CADASTRO' : `FINALIZAR COMPRA ${quantity > 1 ? `(${quantity}x ${ticketAmount > 1 ? 'Pacotes' : ''})` : ''}`)}
                            </>
                        )}
                    </button>

                    {!isRegistrationMode && (
                        <div className="mt-8 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
                            <div className="flex gap-3 items-center opacity-60">
                                {/* Pix */}
                                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
                                    <svg width="20" height="20" viewBox="0 0 512 512" fill="none">
                                        <path d="M397.7 322.7c-25.4 0-49.3-9.9-67.3-27.9l-75.1-75.1c-4.7-4.7-12.9-4.7-17.6 0l-75.5 75.5c-18 18-41.9 27.9-67.3 27.9h-17.2l95.2 95.2c37.5 37.5 98.3 37.5 135.8 0l95.2-95.2h-6.2z" fill="#32BCAD" />
                                        <path d="M94.9 189.3c25.4 0 49.3 9.9 67.3 27.9l75.5 75.5c4.9 4.9 12.7 4.9 17.6 0l75.1-75.1c18-18 41.9-27.9 67.3-27.9h6.2l-95.2-95.2c-37.5-37.5-98.3-37.5-135.8 0l-95.2 95.2h17.2z" fill="#32BCAD" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-gray-500">Pix</span>
                                </div>
                                {/* Visa */}
                                <div className="flex items-center bg-gray-50 rounded-md px-2 py-1">
                                    <svg width="32" height="12" viewBox="0 0 750 471">
                                        <path d="M278.2 334.2h-60.9l38.1-235.5h60.9L278.2 334.2z" fill="#3C58BF" />
                                        <path d="M524.3 104.1c-12-4.6-30.9-9.5-54.4-9.5-60 0-102.2 31.9-102.5 77.5-.3 33.7 30.1 52.5 53.1 63.7 23.6 11.5 31.5 18.8 31.5 29.1-.2 15.7-18.9 22.9-36.4 22.9-24.3 0-37.2-3.6-57.2-12.3l-7.8-3.7-8.5 52.6c14.2 6.6 40.5 12.3 67.8 12.6 63.8 0 105.2-31.5 105.6-80.2.2-26.7-15.9-47.1-50.9-63.9-21.2-10.9-34.2-18.1-34.2-29.1.2-10 11-20.3 34.8-20.3 19.9-.3 34.3 4.2 45.5 9l5.5 2.7 8.1-51.1z" fill="#3C58BF" />
                                        <path d="M661.6 98.7h-46.9c-14.5 0-25.4 4.2-31.8 19.5L476.9 334.2h63.8s10.4-29 12.8-35.3h77.9c1.8 8.2 7.4 35.3 7.4 35.3H696L661.6 98.7zm-75.2 185.8c5-13.6 24.3-66 24.3-66-.4.6 5-13.7 8.1-22.6l4.1 20.4s11.7 56.2 14.1 68.2h-50.6z" fill="#3C58BF" />
                                        <path d="M168.4 98.7L109 265.4l-6.4-32.5C92.2 197.4 59 158.6 22 139.1l54.4 194.8h64.3L232.7 98.7h-64.3z" fill="#3C58BF" />
                                    </svg>
                                </div>
                                {/* Mastercard */}
                                <div className="flex items-center bg-gray-50 rounded-md px-2 py-1">
                                    <svg width="28" height="18" viewBox="0 0 152.407 108">
                                        <rect width="152.407" height="108" rx="8" fill="transparent" />
                                        <circle cx="60.412" cy="54" r="34" fill="#EB001B" opacity="0.8" />
                                        <circle cx="91.995" cy="54" r="34" fill="#F79E1B" opacity="0.8" />
                                        <path d="M76.2 27.2c8.6 6.8 14.1 17.3 14.1 29s-5.5 22.2-14.1 29c-8.6-6.8-14.1-17.3-14.1-29s5.5-22.2 14.1-29z" fill="#FF5F00" opacity="0.8" />
                                    </svg>
                                </div>
                                {/* Boleto */}
                                <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
                                    <svg width="18" height="14" viewBox="0 0 24 20" fill="none" stroke="#666" strokeWidth="1.5">
                                        <rect x="1" y="1" width="22" height="18" rx="2" />
                                        <line x1="5" y1="5" x2="5" y2="15" />
                                        <line x1="8" y1="5" x2="8" y2="15" />
                                        <line x1="11" y1="5" x2="11" y2="15" />
                                        <line x1="14" y1="5" x2="14" y2="12" />
                                        <line x1="17" y1="5" x2="17" y2="15" />
                                        <line x1="20" y1="5" x2="20" y2="12" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-gray-500">Boleto</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-8 border-t border-gray-100 pt-8 w-full">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                        <BadgeCheck size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Acesso Vitalício</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                        <BadgeCheck size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">7 Dias Garantia</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                                        <BadgeCheck size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Pagamento Seguro</span>
                                </div>
                            </div>

                            {/* Trust Messages */}
                            <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-800">Pagamento 100% Seguro</p>
                                        <p className="text-[10px] text-blue-600">Você será redirecionado para o Mercado Pago, a maior plataforma de pagamentos do Brasil.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800">CNPJ: 50.208.258/0001-56</p>
                                        <p className="text-[10px] text-emerald-600">Vox Marketing Academy - Empresa estabelecida e regulamentada.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-800">Importante: Sua vaga só é garantida após a confirmação do pagamento!</p>
                                        <p className="text-[10px] text-amber-600">Apenas realizar a inscrição NÃO garante o ingresso. O pagamento precisa ser aprovado para receber seu acesso.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};
