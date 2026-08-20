
import React from 'react';
import { Ticket, MapPin, Clock, Printer, Check } from 'lucide-react';
import { AppConfig, CustomerData } from '../../types';
import { LegalFooter } from './LegalFooter';

interface RegistrationSuccessProps {
    customer: CustomerData;
    config: AppConfig;
    isTicketMode: boolean;
    isRegistrationMode: boolean;
    barWidth: string;
    onClose: () => void;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({
    customer,
    config,
    isTicketMode,
    isRegistrationMode,
    barWidth,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in overflow-y-auto print:static print:bg-white print:p-0 print:block">
            {(isTicketMode || isRegistrationMode) ? (
                <div className="max-w-md w-full mx-auto animate-in zoom-in duration-700 pb-10 print:pb-0 print:max-w-[400px] print:mx-auto">
                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-t-[12px] border-amber-500 relative print:shadow-none print:border-[8px] ticket-card">
                        <div className="bg-gray-900 p-8 text-white print:bg-gray-900">
                            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30 print:bg-amber-500">
                                <Ticket size={32} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl font-black tracking-widest uppercase text-white print:text-white">VIP PASS • INGRESSO</h2>
                        </div>
                        <div className="h-40 overflow-hidden relative print:h-48">
                            <img src={config.productImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800'; }} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent print:from-white"></div>
                        </div>
                        <div className="p-8 space-y-6 text-left">
                            <div>
                                <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Titular do Ingresso</span>
                                <p className="text-2xl font-black text-gray-900 uppercase truncate leading-tight mt-1">{customer.name}</p>
                            </div>
                            <div className="bg-amber-50 p-6 rounded-[2.5rem] border-2 border-amber-100 shadow-inner print:bg-amber-50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-1"><Clock size={12} /> Data e Horário</span>
                                        <p className="text-xl font-black text-amber-900 leading-none mt-1.5">
                                            {config.eventDate ? (
                                                config.eventDate.includes('/') 
                                                    ? config.eventDate 
                                                    : (() => {
                                                        const parts = config.eventDate.split('-');
                                                        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : config.eventDate;
                                                      })()
                                            ) : 'A consultar'}
                                        </p>
                                        {(config.eventStartTime || config.eventEndTime) && (
                                            <p className="text-[11px] font-black text-amber-700 mt-1 uppercase tracking-tight">Das {config.eventStartTime || '??:??'} às {config.eventEndTime || '??:??'}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-amber-100">
                                    <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-1"><MapPin size={12} /> Local do Evento</span>
                                    <p className="text-xs font-bold text-amber-900 leading-tight mt-1.5">{config.eventLocation || 'A confirmar'}</p>
                                </div>
                            </div>
                            <div className="pt-4 flex flex-col items-center">
                                <div className="w-32 h-32 bg-gray-50 rounded-2xl border p-2 flex items-center justify-center print:border-gray-200">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VALID_TICKET_${customer.cpf}_${config.id}`} className="w-full h-full opacity-80" alt="QR" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex gap-4 print:hidden">
                        <button onClick={() => window.print()} className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                            <Printer size={18} /> Imprimir Ingresso
                        </button>
                        <button onClick={onClose} className="px-8 bg-white text-gray-400 py-5 rounded-2xl font-black text-xs uppercase border border-gray-200 hover:text-gray-600 transition-all">
                            Fechar
                        </button>
                    </div>
                    <LegalFooter className="mt-5 print:hidden" />
                </div>
            ) : (
                <div className="max-w-md w-full">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-xl"><Check size={48} strokeWidth={4} /></div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Matrícula Capturada!</h2>
                    <p className="text-gray-500 font-bold mb-12 max-w-sm text-lg text-center mx-auto">Iniciando pagamento seguro...</p>
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden max-w-sm mx-auto"><div className="h-full bg-green-500 transition-all duration-[2200ms]" style={{ width: barWidth }}></div></div>
                </div>
            )}
        </div>
    );
};
