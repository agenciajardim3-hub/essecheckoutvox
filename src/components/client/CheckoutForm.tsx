import React, { useState, useEffect, useRef } from 'react';
import { Loader2, BadgeCheck, ShoppingCart, Clock, Users, ChevronRight, ChevronLeft, Tag, X, Check, Calendar, MapPin, Shield, Star, ArrowRight } from 'lucide-react';
import { Input } from '../ui/Input';
import { AppConfig, CustomerData, MultiTicketPurchase, Coupon } from '../../types';

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

// Real countdown timer using sessionStorage
function useCountdown(checkoutId: string, durationMinutes = 15) {
    const key = `vox_timer_${checkoutId}`;
    const [timeLeft, setTimeLeft] = useState(() => {
        const stored = sessionStorage.getItem(key);
        if (stored) {
            const remaining = parseInt(stored) - Date.now();
            if (remaining > 0) return Math.floor(remaining / 1000);
        }
        const expiresAt = Date.now() + durationMinutes * 60 * 1000;
        sessionStorage.setItem(key, String(expiresAt));
        return durationMinutes * 60;
    });

    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => {
            const stored = sessionStorage.getItem(key);
            if (stored) {
                const remaining = Math.max(0, Math.floor((parseInt(stored) - Date.now()) / 1000));
                setTimeLeft(remaining);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [key]);

    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');
    return { display: `${mm}:${ss}`, expired: timeLeft <= 0 };
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
    const [submitError, setSubmitError] = useState('');
    const formRef = useRef<HTMLDivElement>(null);

    const { display: timerDisplay, expired: timerExpired } = useCountdown(config.id || 'checkout', 15);

    // Calculate total participants based on bundles
    const ticketAmount = config.ticketAmount || 1;
    const totalParticipants = quantity * ticketAmount;

    const price = parseFloat((config.productPrice || '0').replace(',', '.')) || 0;
    let displayPrice = price * quantity;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
            displayPrice = displayPrice * (1 - appliedCoupon.discountValue / 100);
        } else {
            displayPrice = Math.max(0, displayPrice - appliedCoupon.discountValue);
        }
    }

    // Auto-save logic for Cart Recovery
    useEffect(() => {
        const p0 = participants[0];
        if (!p0.name || !p0.email || !p0.phone || !onSaveAbandonment) return;

        const timer = setTimeout(async () => {
            if (!p0.name || !p0.email || !p0.phone) return;
            const id = await onSaveAbandonment(p0, tempLeadId);
            if (id) setTempLeadId(id);
        }, 1500);

        return () => clearTimeout(timer);
    }, [participants[0].name, participants[0].email, participants[0].phone, onSaveAbandonment]);

    // Update participants array when quantity changes
    useEffect(() => {
        const newParticipants = [...participants];
        if (totalParticipants > participants.length) {
            for (let i = participants.length; i < totalParticipants; i++) {
                newParticipants.push({ name: '', email: '', phone: '', city: '', cpf: '' });
            }
        } else if (totalParticipants < participants.length) {
            newParticipants.splice(totalParticipants);
        }
        setParticipants(newParticipants);
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
        setSubmitError('');

        if (!termsAccepted) {
            setSubmitError('Aceite os termos para continuar.');
            formRef.current?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            if (!p.name || !p.email || !p.phone || !p.cpf) {
                setSubmitError(`Preencha todos os campos do participante ${i + 1}.`);
                setCurrentParticipant(i);
                formRef.current?.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        let totalAmount = price * quantity;
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

    const ctaText = () => {
        if (isSoldOut) return 'VAGAS ESGOTADAS';
        if (isTicketMode) return 'PEGAR MEU INGRESSO AGORA';
        if (isRegistrationMode) return 'CONFIRMAR MEU CADASTRO ✓';
        if (quantity > 1) return `GARANTIR ${quantity} VAGAS AGORA →`;
        return 'GARANTIR MINHA VAGA AGORA →';
    };

    return (
        <div className="max-w-xl w-full bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Banner Header */}
            <div onClick={onClickHeader} className="relative h-[200px] lg:h-[260px] flex flex-col items-center justify-end text-white text-center cursor-pointer select-none overflow-hidden">
                <img
                    src={config.bannerImage}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200'; }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
                    alt="Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="relative z-10 px-8 pb-8 text-center w-full">
                    <h1 className="text-xl lg:text-2xl font-black tracking-tight leading-tight mb-2">
                        {config.productName}
                    </h1>
                    <div className="flex items-center justify-center flex-wrap gap-3">
                        {config.eventDate && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 tracking-wide">
                                <Calendar size={11} /> {config.eventDate}
                            </span>
                        )}
                        {config.eventLocation && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 tracking-wide">
                                <MapPin size={11} /> {config.eventLocation}
                            </span>
                        )}
                        {config.turma && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-blue-500/80 rounded-full px-3 py-1.5 tracking-wide">
                                🎓 {config.turma}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Real Countdown Timer */}
            {!isRegistrationMode && !isTicketMode && (
                <div className={`flex items-center justify-center gap-2 py-3 px-6 ${timerExpired ? 'bg-gray-100' : 'bg-gradient-to-r from-red-600 to-orange-500'} transition-all`}>
                    <Clock size={14} className={`${timerExpired ? 'text-gray-400' : 'text-white animate-pulse'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${timerExpired ? 'text-gray-400' : 'text-white'}`}>
                        {timerExpired ? 'Oferta pode ter expirado — confirme disponibilidade' : `Reserva de vaga expira em: ${timerDisplay}`}
                    </span>
                </div>
            )}

            {/* Mobile Order Summary */}
            {!isRegistrationMode && !isTicketMode && (
                <div className="lg:hidden mx-6 mt-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Seu pedido</span>
                        {appliedCoupon && (
                            <span className="bg-emerald-400 text-emerald-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `R$ ${appliedCoupon.discountValue} OFF`}
                            </span>
                        )}
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                            <p className="text-sm font-black leading-tight truncate">{config.productName}</p>
                            {quantity > 1 && <p className="text-[10px] opacity-70 mt-0.5">{quantity}x ingressos</p>}
                        </div>
                        <div className="text-right shrink-0">
                            {appliedCoupon && price * quantity !== displayPrice && (
                                <p className="text-[10px] line-through opacity-50">R$ {(price * quantity).toFixed(2).replace('.', ',')}</p>
                            )}
                            <p className="text-2xl font-black">R$ {displayPrice.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>
                    {availableSpots !== undefined && availableSpots <= 10 && (
                        <div className="mt-3 flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-2">
                            <span className="text-[10px] font-black uppercase">🔥 Apenas {availableSpots} {availableSpots === 1 ? 'vaga restante' : 'vagas restantes'}!</span>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 lg:p-12 space-y-6 relative">
                {/* Quantity Selector */}
                {!isTicketMode && !isRegistrationMode && (
                    <div className="bg-blue-50/60 p-5 rounded-[2rem] border border-blue-100 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                <Users size={18} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black uppercase text-blue-900 tracking-widest">
                                    {ticketAmount > 1 ? 'Quantidade de Pacotes' : 'Quantidade de Ingressos'}
                                </label>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">
                                    {ticketAmount > 1 ? `Cada pacote = ${ticketAmount} ingressos` : (availableSpots !== undefined ? `${availableSpots} vagas disponíveis` : 'Selecione a quantidade')}
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
                                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                                        : num > maxQuantity
                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-white text-blue-600 hover:bg-blue-100 hover:scale-105'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        {/* Desktop price summary */}
                        <div className="hidden lg:block pt-3 border-t border-blue-100">
                            <div className="flex justify-between items-center text-blue-900">
                                <span className="text-xs font-black uppercase">
                                    {appliedCoupon ? 'Valor com Desconto:' : 'Valor Total:'}
                                </span>
                                <div className="text-right">
                                    {appliedCoupon && price * quantity !== displayPrice && (
                                        <p className="text-xs line-through text-gray-400">R$ {(price * quantity).toFixed(2).replace('.', ',')}</p>
                                    )}
                                    <span className="text-2xl font-black text-blue-700">
                                        R$ {displayPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Coupon Section */}
                {!isTicketMode && !isRegistrationMode && onApplyCoupon && (
                    <div>
                        {!showCouponSection && !appliedCoupon ? (
                            <button
                                type="button"
                                onClick={() => setShowCouponSection(true)}
                                className="w-full py-2.5 text-emerald-600 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition-all flex items-center justify-center gap-2 hover:bg-emerald-50 rounded-xl"
                            >
                                <Tag size={14} />
                                Tem um cupom de desconto?
                            </button>
                        ) : (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-[2rem] border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Tag size={18} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black uppercase text-emerald-900 tracking-widest">Cupom de Desconto</label>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Digite seu código promocional</p>
                                    </div>
                                    {!appliedCoupon && (
                                        <button type="button" onClick={() => setShowCouponSection(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all">
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
                                                className="flex-1 px-4 py-3 rounded-xl border-2 border-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500 font-black text-sm bg-white uppercase"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                disabled={!couponCode.trim() || isApplyingCoupon}
                                                className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
                                                <p className="text-xs font-black text-emerald-900">
                                                    {appliedCoupon.discountType === 'percentage'
                                                        ? `${appliedCoupon.discountValue}% OFF`
                                                        : `R$ ${appliedCoupon.discountValue.toFixed(2)} OFF`}
                                                </p>
                                            </div>
                                            <button type="button" onClick={() => onApplyCoupon('')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover cupom">
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

                {/* Form Fields */}
                <div ref={formRef} className="space-y-5 relative z-10 animate-in fade-in duration-300">
                    {quantity > 1 && (
                        <div className="text-center pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-black text-gray-900">
                                {currentParticipant === 0 ? '👤 Dados do Comprador (Responsável)' : `👥 Participante ${currentParticipant + 1}`}
                            </h3>
                        </div>
                    )}

                    {/* Social proof strip above form */}
                    {!isRegistrationMode && !isTicketMode && (
                        <div className="flex items-center justify-center gap-1.5 py-2">
                            {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                            <span className="text-[10px] font-black text-gray-500 ml-1">Mais de 1.000 alunos aprovados</span>
                        </div>
                    )}

                    <Input
                        label="Nome Completo"
                        type="text"
                        placeholder="Ex: Maria Silva"
                        value={currentP.name}
                        onChange={v => updateParticipant(currentParticipant, 'name', v)}
                        autoComplete="name"
                    />
                    <Input
                        label="E-mail Principal"
                        type="email"
                        placeholder="seu@email.com"
                        value={currentP.email}
                        onChange={v => updateParticipant(currentParticipant, 'email', v)}
                        autoComplete="email"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="WhatsApp"
                            type="tel"
                            placeholder="(00) 00000-0000"
                            mask="phone"
                            value={currentP.phone}
                            onChange={v => updateParticipant(currentParticipant, 'phone', v)}
                            autoComplete="tel"
                        />
                        <Input
                            label="CPF"
                            type="text"
                            placeholder="000.000.000-00"
                            mask="cpf"
                            value={currentP.cpf}
                            onChange={v => updateParticipant(currentParticipant, 'cpf', v)}
                            autoComplete="off"
                        />
                    </div>
                    <Input
                        label="Sua Cidade"
                        type="text"
                        placeholder="Ex: São Paulo"
                        value={currentP.city}
                        onChange={v => updateParticipant(currentParticipant, 'city', v)}
                        autoComplete="address-level2"
                    />
                </div>

                {/* Error Message (replaces alert) */}
                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-in shake duration-300">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <X size={16} className="text-red-600" />
                        </div>
                        <p className="text-sm font-bold text-red-700">{submitError}</p>
                    </div>
                )}

                <div className="pt-2 relative z-10">
                    {/* Terms */}
                    <div className="flex items-start gap-3 mb-5 px-1">
                        <div className="relative flex items-center mt-0.5 shrink-0">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={termsAccepted}
                                onChange={(e) => { setTermsAccepted(e.target.checked); if (e.target.checked) setSubmitError(''); }}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                            <Check size={12} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                        </div>
                        <label htmlFor="terms" className="text-[11px] text-gray-500 font-medium cursor-pointer leading-tight select-none">
                            Li e concordo com os{' '}
                            <a href="#" className="font-bold text-blue-600 hover:underline">Termos de Uso</a>{' '}e{' '}
                            <a href="#" className="font-bold text-blue-600 hover:underline">Política de Privacidade</a>.
                            Estou ciente que a vaga só é garantida após confirmação do pagamento.
                        </label>
                    </div>

                    {/* CTA Button */}
                    <button
                        disabled={isSubmitting || !!isSoldOut}
                        className={`w-full py-7 lg:py-8 rounded-[2.5rem] text-white font-black text-xl lg:text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 group relative overflow-hidden ${
                            isSoldOut
                                ? 'bg-gray-400 cursor-not-allowed'
                                : isRegistrationMode
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/30'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-emerald-500/30'
                        }`}
                    >
                        {/* Shimmer effect */}
                        {!isSoldOut && !isSubmitting && (
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        )}
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={32} />
                        ) : (
                            <>
                                {isSoldOut ? null : isRegistrationMode ? <BadgeCheck size={28} /> : <ShoppingCart size={28} strokeWidth={2.5} />}
                                <span>{ctaText()}</span>
                                {!isSoldOut && !isSubmitting && <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />}
                            </>
                        )}
                    </button>

                    {/* Trust Badges */}
                    {!isRegistrationMode && (
                        <div className="mt-6 space-y-4">
                            {/* Payment methods */}
                            <div className="flex gap-2 items-center justify-center opacity-60 flex-wrap">
                                <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                    <svg width="20" height="20" viewBox="0 0 512 512" fill="none">
                                        <path d="M397.7 322.7c-25.4 0-49.3-9.9-67.3-27.9l-75.1-75.1c-4.7-4.7-12.9-4.7-17.6 0l-75.5 75.5c-18 18-41.9 27.9-67.3 27.9h-17.2l95.2 95.2c37.5 37.5 98.3 37.5 135.8 0l95.2-95.2h-6.2z" fill="#32BCAD" />
                                        <path d="M94.9 189.3c25.4 0 49.3 9.9 67.3 27.9l75.5 75.5c4.9 4.9 12.7 4.9 17.6 0l75.1-75.1c18-18 41.9-27.9 67.3-27.9h6.2l-95.2-95.2c-37.5-37.5-98.3-37.5-135.8 0l-95.2 95.2h17.2z" fill="#32BCAD" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-gray-500">Pix</span>
                                </div>
                                <div className="flex items-center bg-gray-50 rounded-lg px-2.5 py-1.5">
                                    <svg width="32" height="12" viewBox="0 0 750 471">
                                        <path d="M278.2 334.2h-60.9l38.1-235.5h60.9L278.2 334.2z" fill="#3C58BF" />
                                        <path d="M524.3 104.1c-12-4.6-30.9-9.5-54.4-9.5-60 0-102.2 31.9-102.5 77.5-.3 33.7 30.1 52.5 53.1 63.7 23.6 11.5 31.5 18.8 31.5 29.1-.2 15.7-18.9 22.9-36.4 22.9-24.3 0-37.2-3.6-57.2-12.3l-7.8-3.7-8.5 52.6c14.2 6.6 40.5 12.3 67.8 12.6 63.8 0 105.2-31.5 105.6-80.2.2-26.7-15.9-47.1-50.9-63.9-21.2-10.9-34.2-18.1-34.2-29.1.2-10 11-20.3 34.8-20.3 19.9-.3 34.3 4.2 45.5 9l5.5 2.7 8.1-51.1z" fill="#3C58BF" />
                                        <path d="M661.6 98.7h-46.9c-14.5 0-25.4 4.2-31.8 19.5L476.9 334.2h63.8s10.4-29 12.8-35.3h77.9c1.8 8.2 7.4 35.3 7.4 35.3H696L661.6 98.7zm-75.2 185.8c5-13.6 24.3-66 24.3-66-.4.6 5-13.7 8.1-22.6l4.1 20.4s11.7 56.2 14.1 68.2h-50.6z" fill="#3C58BF" />
                                        <path d="M168.4 98.7L109 265.4l-6.4-32.5C92.2 197.4 59 158.6 22 139.1l54.4 194.8h64.3L232.7 98.7h-64.3z" fill="#3C58BF" />
                                    </svg>
                                </div>
                                <div className="flex items-center bg-gray-50 rounded-lg px-2.5 py-1.5">
                                    <svg width="28" height="18" viewBox="0 0 152.407 108">
                                        <circle cx="60.412" cy="54" r="34" fill="#EB001B" opacity="0.8" />
                                        <circle cx="91.995" cy="54" r="34" fill="#F79E1B" opacity="0.8" />
                                        <path d="M76.2 27.2c8.6 6.8 14.1 17.3 14.1 29s-5.5 22.2-14.1 29c-8.6-6.8-14.1-17.3-14.1-29s5.5-22.2 14.1-29z" fill="#FF5F00" opacity="0.8" />
                                    </svg>
                                </div>
                                <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
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

                            {/* Trust icons */}
                            <div className="flex justify-center gap-6 pt-4 border-t border-gray-100">
                                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                                        <Shield size={15} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-center">Pagamento<br/>Seguro</span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                        <BadgeCheck size={15} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-center">7 Dias<br/>Garantia</span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                                        <Check size={15} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-center">Acesso<br/>Imediato</span>
                                </div>
                            </div>

                            {/* Trust message */}
                            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        <Shield size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-800">Pagamento 100% Seguro via Mercado Pago</p>
                                        <p className="text-[10px] text-blue-600">Maior plataforma de pagamentos do Brasil. Seus dados estão protegidos.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <BadgeCheck size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800">CNPJ: 50.208.258/0001-56</p>
                                        <p className="text-[10px] text-emerald-600">Vox Marketing Academy — Empresa estabelecida e regulamentada.</p>
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
