import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, Copy, Edit3, Eye, GraduationCap, Link as LinkIcon, Plus, Search, Users, Wallet, MapPin, Clock, UserCheck } from 'lucide-react';
import { Lead, AppConfig, UserRole } from '../../types';

interface TurmasDashboardProps {
    checkouts: AppConfig[];
    leads: Lead[];
    userRole: UserRole;
    onUpdateLeadStatus: (id: string, status: any) => void;
    onUpdatePaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    onCheckIn?: (id: string, checked: boolean) => void;
    onToggleCheckoutActive?: (checkoutId: string, isActive: boolean) => void;
    onEditCheckout?: (checkout: AppConfig) => void;
    onCreateCheckout?: () => void;
    savingId: string | null;
}

type TurmaGroup = {
    key: string;
    title: string;
    date?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
    city: string;
    area: string;
    checkouts: AppConfig[];
    leads: Lead[];
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}T12:00:00`);
    }
    return new Date(`${dateStr}T12:00:00`);
};

const formatDate = (dateStr?: string) => {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const monthKeyFromDate = (dateStr?: string) => {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return 'sem-data';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabelFromKey = (key: string) => {
    if (key === 'sem-data') return 'Sem data definida';
    const [year, month] = key.split('-').map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const getCheckoutUrl = (checkout: AppConfig, mode?: 'reg') => {
    const url = new URL(window.location.origin + window.location.pathname);
    // Usa o slug (unico por checkout apos o reparo automatico de duplicados no App).
    // Sem slug, cai para o id, que tambem e unico.
    if (checkout.slug) url.searchParams.set('p', checkout.slug);
    else url.searchParams.set('checkout', checkout.id);
    if (mode === 'reg') url.searchParams.set('mode', 'reg');
    return url.toString();
};

const normalizeText = (value?: string) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const detectRegion = (checkout: AppConfig): { city: string; area: string } => {
    const text = normalizeText(`${checkout.turma || ''} ${checkout.productName || ''} ${checkout.eventLocation || ''} ${checkout.slug || ''} ${checkout.folder || ''}`);

    const knownAreas = [
        { key: 'tucuruvi', city: 'São Paulo', area: 'Tucuruvi' },
        { key: 'jabaquara', city: 'São Paulo', area: 'Jabaquara' },
        { key: 'santana', city: 'São Paulo', area: 'Santana' },
        { key: 'tatuape', city: 'São Paulo', area: 'Tatuapé' },
        { key: 'pinheiros', city: 'São Paulo', area: 'Pinheiros' },
        { key: 'lapa', city: 'São Paulo', area: 'Lapa' },
        { key: 'mooca', city: 'São Paulo', area: 'Mooca' },
        { key: 'guarulhos', city: 'Guarulhos', area: 'Geral' },
        { key: 'indaiatuba', city: 'Indaiatuba', area: 'Geral' },
        { key: 'guaratingueta', city: 'Guaratinguetá', area: 'Geral' },
        { key: 'guara', city: 'Guaratinguetá', area: 'Geral' },
        { key: 'sao carlos', city: 'São Carlos', area: 'Geral' },
        { key: 'saocarlos', city: 'São Carlos', area: 'Geral' },
        { key: 'pedregulho', city: 'Guaratinguetá', area: 'Pedregulho' },
        { key: 'recreio sao judas', city: 'São Carlos', area: 'Recreio São Judas Tadeu' }
    ];

    const found = knownAreas.find(item => text.includes(item.key));
    if (found) return { city: found.city, area: found.area };

    if (text.includes('sao paulo') || text.includes('sp')) return { city: 'São Paulo', area: 'Geral' };
    return { city: 'Sem cidade definida', area: 'Geral' };
};

export const TurmasDashboard: React.FC<TurmasDashboardProps> = ({
    checkouts,
    leads,
    userRole,
    onToggleCheckoutActive,
    onEditCheckout,
    onCreateCheckout
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
    const [expandedArea, setExpandedArea] = useState<string | null>(null);
    const [expandedTurma, setExpandedTurma] = useState<string | null>(null);
    const [activeTabByTurma, setActiveTabByTurma] = useState<Record<string, 'resumo' | 'checkouts' | 'alunos'>>({});

    const turmas = useMemo<TurmaGroup[]>(() => {
        const grouped = new Map<string, TurmaGroup>();

        checkouts.forEach(checkout => {
            const title = checkout.turma || checkout.productName || 'Turma sem nome';
            const region = detectRegion(checkout);
            const key = `${region.city}__${region.area}__${title}__${checkout.eventDate || 'sem-data'}`;
            const existing = grouped.get(key);
            if (existing) {
                existing.checkouts.push(checkout);
                if (!existing.location && checkout.eventLocation) existing.location = checkout.eventLocation;
                return;
            }
            grouped.set(key, {
                key,
                title,
                date: checkout.eventDate,
                location: checkout.eventLocation,
                startTime: checkout.eventStartTime,
                endTime: checkout.eventEndTime,
                city: region.city,
                area: region.area,
                checkouts: [checkout],
                leads: []
            });
        });

        const result = Array.from(grouped.values()).map(group => ({
            ...group,
            leads: leads.filter(lead => group.checkouts.some(checkout => checkout.id === lead.product_id || checkout.turma === lead.turma))
        }));

        return result.sort((a, b) => {
            const cityCompare = a.city.localeCompare(b.city);
            if (cityCompare !== 0) return cityCompare;
            const areaCompare = a.area.localeCompare(b.area);
            if (areaCompare !== 0) return areaCompare;
            const dateA = parseDate(a.date)?.getTime() || 0;
            const dateB = parseDate(b.date)?.getTime() || 0;
            return dateB - dateA;
        });
    }, [checkouts, leads]);

    const availableMonths = useMemo(() => Array.from(new Set(turmas.map(turma => monthKeyFromDate(turma.date)))).sort((a, b) => b.localeCompare(a)), [turmas]);

    const filteredTurmas = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return turmas.filter(turma => {
            const active = turma.checkouts.some(checkout => checkout.isActive !== false);
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? active : !active);
            const matchesMonth = selectedMonthFilter === 'all' || monthKeyFromDate(turma.date) === selectedMonthFilter;
            const matchesSearch = !term || [turma.city, turma.area, turma.title, turma.location, turma.date, ...turma.checkouts.map(c => c.slug || c.productName)]
                .filter(Boolean)
                .some(value => String(value).toLowerCase().includes(term));
            return matchesStatus && matchesMonth && matchesSearch;
        });
    }, [turmas, searchTerm, selectedMonthFilter, statusFilter]);

    const groupedByCity = useMemo(() => {
        return filteredTurmas.reduce((acc, turma) => {
            if (!acc[turma.city]) acc[turma.city] = {};
            if (!acc[turma.city][turma.area]) acc[turma.city][turma.area] = [];
            acc[turma.city][turma.area].push(turma);
            return acc;
        }, {} as Record<string, Record<string, TurmaGroup[]>>);
    }, [filteredTurmas]);

    const totalPaid = filteredTurmas.reduce((acc, turma) => acc + turma.leads.filter(lead => lead.status === 'Pago').length, 0);
    const totalRevenue = filteredTurmas.reduce((acc, turma) => acc + turma.leads.filter(lead => lead.status === 'Pago').reduce((sum, lead) => sum + (lead.paid_amount || 0), 0), 0);
    const totalCheckouts = filteredTurmas.reduce((acc, turma) => acc + turma.checkouts.length, 0);
    const activeTurmas = filteredTurmas.filter(turma => turma.checkouts.some(checkout => checkout.isActive !== false)).length;

    const copyToClipboard = async (text: string, message: string) => {
        await navigator.clipboard.writeText(text);
        alert(message);
    };

    const renderTurma = (turma: TurmaGroup) => {
        const paidLeads = turma.leads.filter(lead => lead.status === 'Pago');
        const checkedIn = turma.leads.filter(lead => lead.checked_in).length;
        const revenue = paidLeads.reduce((acc, lead) => acc + (lead.paid_amount || 0), 0);
        const isActive = turma.checkouts.some(checkout => checkout.isActive !== false);
        const isExpanded = expandedTurma === turma.key;
        const activeTab = activeTabByTurma[turma.key] || 'resumo';
        const mainCheckout = turma.checkouts[0];

        return (
            <div key={turma.key} className="border border-gray-100 rounded-3xl overflow-hidden bg-white">
                <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-gray-50/40 transition-all">
                    <button onClick={() => setExpandedTurma(isExpanded ? null : turma.key)} className="flex-1 text-left flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><GraduationCap size={20} /></div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black text-gray-900">{turma.title}</h4>
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{isActive ? 'Ativa' : 'Encerrada'}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 font-bold">
                                <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(turma.date)}</span>
                                {(turma.startTime || turma.endTime) && <span className="flex items-center gap-1"><Clock size={13} /> {turma.startTime || '--'} às {turma.endTime || '--'}</span>}
                                <span className="flex items-center gap-1"><MapPin size={13} /> {turma.city} {turma.area !== 'Geral' ? `• ${turma.area}` : ''}</span>
                            </div>
                        </div>
                    </button>

                    <div className="grid grid-cols-3 gap-3 xl:w-[360px]">
                        <div className="bg-gray-50 rounded-2xl p-3"><p className="text-[9px] font-black uppercase text-gray-400">Leads</p><p className="font-black text-gray-900">{turma.leads.length}</p></div>
                        <div className="bg-emerald-50 rounded-2xl p-3"><p className="text-[9px] font-black uppercase text-emerald-500">Pagos</p><p className="font-black text-emerald-700">{paidLeads.length}</p></div>
                        <div className="bg-blue-50 rounded-2xl p-3"><p className="text-[9px] font-black uppercase text-blue-500">Receita</p><p className="font-black text-blue-700">{money(revenue)}</p></div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="border-t border-gray-100 bg-white">
                        <div className="p-4 flex flex-wrap gap-2 border-b border-gray-100">
                            {(['resumo', 'checkouts', 'alunos'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTabByTurma(prev => ({ ...prev, [turma.key]: tab }))} className={`px-4 py-3 rounded-2xl text-xs font-black uppercase ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{tab}</button>
                            ))}
                            <div className="ml-auto flex gap-2">
                                {mainCheckout && <button onClick={() => window.open(getCheckoutUrl(mainCheckout), '_blank')} className="px-4 py-3 rounded-2xl bg-blue-50 text-blue-600 font-black text-xs uppercase flex items-center gap-2"><Eye size={14} /> Ver</button>}
                                {mainCheckout && <button onClick={() => copyToClipboard(getCheckoutUrl(mainCheckout), 'Link principal copiado!')} className="px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-xs uppercase flex items-center gap-2"><LinkIcon size={14} /> Copiar</button>}
                            </div>
                        </div>

                        {activeTab === 'resumo' && (
                            <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 rounded-3xl p-5"><Users className="text-gray-400 mb-3" size={20} /><p className="text-[10px] font-black uppercase text-gray-400">Leads totais</p><p className="text-2xl font-black text-gray-900">{turma.leads.length}</p></div>
                                <div className="bg-emerald-50 rounded-3xl p-5"><CheckCircle2 className="text-emerald-500 mb-3" size={20} /><p className="text-[10px] font-black uppercase text-emerald-500">Pagos</p><p className="text-2xl font-black text-emerald-700">{paidLeads.length}</p></div>
                                <div className="bg-blue-50 rounded-3xl p-5"><UserCheck className="text-blue-500 mb-3" size={20} /><p className="text-[10px] font-black uppercase text-blue-500">Check-in</p><p className="text-2xl font-black text-blue-700">{checkedIn}</p></div>
                                <div className="bg-indigo-50 rounded-3xl p-5"><Wallet className="text-indigo-500 mb-3" size={20} /><p className="text-[10px] font-black uppercase text-indigo-500">Receita</p><p className="text-2xl font-black text-indigo-700">{money(revenue)}</p></div>
                            </div>
                        )}

                        {activeTab === 'checkouts' && (
                            <div className="p-5 space-y-3">
                                {turma.checkouts.map(checkout => {
                                    const checkoutLeads = turma.leads.filter(lead => lead.product_id === checkout.id);
                                    const checkoutPaid = checkoutLeads.filter(lead => lead.status === 'Pago');
                                    return (
                                        <div key={checkout.id} className="bg-gray-50 rounded-3xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div>
                                                <p className="font-black text-gray-900">{checkout.productName}</p>
                                                <p className="text-xs text-gray-400 font-bold">/{checkout.slug || checkout.id} • R$ {checkout.productPrice || '0,00'} • {checkoutPaid.length} pagos</p>
                                                {checkout.variations && checkout.variations.length > 0 && <p className="text-[10px] font-black uppercase text-indigo-600 mt-1">{checkout.variations.length} variações cadastradas</p>}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => window.open(getCheckoutUrl(checkout), '_blank')} className="p-3 rounded-xl bg-blue-600 text-white"><Eye size={15} /></button>
                                                <button onClick={() => copyToClipboard(getCheckoutUrl(checkout), 'Link do checkout copiado!')} className="p-3 rounded-xl bg-blue-50 text-blue-600"><LinkIcon size={15} /></button>
                                                <button onClick={() => copyToClipboard(getCheckoutUrl(checkout, 'reg'), 'Link de registro copiado!')} className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Copy size={15} /></button>
                                                {userRole === 'master' && <button onClick={() => onEditCheckout?.(checkout)} className="p-3 rounded-xl bg-gray-900 text-white"><Edit3 size={15} /></button>}
                                                {userRole === 'master' && <button onClick={() => onToggleCheckoutActive?.(checkout.id, !(checkout.isActive !== false))} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase ${checkout.isActive !== false ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-600'}`}>{checkout.isActive !== false ? 'Encerrar' : 'Reabrir'}</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === 'alunos' && (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[780px]">
                                    <thead><tr className="text-left border-b border-gray-100"><th className="px-5 py-4 text-[10px] font-black uppercase text-gray-400">Aluno</th><th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">Contato</th><th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">Status</th><th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">Valor</th><th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400">Check-in</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {turma.leads.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">Nenhum aluno nesta turma.</td></tr> : turma.leads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-gray-50"><td className="px-5 py-4 font-bold text-gray-900">{lead.name}</td><td className="px-4 py-4 text-xs text-gray-500 font-bold">{lead.email}<br />{lead.phone}</td><td className="px-4 py-4"><span className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase ${lead.status === 'Pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{lead.status || 'Novo'}</span></td><td className="px-4 py-4 font-black text-blue-600">{money(lead.paid_amount || 0)}</td><td className="px-4 py-4">{lead.checked_in ? <span className="text-blue-600 font-black text-xs uppercase">Feito</span> : <span className="text-gray-400 font-black text-xs uppercase">Pendente</span>}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <MapPin className="text-blue-600" /> Turmas por Cidade
                    </h2>
                    <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Organização por praça, bairro e depois turma</p>
                </div>
                {userRole === 'master' && (
                    <button onClick={onCreateCheckout} className="w-full sm:w-auto bg-blue-600 text-white px-7 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                        <Plus size={18} /> Nova Turma / Checkout
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Turmas ativas</p><p className="text-2xl font-black text-gray-900 mt-2">{activeTurmas}</p></div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Checkouts</p><p className="text-2xl font-black text-gray-900 mt-2">{totalCheckouts}</p></div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Alunos pagos</p><p className="text-2xl font-black text-emerald-600 mt-2">{totalPaid}</p></div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Receita</p><p className="text-2xl font-black text-blue-600 mt-2">{money(totalRevenue)}</p></div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-4 md:p-5 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar cidade, bairro, turma, checkout ou slug..." className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" />
                    </div>
                    <select value={selectedMonthFilter} onChange={event => setSelectedMonthFilter(event.target.value)} className="px-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-black text-xs uppercase">
                        <option value="all">Todos os meses</option>
                        {availableMonths.map(month => <option key={month} value={month}>{monthLabelFromKey(month)}</option>)}
                    </select>
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)} className="px-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-black text-xs uppercase">
                        <option value="all">Todas as turmas</option>
                        <option value="active">Ativas</option>
                        <option value="inactive">Encerradas</option>
                    </select>
                </div>
            </div>

            {Object.keys(groupedByCity).length === 0 ? (
                <div className="bg-white rounded-[3rem] border border-gray-100 p-12 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300"><MapPin size={40} /></div>
                    <h3 className="text-xl font-black text-gray-900">Nenhuma turma encontrada</h3>
                    <p className="text-gray-400 font-bold mt-2">Crie checkouts com nome de cidade/bairro para organizar tudo aqui.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(groupedByCity).map(([city, areas]) => {
                        const cityTurmas = Object.values(areas).flat();
                        const cityPaid = cityTurmas.reduce((acc, turma) => acc + turma.leads.filter(lead => lead.status === 'Pago').length, 0);
                        const cityRevenue = cityTurmas.reduce((acc, turma) => acc + turma.leads.filter(lead => lead.status === 'Pago').reduce((sum, lead) => sum + (lead.paid_amount || 0), 0), 0);
                        const isCityExpanded = expandedRegion === city || expandedRegion === null;

                        return (
                            <div key={city} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                                <button onClick={() => setExpandedRegion(isCityExpanded ? 'closed-' + city : city)} className="w-full p-5 md:p-6 flex items-center justify-between bg-gray-50/70 hover:bg-gray-100 transition-all text-left">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><MapPin size={20} /></div>
                                        <div><h3 className="text-lg font-black text-gray-900">{city}</h3><p className="text-sm text-gray-500 font-bold">{cityTurmas.length} turma(s) • {cityPaid} pagos • {money(cityRevenue)}</p></div>
                                    </div>
                                    {isCityExpanded ? <ChevronUp size={22} className="text-gray-400" /> : <ChevronDown size={22} className="text-gray-400" />}
                                </button>

                                {isCityExpanded && (
                                    <div className="p-4 md:p-5 space-y-4">
                                        {Object.entries(areas).map(([area, areaTurmas]) => {
                                            const areaKey = `${city}__${area}`;
                                            const isAreaExpanded = expandedArea === areaKey || expandedArea === null;
                                            const areaPaid = areaTurmas.reduce((acc, turma) => acc + turma.leads.filter(lead => lead.status === 'Pago').length, 0);
                                            return (
                                                <div key={areaKey} className="bg-gray-50/70 rounded-3xl border border-gray-100 overflow-hidden">
                                                    <button onClick={() => setExpandedArea(isAreaExpanded ? 'closed-' + areaKey : areaKey)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-100">
                                                        <div><h4 className="font-black text-gray-900">{area}</h4><p className="text-xs text-gray-500 font-bold">{areaTurmas.length} turma(s) • {areaPaid} pagos</p></div>
                                                        {isAreaExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                                    </button>
                                                    {isAreaExpanded && <div className="p-4 space-y-4">{areaTurmas.map(renderTurma)}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
