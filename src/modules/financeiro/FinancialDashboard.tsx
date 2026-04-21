
import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, CreditCard, BarChart3, PieChart, ArrowUp, ArrowDown, Filter, Calendar, ChevronDown, Wallet, Clock, CheckCircle, XCircle, AlertTriangle, Minus, Plus } from 'lucide-react';
import { Lead, AppConfig, Expense } from '../../shared';

interface FinancialDashboardProps {
    leads: Lead[];
    checkouts: AppConfig[];
    expenses?: Expense[];
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ leads, checkouts, expenses = [] }) => {
    const [selectedProduct, setSelectedProduct] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

    // Safe date parser - returns null for invalid dates
    const safeDate = (d: any): Date | null => {
        if (!d) return null;
        try {
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        } catch {
            return null;
        }
    };

    // Filter leads based on selection
    const filteredLeads = useMemo(() => {
        let filtered = [...leads];

        if (selectedProduct !== 'all') {
            filtered = filtered.filter(l => l.product_id === selectedProduct);
        }

        if (dateRange !== 'all') {
            const now = new Date();
            const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
            const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(l => {
                const d = safeDate(l.date);
                return d ? d >= cutoff : false;
            });
        }

        return filtered;
    }, [leads, selectedProduct, dateRange]);

    // Filter expenses based on selection
    const filteredExpenses = useMemo(() => {
        if (!expenses) return [];
        let filtered = [...expenses];

        if (selectedProduct !== 'all') {
            // For expenses, we could add a product_id field, or filter by date
            // For now, just filter by date range
        }

        if (dateRange !== 'all') {
            const now = new Date();
            const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
            const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(e => {
                const d = safeDate(e.date);
                return d ? d >= cutoff : true;
            });
        }

        return filtered;
    }, [expenses, selectedProduct, dateRange]);

    // Financial metrics
    const metrics = useMemo(() => {
        const paid = filteredLeads.filter(l => l.status === 'Pago');
        const pending = filteredLeads.filter(l => l.status === 'Pendente');
        const sinal = filteredLeads.filter(l => l.status === 'Sinal');
        const pagarNoDia = filteredLeads.filter(l => l.status === 'Pagar no dia');

        const totalRevenue = paid.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
        const pendingRevenue = pending.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
        const sinalRevenue = sinal.reduce((acc, l) => acc + (l.paid_amount || 0), 0);

        const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const netValue = totalRevenue - totalExpenses;

        // Ticket médio
        const averageTicket = paid.length > 0 ? totalRevenue / paid.length : 0;

        // Conversion rate
        const conversionRate = filteredLeads.length > 0 ? (paid.length / filteredLeads.length) * 100 : 0;

        return {
            totalRevenue,
            totalExpenses,
            netValue,
            pendingRevenue,
            sinalRevenue,
            totalLeads: filteredLeads.length,
            paidCount: paid.length,
            pendingCount: pending.length,
            sinalCount: sinal.length,
            pagarNoDiaCount: pagarNoDia.length,
            newCount: filteredLeads.filter(l => l.status === 'Novo').length,
            averageTicket,
            conversionRate
        };
    }, [filteredLeads, filteredExpenses]);

    // Payment methods breakdown
    const paymentMethods = useMemo(() => {
        const paid = filteredLeads.filter(l => l.status === 'Pago');
        const methods: Record<string, { count: number; total: number }> = {};

        paid.forEach(l => {
            const method = l.payment_method || 'Outro';
            if (!methods[method]) methods[method] = { count: 0, total: 0 };
            methods[method].count++;
            methods[method].total += l.paid_amount || 0;
        });

        return Object.entries(methods).sort((a, b) => b[1].total - a[1].total);
    }, [filteredLeads]);

    // Per-product breakdown
    const productBreakdown = useMemo(() => {
        const data: Record<string, {
            name: string;
            turma: string;
            totalLeads: number;
            paidCount: number;
            revenue: number;
            pendingCount: number;
            conversionRate: number;
        }> = {};

        filteredLeads.forEach(l => {
            const pid = l.product_id || 'unknown';
            if (!data[pid]) {
                const checkout = checkouts.find(c => c.id === pid);
                data[pid] = {
                    name: checkout?.productName || l.product_name || 'Sem nome',
                    turma: checkout?.turma || l.turma || '',
                    totalLeads: 0,
                    paidCount: 0,
                    revenue: 0,
                    pendingCount: 0,
                    conversionRate: 0
                };
            }
            data[pid].totalLeads++;
            if (l.status === 'Pago') {
                data[pid].paidCount++;
                data[pid].revenue += l.paid_amount || 0;
            }
            if (l.status === 'Pendente') data[pid].pendingCount++;
        });

        // Calculate conversion rates
        Object.values(data).forEach(d => {
            d.conversionRate = d.totalLeads > 0 ? (d.paidCount / d.totalLeads) * 100 : 0;
        });

        return Object.entries(data).sort((a, b) => b[1].revenue - a[1].revenue);
    }, [filteredLeads, checkouts]);

    // Daily revenue for chart (last 30 days or filtered range)
    const dailyRevenue = useMemo(() => {
        const paid = filteredLeads.filter(l => l.status === 'Pago');
        const daily: Record<string, number> = {};

        paid.forEach(l => {
            const d = safeDate(l.date);
            if (!d) return;
            const day = d.toISOString().split('T')[0];
            daily[day] = (daily[day] || 0) + (l.paid_amount || 0);
        });

        return Object.entries(daily)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-30);
    }, [filteredLeads]);

    const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d[1]), 1);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'Pix': return 'bg-teal-500';
            case 'Cartão': return 'bg-blue-500';
            case 'Boleto': return 'bg-orange-500';
            case 'Dinheiro': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Filtros</span>
                </div>

                <div className="relative">
                    <select
                        value={selectedProduct}
                        onChange={e => setSelectedProduct(e.target.value)}
                        className="appearance-none bg-white border-2 border-gray-100 rounded-2xl px-5 py-3 pr-10 font-bold text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                    >
                        <option value="all">Todos os Produtos</option>
                        {checkouts.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.productName} {c.turma ? `(${c.turma})` : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="flex bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                    {([['7d', '7 dias'], ['30d', '30 dias'], ['90d', '90 dias'], ['all', 'Todos']] as const).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setDateRange(value)}
                            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${dateRange === value
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Receita Bruta */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-200/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            <ArrowUp size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Receita Bruta</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">{formatCurrency(metrics.totalRevenue)}</p>
                    <p className="text-xs font-bold mt-2 opacity-70">{metrics.paidCount} vendas confirmadas</p>
                </div>

                {/* Total de Despesas */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-[2rem] p-6 text-white shadow-xl shadow-red-200/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            <ArrowDown size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total de Despesas</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">{formatCurrency(metrics.totalExpenses)}</p>
                    <p className="text-xs font-bold mt-2 opacity-70">{filteredExpenses.length} despesas registradas</p>
                </div>

                {/* Valor Líquido */}
                <div className={`rounded-[2rem] p-6 text-white shadow-xl ${metrics.netValue >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200/50' : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-200/50'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Wallet size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Valor Líquido</span>
                    </div>
                    <p className="text-3xl font-black tracking-tight">{formatCurrency(metrics.netValue)}</p>
                    <p className="text-xs font-bold mt-2 opacity-70">
                        {metrics.netValue >= 0 ? 'Lucro' : 'Prejuízo'} bruto
                    </p>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <CheckCircle size={14} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{metrics.paidCount}</p>
                        <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Pagos</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Clock size={14} className="text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{metrics.pendingCount}</p>
                        <p className="text-[9px] font-black uppercase text-yellow-600 tracking-wider">Pendentes</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Wallet size={14} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{metrics.sinalCount}</p>
                        <p className="text-[9px] font-black uppercase text-blue-600 tracking-wider">Sinal</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Calendar size={14} className="text-orange-600" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{metrics.pagarNoDiaCount}</p>
                        <p className="text-[9px] font-black uppercase text-orange-600 tracking-wider">Pagar Dia</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle size={14} className="text-gray-500" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-gray-900">{metrics.newCount}</p>
                        <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Novos</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-black text-gray-900 text-sm">Receita Diária</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Últimos dias com vendas</p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <TrendingUp size={18} className="text-emerald-600" />
                        </div>
                    </div>

                    {dailyRevenue.length > 0 ? (
                        <div className="space-y-2">
                            {dailyRevenue.slice(-10).map(([date, value]) => {
                                const pct = (value / maxDailyRevenue) * 100;
                                let formatted = date;
                                try {
                                    const dateObj = new Date(date + 'T12:00:00');
                                    if (!isNaN(dateObj.getTime())) {
                                        formatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                                    }
                                } catch { /* keep raw date string */ }
                                return (
                                    <div key={date} className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-gray-400 w-16 text-right">{formatted}</span>
                                        <div className="flex-1 bg-gray-50 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                                                style={{ width: `${Math.max(pct, 8)}%` }}
                                            >
                                                <span className="text-[9px] font-black text-white whitespace-nowrap">{formatCurrency(value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-300">
                            <BarChart3 size={40} className="mx-auto mb-3 opacity-50" />
                            <p className="text-xs font-bold">Sem dados de receita</p>
                        </div>
                    )}
                </div>

                {/* Payment Methods */}
                <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-black text-gray-900 text-sm">Meios de Pagamento</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Distribuição por forma de pagamento</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <CreditCard size={18} className="text-blue-600" />
                        </div>
                    </div>

                    {paymentMethods.length > 0 ? (
                        <div className="space-y-4">
                            {paymentMethods.map(([method, data]) => {
                                const totalPaid = filteredLeads.filter(l => l.status === 'Pago').length;
                                const pct = totalPaid > 0 ? (data.count / totalPaid) * 100 : 0;
                                return (
                                    <div key={method} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${getMethodColor(method)}`} />
                                                <span className="text-xs font-black text-gray-700">{method}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-black text-gray-900">{formatCurrency(data.total)}</span>
                                                <span className="text-[10px] font-bold text-gray-400 ml-2">({data.count}x)</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-50 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${getMethodColor(method)}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-300">
                            <PieChart size={40} className="mx-auto mb-3 opacity-50" />
                            <p className="text-xs font-bold">Sem dados de pagamento</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Per-Product Breakdown */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-black text-gray-900 text-sm">Desempenho por Produto / Turma</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Análise detalhada de cada checkout</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <PieChart size={18} className="text-purple-600" />
                    </div>
                </div>

                {productBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-50">
                                    <th className="text-left text-[10px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Produto</th>
                                    <th className="text-left text-[10px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Turma</th>
                                    <th className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Leads</th>
                                    <th className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Vendas</th>
                                    <th className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Conversão</th>
                                    <th className="text-right text-[10px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Receita</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productBreakdown.map(([id, data]) => (
                                    <tr key={id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-2">
                                            <span className="font-bold text-sm text-gray-900">{data.name}</span>
                                        </td>
                                        <td className="py-4 px-2">
                                            {data.turma ? (
                                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{data.turma}</span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <span className="font-black text-sm text-gray-700">{data.totalLeads}</span>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">{data.paidCount}</span>
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${data.conversionRate >= 50 ? 'bg-emerald-500' : data.conversionRate >= 20 ? 'bg-yellow-500' : 'bg-red-400'}`} />
                                                <span className="font-black text-sm text-gray-700">{data.conversionRate.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 text-right">
                                            <span className="font-black text-sm text-emerald-600">{formatCurrency(data.revenue)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-100 bg-gray-50/50">
                                    <td colSpan={2} className="py-4 px-2">
                                        <span className="font-black text-sm text-gray-700">TOTAL</span>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <span className="font-black text-sm text-gray-700">{metrics.totalLeads}</span>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <span className="font-black text-sm text-gray-700">{metrics.paidCount}</span>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <span className="font-black text-sm text-gray-700">{metrics.conversionRate.toFixed(1)}%</span>
                                    </td>
                                    <td className="py-4 px-2 text-right">
                                        <span className="font-black text-sm text-emerald-600">{formatCurrency(metrics.totalRevenue)}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-300">
                        <BarChart3 size={40} className="mx-auto mb-3 opacity-50" />
                        <p className="text-xs font-bold">Sem dados para exibir</p>
                    </div>
                )}
            </div>

            {/* Revenue Pending Summary */}
            {(metrics.pendingRevenue > 0 || metrics.sinalRevenue > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metrics.pendingRevenue > 0 && (
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-[2rem] p-6 border border-yellow-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center">
                                    <Clock size={20} className="text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-yellow-800 tracking-widest">Receita Pendente</p>
                                    <p className="text-2xl font-black text-yellow-700">{formatCurrency(metrics.pendingRevenue)}</p>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-yellow-600">{metrics.pendingCount} pagamentos aguardando confirmação</p>
                        </div>
                    )}
                    {metrics.sinalRevenue > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] p-6 border border-blue-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                                    <Wallet size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest">Receita em Sinal</p>
                                    <p className="text-2xl font-black text-blue-700">{formatCurrency(metrics.sinalRevenue)}</p>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-blue-600">{metrics.sinalCount} pagamentos parciais</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
