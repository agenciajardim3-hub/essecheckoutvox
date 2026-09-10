import React, { useState, useEffect, useRef } from 'react';
import { Loader2, BadgeCheck, ShoppingCart, Clock, Users, ChevronRight, ChevronLeft, Tag, X, Check, Calendar, MapPin, Shield, ArrowRight } from 'lucide-react';
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

// ─── Real countdown timer ────────────────────────────────────────
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
    return { display: `${mm}:${ss}`, expired: timeLeft <= 0, urgent: timeLeft < 120 };
}

// ─── Fluctuating viewer count ─────────────────────────────────────
function useViewerCount(base: number) {
    const [count, setCount] = useState(() => {
        if (!base) return 0;
        return base + Math.floor(Math.random() * 7) - 3;
    });

    useEffect(() => {
        if (!base) return;
        const scheduleNext = () => {
            const delay = 4000 + Math.random() * 4000; // 4–8s
            return setTimeout(() => {
                setCount(prev => {
                    // Random walk ±1, clamped within base ± 4
                    const delta = Math.random() < 0.5 ? -1 : 1;
                    const next = prev + delta;
                    const min = Math.max(1, base - 4);
                    const max = base + 4;
                    return Math.min(max, Math.max(min, next));
                });
            }, delay);
        };

        let timer = scheduleNext();
        const interval = setInterval(() => {
            clearTimeout(timer);
            timer = scheduleNext();
        }, 8000);

        return () => { clearTimeout(timer); clearInterval(interval); };
    }, [base]);

    return count;
}

