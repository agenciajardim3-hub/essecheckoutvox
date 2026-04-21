
import React, { useMemo, useState } from 'react';
import { Calendar, Users, Check, X, Plus, Search, Filter, GraduationCap, Eye, MessageCircle, Award, UserCheck, Ticket, Hammer, Trash2, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../../shared/components/Input';
import { Lead, AppConfig, UserRole } from '../../shared';

interface TurmasDashboardProps {
    checkouts: AppConfig[];
    leads: Lead[];
    userRole: UserRole;
    onUpdateLeadStatus: (id: string, status: any) => void;
    onUpdatePaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    onCheckIn?: (id: string, checked: boolean) => void;
    onToggleCheckoutActive?: (checkoutId: string, isActive: boolean) => void;
    savingId: string | null;
}

export const TurmasDashboard: React.FC<TurmasDashboardProps> = ({
    checkouts,
    leads,
    userRole,
    onUpdateLeadStatus,
    onUpdatePaidAmount,
    onDeleteLead,
    onCheckIn,
    onToggleCheckoutActive,
    savingId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
    const [expandedTurma, setExpandedTurma] = useState<string | null>(null);
    const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
    const [showActiveFilter, setShowActiveFilter] = useState<string>('all'); // all, active, inactive

    const parseEventDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        return new Date(dateStr);
    };

    // Get unique months for filter
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        checkouts.forEach(checkout => {
            if (!checkout.eventDate) return;
            const date = parseEventDate(checkout.eventDate);
            if (!date || isNaN(date.getTime())) return;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthKey);
        });
        return Array.from(months).sort().reverse();
    }, [checkouts]);

    // Group checkouts by month
    const checkoutsByMonth = useMemo(() => {
        const grouped: Record<string, { checkouts: AppConfig[], label: string }> = {};
        
        checkouts.forEach(checkout => {
            if (!checkout.eventDate) return;
            
            const date = parseEventDate(checkout.eventDate);
            if (!date || isNaN(date.getTime())) return;
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            if (!grouped[monthKey]) {
                grouped[monthKey] = { label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), checkouts: [] };
            }
            grouped[monthKey].checkouts.push(checkout);
        });
        
        // Sort by date descending
        const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        const result: Record<string, { checkouts: AppConfig[], label: string }> = {};
        sortedKeys.forEach(key => {
            result[key] = grouped[key];
        });
        
        return result;
    }, [checkouts]);

    // Get leads for a specific checkout
    const getLeadsForCheckout = (checkoutId: string) => {
        return leads.filter(l => l.product_id === checkoutId);
    };

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Calendar className="text-blue-600" /> Turmas
                    </h2>
                    <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Gerencie suas turmas por mês</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedMonthFilter}
                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    >
                        <option value="all">Todos os Meses</option>
                        {availableMonths.map(month => {
                            const [year, m] = month.split('-');
                            const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                            return <option key={month} value={month}>{monthName}</option>;
                        })}
                    </select>
                    <select
                        value={showActiveFilter}
                        onChange={(e) => setShowActiveFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    >
                        <option value="all">Todas as Turmas</option>
                        <option value="active">Ativas</option>
                        <option value="inactive">Encerradas</option>
                    </select>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar turma..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                </div>
            </div>

            {/* Months */}
            <div className="space-y-4">
                {Object.entries(checkoutsByMonth).length === 0 ? (
                    <div className="bg-white rounded-[3rem] border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900">Nenhuma turma encontrada</h3>
                        <p className="text-gray-400 font-bold mt-2">Crie checkouts com data de evento para ver as turmas aqui.</p>
                    </div>
                ) : (
                    Object.entries(checkoutsByMonth).map(([monthKey, { label, checkouts }]) => {
                        // Apply month filter
                        if (selectedMonthFilter !== 'all' && monthKey !== selectedMonthFilter) return null;
                        
                        const filteredCheckouts = checkouts.filter(c => {
                            const matchesSearch = c.turma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                c.productName?.toLowerCase().includes(searchTerm.toLowerCase());
                            
                            if (showActiveFilter === 'active') {
                                return matchesSearch && c.isActive;
                            } else if (showActiveFilter === 'inactive') {
                                return matchesSearch && !c.isActive;
                            }
                            return matchesSearch;
                        });
                        
                        if (searchTerm && filteredCheckouts.length === 0) return null;
                        
                        const isExpanded = expandedMonth === monthKey;
                        
                        return (
                            <div key={monthKey} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                                    className="w-full p-6 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                            <Calendar size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-black text-gray-900">{label}</h3>
                                            <p className="text-sm text-gray-500 font-bold">{filteredCheckouts.length} turmas</p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}
                                </button>
                                
                                {isExpanded && (
                                    <div className="p-6 space-y-4">
                                        {filteredCheckouts.map(checkout => {
                                            const turmaLeads = getLeadsForCheckout(checkout.id);
                                            const paidLeads = turmaLeads.filter(l => l.status === 'Pago');
                                            const isTurmaExpanded = expandedTurma === checkout.id;
                                            
                                            return (
                                                <div key={checkout.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                                                    <button
                                                        onClick={() => setExpandedTurma(isTurmaExpanded ? null : checkout.id)}
                                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${checkout.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                <GraduationCap size={18} />
                                                            </div>
                                                            <div className="text-left">
                                                                <h4 className="text-sm font-black text-gray-900">{checkout.turma || checkout.productName}</h4>
                                                                <p className="text-xs text-gray-500 font-bold">
                                                                    {formatDate(checkout.eventDate)} • {paidLeads.length} alunos pagos
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!checkout.isActive && (
                                                                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                                                                    TURMA ENCERRADA
                                                                </span>
                                                            )}
                                                            {isTurmaExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                                        </div>
                                                    </button>
                                                    
                                                    {isTurmaExpanded && (
                                                        <div className="border-t border-gray-100">
                                                            {/* Alunos List */}
                                                            {turmaLeads.length === 0 ? (
                                                                <div className="p-8 text-center text-gray-400 font-bold">
                                                                    Nenhum aluno nesta turma
                                                                </div>
                                                            ) : (
                                                                <div className="divide-y divide-gray-50">
                                                                    {turmaLeads.map((lead, idx) => (
                                                                        <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-black text-gray-400 text-xs">
                                                                                    {idx + 1}
                                                                                </span>
                                                                                <div>
                                                                                    <p className="font-bold text-gray-900 text-sm">{lead.name}</p>
                                                                                    <p className="text-xs text-gray-500">{lead.email}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${lead.status === 'Pago' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                                    {lead.status}
                                                                                </span>
                                                                                {lead.checked_in && (
                                                                                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                                                                                        CHECK-IN
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Summary */}
                                                            <div className="p-4 bg-gray-50 flex justify-between items-center">
                                                                <div className="flex gap-6">
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase text-gray-400">Total</p>
                                                                        <p className="font-black text-gray-900">{turmaLeads.length}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase text-gray-400">Pagos</p>
                                                                        <p className="font-black text-emerald-600">{paidLeads.length}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase text-gray-400">Check-in</p>
                                                                        <p className="font-black text-blue-600">{turmaLeads.filter(l => l.checked_in).length}</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => onToggleCheckoutActive?.(checkout.id, checkout.isActive)}
                                                                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all ${checkout.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                                                                >
                                                                    {checkout.isActive ? 'Encerrar Turma' : 'Reabrir Turma'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
