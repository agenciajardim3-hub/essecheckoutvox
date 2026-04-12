import React, { useMemo, useState } from 'react';
import {
    BarChart3, Users, DollarSign, TrendingUp, Search, Filter,
    Download, Mail, MessageCircle, Eye, Edit2, Trash2, Check,
    AlertCircle, Calendar, MapPin, Phone, GraduationCap, Loader2
} from 'lucide-react';
import { Lead, AppConfig, UserRole } from '../../types';

interface LeadsReportV2Props {
    userRole: UserRole;
    leads: Lead[];
    allCheckouts: AppConfig[];
    onUpdateStatus: (id: string, status: Lead['status']) => void;
    onUpdatePaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    savingId: string | null;
}

type ViewMode = 'grid' | 'table' | 'stats';
type SortBy = 'date' | 'name' | 'status' | 'amount';

export const LeadsReportV2: React.FC<LeadsReportV2Props> = ({
    userRole,
    leads,
    allCheckouts,
    onUpdateStatus,
    onUpdatePaidAmount,
    onDeleteLead,
    savingId
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Filtrar e ordenar leads
    const filteredAndSortedLeads = useMemo(() => {
        let result = leads;

        // Filtro por produto
        if (selectedProduct !== 'all') {
            result = result.filter(l => l.product_id === selectedProduct);
        }

        // Filtro por status
        if (selectedStatus !== 'all') {
            result = result.filter(l => l.status === selectedStatus);
        }

        // Busca por texto
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(l =>
                l.name?.toLowerCase().includes(term) ||
                l.email?.toLowerCase().includes(term) ||
                l.phone?.includes(term) ||
                l.cpf?.includes(term)
            );
        }

        // Ordenação
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                case 'amount':
                    return (b.paid_amount || 0) - (a.paid_amount || 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [leads, selectedProduct, selectedStatus, searchTerm, sortBy]);

    // Paginação
    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedLeads, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);

    // Cálculos de estatísticas
    const stats = useMemo(() => {
        const paidLeads = filteredAndSortedLeads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
        const totalRevenue = paidLeads.reduce((sum, l) => sum + (l.paid_amount || 0), 0);
        const pendingLeads = filteredAndSortedLeads.filter(l =>
            l.status !== 'Pago' && l.status !== 'Aprovado' && l.status !== 'Cancelado' && l.status !== 'Devolvido'
        );
        const conversionRate = filteredAndSortedLeads.length > 0
            ? ((paidLeads.length / filteredAndSortedLeads.length) * 100).toFixed(1)
            : '0';

        return { paidLeads, totalRevenue, pendingLeads, conversionRate };
    }, [filteredAndSortedLeads]);

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Pago':
            case 'Aprovado':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Pendente':
            case 'Sinal':
            case 'Pagar no dia':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Cancelado':
            case 'Devolvido':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'Abandonado':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Relatório de Vendas</h2>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                    {filteredAndSortedLeads.length} registros • {stats.paidLeads.length} pagos
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total de Leads</p>
                            <p className="text-3xl font-black text-gray-900">{filteredAndSortedLeads.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pagos</p>
                            <p className="text-3xl font-black text-emerald-600">{stats.paidLeads.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Check size={24} className="text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Receita</p>
                            <p className="text-3xl font-black text-gray-900">R$ {(stats.totalRevenue / 1000).toFixed(1)}k</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Taxa Conversão</p>
                            <p className="text-3xl font-black text-orange-600">{stats.conversionRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingUp size={24} className="text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controles */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                {/* Busca */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email, telefone ou CPF..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        />
                    </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Produto</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                            <option value="all">Todos os produtos</option>
                            {allCheckouts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.productName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                            <option value="all">Todos os status</option>
                            <option value="Pago">Pagos</option>
                            <option value="Pendente">Pendentes</option>
                            <option value="Abandonado">Abandonados</option>
                            <option value="Cancelado">Cancelados</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Ordenar por</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                            <option value="date">Data (Recente)</option>
                            <option value="name">Nome</option>
                            <option value="status">Status</option>
                            <option value="amount">Valor</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Visualização</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Tabela
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {paginatedLeads.map((lead) => (
                            <div key={lead.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                                {/* Header do Card */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-100">
                                    <h3 className="font-black text-gray-900 mb-1 truncate">{lead.name}</h3>
                                    <p className="text-xs text-gray-500 font-bold truncate">{lead.email}</p>
                                </div>

                                {/* Conteúdo */}
                                <div className="p-4 space-y-3">
                                    {/* Contato */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={16} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-bold text-gray-700 truncate">{lead.phone}</span>
                                    </div>

                                    {/* Localização */}
                                    {lead.city && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-bold text-gray-700">{lead.city}</span>
                                        </div>
                                    )}

                                    {/* Turma */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <GraduationCap size={16} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-bold text-gray-700 truncate">{lead.turma || 'Sem turma'}</span>
                                    </div>

                                    {/* Status */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <select
                                            value={lead.status || 'Novo'}
                                            onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                                            className={`w-full px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${getStatusColor(lead.status)}`}
                                        >
                                            {['Novo', 'Pago', 'Pendente', 'Sinal', 'Pagar no dia', 'Aprovado', 'Cancelado', 'Devolvido', 'Abandonado'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Valor */}
                                    {userRole === 'master' && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                            <span className="text-xs font-bold text-gray-600 uppercase">Valor:</span>
                                            <input
                                                type="text"
                                                value={lead.paid_amount || ''}
                                                onChange={(e) => onUpdatePaidAmount(lead.id, e.target.value)}
                                                placeholder="0,00"
                                                className="flex-1 px-2 py-1.5 text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {/* Data */}
                                    <div className="text-xs text-gray-400 font-bold text-right pt-2 border-t border-gray-100">
                                        {lead.created_at && new Date(lead.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                    <button className="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs uppercase hover:bg-blue-100 transition-all flex items-center justify-center gap-1">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <button
                                        onClick={() => onDeleteLead(lead.id)}
                                        disabled={savingId === lead.id}
                                        className="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 font-bold text-xs uppercase hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        {savingId === lead.id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                        Apagar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-900 text-white">
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Nome</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Contato</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Produto</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Status</th>
                                    {userRole === 'master' && (
                                        <th className="px-4 py-3 text-left font-black uppercase text-xs">Valor</th>
                                    )}
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Data</th>
                                    <th className="px-4 py-3 text-center font-black uppercase text-xs">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-blue-50/30 transition-all">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{lead.name}</div>
                                            {lead.city && <div className="text-xs text-gray-500">{lead.city}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-emerald-600">{lead.phone}</div>
                                            <div className="text-xs text-gray-500 truncate">{lead.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-block bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                                {lead.turma || 'Sem turma'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={lead.status || 'Novo'}
                                                onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                                                className={`px-2 py-1.5 rounded-lg text-xs font-bold uppercase border ${getStatusColor(lead.status)}`}
                                            >
                                                {['Novo', 'Pago', 'Pendente', 'Sinal', 'Pagar no dia', 'Aprovado', 'Cancelado', 'Devolvido', 'Abandonado'].map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </td>
                                        {userRole === 'master' && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={lead.paid_amount || ''}
                                                    onChange={(e) => onUpdatePaidAmount(lead.id, e.target.value)}
                                                    placeholder="0,00"
                                                    className="w-24 px-2 py-1.5 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-xs font-bold text-gray-500">
                                            {lead.created_at && new Date(lead.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onDeleteLead(lead.id)}
                                                disabled={savingId === lead.id}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs uppercase hover:bg-red-100 transition-all disabled:opacity-50"
                                            >
                                                {savingId === lead.id ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={12} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-600">
                        Página {currentPage} de {totalPages} • {filteredAndSortedLeads.length} resultados
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs uppercase disabled:opacity-50"
                        >
                            ← Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs uppercase disabled:opacity-50"
                        >
                            Próximo →
                        </button>
                    </div>
                </div>
            )}

            {/* Vazio */}
            {filteredAndSortedLeads.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="font-bold text-gray-600 mb-2">Nenhum resultado encontrado</p>
                    <p className="text-sm text-gray-500">Tente alterar os filtros de busca</p>
                </div>
            )}
        </div>
    );
};
