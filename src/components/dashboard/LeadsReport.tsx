import React, { useMemo, useState } from 'react';
import {
    Users, Wallet, UserPlus, X, Ticket, Printer,
    Smartphone, MapPin, GraduationCap, ShoppingBag, Hammer, Trash2, Loader2,
    Check, Clock, User, Tag, DollarSign, MessageCircle, RotateCcw, Search, ClipboardList,
    Award, UserCheck, Send, MoreVertical, Eye, FileText, Square, CheckSquare
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Lead, AppConfig, UserRole } from '../../types';

interface LeadsReportProps {
    userRole: UserRole;
    leads: Lead[];
    allCheckouts: AppConfig[];
    totalRevenue: number;
    totalLeadsCount: number;
    savingId: string | null;
    onUpdateStatus: (id: string, status: 'Novo' | 'Pago' | 'Pendente' | 'Sinal' | 'Pagar no dia' | 'Aprovado' | 'Cancelado' | 'Devolvido' | 'Abandonado') => void;
    onUpdatePaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    onSaveManualLead: (lead: Partial<Lead>) => Promise<void>;
    onPrintLeads: () => void;
    onMoveLeadTurma?: (leadId: string, newTurma: string) => Promise<void>;
    onCheckIn?: (leadId: string, checkedIn: boolean) => Promise<void>;
    onUpdateLeadField?: (id: string, fields: Record<string, any>) => Promise<void>;
    isOnline: boolean;
    pendingSyncCount: number;
    onSync: () => Promise<void>;
}

