import React, { useEffect, useState } from 'react';
import { CheckCircle, Calendar, Clock, MapPin, ArrowRight, PartyPopper, Sparkles } from 'lucide-react';
import { AppConfig } from '../../shared';

interface ThankYouPageProps {
    config: AppConfig;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({ config }) => {
    const [showContent, setShowContent] = useState(false);
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        setTimeout(() => setShowContent(true), 300);
        setTimeout(() => setShowConfetti(false), 5000);
        
        // Meta Pixel - Purchase event (conversão concluída)
        if (window.fbq && config.metaPixelId) {
            window.fbq('track', 'Purchase', {
                value: parseFloat(config.productPrice?.replace(',', '.') || '0'),
                currency: 'BRL',
                content_type: 'product',
                content_ids: [config.id],
                content_name: config.productName,
            });
        }
        
        // GA4 - purchase conversion
        if (window.gtag && config.ga4Id) {
            window.gtag('event', 'purchase', {
                transaction_id: Date.now().toString(),
                value: parseFloat(config.productPrice?.replace(',', '.') || '0'),
                currency: 'BRL',
                items: [{ item_name: config.productName, item_id: config.id }]
            });
        }
    }, []);

    const title = config.thankYouTitle || '🎉 Parabéns! Sua compra foi confirmada!';
    const subtitle = config.thankYouSubtitle || `Você está inscrito(a) no ${config.productName}`;
    const message = config.thankYouMessage || 'Em breve você receberá um e-mail com todas as informações. Fique atento ao seu WhatsApp!';
    const buttonText = config.thankYouButtonText || '';
    const buttonUrl = config.thankYouButtonUrl || '';
    const imageUrl = config.thankYouImageUrl || '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Confetti Effect */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-10px',
                                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
                                animation: `confettiFall ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
                                opacity: 0.8,
                            }}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes confettiFall {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes slideUp {
                    0% { transform: translateY(30px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div className={`max-w-lg w-full relative z-10 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Success Card */}
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-emerald-100/50 p-8 space-y-6 border border-emerald-100/50">

                    {/* Success Icon */}
                    <div className="flex justify-center" style={{ animation: 'bounceIn 0.6s ease-out 0.5s both' }}>
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                            <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-3" style={{ animation: 'slideUp 0.6s ease-out 0.7s both' }}>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">
                            {title}
                        </h1>
                        <p className="text-base font-bold text-emerald-600">
                            {subtitle}
                        </p>
                    </div>

                    {/* Image */}
                    {imageUrl && (
                        <div className="rounded-2xl overflow-hidden" style={{ animation: 'slideUp 0.6s ease-out 0.9s both' }}>
                            <img src={imageUrl} alt="Sucesso" className="w-full h-48 object-cover" />
                        </div>
                    )}

                    {/* Event Details */}
                    {(config.eventDate || config.eventStartTime || config.eventLocation) && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 space-y-3 border border-blue-100" style={{ animation: 'slideUp 0.6s ease-out 1.1s both' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-blue-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-800">Detalhes do Evento</span>
                            </div>

                            {config.eventDate && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Calendar size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Data</p>
                                        <p className="text-sm font-black text-gray-900">{config.eventDate}</p>
                                    </div>
                                </div>
                            )}

                            {(config.eventStartTime || config.eventEndTime) && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Clock size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Horário</p>
                                        <p className="text-sm font-black text-gray-900">
                                            {config.eventStartTime}{config.eventEndTime ? ` às ${config.eventEndTime}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {config.eventLocation && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <MapPin size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Local</p>
                                        <p className="text-sm font-black text-gray-900">{config.eventLocation}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Message */}
                    <div className="text-center" style={{ animation: 'slideUp 0.6s ease-out 1.3s both' }}>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>

                    {/* CTA Button */}
                    {buttonText && buttonUrl && (
                        <div style={{ animation: 'slideUp 0.6s ease-out 1.5s both' }}>
                            <a
                                href={buttonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-center font-black text-sm uppercase tracking-wider rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                                {buttonText}
                                <ArrowRight size={18} />
                            </a>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center pt-2" style={{ animation: 'slideUp 0.6s ease-out 1.7s both' }}>
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                            <PartyPopper size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Obrigado pela confiança!</span>
                            <PartyPopper size={14} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
