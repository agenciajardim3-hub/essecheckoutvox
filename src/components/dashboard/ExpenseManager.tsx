import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Loader2, DollarSign, TrendingUp, TrendingDown, Save, X, Target, Tag, AlertCircle } from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';
import { Expense, AppConfig } from '../../types';
import { STANDARDIZED_EXPENSE_CATEGORIES, getExpenseCategoryConfig } from '../../utils/expenseCategories';

interface ExpenseManagerProps {
    leads: any[];
    checkouts?: AppConfig[];
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ leads, checkouts = [] }) => {
    const supabase = useSupabase();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedCheckout, setSelectedCheckout] = useState('all');
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        description: '',
        amount: 0,
        category: 'Tráfego Pago',
        date: new Date().toISOString().split('T')[0],
        checkout_id: 'global'
    });

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.error('Error fetching expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!supabase) return;
        if (!newExpense.description || !newExpense.amount || !newExpense.category) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }
        setSubmitting(true);
        try {
            const checkoutIdVal = newExpense.checkout_id === 'global' ? null : newExpense.checkout_id;
            const { error } = await supabase.from('expenses').insert({
                description: newExpense.description,
                amount: newExpense.amount,
                category: newExpense.category,
                date: newExpense.date,
                checkout_id: checkoutIdVal
            });
            if (error) {
                console.error('Error creating expense:', error);
                alert('Erro ao criar despesa: ' + error.message);
                return;
            }
            setShowForm(false);
            setNewExpense({
                description: '',
                amount: 0,
                category: 'Tráfego Pago',
                date: new Date().toISOString().split('T')[0],
                checkout_id: selectedCheckout === 'all' ? 'global' : selectedCheckout
            });
            fetchExpenses();
        } catch (err: any) {
            console.error('Error creating expense:', err);
            alert('Erro ao criar despesa: ' + (err?.message || 'Erro desconhecido'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
        if (!supabase) return;
        try {
            await supabase.from('expenses').delete().eq('id', id);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const filteredExpenses = useMemo(() => {
        if (selectedCheckout === 'all') return expenses;
        if (selectedCheckout === 'global') return expenses.filter(e => !e.checkout_id || e.checkout_id === 'global');
        return expenses.filter(e => e.checkout_id === selectedCheckout);
    }, [expenses, selectedCheckout]);

    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    }, [filteredExpenses]);

    const confirmedLeads = useMemo(() => {
        let l = leads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
        if (selectedCheckout !== 'all') {
            l = l.filter(lead => lead.product_id === selectedCheckout);
        }
        return l;
    }, [leads, selectedCheckout]);

    const totalRevenue = useMemo(() => {
        return confirmedLeads.reduce((acc, l) => acc + (Number(l.paid_amount) || 0), 0);
    }, [confirmedLeads]);

    const netProfit = totalRevenue - totalExpenses;
    const paidCount = confirmedLeads.length;
    const averageNetTicket = paidCount > 0 ? totalRevenue / paidCount : 0;
    const expenseRate = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : (totalExpenses > 0 ? 100 : 0);
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : (totalExpenses > 0 ? -100 : 0);

    const expensesByCategory = useMemo(() => {
        const grouped: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
            const config = getExpenseCategoryConfig(exp.category);
            const key = config.label;
            if (!grouped[key]) grouped[key] = 0;
            grouped[key] += Number(exp.amount) || 0;
        });
        return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    }, [filteredExpenses]);

    const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div id="finance-expenses" className="space-y-6 animate-in fade-in duration-500">
            {/* Barra Superior de Ações com Largura Equilibrada */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                        <DollarSign size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-base leading-tight">Lançamentos de Despesas</h3>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">Registre custos da operação e vincule às turmas para cálculo do Break-Even</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Seletor com Largura Máxima Equilibrada (max-w-xs / w-72) */}
                    <select
                        value={selectedCheckout}
                        onChange={(e) => setSelectedCheckout(e.target.value)}
                        className="w-full sm:w-72 max-w-xs bg-gray-50 border-2 border-transparent focus:border-blue-500 text-xs font-black rounded-2xl px-4 py-3 outline-none cursor-pointer text-gray-700 transition-all"
                    >
                        <option value="all">Visão Geral (Todos)</option>
                        <option value="global">Custos Globais (Sem Turma)</option>
                        {checkouts.map(c => (
                            <option key={c.id} value={c.id}>{c.productName} {c.turma ? `— ${c.turma}` : ''}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Nova Despesa
                    </button>
                </div>
            </div>

            {/* Modal / Formulário Expansível de Nova Despesa */}
            {showForm && (
                <div className="bg-white border-2 border-gray-100 p-6 sm:p-7 rounded-[2.5rem] shadow-xl animate-in slide-in-from-top-3 duration-200 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <h4 className="font-black text-gray-900 text-sm uppercase tracking-wide">Novo Lançamento Financeiro</h4>
                        </div>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-black uppercase text-gray-500 mb-2 block">Descrição da Despesa *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-sm text-gray-900 transition-all"
                                placeholder="Ex: Locação Sala Principal, Hotel Equipe, Anúncios Meta..."
                                value={newExpense.description}
                                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-black uppercase text-gray-500 mb-2 block">Valor (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-black text-sm text-gray-900 transition-all"
                                placeholder="0,00"
                                value={newExpense.amount || ''}
                                onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-black uppercase text-gray-500 mb-2 block">Data *</label>
                            <input
                                type="date"
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-sm text-gray-900 transition-all"
                                value={newExpense.date}
                                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-black uppercase text-gray-500 mb-2 block">Categoria Padronizada *</label>
                            <select
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-sm text-gray-900 transition-all cursor-pointer"
                                value={newExpense.category}
                                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                            >
                                {STANDARDIZED_EXPENSE_CATEGORIES.map(cat => (
                                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-black uppercase text-gray-500 mb-2 block">Vincular à Turma</label>
                            <select
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-transparent bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold text-sm text-gray-900 transition-all cursor-pointer"
                                value={newExpense.checkout_id || 'global'}
                                onChange={(e) => setNewExpense({ ...newExpense, checkout_id: e.target.value })}
                            >
                                <option value="global">Custo Global (Sem Turma Vinculada)</option>
                                {checkouts.map(c => (
                                    <option key={c.id} value={c.id}>{c.productName} {c.turma ? `— ${c.turma}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-7 py-3.5 rounded-2xl font-black text-xs uppercase shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar Despesa
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3.5 rounded-2xl font-black text-xs uppercase transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* 3 CARDS MODERNOS COM DESIGN STRIPE / LINEAR / SAAS CLEAN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Receita Total */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Receita Total</span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                <TrendingUp size={18} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{money(totalRevenue)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 text-xs font-bold text-gray-500">
                        <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-md">{paidCount} vendas</span>
                        <span>•</span>
                        <span>Ticket médio {money(averageNetTicket)}</span>
                    </div>
                </div>

                {/* 2. Despesas Totais (Rótulo corrigido) */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Despesas Totais</span>
                            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                                <TrendingDown size={18} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{money(totalExpenses)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 text-xs font-bold text-gray-500">
                        <span className={`font-black px-2 py-0.5 rounded-md ${
                            expenseRate > 80 ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                            {expenseRate.toFixed(1)}% comprometido
                        </span>
                        <span>•</span>
                        <span>{filteredExpenses.length} lançamento(s)</span>
                    </div>
                </div>

                {/* 3. Lucro Líquido com Badge de Margem Real */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Lucro Líquido</span>
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm ${
                                netProfit >= 0 ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-red-50 border-red-100 text-red-600'
                            }`}>
                                <DollarSign size={18} />
                            </div>
                        </div>
                        <p className={`text-3xl font-black tracking-tight ${netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                            {money(netProfit)}
                        </p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs font-bold">
                        <span className="text-gray-500">Margem Real</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            profitMargin >= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            profitMargin > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            {profitMargin >= 0 ? `+${profitMargin.toFixed(1)}%` : `${profitMargin.toFixed(1)}%`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Despesas por Categoria Padronizada */}
            {expensesByCategory.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h4 className="font-black text-gray-900 text-sm mb-4">Despesas por Categoria</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {expensesByCategory.map(([catName, amount]) => {
                            const config = getExpenseCategoryConfig(catName);
                            const IconComponent = config.icon;
                            const share = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                            return (
                                <div key={catName} className={`p-4 rounded-2xl border ${config.borderColor} ${config.badgeBg} flex flex-col justify-between`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-black uppercase ${config.textColor} flex items-center gap-1.5`}>
                                            <IconComponent size={14} />
                                            {config.label}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500">{share.toFixed(0)}%</span>
                                    </div>
                                    <p className="font-black text-gray-900 text-lg">{money(amount)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tabela de Lançamentos com Categorias Estilizadas */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="animate-spin text-blue-600 w-6 h-6 mx-auto" />
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <DollarSign size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-black uppercase tracking-wider">Nenhuma despesa registrada para o filtro atual</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px]">
                            <thead>
                                <tr className="bg-gray-50/70 border-b border-gray-100 text-left">
                                    <th className="p-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-wider">Descrição</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Turma / Destino</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Categoria</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Data</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-right text-gray-400 tracking-wider">Valor</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-center text-gray-400 tracking-wider">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredExpenses.map((exp) => {
                                    const catConfig = getExpenseCategoryConfig(exp.category);
                                    const CategoryIcon = catConfig.icon;
                                    return (
                                        <tr key={exp.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 px-6 font-bold text-gray-900 text-sm">{exp.description}</td>
                                            <td className="p-4 text-xs font-bold text-gray-500">
                                                {exp.checkout_id && exp.checkout_id !== 'global' 
                                                    ? (checkouts.find(c => c.id === exp.checkout_id)?.turma || checkouts.find(c => c.id === exp.checkout_id)?.productName || 'Turma')
                                                    : <span className="text-gray-400 italic">Custo Global</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${catConfig.badgeBg} ${catConfig.textColor} ${catConfig.borderColor}`}>
                                                    <CategoryIcon size={12} />
                                                    {catConfig.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-600 text-xs font-bold">{exp.date}</td>
                                            <td className="p-4 text-right font-black text-gray-900 text-sm">{money(exp.amount || 0)}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(exp.id || '')}
                                                    className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-all mx-auto"
                                                    title="Excluir despesa"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