// ─── Main Component ───────────────────────────────────────────────
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
    const [participants, setParticipants] = useState<CustomerData[]>([{ name: '', email: '', phone: '', city: '', cpf: '' }]);
    const [tempLeadId, setTempLeadId] = useState<string | undefined>(undefined);
    const [couponCode, setCouponCode] = useState('');
    const [showCouponSection, setShowCouponSection] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const formRef = useRef<HTMLDivElement>(null);

    const { display: timerDisplay, expired: timerExpired, urgent: timerUrgent } = useCountdown(config.id || 'checkout', 15);
    const viewerCount = useViewerCount(config.viewerCount || 0);

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
    const hasDiscount = appliedCoupon && price * quantity !== displayPrice;

    // Auto-save abandonment
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

    // Sync participants with quantity
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
        if (currentParticipant >= totalParticipants) setCurrentParticipant(totalParticipants - 1);
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
            if (result.success) { setCouponCode(''); }
            else { setCouponError(result.error || 'Cupom inválido'); }
        } catch { setCouponError('Erro ao aplicar cupom'); }
        finally { setIsApplyingCoupon(false); }
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
            totalAmount = appliedCoupon.discountType === 'percentage'
                ? totalAmount * (1 - appliedCoupon.discountValue / 100)
                : Math.max(0, totalAmount - appliedCoupon.discountValue);
        }
        onSubmit({ participants, quantity, totalAmount, responsibleIndex: 0, abandonedLeadId: tempLeadId });
    };

    const maxQuantity = availableSpots !== undefined ? Math.min(availableSpots, 10) : 10;
    const currentP = participants[currentParticipant];

    const ctaText = () => {
        if (isSoldOut) return 'VAGAS ESGOTADAS';
        if (isTicketMode) return 'PEGAR MEU INGRESSO AGORA';
        if (isRegistrationMode) return 'CONFIRMAR MEU CADASTRO';
        if (quantity > 1) return `GARANTIR ${quantity} VAGAS AGORA`;
        return 'GARANTIR MINHA VAGA AGORA';
    };

    return (
        <div className="w-full bg-white rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem] shadow-lg lg:shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col">

            {/* ── Banner ── */}
            <div
                onClick={onClickHeader}
                className="relative h-[180px] lg:h-[220px] overflow-hidden cursor-pointer select-none"
            >
                <img
                    src={config.bannerImage}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200'; }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
                    alt="Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                {/* Event badges */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h1 className="hidden lg:block text-base font-black text-white leading-tight mb-2 line-clamp-2">
                        {config.productName}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                        {config.eventDate && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-white/20 backdrop-blur-sm text-white rounded-full px-2.5 py-1">
                                <Calendar size={9} /> {config.eventDate}
                            </span>
                        )}
                        {config.eventLocation && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-white/20 backdrop-blur-sm text-white rounded-full px-2.5 py-1">
                                <MapPin size={9} /> {config.eventLocation}
                            </span>
                        )}
                        {config.turma && (
                            <span className="hidden lg:inline text-[9px] font-black uppercase bg-blue-500/80 text-white rounded-full px-2.5 py-1">
                                🎓 {config.turma}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Barra de urgência ──
                Antes eram duas faixas empilhadas (timer + "X pessoas vendo"), cada uma com
                gradiente próprio. Numa tela de celular viravam duas tarjas berrantes antes
                do formulário. Agora é uma só: cronômetro à esquerda, motivo à direita. ── */}
            {!isRegistrationMode && !isTicketMode && (
                <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    timerExpired
                        ? 'bg-gray-100'
                        : timerUrgent
                            ? 'bg-red-600'
                            : 'bg-emerald-600'
                }`}>
                    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 shrink-0 ${
                        timerExpired ? 'bg-gray-200' : 'bg-black/15'
                    }`}>
                        <Clock size={14} className={timerExpired ? 'text-gray-500' : 'text-white'} />
                        <span className={`text-[15px] font-black tabular-nums leading-none ${
                            timerExpired ? 'text-gray-500' : 'text-white'
                        }`}>
                            {timerExpired ? '00:00' : timerDisplay}
                        </span>
                    </div>

                    <p className={`text-[11px] sm:text-xs font-bold leading-snug ${
                        timerExpired ? 'text-gray-600' : 'text-white'
                    }`}>
                        {timerExpired
                            ? 'Sua reserva expirou. Confirme a disponibilidade antes de continuar.'
                            : availableSpots !== undefined && availableSpots <= 20
                                ? `Restam apenas ${availableSpots} ${availableSpots === 1 ? 'vaga' : 'vagas'} com o valor promocional. Garanta a sua antes que a oferta seja encerrada.`
                                : viewerCount > 0
                                    ? `${viewerCount} ${viewerCount === 1 ? 'pessoa está vendo' : 'pessoas estão vendo'} esta página agora. Garanta a sua vaga com o valor promocional.`
                                    : 'Valor promocional reservado por tempo limitado. Garanta a sua vaga antes que a oferta seja encerrada.'}
                    </p>
                </div>
            )}

            {/* ── Título do produto (celular) ──
                No desktop o nome aparece sobre o banner; ali há espaço. No celular o banner
                é baixo e o texto sobreposto competia com a imagem, então o nome vem embaixo,
                legível, como cabeçalho da página. ── */}
            <div className="lg:hidden px-5 pt-5">
                <h1 className="text-[19px] font-black text-gray-900 leading-tight">
                    {config.productName}
                </h1>
                {config.turma && (
                    <p className="text-[12px] font-bold text-gray-500 mt-1">{config.turma}</p>
                )}
            </div>

            {/* ── Mobile Order Summary ── */}
            {!isRegistrationMode && !isTicketMode && (
                <div className="lg:hidden mx-5 mt-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 flex items-end justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-gray-500">
                                {quantity > 1 ? `${quantity} ingressos` : 'Valor total'}
                            </p>
                            {hasDiscount && (
                                <p className="text-[12px] font-bold text-gray-400 line-through leading-tight">
                                    R$ {(price * quantity).toFixed(2).replace('.', ',')}
                                </p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[26px] font-black text-blue-600 leading-none tracking-tight">
                                R$ {displayPrice.toFixed(2).replace('.', ',')}
                            </p>
                            {hasDiscount && appliedCoupon && (
                                <p className="text-[11px] font-black text-emerald-600 mt-1">
                                    {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `−R$ ${appliedCoupon.discountValue}`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-5 py-5 lg:px-8 lg:py-8 space-y-5 lg:space-y-6 flex flex-col flex-1">

                {/* ── Quantity Selector ── */}
                {!isTicketMode && !isRegistrationMode && (
                    <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Users size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-800 tracking-widest leading-none">
                                        {ticketAmount > 1 ? 'Qtd. Pacotes' : 'Qtd. Ingressos'}
                                    </p>
                                    <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                                        {ticketAmount > 1 ? `${ticketAmount} ingressos/pacote` : (availableSpots !== undefined ? `${availableSpots} disponíveis` : 'Selecione')}
                                    </p>
                                </div>
                            </div>
                            {/* Desktop price */}
                            <div className="hidden lg:block text-right">
                                {hasDiscount && (
                                    <p className="text-[10px] line-through text-gray-400">R$ {(price * quantity).toFixed(2).replace('.', ',')}</p>
                                )}
                                <p className="text-xl font-black text-blue-700">R$ {displayPrice.toFixed(2).replace('.', ',')}</p>
                                {hasDiscount && appliedCoupon && (
                                    <p className="text-[9px] font-black text-emerald-600">
                                        {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `−R$ ${appliedCoupon.discountValue}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    disabled={num > maxQuantity}
                                    onClick={() => setQuantity(num)}
                                    className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${
                                        quantity === num ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105' :
                                        num > maxQuantity ? 'bg-gray-100 text-gray-300 cursor-not-allowed' :
                                        'bg-white text-blue-600 border border-gray-200 hover:border-blue-300 hover:scale-105'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Coupon ── */}
                {!isTicketMode && !isRegistrationMode && onApplyCoupon && (
                    <div>
                        {!showCouponSection && !appliedCoupon ? (
                            <button
                                type="button"
                                onClick={() => setShowCouponSection(true)}
                                className="w-full py-2.5 text-emerald-600 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition-all flex items-center justify-center gap-1.5 hover:bg-emerald-50 rounded-xl"
                            >
                                <Tag size={13} /> Tem um cupom de desconto?
                            </button>
                        ) : (
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-3 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest flex items-center gap-1.5"><Tag size={12} /> Cupom de Desconto</span>
                                    {!appliedCoupon && (
                                        <button type="button" onClick={() => setShowCouponSection(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                            <X size={14} />
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
                                                placeholder="CÓDIGO"
                                                disabled={isApplyingCoupon}
                                                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-emerald-100 outline-none focus:ring-2 focus:ring-emerald-400 font-black text-sm bg-white uppercase tracking-widest"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                disabled={!couponCode.trim() || isApplyingCoupon}
                                                className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 disabled:opacity-50 transition-all"
                                            >
                                                {isApplyingCoupon ? <Loader2 size={15} className="animate-spin" /> : 'Aplicar'}
                                            </button>
                                        </div>
                                        {couponError && <p className="text-red-500 text-xs font-bold flex items-center gap-1"><X size={12} /> {couponError}</p>}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl p-3 border-2 border-emerald-400 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-2 py-1 rounded-lg">{appliedCoupon.code}</span>
                                            <span className="text-emerald-700 font-black text-sm">
                                                {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `R$ ${appliedCoupon.discountValue} OFF`}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => onApplyCoupon('')} className="text-red-400 hover:text-red-600 p-1">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Multi-participant nav ── */}
                {quantity > 1 && (
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setCurrentParticipant(Math.max(0, currentParticipant - 1))} disabled={currentParticipant === 0}
                            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-all">
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex-1 flex gap-1">
                            {participants.map((p, idx) => (
                                <button key={idx} type="button" onClick={() => setCurrentParticipant(idx)}
                                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                                        currentParticipant === idx ? 'bg-blue-600 text-white' :
                                        p.name && p.cpf ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {idx === 0 ? 'Comprador' : `P. ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setCurrentParticipant(Math.min(totalParticipants - 1, currentParticipant + 1))} disabled={currentParticipant === totalParticipants - 1}
                            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-all">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {/* ── Form fields ── */}
                <div ref={formRef} className="space-y-4 lg:space-y-4">
                    {quantity > 1 && (
                        <p className="text-sm font-black text-gray-700 text-center pb-2 border-b border-gray-100">
                            {currentParticipant === 0 ? '👤 Comprador (Responsável)' : `👥 Participante ${currentParticipant + 1}`}
                        </p>
                    )}
                    <Input variant="clean" label="Nome Completo" type="text" placeholder="Preencha seu nome" value={currentP.name} onChange={v => updateParticipant(currentParticipant, 'name', v)} autoComplete="name" />
                    <Input variant="clean" label="E-mail" type="email" placeholder="Preencha seu email" value={currentP.email} onChange={v => updateParticipant(currentParticipant, 'email', v)} autoComplete="email" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
                        <Input variant="clean" label="WhatsApp" type="tel" placeholder="Preencha seu celular" mask="phone" value={currentP.phone} onChange={v => updateParticipant(currentParticipant, 'phone', v)} autoComplete="tel" />
                        <Input variant="clean" label="CPF" type="text" placeholder="000.000.000-00" mask="cpf" value={currentP.cpf} onChange={v => updateParticipant(currentParticipant, 'cpf', v)} autoComplete="off" />
                    </div>
                    <Input variant="clean" label="Cidade" type="text" placeholder="Preencha sua cidade" value={currentP.city} onChange={v => updateParticipant(currentParticipant, 'city', v)} autoComplete="address-level2" />
                </div>

                {/* ── Submit error ── */}
                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5 animate-in shake duration-300">
                        <X size={15} className="text-red-500 shrink-0" />
                        <p className="text-sm font-bold text-red-700">{submitError}</p>
                    </div>
                )}

                {/* ── Terms ── */}
                <div className="flex items-start gap-3 px-0.5">
                    <div className="relative flex items-center mt-0.5 shrink-0">
                        <input
                            type="checkbox"
                            id="terms"
                            checked={termsAccepted}
                            onChange={(e) => { setTermsAccepted(e.target.checked); if (e.target.checked) setSubmitError(''); }}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600 hover:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                        <Check size={11} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                    </div>
                    <label htmlFor="terms" className="text-[11px] text-gray-500 font-medium cursor-pointer leading-relaxed select-none">
                        Li e concordo com os <a href="#" className="font-bold text-blue-600 hover:underline">Termos de Uso</a> e <a href="#" className="font-bold text-blue-600 hover:underline">Política de Privacidade</a>. Estou ciente que a vaga só é garantida após o pagamento.
                    </label>
                </div>

                {/* ── CTA Button ── */}
                <button
                    disabled={isSubmitting || !!isSoldOut}
                    className={`w-full mt-auto py-5 lg:py-7 px-6 rounded-xl lg:rounded-2xl text-white font-black text-[13.5px] sm:text-[15px] lg:text-lg tracking-tight lg:tracking-normal shadow-lg lg:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 lg:gap-3 group relative overflow-hidden ${
                        isSoldOut ? 'bg-gray-400 cursor-not-allowed shadow-gray-400/20' :
                        isRegistrationMode ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800' :
                        'bg-gradient-to-r from-emerald-500 via-emerald-500 to-green-600 hover:shadow-2xl hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-green-700'
                    }`}
                >
                    {/* shimmer */}
                    {!isSoldOut && !isSubmitting && (
                        <div className="hidden lg:block absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    )}
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" size={24} />
                    ) : (
                        <>
                            {!isSoldOut && (isRegistrationMode ? <BadgeCheck size={20} className="shrink-0 lg:w-6 lg:h-6" /> : <ShoppingCart size={20} strokeWidth={2.5} className="shrink-0 lg:w-6 lg:h-6" />)}
                            <span className="flex-1 text-center whitespace-nowrap lg:whitespace-normal">{ctaText()}</span>
                            {!isSoldOut && !isSubmitting && <ArrowRight size={20} className="hidden sm:block group-hover:translate-x-1 transition-transform" />}
                        </>
                    )}
                </button>

                {/* ── Trust footer ── */}
                {!isRegistrationMode && (
                    <div className="space-y-3 lg:space-y-4 pt-1">
                        {/* Payment methods */}
                        <div className="flex gap-2 items-center justify-center flex-wrap opacity-50">
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2.5 py-1.5">
                                <svg width="18" height="18" viewBox="0 0 512 512" fill="none">
                                    <path d="M397.7 322.7c-25.4 0-49.3-9.9-67.3-27.9l-75.1-75.1c-4.7-4.7-12.9-4.7-17.6 0l-75.5 75.5c-18 18-41.9 27.9-67.3 27.9h-17.2l95.2 95.2c37.5 37.5 98.3 37.5 135.8 0l95.2-95.2h-6.2z" fill="#32BCAD" />
                                    <path d="M94.9 189.3c25.4 0 49.3 9.9 67.3 27.9l75.5 75.5c4.9 4.9 12.7 4.9 17.6 0l75.1-75.1c18-18 41.9-27.9 67.3-27.9h6.2l-95.2-95.2c-37.5-37.5-98.3-37.5-135.8 0l-95.2 95.2h17.2z" fill="#32BCAD" />
                                </svg>
                                <span className="text-[9px] font-bold text-gray-600">Pix</span>
                            </div>
                            <div className="bg-gray-100 rounded-lg px-2.5 py-1.5">
                                <svg width="30" height="11" viewBox="0 0 750 471">
                                    <path d="M278.2 334.2h-60.9l38.1-235.5h60.9L278.2 334.2z" fill="#3C58BF" />
                                    <path d="M524.3 104.1c-12-4.6-30.9-9.5-54.4-9.5-60 0-102.2 31.9-102.5 77.5-.3 33.7 30.1 52.5 53.1 63.7 23.6 11.5 31.5 18.8 31.5 29.1-.2 15.7-18.9 22.9-36.4 22.9-24.3 0-37.2-3.6-57.2-12.3l-7.8-3.7-8.5 52.6c14.2 6.6 40.5 12.3 67.8 12.6 63.8 0 105.2-31.5 105.6-80.2.2-26.7-15.9-47.1-50.9-63.9-21.2-10.9-34.2-18.1-34.2-29.1.2-10 11-20.3 34.8-20.3 19.9-.3 34.3 4.2 45.5 9l5.5 2.7 8.1-51.1z" fill="#3C58BF" />
                                    <path d="M168.4 98.7L109 265.4l-6.4-32.5C92.2 197.4 59 158.6 22 139.1l54.4 194.8h64.3L232.7 98.7h-64.3z" fill="#3C58BF" />
                                </svg>
                            </div>
                            <div className="bg-gray-100 rounded-lg px-2.5 py-1.5">
                                <svg width="26" height="17" viewBox="0 0 152.407 108">
                                    <circle cx="60.412" cy="54" r="34" fill="#EB001B" opacity="0.8" />
                                    <circle cx="91.995" cy="54" r="34" fill="#F79E1B" opacity="0.8" />
                                    <path d="M76.2 27.2c8.6 6.8 14.1 17.3 14.1 29s-5.5 22.2-14.1 29c-8.6-6.8-14.1-17.3-14.1-29s5.5-22.2 14.1-29z" fill="#FF5F00" opacity="0.8" />
                                </svg>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2.5 py-1.5">
                                <svg width="16" height="12" viewBox="0 0 24 20" fill="none" stroke="#666" strokeWidth="1.5">
                                    <rect x="1" y="1" width="22" height="18" rx="2" /><line x1="5" y1="5" x2="5" y2="15" /><line x1="8" y1="5" x2="8" y2="15" /><line x1="11" y1="5" x2="11" y2="15" /><line x1="17" y1="5" x2="17" y2="15" />
                                </svg>
                                <span className="text-[9px] font-bold text-gray-600">Boleto</span>
                            </div>
                        </div>

                        {/* Trust icons */}
                        <div className="flex justify-center gap-6 lg:gap-8 pt-3 border-t border-gray-100">
                            {[
                                { icon: <Shield size={14} />, color: 'text-blue-500 bg-blue-50', label: 'Pagamento\nSeguro' },
                                { icon: <BadgeCheck size={14} />, color: 'text-emerald-500 bg-emerald-50', label: '7 Dias\nGarantia' },
                                { icon: <Check size={14} />, color: 'text-amber-500 bg-amber-50', label: 'Acesso\nImediato' },
                            ].map(({ icon, color, label }) => (
                                <div key={label} className="flex flex-col items-center gap-1.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>{icon}</div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-pre-line">{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Mercado Pago note */}
                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
                            <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                                Você será redirecionado para o <strong>Mercado Pago</strong>, a plataforma de pagamentos mais segura do Brasil.
                            </p>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};
