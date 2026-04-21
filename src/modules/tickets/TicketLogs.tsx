
import React, { useMemo, useState } from 'react';
import { Ticket, GraduationCap, Printer, Trash2, Loader2 } from 'lucide-react';
import { AppConfig, Lead } from '../../shared';

interface TicketLogsProps {
    leads: Lead[];
    allCheckouts: AppConfig[];
    savingId: string | null;
    onDeleteLead: (id: string) => void;
    onReprintTicket: (lead: Lead) => void;
}

export const TicketLogs: React.FC<TicketLogsProps> = ({
    leads,
    allCheckouts,
    savingId,
    onDeleteLead,
    onReprintTicket
}) => {
    const [selectedTicketFilter, setSelectedTicketFilter] = useState<string>('all');
    const [selectedTicketTurmaFilter, setSelectedTicketTurmaFilter] = useState<string>('all');

    const uniqueTurmas = useMemo(() => {
        const turmasFromLeads = leads.map(l => l.turma).filter(Boolean);
        const turmasFromProducts = allCheckouts.map(p => p.turma).filter(Boolean);
        return Array.from(new Set([...turmasFromLeads, ...turmasFromProducts])).sort();
    }, [leads, allCheckouts]);

    const ticketLeadsList = useMemo(() => {
        return leads.filter(lead => {
            // Access custom properties safely - check both camelCase and snake_case
            const utmSource = lead.utmSource || (lead as any).utm_source || '';
            const source = lead.source || '';
            const isTicketLead = utmSource === 'Ticket_Link' ||
                utmSource === 'Direct_Registration' ||
                utmSource === 'Manual_Entry' ||
                source === 'manual' ||
                utmSource === 'checkout' ||
                lead.ticket_generated === true;
            const matchProduct = selectedTicketFilter === 'all' || lead.product_id === selectedTicketFilter;
            const matchTurma = selectedTicketTurmaFilter === 'all' || lead.turma === selectedTicketTurmaFilter;

            return isTicketLead && matchProduct && matchTurma;
        });
    }, [leads, selectedTicketFilter, selectedTicketTurmaFilter]);

    return (
        <div className="animate-in fade-in duration-500 space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Controle de Ingressos</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Logs de emissões automáticas e manuais</p>
                </div>
                <div className="bg-amber-100 text-amber-600 px-6 py-3 rounded-2xl border border-amber-200 font-black text-xs uppercase flex items-center gap-2 shadow-sm">
                    <Ticket size={16} /> {ticketLeadsList.length} Ingressos Emitidos
                </div>
            </div>

            {/* Filtro por Abas (Produtos) + Filtro Turma */}
            <div className="flex flex-wrap items-center gap-6 border-b pb-6">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                    <button onClick={() => setSelectedTicketFilter('all')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedTicketFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Todos Produtos</button>
                    {allCheckouts.map(prod => (
                        <button key={prod.id} onClick={() => setSelectedTicketFilter(prod.id)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedTicketFilter === prod.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{prod.productName}</button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100 shadow-sm"><GraduationCap size={20} /></div>
                    <select
                        value={selectedTicketTurmaFilter}
                        onChange={(e) => setSelectedTicketTurmaFilter(e.target.value)}
                        className="bg-white border-2 border-gray-100 rounded-2xl px-6 py-2.5 text-xs font-black uppercase focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm text-gray-600"
                    >
                        <option value="all">Todas as Turmas</option>
                        {uniqueTurmas.map((turma: any) => <option key={turma} value={turma}>TURMA: {turma.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-900 text-white">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest w-16 text-center">#</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Aluno / Titular</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">CPF / Documento</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Produto / Evento</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Turma</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Data Emissão</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center w-32">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ticketLeadsList.length > 0 ? ticketLeadsList.map((lead, index) => {
                                const isSaving = savingId === lead.id;
                                return (
                                    <tr key={lead.id} className="hover:bg-amber-50/20 transition-all">
                                        <td className="p-6 text-center"><span className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-400 text-xs mx-auto">{ticketLeadsList.length - index}</span></td>
                                        <td className="p-6">
                                            <div className="font-black text-gray-900 text-sm">{lead.name}</div>
                                            <div className="text-[10px] font-black text-gray-400">{lead.email}</div>
                                        </td>
                                        <td className="p-6 font-bold text-gray-700 text-sm">{lead.cpf}</td>
                                        <td className="p-6">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-blue-100">
                                                {lead.product_name || allCheckouts.find(c => c.id === lead.product_id)?.productName || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-amber-100">
                                                {lead.turma || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6 font-bold text-gray-500 text-xs">{lead.date}</td>
                                        <td className="p-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => onReprintTicket(lead)}
                                                    className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-amber-600 transition-all"
                                                    title="Reemitir Ingresso"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteLead(lead.id)}
                                                    disabled={isSaving}
                                                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                    title="Excluir Registro de Ingresso"
                                                >
                                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={7} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum ingresso emitido nesta categoria.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
