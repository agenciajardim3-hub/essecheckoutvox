
import React, { useMemo, useState } from 'react';
import { Ticket, GraduationCap, Printer, Trash2, Loader2, Mail, Check, XCircle } from 'lucide-react';
import { AppConfig, Lead } from '../../types';
import { DEFAULT_SUPABASE_KEY } from '../../hooks/useSupabase';

const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  DEFAULT_SUPABASE_KEY;

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
    const [sendingStates, setSendingStates] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});

    const handleSendEmail = async (lead: Lead) => {
        if (!lead.email) {
            alert('Este aluno não tem e-mail cadastrado.');
            return;
        }

        const confirmSend = confirm(`Enviar ingresso para ${lead.name} (${lead.email}) por e-mail?`);
        if (!confirmSend) return;

        setSendingStates(prev => ({ ...prev, [lead.id]: 'sending' }));

        try {
            const ticketUrl = `${window.location.origin}/?mode=ticket&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`;
            
            const htmlMessage = `
              <p>Olá! 🎉 Aqui está seu ingresso.</p>
              <p style="margin-top: 18px;"><strong>🎫 Seu ingresso:</strong></p>
              <p><a href="${ticketUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:bold;">Abrir ingresso</a></p>
              <p style="font-size:13px;color:#6b7280;">Caso o botão não funcione, copie e cole este link no navegador:<br />${ticketUrl}</p>
            `;

            const response = await fetch(SEND_EMAIL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(SUPABASE_ANON_KEY ? {
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'apikey': SUPABASE_ANON_KEY
                    } : {})
                },
                body: JSON.stringify({
                    to: lead.email,
                    name: lead.name || 'Aluno',
                    subject: `Seu Ingresso - ${lead.product_name || 'Vox Marketing Academy'}`,
                    productName: lead.product_name || 'Vox Marketing Academy',
                    message: htmlMessage,
                    ticketUrl,
                    certificateUrl: ''
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar e-mail');
            }

            setSendingStates(prev => ({ ...prev, [lead.id]: 'sent' }));
            
            // Clear success state after a few seconds
            setTimeout(() => {
                setSendingStates(prev => ({ ...prev, [lead.id]: 'idle' }));
            }, 3000);

        } catch (error) {
            console.error('Erro ao enviar e-mail:', error);
            setSendingStates(prev => ({ ...prev, [lead.id]: 'error' }));
            alert('Falha ao enviar e-mail. Tente novamente.');
        }
    };

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
                lead.ticket_generated === true ||
                lead.status === 'Pago' ||
                lead.status === 'Aprovado';
            const matchProduct = selectedTicketFilter === 'all' || lead.product_id === selectedTicketFilter;
            
            let matchTurma = false;
            if (selectedTicketTurmaFilter === 'all') {
                matchTurma = true;
            } else {
                const checkoutForLead = allCheckouts.find(c => c.id === lead.product_id);
                matchTurma = lead.turma === selectedTicketTurmaFilter || 
                             checkoutForLead?.turma === selectedTicketTurmaFilter ||
                             checkoutForLead?.productName === selectedTicketTurmaFilter;
            }

            return isTicketLead && matchProduct && matchTurma;
        });
    }, [leads, selectedTicketFilter, selectedTicketTurmaFilter, allCheckouts]);

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
                                                    onClick={() => handleSendEmail(lead)}
                                                    disabled={sendingStates[lead.id] === 'sending'}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                                                        sendingStates[lead.id] === 'sent' 
                                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                                            : sendingStates[lead.id] === 'error'
                                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                                    }`}
                                                    title="Enviar Ingresso por E-mail"
                                                >
                                                    {sendingStates[lead.id] === 'sending' ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : sendingStates[lead.id] === 'sent' ? (
                                                        <Check size={18} />
                                                    ) : sendingStates[lead.id] === 'error' ? (
                                                        <XCircle size={18} />
                                                    ) : (
                                                        <Mail size={18} />
                                                    )}
                                                </button>
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
