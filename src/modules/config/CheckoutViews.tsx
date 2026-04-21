import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Calendar, TrendingUp, Loader2, ArrowUpDown } from 'lucide-react';
import { useSupabase } from '../../services/useSupabase';
import { AppConfig } from '../../shared';

interface CheckoutViewsProps {
    checkouts: AppConfig[];
}

interface ViewStats {
    checkout_id: string;
    checkout_name: string;
    today: number;
    yesterday: number;
    last_7_days: number;
    last_15_days: number;
    last_30_days: number;
    total: number;
}

export const CheckoutViews: React.FC<CheckoutViewsProps> = ({ checkouts }) => {
    const supabase = useSupabase();
    const [loading, setLoading] = useState(true);
    const [viewData, setViewData] = useState<ViewStats[]>([]);
    const [period, setPeriod] = useState<'7' | '15' | '30' | 'all'>('7');
    const [sortBy, setSortBy] = useState<'visits' | 'name'>('visits');

    useEffect(() => {
        fetchViewData();
    }, []);

    const fetchViewData = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('checkout_views')
                .select('*')
                .order('viewed_at', { ascending: false });

            if (error) throw error;

            // Process data
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const days7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const days15 = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
            const days30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Group by checkout
            const grouped: Record<string, ViewStats> = {};

            checkouts.forEach(c => {
                grouped[c.id] = {
                    checkout_id: c.id,
                    checkout_name: c.productName || c.turma || c.id,
                    today: 0,
                    yesterday: 0,
                    last_7_days: 0,
                    last_15_days: 0,
                    last_30_days: 0,
                    total: 0
                };
            });

            (data || []).forEach(view => {
                const viewDate = new Date(view.viewed_at);
                const checkoutId = view.checkout_id;

                if (!grouped[checkoutId]) {
                    grouped[checkoutId] = {
                        checkout_id: checkoutId,
                        checkout_name: view.checkout_slug || checkoutId,
                        today: 0,
                        yesterday: 0,
                        last_7_days: 0,
                        last_15_days: 0,
                        last_30_days: 0,
                        total: 0
                    };
                }

                grouped[checkoutId].total++;

                if (viewDate >= today) {
                    grouped[checkoutId].today++;
                } else if (viewDate >= yesterday && viewDate < today) {
                    grouped[checkoutId].yesterday++;
                }

                if (viewDate >= days7) {
                    grouped[checkoutId].last_7_days++;
                }
                if (viewDate >= days15) {
                    grouped[checkoutId].last_15_days++;
                }
                if (viewDate >= days30) {
                    grouped[checkoutId].last_30_days++;
                }
            });

            setViewData(Object.values(grouped));
        } catch (err) {
            console.error('Error fetching views:', err);
        } finally {
            setLoading(false);
        }
    };

    const getPeriodValue = (stats: ViewStats): number => {
        switch (period) {
            case '7': return stats.last_7_days;
            case '15': return stats.last_15_days;
            case '30': return stats.last_30_days;
            default: return stats.total;
        }
    };

    const sortedViewData = useMemo(() => {
        const sorted = [...viewData];
        if (sortBy === 'visits') {
            sorted.sort((a, b) => getPeriodValue(b) - getPeriodValue(a));
        } else {
            sorted.sort((a, b) => a.checkout_name.localeCompare(b.checkout_name));
        }
        return sorted;
    }, [viewData, period, sortBy]);

    const totalViews = useMemo(() => {
        return viewData.reduce((acc, v) => acc + getPeriodValue(v), 0);
    }, [viewData, period]);

    const topCheckout = useMemo(() => {
        if (viewData.length === 0) return null;
        return viewData.reduce((a, b) => getPeriodValue(a) > getPeriodValue(b) ? a : b);
    }, [viewData, period]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                        <Eye className="text-blue-600" /> Visualizações de Checkouts
                    </h3>
                    <p className="text-gray-500 text-xs font-medium">Acompanhe quantas pessoas visualizaram cada checkout</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="flex gap-2">
                        {(['7', '15', '30', 'all'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                                    period === p
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {p === 'all' ? 'Total' : `${p} dias`}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 border-l pl-2">
                        <button
                            onClick={() => setSortBy('visits')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1 ${
                                sortBy === 'visits'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Ordenar por mais visualizados"
                        >
                            <TrendingUp size={14} /> Mais Visitados
                        </button>
                        <button
                            onClick={() => setSortBy('name')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1 ${
                                sortBy === 'name'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Ordenar por nome"
                        >
                            <ArrowUpDown size={14} /> Nome
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <Eye size={16} />
                        <span className="text-[10px] font-black uppercase">Total de Visualizações</span>
                    </div>
                    <p className="text-3xl font-black">{totalViews}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <TrendingUp size={16} />
                        <span className="text-[10px] font-black uppercase">Hoje</span>
                    </div>
                    <p className="text-3xl font-black">{viewData.reduce((acc, v) => acc + v.today, 0)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <Calendar size={16} />
                        <span className="text-[10px] font-black uppercase">Ontem</span>
                    </div>
                    <p className="text-3xl font-black">{viewData.reduce((acc, v) => acc + v.yesterday, 0)}</p>
                </div>
            </div>

            {/* Top Checkout */}
            {topCheckout && getPeriodValue(topCheckout) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-amber-600" size={20} />
                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Mais Visualizado</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">{topCheckout.checkout_name}</p>
                    <p className="text-2xl font-black text-amber-600">{getPeriodValue(topCheckout)} visualizações</p>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <Loader2 className="animate-spin text-blue-600 w-6 h-6 mx-auto" />
                    </div>
                ) : viewData.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Eye size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase">Nenhuma visualização registrada</p>
                        <p className="text-[10px] mt-1">As visualizações começam a ser contadas após configurar o rastreamento</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-900 text-white">
                                <th className="p-4 text-[10px] font-black uppercase text-left">Checkout</th>
                                <th className="p-4 text-[10px] font-black uppercase text-center">Hoje</th>
                                <th className="p-4 text-[10px] font-black uppercase text-center">Ontem</th>
                                <th className="p-4 text-[10px] font-black uppercase text-center">7 dias</th>
                                <th className="p-4 text-[10px] font-black uppercase text-center">15 dias</th>
                                <th className="p-4 text-[10px] font-black uppercase text-center">30 dias</th>
                                <th className="p-4 text-[10px] font-black uppercase text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedViewData.map((stats) => (
                                <tr key={stats.checkout_id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <span className="font-black text-gray-900 text-sm">{stats.checkout_name}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold text-sm ${stats.today > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                                            {stats.today}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold text-sm ${stats.yesterday > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                                            {stats.yesterday}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-sm text-gray-900">{stats.last_7_days}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-sm text-gray-900">{stats.last_15_days}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="font-bold text-sm text-gray-900">{stats.last_30_days}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-black text-blue-600">{stats.total}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
