import React, { useState, useMemo } from 'react';
import { Ticket, Send, ListFilter, QrCode, UserCheck, Search, Check, Users, Phone, Mail, Clock, RotateCcw } from 'lucide-react';
import { AppConfig, Lead, UserRole } from '../../types';
import { TicketGenerator } from './TicketGenerator';
import { TicketSender } from './TicketSender';
import { TicketLogs } from './TicketLogs';
import { TicketScanner } from './TicketScanner';

interface TicketsPresenceHubProps {
    userRole: UserRole;
    leads: Lead[];
    checkouts: AppConfig[];
    uploadService: (file: File) => Promise<string | null>;
    isUploading: string | null;
    savingId: string | null;
    onDeleteLead: (id: string) => void;
    onReprintTicket: (lead: Lead) => void;
    onUpdateStatus: (id: string, status: Lead['status']) => void;
    onCheckIn?: (id: string, checked: boolean) => void;
    initialSubTab?: 'checkin' | 'scanner' | 'sender' | 'generator' | 'logs';
}

export const TicketsPresenceHub: React.FC<TicketsPresenceHubProps> = ({
    userRole,
    leads,
    checkouts,
    uploadService,
    isUploading,
    savingId,
    onDeleteLead,
    onReprintTicket,
    onUpdateStatus,
    onCheckIn,
    initialSubTab = 'checkin'
}) => {
    const isManager = userRole === 'manager';
    const [subTab, setSubTab] = useState<'checkin' | 'scanner' | 'sender' | 'generator' | 'logs'>(
        initialSubTab
    );

    // Estados para Check-in Rápido
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('all');

    // Turmas disponíveis
    const turmasList = useMemo(() => {
        const set = new Set<string>();
        checkouts.forEach(c => {
            if (c.turma?.trim()) set.add(c.turma.trim());
            else if (c.productName?.trim()) set.add(c.productName.trim());
        });
        leads.forEach(l => {
            if (l.turma?.trim()) set.add(l.turma.trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [checkouts, leads]);

    const confirmedLeads = useMemo(() => {
        return leads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
    }, [leads]);

    const checkedInCount = useMemo(() => {
        return confirmedLeads.filter(l => l.checked_in).length;
    }, [confirmedLeads]);

    // Filtro da lista de Check-in
    const filteredCheckinLeads = useMemo(() => {
        return leads.filter(lead => {
            // Filtro de turma
            if (selectedTurmaFilter !== 'all') {
                const matchTurma = lead.turma === selectedTurmaFilter;
                const matchCheckout = checkouts.some(c => (c.turma === selectedTurmaFilter || c.productName === selectedTurmaFilter) && c.id === lead.product_id);
                if (!matchTurma && !matchCheckout) return false;
            }

            // Busca textual
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = (lead.name || '').toLowerCase().includes(q);
                const emailMatch = (lead.email || '').toLowerCase().includes(q);
                const phoneMatch = (lead.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
                const cpfMatch = (lead.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
                const idMatch = (lead.id || '').toLowerCase().includes(q);
                return nameMatch || emailMatch || phoneMatch || cpfMatch || idMatch;
            }

            return true;
        });
    }, [leads, selectedTurmaFilter, searchQuery, checkouts]);

    // Estatísticas da turma selecionada
    const currentTurmaLeads = useMemo(() => {
        if (selectedTurmaFilter === 'all') return leads;
        return leads.filter(lead => {
            const matchTurma = lead.turma === selectedTurmaFilter;
            const matchCheckout = checkouts.some(c => (c.turma === selectedTurmaFilter || c.productName === selectedTurmaFilter) && c.id === lead.product_id);
            return matchTurma || matchCheckout;
        });
    }, [leads, selectedTurmaFilter, checkouts]);

    const currentConfirmed = currentTurmaLeads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
    const currentCheckedIn = currentConfirmed.filter(l => l.checked_in).length;
    const currentPending = currentConfirmed.length - currentCheckedIn;
    const presenceRate = currentConfirmed.length > 0 ? Math.round((currentCheckedIn / currentConfirmed.length) * 100) : 0;

    const tabs = [
        { id: 'checkin', label: 'Check-in Rápido', icon: UserCheck, badge: `${checkedInCount}/${confirmedLeads.length}` },
        { id: 'scanner', label: 'Escanear QR Code', icon: QrCode },
        ...(!isManager ? [
            { id: 'sender', label: 'Disparo em Lote', icon: Send, badge: `${confirmedLeads.length} pagos` },
            { id: 'generator', label: 'Emitir Ingresso Individual', icon: Ticket },
        ] : []),
        { id: 'logs', label: 'Histórico & Reimpressão', icon: ListFilter, badge: `${leads.filter(l => l.ticket_generated).length}` },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header com Navegação Integrada estilo Pill Tabs */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                            <Ticket size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Hub de Ingressos & Portaria</h2>
                            <p className="text-xs text-gray-500 font-medium">Gestão centralizada de recepção, validação de presença, disparos e histórico</p>
                        </div>
                    </div>
                </div>

                {/* Sub-abas pill */}
                <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 p-1.5 rounded-2xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = subTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSubTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                            >
                                <Icon size={15} />
                                <span>{tab.label}</span>
                                {'badge' in tab && tab.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                        isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Conteúdo da Sub-Aba selecionada */}
            <div className="transition-opacity duration-200">
                {/* 1. ABA CHECK-IN RÁPIDO PARA PORTARIA */}
                {subTab === 'checkin' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Cards de Métricas em Tempo Real */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-gray-400">Total Confirmados</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{currentConfirmed.length}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">Alunos com vaga garantida</p>
                            </div>
                            <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-emerald-600">Presentes no Evento</p>
                                <p className="text-3xl font-black text-emerald-700 mt-1">{currentCheckedIn}</p>
                                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Check-in realizado</p>
                            </div>
                            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-amber-600">Ausentes / A Chegar</p>
                                <p className="text-3xl font-black text-amber-700 mt-1">{currentPending}</p>
                                <p className="text-[10px] font-bold text-amber-600 mt-0.5">Aguardando na recepção</p>
                            </div>
                            <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100 shadow-sm">
                                <p className="text-[10px] font-black uppercase text-blue-600">Taxa de Presença</p>
                                <p className="text-3xl font-black text-blue-700 mt-1">{presenceRate}%</p>
                                <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${presenceRate}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Filtros e Busca Instantânea */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por Nome, Telefone/WhatsApp, CPF ou Código..."
                                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-gray-900 text-sm transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-gray-400 hover:text-gray-700">
                                        Limpar
                                    </button>
                                )}
                            </div>

                            <div className="w-full md:w-72">
                                <select
                                    value={selectedTurmaFilter}
                                    onChange={(e) => setSelectedTurmaFilter(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-gray-900 text-sm transition-all"
                                >
                                    <option value="all">Todas as Turmas ({leads.length} alunos)</option>
                                    {turmasList.map(turma => (
                                        <option key={turma} value={turma}>{turma}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tabela de Check-in com 1 Clique */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left bg-gray-50/50">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Aluno</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">Contato</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">Turma / Pagamento</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Controle de Portaria</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredCheckinLeads.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-gray-400 font-bold">
                                                    Nenhum aluno encontrado com os filtros atuais.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCheckinLeads.map(lead => {
                                                const isStudentPaid = lead.status === 'Pago' || lead.status === 'Aprovado';
                                                return (
                                                    <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="font-black text-gray-900 text-sm">{lead.name}</p>
                                                            {lead.cpf && <p className="text-xs text-gray-400 font-bold">CPF: {lead.cpf}</p>}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-bold text-gray-600">
                                                            {lead.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400" /> {lead.phone}</div>}
                                                            {lead.email && <div className="flex items-center gap-1 text-gray-400 text-[11px]"><Mail size={12} /> {lead.email}</div>}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-black text-gray-800">{lead.turma || lead.product_name || 'Geral'}</p>
                                                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                isStudentPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                            }`}>
                                                                {lead.status || 'Pendente'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {lead.checked_in ? (
                                                                <div className="inline-flex items-center gap-3">
                                                                    <div className="text-right">
                                                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-sm">
                                                                            <Check size={14} className="stroke-[3]" /> Presente
                                                                        </span>
                                                                        {lead.checked_in_at && (
                                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center justify-end gap-1">
                                                                                <Clock size={10} /> {new Date(lead.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => onCheckIn?.(lead.id, false)}
                                                                        className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-gray-100 transition-all"
                                                                        title="Desfazer check-in"
                                                                    >
                                                                        <RotateCcw size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => onCheckIn?.(lead.id, true)}
                                                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 ml-auto"
                                                                >
                                                                    <Check size={14} className="stroke-[3]" />
                                                                    <span>Marcar Presença</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'sender' && !isManager && (
                    <TicketSender
                        leads={leads}
                        checkouts={checkouts}
                        uploadService={uploadService}
                        isUploading={isUploading}
                    />
                )}

                {subTab === 'generator' && !isManager && (
                    <TicketGenerator allCheckouts={checkouts} />
                )}

                {subTab === 'logs' && (
                    <TicketLogs
                        leads={leads}
                        allCheckouts={checkouts}
                        savingId={savingId}
                        onDeleteLead={onDeleteLead}
                        onReprintTicket={onReprintTicket}
                    />
                )}

                {subTab === 'scanner' && (
                    <TicketScanner
                        leads={leads}
                        allCheckouts={checkouts}
                        onUpdateStatus={onUpdateStatus}
                    />
                )}
            </div>
        </div>
    );
};
