
import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, Loader2, User, Ticket, QrCode } from 'lucide-react';
import { Lead, AppConfig } from '../../shared';

interface TicketScannerProps {
    leads: Lead[];
    allCheckouts: AppConfig[];
    onUpdateStatus: (id: string, status: Lead['status']) => void;
}

export const TicketScanner: React.FC<TicketScannerProps> = ({
    leads,
    allCheckouts,
    onUpdateStatus
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [scannedLead, setScannedLead] = useState<Lead | null>(null);
    const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setStatus('searching');

        // Simulating a delay for a "scan" feel
        setTimeout(() => {
            const found = leads.find(l =>
                l.id === searchQuery ||
                l.cpf === searchQuery.replace(/\D/g, '') ||
                l.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (found) {
                setScannedLead(found);
                setStatus('found');
            } else {
                setScannedLead(null);
                setStatus('not_found');
            }
        }, 600);
    };

    const handleCheckIn = async () => {
        if (!scannedLead) return;
        onUpdateStatus(scannedLead.id, 'Pago');
        setScannedLead({ ...scannedLead, status: 'Pago' });
    };

    const getProduct = (productId?: string) => {
        return allCheckouts.find(c => c.id === productId);
    };

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500 space-y-8">
            <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                    <QrCode size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-gray-900">Validar Ingresso</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Escaneie o QR Code ou busque pelo CPF/Nome</p>
            </div>

            <form onSubmit={handleSearch} className="relative group">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cole o ID, CPF ou Nome do Aluno..."
                    className="w-full bg-white border-2 border-transparent focus:border-blue-600 rounded-[2rem] px-8 py-6 text-lg font-black shadow-xl outline-none transition-all placeholder:text-gray-300"
                    autoFocus
                />
                <button
                    type="submit"
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all"
                >
                    {status === 'searching' ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
                </button>
            </form>

            <div className="min-h-[300px]">
                {status === 'found' && scannedLead && (
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-2 border-emerald-100 animate-in zoom-in-95 duration-300">
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                                    <User size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{scannedLead.name}</h3>
                                    <p className="text-emerald-600 font-black text-sm">{scannedLead.phone}</p>
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 ${scannedLead.status === 'Pago' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {scannedLead.status === 'Pago' ? <CheckCircle2 size={14} /> : <Ticket size={14} />}
                                {scannedLead.status === 'Pago' ? 'INGRESSO VÁLIDO' : 'PAGAMENTO PENDENTE'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-gray-50 p-6 rounded-2xl">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Produto</span>
                                <p className="font-black text-gray-900 truncate">{scannedLead.product_name || getProduct(scannedLead.product_id)?.productName || 'N/A'}</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-2xl">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Turma</span>
                                <p className="font-black text-gray-900">{scannedLead.turma || getProduct(scannedLead.product_id)?.turma || 'SEM TURMA'}</p>
                            </div>
                        </div>

                        {scannedLead.status !== 'Pago' ? (
                            <button
                                onClick={handleCheckIn}
                                className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-sm uppercase shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                            >
                                <CheckCircle2 size={24} /> CONFIRMAR PAGAMENTO E CHECK-IN
                            </button>
                        ) : (
                            <div className="w-full py-6 rounded-3xl border-2 border-emerald-600 text-emerald-600 font-black text-sm uppercase flex items-center justify-center gap-3">
                                <CheckCircle2 size={24} /> ALUNO JÁ VALIDADO
                            </div>
                        )}
                    </div>
                )}

                {status === 'not_found' && (
                    <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-red-50 animate-in shake duration-500">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">Ingresso não encontrado</h3>
                        <p className="text-gray-400 font-bold mt-2">Verifique o ID ou CPF digitado.</p>
                        <button onClick={() => setStatus('idle')} className="mt-8 text-blue-600 font-black text-xs uppercase tracking-widest">Tentar novamente</button>
                    </div>
                )}

                {status === 'idle' && (
                    <div className="bg-blue-50/30 rounded-[3rem] p-20 text-center border-2 border-dashed border-blue-100">
                        <p className="text-blue-400 font-bold max-w-xs mx-auto">Aguardando leitura de código ou busca manual...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