export const LeadsReport: React.FC<LeadsReportProps> = ({
    userRole,
    leads,
    allCheckouts,
    totalRevenue,
    totalLeadsCount,
    savingId,
    onUpdateStatus,
    onUpdatePaidAmount,
    onDeleteLead,
    onSaveManualLead,
    onPrintLeads,
    onMoveLeadTurma,
    onCheckIn,
    onUpdateLeadField,
    isOnline,
    pendingSyncCount,
    onSync
}) => {
    const formatDateTime = (dt?: string) => {
        if (!dt) return '';
        const d = new Date(dt);
        if (isNaN(d.getTime())) return dt;
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const [selectedLeadFilter, setSelectedLeadFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyTickets, setShowOnlyTickets] = useState(false);
    const [copiedNames, setCopiedNames] = useState(false);
    const [showManualLeadForm, setShowManualLeadForm] = useState(false);
    const [manualLead, setManualLead] = useState<Partial<Lead>>({});
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [bulkStatus, setBulkStatus] = useState<string>('');

    const uniqueTurmas = useMemo(() => {
        const turmas = new Set<string>();
        leads.forEach(l => { if (l.turma) turmas.add(l.turma); });
        allCheckouts.forEach(c => { if (c.turma) turmas.add(c.turma); });
        return Array.from(turmas).sort();
    }, [leads, allCheckouts]);

    const moveLeadToTurma = async (leadId: string, newTurma: string) => {
        if (!newTurma) return;
        if (onMoveLeadTurma) {
            await onMoveLeadTurma(leadId, newTurma);
        }
    };

    const filteredLeadsList = useMemo(() => {
        let result = leads;
        if (selectedLeadFilter !== 'all') {
            result = result.filter(l => l.product_id === selectedLeadFilter);
        }
        if (paymentFilter === 'paid') {
            result = result.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
        } else if (paymentFilter === 'unpaid') {
            result = result.filter(l => l.status !== 'Pago' && l.status !== 'Aprovado');
        } else if (paymentFilter === 'abandoned') {
            result = result.filter(l => l.status === 'Abandonado');
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(l =>
                l.name?.toLowerCase().includes(term) ||
                l.phone?.includes(term) ||
                l.email?.toLowerCase().includes(term) ||
                l.cpf?.includes(term)
            );
        }
        if (showOnlyTickets) {
            result = result.filter(l => l.checked_in);
        }
        return result;
    }, [leads, selectedLeadFilter, paymentFilter, searchTerm, showOnlyTickets]);

    const copyAllNames = () => {
        const names = filteredLeadsList.map(l => l.name).join('\n');
        navigator.clipboard.writeText(names);
        setCopiedNames(true);
        setTimeout(() => setCopiedNames(false), 2000);
    };

    // Calculate product stats
    const productStats = useMemo(() => {
        const stats: Record<string, { count: number; paid: number; revenue: number; name: string }> = {};

        leads.forEach(lead => {
            if (!lead.product_id) return;

            if (!stats[lead.product_id]) {
                const product = allCheckouts.find(c => c.id === lead.product_id);
                stats[lead.product_id] = {
                    count: 0,
                    paid: 0,
                    revenue: 0,
                    name: product?.productName || 'Desconhecido'
                };
            }

            stats[lead.product_id].count++;
            if (lead.status === 'Pago' || lead.status === 'Aprovado') {
                stats[lead.product_id].paid++;
                stats[lead.product_id].revenue += lead.paid_amount || 0;
            }
        });

        return Object.entries(stats)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count);
    }, [leads, allCheckouts]);

    const handleManualLeadSubmit = async () => {
        if (!manualLead.name || !manualLead.email) {
            alert('Preencha pelo menos nome e email');
            return;
        }
        await onSaveManualLead(manualLead);
        setShowManualLeadForm(false);
        setManualLead({});
    };

    // Bulk selection functions
    const toggleSelectAll = () => {
        if (selectedLeadIds.length === filteredLeadsList.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(filteredLeadsList.map(l => l.id));
        }
    };

    const toggleSelectLead = (id: string) => {
        if (selectedLeadIds.includes(id)) {
            setSelectedLeadIds(selectedLeadIds.filter(i => i !== id));
        } else {
            setSelectedLeadIds([...selectedLeadIds, id]);
        }
    };

    // Bulk status update
    const handleBulkStatusUpdate = async () => {
        if (!bulkStatus || selectedLeadIds.length === 0) return;
        
        for (const id of selectedLeadIds) {
            await onUpdateStatus(id, bulkStatus as any);
        }
        setSelectedLeadIds([]);
        setBulkStatus('');
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-8 pb-20">
            {/* Status Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 leads-section-top">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <ClipboardList className="text-blue-600" /> Relatório de Vendas
                    </h2>
                    <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Acompanhe seus leads e conversões</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    {!isOnline && (
                        <div className="flex-1 md:flex-initial bg-red-100 p-6 rounded-[2.5rem] border border-red-200 animate-pulse">
                            <div className="flex items-center gap-2 mb-1 opacity-70 text-red-600"><Smartphone size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">MODO OFFLINE</span></div>
                        </div>
                    )}
                    {pendingSyncCount > 0 && (
                        <div className="flex-1 md:flex-initial bg-amber-100 p-6 rounded-[2.5rem] border border-amber-200">
                            <div className="flex items-center gap-2 mb-1 opacity-70 text-amber-700"><Check size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">PENDENTE</span></div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-amber-900">{pendingSyncCount}</span>
                                <button onClick={onSync} className="text-[10px] font-black uppercase bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-all">Sincronizar</button>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 md:flex-initial bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100">
                        <div className="flex items-center gap-2 mb-1 opacity-70 text-blue-600"><Users size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">Total Cadastros</span></div>
                        <span className="text-xl font-black text-blue-900">{totalLeadsCount}</span>
                    </div>
                    <div className="flex-1 md:flex-initial bg-emerald-600 p-6 rounded-[2.5rem] shadow-xl text-white">
                        <div className="flex items-center gap-2 mb-1 opacity-70"><Wallet size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">Total Recebido</span></div>
                        <span className="text-xl font-black">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Manual Lead Form */}
            {userRole === 'master' && showManualLeadForm && (
                <div className="bg-blue-50/50 border-2 border-blue-100 p-10 rounded-[3rem] animate-in slide-in-from-top-4 duration-500 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                            <UserPlus className="text-blue-600" /> {manualLead.id ? 'Editar Cadastro de Aluno' : 'Cadastrar Aluno Manualmente'}
                        </h3>
                        <button onClick={() => setShowManualLeadForm(false)} className="text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="Nome do Aluno" type="text" placeholder="Nome Completo" value={manualLead.name || ''} onChange={v => setManualLead({ ...manualLead, name: v })} />
                        <Input label="E-mail" type="email" placeholder="aluno@email.com" value={manualLead.email || ''} onChange={v => setManualLead({ ...manualLead, email: v })} />
                        <Input label="WhatsApp" type="tel" placeholder="(00) 00000-0000" mask="phone" value={manualLead.phone || ''} onChange={v => setManualLead({ ...manualLead, phone: v })} />
                        <Input label="CPF" type="text" placeholder="000.000.000-00" mask="cpf" value={manualLead.cpf || ''} onChange={v => setManualLead({ ...manualLead, cpf: v })} />
                        <Input label="Cidade" type="text" placeholder="Ex: Rio de Janeiro" value={manualLead.city || ''} onChange={v => setManualLead({ ...manualLead, city: v })} />

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase text-gray-500">Produto / Turma</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                value={manualLead.product_id || ''}
                                onChange={e => setManualLead({ ...manualLead, product_id: e.target.value, product_name: allCheckouts.find(c => c.id === e.target.value)?.productName || '' })}
                            >
                                <option value="">Selecione...</option>
                                {allCheckouts.map(c => <option key={c.id} value={c.id}>{c.productName} ({c.turma || 'Geral'})</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase text-gray-500">Status</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                value={manualLead.status || 'Novo'}
                                onChange={e => setManualLead({ ...manualLead, status: e.target.value as any })}
                            >
                                <option value="Novo">Novo</option>
                                <option value="Pago">Pago</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Abandonado">Abandonado</option>
                            </select>
                        </div>

                        <div className="md:col-span-3 border-t pt-4 mt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Input label="Data" type="text" placeholder="Ex: 25/12/2024" value={manualLead.date || ''} onChange={v => setManualLead({ ...manualLead, date: v })} />
                                <Input label="Hora" type="text" placeholder="Ex: 14:30" value={manualLead.time || ''} onChange={v => setManualLead({ ...manualLead, time: v })} />
                                <Input label="Cupom Utilizado" type="text" placeholder="Código do cupom" value={manualLead.coupon_code || ''} onChange={v => setManualLead({ ...manualLead, coupon_code: v })} />
                                <div className="flex items-end">
                                    <button onClick={handleManualLeadSubmit} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                        <Send size={16} /> {manualLead.id ? 'Atualizar' : 'Cadastrar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Statistics Cards */}
            {productStats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {productStats.map(product => (
                        <div key={product.id} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest mb-2">Produto</h3>
                                    <p className="text-sm font-black text-gray-900 truncate">{product.name}</p>
                                </div>
                                <div className="text-2xl text-blue-200 ml-2">📊</div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-600">Cadastros</span>
                                    <span className="text-lg font-black text-blue-600">{product.count}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-600">Pagos</span>
                                    <span className="text-lg font-black text-emerald-600">{product.paid}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                    <span className="text-xs font-bold text-gray-600">Recebido</span>
                                    <span className="text-sm font-black text-gray-900">R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 border-b pb-6">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                    <button onClick={() => setSelectedLeadFilter('all')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedLeadFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Todos Produtos</button>
                    {allCheckouts.map(prod => (
                        <button key={prod.id} onClick={() => setSelectedLeadFilter(prod.id)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedLeadFilter === prod.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{prod.productName}</button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100 shadow-sm"><GraduationCap size={20} /></div>
                    <select
                        className="bg-white border-2 border-gray-100 rounded-2xl px-6 py-2.5 text-xs font-black uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-gray-600"
                        value={selectedLeadFilter}
                        onChange={e => setSelectedLeadFilter(e.target.value)}
                    >
                        <option value="all">Todos os Produtos</option>
                        {allCheckouts.map(c => <option key={c.id} value={c.id}>{c.productName} ({c.turma || 'Geral'})</option>)}
                    </select>
                </div>

                <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>

                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                    <button onClick={() => setPaymentFilter('all')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${paymentFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Todos Status</button>
                    <button onClick={() => setPaymentFilter('paid')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${paymentFilter === 'paid' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Pagos</button>
                    <button onClick={() => setPaymentFilter('unpaid')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${paymentFilter === 'unpaid' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Pendentes</button>
                    <button onClick={() => setPaymentFilter('abandoned')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${paymentFilter === 'abandoned' ? 'bg-gray-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Abandonados</button>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase bg-gray-100 border-0 outline-none focus:ring-2 focus:ring-blue-500 w-40"
                        />
                    </div>
                </div>

                <button onClick={() => setShowOnlyTickets(!showOnlyTickets)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${showOnlyTickets ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    <UserCheck size={16} /> Com Check-in
                </button>

                <button onClick={onPrintLeads} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all shadow-sm">
                    <Printer size={16} /> Imprimir
                </button>

                <button onClick={copyAllNames} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm border ${copiedNames ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-900 text-white hover:bg-black'}`}>
                    {copiedNames ? <Check size={16} /> : <ClipboardList size={16} />} {copiedNames ? 'Copiado!' : 'Copiar Nomes'}
                </button>

                <div className="flex items-center gap-3 ml-auto">
                    <button onClick={() => {
                        setShowManualLeadForm(!showManualLeadForm);
                        if (!showManualLeadForm) setManualLead({});
                    }} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase bg-gray-900 text-white hover:bg-black transition-all shadow-xl">
                        <UserPlus size={14} /> Novo Registro
                    </button>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="bg-white rounded-[3rem] shadow-xl border overflow-hidden md:hidden">
                <div className="divide-y divide-gray-50">
                    {filteredLeadsList.length > 0 ? filteredLeadsList.map((lead, index) => {
                        const product = allCheckouts.find(c => c.id === lead.product_id);
                        const isSaving = savingId === lead.id;
                        
                        const whatsappMessage = (lead.status === 'Pago' || lead.status === 'Aprovado')
                            ? `Oi ${lead.name?.split(' ')[0] || ''}, tudo bem? Vi que sua inscrição na ${lead.product_name || product?.productName || 'turma'} foi confirmada! Seja bem-vindo(a)!`
                            : (lead.status === 'Abandonado'
                                ? `Oi ${lead.name?.split(' ')[0] || ''}, tudo bem? Vi que você começou sua inscrição na ${lead.product_name || product?.productName || 'turma'} mas não finalizou. Ficou com alguma dúvida? Posso te ajudar?`
                                : `Oi ${lead.name?.split(' ')[0] || ''}, tudo bem? Vi que você tentou se inscriptionar na ${lead.product_name || product?.productName || 'turma'} mas o pagamento não confirmou. Teve alguma dúvida?`);

                        const whatsappLink = `https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(whatsappMessage)}`;

                        return (
                            <div key={lead.id} className="p-4 bg-white">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-gray-900 text-sm truncate">{lead.name}</p>
                                        <p className="text-xs text-emerald-600">{lead.phone}</p>
                                        {lead.city && <p className="text-[10px] text-amber-600">{lead.city}</p>}
                                    </div>
                                    <select value={lead.status || 'Novo'} onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)} className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${lead.status === 'Pago' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                        {['Novo', 'Pago', 'Pendente', 'Sinal', 'Pagar no dia', 'Aprovado', 'Cancelado', 'Devolvido', 'Abandonado'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${lead.status === 'Pago' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {lead.status}
                                    </span>
                                    <span className="text-[9px] font-black text-gray-500">
                                        {formatDateTime(lead.submitted_at ?? lead.created_at).split(',')[0] || formatDateTime(lead.submitted_at ?? lead.created_at)}
                                    </span>
                                    <span className="text-[9px] font-black text-gray-400 truncate max-w-[120px]">
                                        {lead.product_name || product?.productName || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={async () => {
                                            const ticketUrl = `${window.location.origin}/?mode=ticket&checkout=${lead.product_id}&cpf=${lead.cpf}`;
                                            // Save emitter info - get from localStorage or use a default
                                            const emittedBy = localStorage.getItem('vox_user_email') || 'Admin';
                                            // Update lead with emitter info
                                            if (lead.id) {
                                                await onUpdateLeadField?.(lead.id, { emitted_by: emittedBy, emission_date: new Date().toISOString() });
                                            }
                                            window.open(ticketUrl, '_blank');
                                        }}
                                        className="px-3 py-2 rounded-lg bg-purple-50 text-purple-500 text-xs font-bold flex items-center gap-1"
                                    >
                                        <Ticket size={12} /> Ingresso
                                    </button>
                                    <button
                                        onClick={() => {
                                            const certUrl = `${window.location.origin}/?mode=certificate&checkout=${lead.product_id}&cpf=${lead.cpf}`;
                                            window.open(certUrl, '_blank');
                                        }}
                                        className="px-3 py-2 rounded-lg bg-amber-50 text-amber-500 text-xs font-bold flex items-center gap-1"
                                    >
                                        <Award size={12} /> Certificado
                                    </button>
                                    {lead.checked_in ? (
                                        <span className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center gap-1">
                                            <UserCheck size={12} /> Check-in OK
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => onCheckIn?.(lead.id, true)}
                                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-500 text-xs font-bold flex items-center gap-1"
                                        >
                                            <Check size={12} /> Check-in
                                        </button>
                                    )}
                                    <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-500 text-xs font-bold flex items-center gap-1"
                                    >
                                        <MessageCircle size={12} /> WhatsApp
                                    </a>
                                    <button
                                        onClick={() => {
                                            setManualLead(lead);
                                            setShowManualLeadForm(true);
                                        }}
                                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-500 text-xs font-bold flex items-center gap-1"
                                    >
                                        <Hammer size={12} /> Editar
                                    </button>
                                    <button
                                        onClick={() => onDeleteLead(lead.id)}
                                        disabled={isSaving}
                                        className="px-3 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-bold flex items-center gap-1"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-8 text-center text-gray-400 font-bold">Nenhum registro encontrado.</div>
                    )}
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="bg-white rounded-[3rem] shadow-xl border overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-900 text-white">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest w-16 text-center">#</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest"><div className="flex items-center gap-2"><User size={12} /> Identificação Cliente</div></th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest"><div className="flex items-center gap-2"><Clock size={12} /> Data</div></th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest"><div className="flex items-center gap-2"><Tag size={12} /> Status Lead</div></th>
                                {userRole === 'master' && (
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest"><div className="flex items-center gap-2"><DollarSign size={12} /> Valor Pago</div></th>
                                )}
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest"><div className="flex items-center gap-2"><GraduationCap size={12} /> Turma / Produto</div></th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-28">Mover</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-16">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLeadsList.length > 0 ? filteredLeadsList.map((lead, index) => {
                                const product = allCheckouts.find(c => c.id === lead.product_id);
                                const isSaving = savingId === lead.id;

                                const whatsappMessage = (lead.status === 'Pago' || lead.status === 'Aprovado')
                                    ? `Oi ${lead.name?.split(' ')[0] || ''}, tudo bem? Vi que sua inscrição na ${lead.product_name || product?.productName || 'turma'} foi confirmada! Seja bem-vindo(a)!`
                                    : (lead.status === 'Abandonado'
                                        ? `Oi ${lead.name?.split(' ')[0] || ''}, tudo bem? Vi que você começou sua inscrição na ${lead.product_name || product?.productName || 'turma'} mas não finalizou. Ficou com alguma dúvida? Posso te ajudar?`
                                        : `Oi ${lead.name?.split(' ')[0] || ''}, tudo bem? Vi que você tentou se inscriptionar na ${lead.product_name || product?.productName || 'turma'} mas o pagamento não confirmou. Teve alguma dúvida?`);

                                const whatsappLink = `https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(whatsappMessage)}`;

                                return (
                                    <tr key={lead.id} className="hover:bg-blue-50/20 transition-all">
                                        <td className="p-4 text-center"><span className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-400 text-xs mx-auto">{filteredLeadsList.length - index}</span></td>
                                        <td className="p-4">
                                            <div className="font-black text-gray-900 text-sm mb-1">{lead.name}</div>
                                            <div className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><Smartphone size={10} /> {lead.phone}</div>
                                            {lead.city && <div className="text-[9px] font-black text-amber-600 flex items-center gap-1"><MapPin size={10} /> {lead.city}</div>}
                                            <div className="text-[8px] font-bold text-gray-300">CPF: {lead.cpf}</div>
                                            {(lead as any).utm_source === 'Manual_Entry' && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block">Manual</span>}
                                            {(lead as any).utm_source === 'Direct_Registration' && <span className="bg-blue-100 text-blue-500 px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block">Auto-Registro</span>}
                                            {(lead as any).utm_source === 'Ticket_Link' && <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block">Link Ingresso</span>}
                                            {(lead as any).payer_name && (
                                                <div className="mt-2 bg-blue-50 p-2 rounded border border-blue-100 inline-block">
                                                    <div className="text-[8px] font-black uppercase text-blue-400 mb-0.5 tracking-widest">Pago Por:</div>
                                                    <div className="text-[10px] font-bold text-blue-700">{(lead as any).payer_name}</div>
                                                    {(lead as any).payer_document && <div className="text-[9px] text-blue-600">CPF: {(lead as any).payer_document}</div>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {lead.submitted_at || lead.created_at ? (
                                                <>
                                                    <div className="font-bold text-gray-900 text-sm leading-none mb-1">
                                                        {formatDateTime(lead.submitted_at ?? lead.created_at).split(',')[0] || formatDateTime(lead.submitted_at ?? lead.created_at)}
                                                    </div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                                                        {formatDateTime(lead.submitted_at ?? lead.created_at).split(',')[1]?.trim() || ''}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="font-bold text-gray-900 text-sm leading-none mb-1">
                                                        {lead.date?.includes(',') ? lead.date.split(',')[0] : lead.date || 'Data N/A'}
                                                    </div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                                                        {lead.date?.includes(',') ? lead.date.split(',')[1]?.trim() : ''}
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <select value={lead.status || 'Novo'} onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border focus:outline-none transition-all ${lead.status === 'Pago' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {['Novo', 'Pago', 'Pendente', 'Sinal', 'Pagar no dia', 'Aprovado', 'Cancelado', 'Devolvido', 'Abandonado'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </td>
                                        {userRole === 'master' && (
                                            <td className="p-4">
                                                <div className="relative inline-block">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                                                    <input type="text" className="w-28 bg-gray-50 border rounded-xl px-8 py-2 text-sm font-black text-emerald-600" defaultValue={lead.paid_amount || ''} onBlur={(e) => onUpdatePaidAmount(lead.id, e.target.value)} />
                                                </div>
                                                {(lead as any).coupon_code && (
                                                    <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-amber-200 uppercase tracking-tighter flex items-center gap-1.5 shadow-sm mt-2 inline-flex">
                                                        <Tag size={10} /> {(lead as any).coupon_code}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-amber-200 uppercase tracking-tighter flex items-center gap-1.5 shadow-sm">
                                                        <GraduationCap size={12} className="text-amber-500" /> {lead.turma || product?.turma || 'SEM TURMA'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[9px] font-black border border-blue-200 uppercase tracking-tighter flex items-center gap-1.5 shadow-sm">
                                                        <ShoppingBag size={12} className="text-blue-500" /> {lead.product_name || product?.productName || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <select onChange={(e) => moveLeadToTurma(lead.id, e.target.value)} className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border border-gray-200">
                                                <option value="">Mover para...</option>
                                                {uniqueTurmas.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(`actions-${lead.id}`);
                                                        if (el) el.classList.toggle('hidden');
                                                    }}
                                                    className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-all"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                <div id={`actions-${lead.id}`} className="hidden absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[180px] text-left">
                                                    <button
                                                        onClick={() => {
                                                            if (!lead.product_id) {
                                                                alert('Este lead não tem um produto associado');
                                                                return;
                                                            }
                                                            const ticketUrl = `${window.location.origin}/?mode=ticket&checkout=${lead.product_id}&cpf=${lead.cpf}`;
                                                            document.getElementById(`actions-${lead.id}`)?.classList.add('hidden');
                                                            window.open(ticketUrl, '_blank') || (window.location.href = ticketUrl);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-purple-50 flex items-center gap-2"
                                                    >
                                                        <Ticket size={14} className="text-purple-500" /> Ver Ingresso
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!lead.product_id) {
                                                                alert('Este lead não tem um produto associado');
                                                                return;
                                                            }
                                                            const certUrl = `${window.location.origin}/?mode=certificate&checkout=${lead.product_id}&cpf=${lead.cpf}`;
                                                            document.getElementById(`actions-${lead.id}`)?.classList.add('hidden');
                                                            window.open(certUrl, '_blank') || (window.location.href = certUrl);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                                                    >
                                                        <Award size={14} className="text-amber-500" /> Gerar Certificado
                                                    </button>
                                                    {lead.checked_in ? (
                                                        <div className="w-full px-4 py-2 text-left text-xs font-bold text-emerald-600 flex items-center gap-2">
                                                            <UserCheck size={14} /> Check-in OK
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                onCheckIn?.(lead.id, true);
                                                                document.getElementById(`actions-${lead.id}`)?.classList.add('hidden');
                                                            }}
                                                            className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                                        >
                                                            <Check size={14} className="text-blue-500" /> Check-in
                                                        </button>
                                                    )}
                                                    <a
                                                        href={whatsappLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 flex items-center gap-2"
                                                    >
                                                        <MessageCircle size={14} className="text-emerald-500" /> WhatsApp
                                                    </a>
                                                    <button
                                                        onClick={() => {
                                                            setManualLead(lead);
                                                            setShowManualLeadForm(true);
                                                            document.getElementById(`actions-${lead.id}`)?.classList.add('hidden');
                                                            document.querySelector('.leads-section-top')?.scrollIntoView({ behavior: 'smooth' });
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                                                    >
                                                        <Hammer size={14} className="text-blue-500" /> Editar
                                                    </button>
                                                    <hr className="my-2 border-gray-100" />
                                                    <button
                                                        onClick={() => {
                                                            onDeleteLead(lead.id);
                                                            document.getElementById(`actions-${lead.id}`)?.classList.add('hidden');
                                                        }}
                                                        disabled={isSaving}
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={userRole === 'master' ? 8 : 7} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum cadastro encontrado com estes filtros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
