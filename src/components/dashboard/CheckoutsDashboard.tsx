import React, { useMemo, useState } from 'react';
import { AppConfig, Lead, UserRole } from '../../types';
import { Calendar, CheckCircle2, Copy, Edit3, Eye, GraduationCap, Link as LinkIcon, Plus, Search, Trash2, Users, Wallet, XCircle, Layers } from 'lucide-react';

interface CheckoutsDashboardProps {
    checkouts: AppConfig[];
    leads: Lead[];
    userRole: UserRole;
    savingId: string | null;
    onCreateCheckout: () => void;
    onEditCheckout: (checkout: AppConfig) => void;
    onDeleteCheckout: (id: string) => Promise<void>;
}

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getCheckoutUrl = (checkout: AppConfig, mode?: 'reg') => {
    const url = new URL(window.location.origin + window.location.pathname);
    if (checkout.slug) url.searchParams.set('p', checkout.slug);
    else url.searchParams.set('checkout', checkout.id);
    if (mode === 'reg') url.searchParams.set('mode', 'reg');
    return url.toString();
};

const parsePrice = (price?: string) => Number(String(price || '0').replace(/[^0-9,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

export const CheckoutsDashboard: React.FC<CheckoutsDashboardProps> = ({
    checkouts,
    leads,
    userRole,
    savingId,
    onCreateCheckout,
    onEditCheckout,
    onDeleteCheckout
}) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [groupMode, setGroupMode] = useState<'turma' | 'folder'>('turma');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const checkoutStats = useMemo(() => {
        const map = new Map<string, { total: number; paid: number; revenue: number }>();
        checkouts.forEach(checkout => {
            const checkoutLeads = leads.filter(lead => lead.product_id === checkout.id);
            const paidLeads = checkoutLeads.filter(lead => lead.status === 'Pago');
            map.set(checkout.id, {
                total: checkoutLeads.length,
                paid: paidLeads.length,
                revenue: paidLeads.reduce((acc, lead) => acc + (lead.paid_amount || parsePrice(checkout.productPrice)), 0)
            });
        });
        return map;
    }, [checkouts, leads]);

    const filteredCheckouts = useMemo(() => {
        const term = search.trim().toLowerCase();
        return checkouts.filter(checkout => {
            const matchesSearch = !term || [checkout.productName, checkout.turma, checkout.slug, checkout.folder, checkout.eventLocation]
                .filter(Boolean)
                .some(value => String(value).toLowerCase().includes(term));
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? checkout.isActive !== false : checkout.isActive === false);
            return matchesSearch && matchesStatus;
        });
    }, [checkouts, search, statusFilter]);

    const groupedCheckouts = useMemo(() => {
        return filteredCheckouts.reduce((acc, checkout) => {
            const key = groupMode === 'folder'
                ? (checkout.folder || 'Sem pasta')
                : (checkout.turma || checkout.productName || 'Sem turma definida');
            if (!acc[key]) acc[key] = [];
            acc[key].push(checkout);
            return acc;
        }, {} as Record<string, AppConfig[]>);
    }, [filteredCheckouts, groupMode]);

    const totalPaid = leads.filter(lead => lead.status === 'Pago').length;
    const totalRevenue = leads.filter(lead => lead.status === 'Pago').reduce((acc, lead) => acc + (lead.paid_amount || 0), 0);
    const activeCheckouts = checkouts.filter(checkout => checkout.isActive !== false).length;

    const copyToClipboard = async (text: string, message: string) => {
        await navigator.clipboard.writeText(text);
        alert(message);
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !(prev[group] ?? true) }));
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Layers className="text-blue-600" /> Checkouts
                    </h2>
                    <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Links de venda organizados por turma</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <button onClick={onCreateCheckout} className="w-full sm:w-auto bg-blue-600 text-white px-7 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                        <Plus size={18} /> Novo Checkout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Checkouts ativos</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{activeCheckouts}</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total checkouts</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{checkouts.length}</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Alunos pagos</p>
                    <p className="text-2xl font-black text-emerald-600 mt-2">{totalPaid}</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Receita confirmada</p>
                    <p className="text-2xl font-black text-blue-600 mt-2">{money(totalRevenue)}</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-4 md:p-5 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Buscar por turma, cidade, slug, pasta ou local..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        />
                    </div>
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as any)} className="px-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-black text-xs uppercase">
                        <option value="all">Todos os status</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                    </select>
                    <select value={groupMode} onChange={event => setGroupMode(event.target.value as any)} className="px-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-black text-xs uppercase">
                        <option value="turma">Agrupar por turma</option>
                        <option value="folder">Agrupar por pasta</option>
                    </select>
                </div>
            </div>

            {checkouts.length === 0 ? (
                <div className="bg-white rounded-[3rem] border border-gray-100 p-16 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300"><Layers size={40} /></div>
                    <h3 className="text-xl font-black text-gray-900">Nenhum checkout criado ainda</h3>
                    <p className="text-gray-400 max-w-sm mt-2 font-bold">Comece criando o checkout principal de uma turma.</p>
                </div>
            ) : Object.keys(groupedCheckouts).length === 0 ? (
                <div className="bg-white rounded-[3rem] border border-gray-100 p-12 text-center font-bold text-gray-400">Nenhum checkout encontrado com esses filtros.</div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(groupedCheckouts).map(([group, groupCheckouts]) => {
                        const isExpanded = expandedGroups[group] ?? true;
                        const groupLeads = groupCheckouts.flatMap(checkout => leads.filter(lead => lead.product_id === checkout.id));
                        const groupPaid = groupLeads.filter(lead => lead.status === 'Pago');
                        const groupRevenue = groupPaid.reduce((acc, lead) => acc + (lead.paid_amount || 0), 0);

                        return (
                            <div key={group} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                                <button onClick={() => toggleGroup(group)} className="w-full p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/70 hover:bg-gray-100 transition-all text-left">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center"><GraduationCap size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">{group}</h3>
                                            <p className="text-xs text-gray-500 font-bold">{groupCheckouts.length} checkout(s) • {groupPaid.length} alunos pagos • {money(groupRevenue)}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
                                </button>

                                {isExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[980px]">
                                            <thead>
                                                <tr className="text-left border-b border-gray-100">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Checkout</th>
                                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Data/Local</th>
                                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Valor</th>
                                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Leads</th>
                                                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {groupCheckouts.map(checkout => {
                                                    const stats = checkoutStats.get(checkout.id) || { total: 0, paid: 0, revenue: 0 };
                                                    const isDeleting = savingId === checkout.id;
                                                    return (
                                                        <tr key={checkout.id} className="hover:bg-gray-50/60 transition-all">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-4">
                                                                    <img src={checkout.productImage} onError={event => { (event.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=300'; }} className="w-14 h-14 rounded-2xl object-cover bg-gray-100" alt="" />
                                                                    <div className="min-w-0">
                                                                        <p className="font-black text-gray-900 truncate max-w-[260px]">{checkout.productName || 'Checkout sem nome'}</p>
                                                                        <p className="text-xs text-gray-400 font-bold truncate max-w-[260px]">/{checkout.slug || checkout.id}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <p className="text-sm font-black text-gray-900 flex items-center gap-2"><Calendar size={14} className="text-blue-600" /> {checkout.eventDate || 'Sem data'}</p>
                                                                <p className="text-xs text-gray-400 font-bold truncate max-w-[210px]">{checkout.eventLocation || checkout.turma || 'Sem local definido'}</p>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <p className="text-sm font-black text-blue-600">R$ {checkout.productPrice || '0,00'}</p>
                                                                {checkout.variations && checkout.variations.length > 0 && <p className="text-[10px] font-black text-indigo-600 uppercase">{checkout.variations.length} variações</p>}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <p className="text-sm font-black text-gray-900 flex items-center gap-2"><Users size={14} /> {stats.total}</p>
                                                                <p className="text-xs text-emerald-600 font-black">{stats.paid} pagos • {money(stats.revenue)}</p>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase ${checkout.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {checkout.isActive !== false ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                    {checkout.isActive !== false ? 'Ativo' : 'Inativo'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => window.open(getCheckoutUrl(checkout), '_blank')} className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700" title="Visualizar"><Eye size={16} /></button>
                                                                    <button onClick={() => copyToClipboard(getCheckoutUrl(checkout), 'Link do checkout copiado!')} className="p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white" title="Copiar link"><LinkIcon size={16} /></button>
                                                                    <button onClick={() => copyToClipboard(getCheckoutUrl(checkout, 'reg'), 'Link de registro copiado!')} className="p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white" title="Copiar registro"><Copy size={16} /></button>
                                                                    {userRole === 'master' && <button onClick={() => onEditCheckout(checkout)} className="p-3 rounded-xl bg-gray-900 text-white hover:bg-black" title="Editar"><Edit3 size={16} /></button>}
                                                                    {userRole === 'master' && <button disabled={isDeleting} onClick={() => { if (confirm('Excluir este checkout permanentemente?')) onDeleteCheckout(checkout.id); }} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white" title="Excluir">{isDeleting ? <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}</button>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
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
