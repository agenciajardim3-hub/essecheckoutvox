
import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, ScatterChart, Scatter, ComposedChart, Area, AreaChart } from 'recharts';
import {
    Calendar, Users, DollarSign, TrendingUp, BarChart3, Eye, EyeOff,
    GraduationCap, Megaphone, Wallet, PieChart, ArrowUpRight,
    Filter, CheckCircle, Clock, CreditCard, FileText, UserPlus, RefreshCw,
    Settings, ChevronDown, ChevronUp, Save, Info, TrendingDown
} from 'lucide-react';
import { Lead, AppConfig } from '../../types';

interface OverviewDashboardProps {
    leads: Lead[];
    checkouts: AppConfig[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

const METHOD_COLORS: Record<string, string> = {
    'Pix': '#10b981',
    'Cartão': '#6366f1',
    'Boleto': '#f59e0b',
    'Dinheiro': '#3b82f6',
    'Outro': '#94a3b8'
};

interface TurmaExpenses {
    aluguelSala: number;
    coffeeBreak: number;
    alimentacao: number;
    trafegoMeta: number;
    trafegoGoogle: number;
    trafegoOutras: number;
    hospedagem: number;
    gasolina: number;
    pedagio: number;
    ajudante01: number;
    ajudante02: number;
    ajudante03: number;
    ajudante04: number;
    ajudante05: number;
}

const EMPTY_EXPENSES: TurmaExpenses = {
    aluguelSala: 0, coffeeBreak: 0, alimentacao: 0,
    trafegoMeta: 0, trafegoGoogle: 0, trafegoOutras: 0,
    hospedagem: 0, gasolina: 0, pedagio: 0,
    ajudante01: 0, ajudante02: 0, ajudante03: 0, ajudante04: 0, ajudante05: 0
};

const EXPENSE_CATEGORIES = [
    {
        title: 'Estrutura & Alimentação',
        icon: '🏢',
        fields: [
            { key: 'aluguelSala' as keyof TurmaExpenses, label: 'Aluguel da Sala' },
            { key: 'coffeeBreak' as keyof TurmaExpenses, label: 'Coffee Break' },
            { key: 'alimentacao' as keyof TurmaExpenses, label: 'Alimentação' },
        ]
    },
    {
        title: 'Tráfego Pago',
        icon: '📢',
        fields: [
            { key: 'trafegoMeta' as keyof TurmaExpenses, label: 'Tráfego Meta Ads' },
            { key: 'trafegoGoogle' as keyof TurmaExpenses, label: 'Tráfego Google Ads' },
            { key: 'trafegoOutras' as keyof TurmaExpenses, label: 'Outras Plataformas' },
        ]
    },
    {
        title: 'Custos Gerais / Logística',
        icon: '🚗',
        fields: [
            { key: 'hospedagem' as keyof TurmaExpenses, label: 'Hospedagem' },
            { key: 'gasolina' as keyof TurmaExpenses, label: 'Gasolina' },
            { key: 'pedagio' as keyof TurmaExpenses, label: 'Pedágio' },
        ]
    },
    {
        title: 'Staff / Ajudantes',
        icon: '👥',
        fields: [
            { key: 'ajudante01' as keyof TurmaExpenses, label: 'Ajudante 01' },
            { key: 'ajudante02' as keyof TurmaExpenses, label: 'Ajudante 02' },
            { key: 'ajudante03' as keyof TurmaExpenses, label: 'Ajudante 03' },
            { key: 'ajudante04' as keyof TurmaExpenses, label: 'Ajudante 04' },
            { key: 'ajudante05' as keyof TurmaExpenses, label: 'Ajudante 05' },
        ]
    }
];

const getTotalExpenses = (exp: TurmaExpenses): number => {
    return Object.values(exp).reduce((s, v) => s + (v || 0), 0);
};

const getTrafegoTotal = (exp: TurmaExpenses): number => {
    return (exp.trafegoMeta || 0) + (exp.trafegoGoogle || 0) + (exp.trafegoOutras || 0);
};

const loadTurmaExpenses = (): Record<string, TurmaExpenses> => {
    try {
        const saved = localStorage.getItem('cv_turma_expenses');
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

const saveTurmaExpenses = (data: Record<string, TurmaExpenses>) => {
    localStorage.setItem('cv_turma_expenses', JSON.stringify(data));
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ leads, checkouts }) => {
    const [hideValues, setHideValues] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
    const [turmaExpenses, setTurmaExpenses] = useState<Record<string, TurmaExpenses>>(loadTurmaExpenses);
    const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
    const [showTurmaSelector, setShowTurmaSelector] = useState(false);
    const [configSaved, setConfigSaved] = useState(false);
    const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'financeiro' | 'inteligencia' | 'configuracao'>('financeiro');

    const gastoCampanha = useMemo(() => {
        return Object.values(turmaExpenses).reduce((s, exp) => s + getTotalExpenses(exp), 0);
    }, [turmaExpenses]);

    const updateExpenseField = (turmaId: string, field: keyof TurmaExpenses, value: number) => {
        setTurmaExpenses(prev => {
            const current = prev[turmaId] || { ...EMPTY_EXPENSES };
            const updated = { ...prev, [turmaId]: { ...current, [field]: value } };
            return updated;
        });
    };

    const saveExpenses = () => {
        saveTurmaExpenses(turmaExpenses);
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
    };

    const safeDate = (d: any): Date | null => {
        if (!d) return null;
        try {
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        } catch { return null; }
    };

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
                const d = safeDate(l.created_at || l.date);
                return d ? d >= cutoff : false;
            });
        }
        return filtered;
    }, [leads, selectedProduct, dateRange]);

    const filteredPaid = useMemo(() => filteredLeads.filter(l => l.status === 'Pago'), [filteredLeads]);

    const financialMetrics = useMemo(() => {
        const totalRevenue = filteredPaid.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
        const ticketMedio = filteredPaid.length > 0 ? totalRevenue / filteredPaid.length : 0;
        const conversionRate = filteredLeads.length > 0 ? (filteredPaid.length / filteredLeads.length) * 100 : 0;

        const totalExpenses = Object.values(turmaExpenses).reduce((s, exp) => s + getTotalExpenses(exp), 0);
        const totalProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            ticketMedio,
            conversionRate,
            totalLeads: filteredLeads.length,
            totalPaid: filteredPaid.length,
            totalExpenses,
            totalProfit,
            profitMargin
        };
    }, [filteredLeads, filteredPaid, turmaExpenses]);

    const statusCounts = useMemo(() => ({
        pago: filteredLeads.filter(l => l.status === 'Pago').length,
        pendente: filteredLeads.filter(l => l.status === 'Pendente').length,
        sinal: filteredLeads.filter(l => l.status === 'Sinal').length,
        pagarDia: filteredLeads.filter(l => l.status === 'Pagar no dia').length,
        novo: filteredLeads.filter(l => l.status === 'Novo' || !l.status).length
    }), [filteredLeads]);

    const dailyRevenue = useMemo(() => {
        const daily: Record<string, number> = {};
        filteredPaid.forEach(l => {
            const d = safeDate(l.created_at || l.date);
            if (!d) return;
            const day = d.toISOString().split('T')[0];
            daily[day] = (daily[day] || 0) + (l.paid_amount || 0);
        });
        return Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).slice(-10);
    }, [filteredPaid]);

    const maxDailyRevenue = Math.max(...dailyRevenue.map(([, v]) => v), 1);

    const paymentMethods = useMemo(() => {
        const methods: Record<string, { count: number; revenue: number }> = {};
        filteredPaid.forEach(l => {
            const method = l.payment_method || 'Outro';
            if (!methods[method]) methods[method] = { count: 0, revenue: 0 };
            methods[method].count++;
            methods[method].revenue += (l.paid_amount || 0);
        });
        return Object.entries(methods).sort((a, b) => b[1].revenue - a[1].revenue);
    }, [filteredPaid]);

    const allPaidLeads = useMemo(() => leads.filter(l => l.status === 'Pago'), [leads]);

    // Current month leads
    const currentMonthLeads = useMemo(() => {
        const now = new Date();
        return allPaidLeads.filter(l => {
            const d = safeDate(l.created_at || l.date);
            return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    }, [allPaidLeads]);

    const currentMonthData = useMemo(() => {
        const turmasSet = new Set(currentMonthLeads.map(l => l.product_id).filter(Boolean));
        const alunos = currentMonthLeads.length;
        const receita = currentMonthLeads.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
        const lucroBruto = receita;
        const lucroLiquido = receita - gastoCampanha;
        return { turmas: turmasSet.size, alunos, receita, lucroBruto, lucroLiquido };
    }, [currentMonthLeads, gastoCampanha]);

    const globalData = useMemo(() => {
        const totalAlunos = allPaidLeads.length;
        const totalReceita = allPaidLeads.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
        const ticketMedio = totalAlunos > 0 ? totalReceita / totalAlunos : 0;
        const turmasSet = new Set(allPaidLeads.map(l => l.product_id).filter(Boolean));
        const mediaPorTurma = turmasSet.size > 0 ? totalAlunos / turmasSet.size : 0;
        const roi = gastoCampanha > 0 ? ((totalReceita - gastoCampanha) / gastoCampanha) * 100 : 0;
        const lucroTotal = totalReceita - gastoCampanha;
        return { totalAlunos, totalReceita, ticketMedio, turmasCount: turmasSet.size, mediaPorTurma, roi, lucroTotal };
    }, [allPaidLeads, gastoCampanha]);

    const salesByWeekday = useMemo(() => {
        const counts = Array(7).fill(0);
        allPaidLeads.forEach(l => {
            const d = safeDate(l.created_at || l.date);
            if (d) counts[d.getDay()]++;
        });
        return counts;
    }, [allPaidLeads]);
    const maxWeekday = Math.max(...salesByWeekday, 1);

    const salesByMonthDay = useMemo(() => {
        const counts = Array(31).fill(0);
        allPaidLeads.forEach(l => {
            const d = safeDate(l.created_at || l.date);
            if (d) counts[d.getDate() - 1]++;
        });
        return counts;
    }, [allPaidLeads]);
    const maxMonthDay = Math.max(...salesByMonthDay, 1);

    const growthData = useMemo(() => {
        const turmasToShow = selectedTurmas.length > 0 ? selectedTurmas : checkouts.slice(0, 3).map(c => c.id);
        const curves: { id: string; name: string; color: string; points: { dateStr: string; date: Date; cumulativeCount: number }[] }[] = [];

        turmasToShow.forEach((tid, idx) => {
            const checkout = checkouts.find(c => c.id === tid);
            if (!checkout) return;

            const paidLeads = allPaidLeads.filter(l => l.product_id === tid);

            if (paidLeads.length === 0) return;

            const leadDates = paidLeads
                .map(l => {
                    const d = safeDate(l.created_at || l.date);
                    return d ? { date: d, dateStr: d.toISOString().split('T')[0] } : null;
                })
                .filter((item): item is { date: Date; dateStr: string } => item !== null);

            if (leadDates.length === 0) return;

            const dateGroups: Record<string, number> = {};
            leadDates.forEach(({ dateStr }) => {
                dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
            });

            const sortedDates = Object.keys(dateGroups).sort();

            const points: { dateStr: string; date: Date; cumulativeCount: number }[] = [];
            let cumulativeCount = 0;

            sortedDates.forEach(dateStr => {
                cumulativeCount += dateGroups[dateStr];
                const date = new Date(dateStr);
                points.push({ dateStr, date, cumulativeCount });
            });

            curves.push({
                id: tid,
                name: `${checkout.productName}${checkout.turma ? ` (${checkout.turma})` : ''}`,
                color: COLORS[idx % COLORS.length],
                points
            });
        });

        return curves;
    }, [allPaidLeads, checkouts, selectedTurmas]);

    const rechartsData = useMemo(() => {
        if (growthData.length === 0) return [];

        const allDates = new Set<string>();
        growthData.forEach(curve => {
            curve.points.forEach(p => {
                allDates.add(p.dateStr);
            });
        });

        const sortedDates = Array.from(allDates).sort();

        const data = sortedDates.map(dateStr => {
            const point: any = { date: dateStr };

            growthData.forEach(curve => {
                let cumulativeCount = 0;
                for (const p of curve.points) {
                    if (p.dateStr <= dateStr) {
                        cumulativeCount = p.cumulativeCount;
                    } else {
                        break;
                    }
                }
                point[curve.id] = cumulativeCount || null;
            });

            return point;
        });

        return data;
    }, [growthData]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dateObj = new Date(label);
            const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                : label;

            return (
                <div className="bg-white p-4 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100">
                    <p className="font-bold text-gray-800 text-sm mb-3">📅 {formattedDate}</p>
                    {payload.map((entry: any, index: number) => {
                        const curve = growthData.find(c => c.id === entry.dataKey);
                        return (
                            <p key={index} className="text-xs font-medium mb-1.5 flex items-center justify-between gap-4" style={{ color: entry.color }}>
                                <span>{curve?.name}:</span> <span className="font-black text-sm">{entry.value || 0} Alunos</span>
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    }, [growthData]);

    const turmaTableData = useMemo(() => {
        return checkouts.map(checkout => {
            const turmaLeads = leads.filter(l => l.product_id === checkout.id);
            const turmaPaid = turmaLeads.filter(l => l.status === 'Pago');
            const turmaRevenue = turmaPaid.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
            const conv = turmaLeads.length > 0 ? (turmaPaid.length / turmaLeads.length) * 100 : 0;
            return { checkout, totalLeads: turmaLeads.length, totalPaid: turmaPaid.length, turmaRevenue, conv };
        });
    }, [leads, checkouts]);

    const tableTotals = useMemo(() => ({
        leads: turmaTableData.reduce((s, t) => s + t.totalLeads, 0),
        paid: turmaTableData.reduce((s, t) => s + t.totalPaid, 0),
        revenue: turmaTableData.reduce((s, t) => s + t.turmaRevenue, 0),
        conv: turmaTableData.reduce((s, t) => s + t.totalLeads, 0) > 0
            ? (turmaTableData.reduce((s, t) => s + t.totalPaid, 0) / turmaTableData.reduce((s, t) => s + t.totalLeads, 0)) * 100
            : 0
    }), [turmaTableData]);

    const formatCurrency = (value: number) => {
        if (hideValues) return '•••••';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };
    const formatNumber = (value: number) => hideValues ? '•••' : value.toLocaleString('pt-BR');
    const formatPercent = (value: number) => hideValues ? '•••%' : `${value.toFixed(1)}%`;

    const tooltipContentStyle = useMemo(() => ({
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px'
    }), []);

    const currencyFormatter = useCallback((value: any) => formatCurrency(value as number), [hideValues]);

    const lineChartMargin = useMemo(() => ({ top: 20, right: 30, left: 0, bottom: 20 }), []);
    const barChartMargin = useMemo(() => ({ top: 5, right: 30, left: 200, bottom: 5 }), []);
    const scatterChartMargin = useMemo(() => ({ top: 20, right: 20, bottom: 20, left: 20 }), []);

    React.useEffect(() => {
        if (selectedTurmas.length === 0 && checkouts.length > 0) {
            setSelectedTurmas(checkouts.slice(0, 3).map(c => c.id));
        }
    }, [checkouts]);

    const toggleTurma = (id: string) => {
        setSelectedTurmas(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const formatDateLabel = (dateStr: string) => {
        try {
            const d = new Date(dateStr + 'T12:00:00');
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        } catch { return dateStr; }
    };

    // NOVO: Distribuição de Receita por Turma (Pie Chart)
    const revenueByTurma = useMemo(() => {
        const data: { name: string; value: number; id: string }[] = [];
        checkouts.forEach(checkout => {
            const turmaRevenue = allPaidLeads
                .filter(l => l.product_id === checkout.id)
                .reduce((acc, l) => acc + (l.paid_amount || 0), 0);
            if (turmaRevenue > 0) {
                data.push({
                    name: `${checkout.productName} ${checkout.turma ? `(${checkout.turma})` : ''}`,
                    value: turmaRevenue,
                    id: checkout.id
                });
            }
        });
        return data.sort((a, b) => b.value - a.value);
    }, [allPaidLeads, checkouts]);

    // NOVO: Ranking de Turmas (Bar Chart)
    const turmaRanking = useMemo(() => {
        return turmaTableData
            .filter(t => t.totalPaid > 0)
            .sort((a, b) => b.turmaRevenue - a.turmaRevenue)
            .slice(0, 5)
            .map(t => ({
                name: `${t.checkout.productName}`,
                turma: t.checkout.turma || '—',
                revenue: t.turmaRevenue,
                alunos: t.totalPaid,
                taxa: t.conv
            }));
    }, [turmaTableData]);

    // NOVO: Comparação Mês Atual vs Anterior
    const previousMonthLeads = useMemo(() => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return allPaidLeads.filter(l => {
            const d = safeDate(l.created_at || l.date);
            return d && d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        });
    }, [allPaidLeads]);

    const previousMonthData = useMemo(() => {
        const alunos = previousMonthLeads.length;
        const receita = previousMonthLeads.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
        return { alunos, receita };
    }, [previousMonthLeads]);

    // NOVO: Scatter Plot - Gasto × Receita por Turma
    const scatterData = useMemo(() => {
        return checkouts
            .map(checkout => {
                const turmaAllLeads = allPaidLeads.filter(l => l.product_id === checkout.id);
                const turmaRevenue = turmaAllLeads.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
                const exp = turmaExpenses[checkout.id] || { ...EMPTY_EXPENSES };
                const trafego = getTrafegoTotal(exp);
                const alunos = turmaAllLeads.length;
                const totalLeads = leads.filter(l => l.product_id === checkout.id).length;
                const conv = totalLeads > 0 ? (alunos / totalLeads) * 100 : 0;

                return {
                    x: trafego,
                    y: turmaRevenue,
                    z: alunos,
                    taxa: conv,
                    name: checkout.productName,
                    turma: checkout.turma
                };
            })
            .filter(d => d.y > 0);
    }, [allPaidLeads, leads, checkouts, turmaExpenses]);

    // NOVO: Heatmap - Padrão por Dia do Mês × Método de Pagamento
    const heatmapData = useMemo(() => {
        const methods = ['Pix', 'Cartão', 'Boleto', 'Dinheiro', 'Outro'];
        const days = Array(31).fill(null).map((_, i) => i + 1);

        const matrix: Record<number, Record<string, number>> = {};
        days.forEach(day => {
            matrix[day] = {};
            methods.forEach(method => {
                matrix[day][method] = 0;
            });
        });

        allPaidLeads.forEach(l => {
            const d = safeDate(l.created_at || l.date);
            if (!d) return;
            const day = d.getDate();
            const method = l.payment_method || 'Outro';
            if (matrix[day]) matrix[day][method] = (matrix[day][method] || 0) + 1;
        });

        return { matrix, methods, days };
    }, [allPaidLeads]);

    const latestPaid = useMemo(() => {
        if (allPaidLeads.length === 0) return null;
        return [...allPaidLeads].sort((a, b) => {
            const da = safeDate(a.created_at || a.date)?.getTime() || 0;
            const db = safeDate(b.created_at || b.date)?.getTime() || 0;
            return db - da;
        })[0];
    }, [allPaidLeads]);

    const latestLead = useMemo(() => {
        if (leads.length === 0) return null;
        return [...leads].sort((a, b) => {
            const da = safeDate(a.created_at || a.date)?.getTime() || 0;
            const db = safeDate(b.created_at || b.date)?.getTime() || 0;
            return db - da;
        })[0];
    }, [leads]);

    const formatFullDateTime = (dStr?: string) => {
        const d = safeDate(dStr);
        if (!d) return 'N/A';
        const datePart = d.toLocaleDateString('pt-BR');
        const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const weekday = WEEKDAYS[d.getDay()];
        return `${datePart} às ${timePart} (${weekday})`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Visão Geral</h2>
                    <p className="text-sm text-gray-400 font-medium mt-1 mb-4">Painel de inteligência e performance.</p>

                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                        {latestPaid && (
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <DollarSign size={18} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-tight">Última Venda</p>
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{latestPaid.name.split(' ')[0]}</p>
                                    <p className="text-[10px] font-medium text-gray-500">{formatFullDateTime(latestPaid.created_at || latestPaid.date)}</p>
                                    <p className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                        {latestPaid.turma || latestPaid.product_name || 'Produto'}
                                    </p>
                                </div>
                            </div>
                        )}
                        {latestLead && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <UserPlus size={18} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-tight">Último Cadastro</p>
                                    <p className="text-sm font-bold text-gray-900 leading-tight">{latestLead.name.split(' ')[0]}</p>
                                    <p className="text-[10px] font-medium text-gray-500">{formatFullDateTime(latestLead.created_at || latestLead.date)}</p>
                                    <p className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                        {latestLead.turma || latestLead.product_name || 'Produto'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('financeiro')}
                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'financeiro'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📊 Financeiro
                </button>
                <button
                    onClick={() => setActiveTab('inteligencia')}
                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'inteligencia'
                        ? 'border-emerald-600 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📈 Inteligência
                </button>
                <button
                    onClick={() => setActiveTab('configuracao')}
                    className={`px-6 py-3 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'configuracao'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    ⚙️ Configuração
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* TAB: FINANCEIRO */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeTab === 'financeiro' && (
                <div className="space-y-6">
                    {/* FILTERS */}
                    <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Filter size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
                        </div>
                        <select
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(e.target.value)}
                            className="flex-1 min-w-[180px] text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            <option value="all">Todos os Produtos</option>
                            {checkouts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.productName} {c.turma ? `(${c.turma})` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="flex rounded-xl overflow-hidden border border-gray-200">
                            {(['7d', '30d', '90d', 'all'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${dateRange === range
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {range === '7d' ? '7 Dias' : range === '30d' ? '30 Dias' : range === '90d' ? '90 Dias' : 'Todos'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setHideValues(!hideValues)}
                            className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {hideValues ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span className="hidden sm:inline">{hideValues ? 'Mostrar' : 'Esconder'}</span>
                        </button>
                    </div>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Receita Total</p>
                                    <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(financialMetrics.totalRevenue)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">{financialMetrics.totalPaid} vendas</p>
                                </div>
                                <DollarSign size={24} className="text-emerald-500" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Despesas</p>
                                    <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(financialMetrics.totalExpenses)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">Custos da campanha</p>
                                </div>
                                <Wallet size={24} className="text-orange-500" />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Lucro Líquido</p>
                                    <p className={`text-3xl font-black mt-2 ${financialMetrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {formatCurrency(financialMetrics.totalProfit)}
                                    </p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">Receita - Despesas</p>
                                </div>
                                <TrendingUp size={24} className={financialMetrics.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Taxa Conversão</p>
                                    <p className="text-3xl font-black text-gray-900 mt-2">{formatPercent(financialMetrics.conversionRate)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">{financialMetrics.totalPaid}/{financialMetrics.totalLeads}</p>
                                </div>
                                <BarChart3 size={24} className="text-indigo-500" />
                            </div>
                        </div>
                    </div>

                    {/* STATUS BREAKDOWN */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-2xl font-black text-gray-900">{formatNumber(statusCounts.pago)}</p>
                                <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Pagos</p>
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-2xl p-4 flex items-center gap-3">
                            <Clock size={16} className="text-yellow-500 shrink-0" />
                            <div>
                                <p className="text-2xl font-black text-gray-900">{formatNumber(statusCounts.pendente)}</p>
                                <p className="text-[9px] font-black uppercase text-yellow-600 tracking-widest">Pendentes</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3">
                            <CreditCard size={16} className="text-blue-500 shrink-0" />
                            <div>
                                <p className="text-2xl font-black text-gray-900">{formatNumber(statusCounts.sinal)}</p>
                                <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Sinal</p>
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-2xl p-4 flex items-center gap-3">
                            <FileText size={16} className="text-orange-500 shrink-0" />
                            <div>
                                <p className="text-2xl font-black text-gray-900">{formatNumber(statusCounts.pagarDia)}</p>
                                <p className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Pagar Dia</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                            <UserPlus size={16} className="text-gray-400 shrink-0" />
                            <div>
                                <p className="text-2xl font-black text-gray-900">{formatNumber(statusCounts.novo)}</p>
                                <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Novos</p>
                            </div>
                        </div>
                    </div>

                    {/* RECEITA DIÁRIA + MEIOS PAGAMENTO */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-sm text-gray-800">Receita Diária</h3>
                                <TrendingUp size={16} className="text-emerald-400" />
                            </div>

                            <div className="space-y-3">
                                {dailyRevenue.length === 0 && (
                                    <p className="text-xs text-gray-300 text-center py-4">Nenhuma venda encontrada</p>
                                )}
                                {dailyRevenue.map(([date, value]) => {
                                    const pct = (value / maxDailyRevenue) * 100;
                                    return (
                                        <div key={date} className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-400 w-16 text-right shrink-0">
                                                {formatDateLabel(date)}
                                            </span>
                                            <div className="flex-1 relative h-6">
                                                <div
                                                    className="absolute left-0 top-0 h-full rounded-r-lg transition-all duration-700"
                                                    style={{
                                                        width: `${Math.max(pct, 3)}%`,
                                                        background: 'linear-gradient(to right, #f59e0b, #f97316)'
                                                    }}
                                                />
                                            </div>
                                            <span className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shrink-0">
                                                {formatCurrency(value)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-sm text-gray-800">Meios de Pagamento</h3>
                                <CreditCard size={16} className="text-indigo-400" />
                            </div>

                            <div className="space-y-4">
                                {paymentMethods.length === 0 && (
                                    <p className="text-xs text-gray-300 text-center py-4">Nenhum pagamento encontrado</p>
                                )}
                                {paymentMethods.map(([method, data]) => {
                                    const pct = financialMetrics.totalRevenue > 0 ? (data.revenue / financialMetrics.totalRevenue) * 100 : 0;
                                    const color = METHOD_COLORS[method] || '#94a3b8';
                                    return (
                                        <div key={method}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                    <span className="text-xs font-bold text-gray-700">{method}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-gray-900">{formatCurrency(data.revenue)}</span>
                                                    <span className="text-[9px] font-bold text-gray-400">({pct.toFixed(0)}%)</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* PERFORMANCE TABLE */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-sm text-gray-800">Desempenho por Produto / Turma</h3>
                            <RefreshCw size={14} className="text-emerald-400" />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-50">
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Produto</th>
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Turma</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Leads</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Vendas</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Conv</th>
                                        <th className="text-right text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Receita</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {turmaTableData.map(({ checkout, totalLeads, totalPaid, turmaRevenue, conv }) => (
                                        <tr key={checkout.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-3 px-2">
                                                <span className="font-bold text-xs text-gray-900">{checkout.productName}</span>
                                            </td>
                                            <td className="py-3 px-2">
                                                {checkout.turma ? (
                                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{checkout.turma}</span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <span className="font-black text-xs text-gray-600">{totalLeads}</span>
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-black">{totalPaid}</span>
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${conv >= 50 ? 'bg-emerald-500' : conv >= 20 ? 'bg-yellow-500' : 'bg-red-400'}`} />
                                                    <span className="font-bold text-xs text-gray-600">{conv.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                <span className="font-black text-xs text-emerald-600">{formatCurrency(turmaRevenue)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                                        <td className="py-3 px-2" colSpan={2}>
                                            <span className="font-black text-sm text-gray-900">TOTAL</span>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className="font-black text-sm text-gray-900">{tableTotals.leads}</span>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className="font-black text-sm text-gray-900">{tableTotals.paid}</span>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className="font-black text-sm text-gray-900">{tableTotals.conv.toFixed(1)}%</span>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <span className="font-black text-sm text-emerald-600">{formatCurrency(tableTotals.revenue)}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* TAB: INTELIGÊNCIA */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeTab === 'inteligencia' && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <p className="text-gray-600">Aba em manutenção</p>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* TAB: CONFIGURAÇÃO */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeTab === 'configuracao' && (
                <div className="space-y-6">
                    {/* CONFIGURAÇÃO FINANCEIRA - Always visible */}
                    <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Settings size={16} className="text-purple-600" />
                                    <h3 className="font-black text-sm text-gray-800">Configuração de Despesas</h3>
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium">Clique em "Editar" para gerenciar as despesas de cada turma</p>
                            </div>
                            <button
                                onClick={saveExpenses}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${configSaved
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                    }`}
                            >
                                {configSaved ? <CheckCircle size={12} /> : <Save size={12} />}
                                {configSaved ? 'Salvo!' : 'Salvar Tudo'}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-purple-100/50">
                                        <th className="text-left text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Produto / Turma</th>
                                        <th className="text-center text-[9px] font-black uppercase text-emerald-600 tracking-widest py-3 px-2">Receita</th>
                                        <th className="text-center text-[9px] font-black uppercase text-blue-600 tracking-widest py-3 px-2">Tráfego</th>
                                        <th className="text-center text-[9px] font-black uppercase text-orange-600 tracking-widest py-3 px-2">Total Custos</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Lucro</th>
                                        <th className="text-center text-[9px] font-black uppercase text-gray-400 tracking-widest py-3 px-2">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkouts.map(checkout => {
                                        const turmaRevenue = leads
                                            .filter(l => l.product_id === checkout.id && l.status === 'Pago')
                                            .reduce((acc, l) => acc + (l.paid_amount || 0), 0);
                                        const exp = turmaExpenses[checkout.id] || { ...EMPTY_EXPENSES };
                                        const totalCustos = getTotalExpenses(exp);
                                        const trafego = getTrafegoTotal(exp);
                                        const lucro = turmaRevenue - totalCustos;

                                        return (
                                            <tr key={checkout.id} className="border-b border-purple-50 hover:bg-white/50 transition-colors">
                                                <td className="py-3 px-2">
                                                    <span className="font-bold text-xs text-gray-900">{checkout.productName}</span>
                                                    {checkout.turma && (
                                                        <span className="ml-2 bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{checkout.turma}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className="text-xs font-black text-emerald-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(turmaRevenue)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className="text-xs font-black text-blue-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trafego)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className="text-xs font-black text-orange-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustos)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`text-xs font-black ${lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucro)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <button
                                                        onClick={() => setEditingTurmaId(checkout.id)}
                                                        className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-purple-200 transition-colors"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 pt-4 border-t border-purple-100/50">
                            <div className="text-[10px] text-gray-400 font-medium">
                                Total despesas: <span className="font-black text-orange-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gastoCampanha)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
                        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black text-blue-900">💡 Dica</p>
                            <p className="text-xs text-blue-700 mt-1">As despesas são usadas para calcular o lucro líquido e ROI em todas as abas. Configure com cuidado!</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* MODAL EDITAR DESPESAS */}
            {/* ════════════════════════════════════════════════════════════ */}
            {editingTurmaId && (() => {
                const checkout = checkouts.find(c => c.id === editingTurmaId);
                if (!checkout) return null;
                const exp = turmaExpenses[editingTurmaId] || { ...EMPTY_EXPENSES };
                const totalCustos = getTotalExpenses(exp);

                return (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingTurmaId(null)}>
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-base text-gray-900">Editar Despesas</h3>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                                            {checkout.productName} {checkout.turma ? `(${checkout.turma})` : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setEditingTurmaId(null)}
                                        className="text-gray-300 hover:text-gray-500 text-xl font-bold transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-5 space-y-6">
                                {EXPENSE_CATEGORIES.map(category => (
                                    <div key={category.title}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">{category.icon}</span>
                                            <h4 className="font-black text-xs uppercase text-gray-700 tracking-wider">{category.title}</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {category.fields.map(field => (
                                                <div key={field.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                                                    <span className="text-xs font-bold text-gray-600">{field.label}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-gray-400">R$</span>
                                                        <input
                                                            type="number"
                                                            value={exp[field.key] || ''}
                                                            onChange={e => updateExpenseField(editingTurmaId, field.key, parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                            className="w-24 text-sm font-bold text-right bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Total Despesas</p>
                                        <p className="text-xl font-black text-orange-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustos)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingTurmaId(null)}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                                        >
                                            Fechar
                                        </button>
                                        <button
                                            onClick={() => { saveExpenses(); setEditingTurmaId(null); }}
                                            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center gap-2"
                                        >
                                            <Save size={12} />
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
