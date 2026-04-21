
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Loader2, DollarSign, TrendingUp, TrendingDown, Save, X } from 'lucide-react';
import { useSupabase } from '../../services/useSupabase';
import { Expense } from '../../shared';

interface ExpenseManagerProps {
    leads: any[];
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ leads }) => {
    const supabase = useSupabase();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        description: '',
        amount: 0,
        category: 'material',
        date: new Date().toISOString().split('T')[0]
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
            alert('Preencha todos os campos!');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('expenses').insert({
                description: newExpense.description,
                amount: newExpense.amount,
                category: newExpense.category,
                date: newExpense.date
            });
            if (error) {
                console.error('Error creating expense:', error);
                alert('Erro ao criar despesa: ' + error.message);
                return;
            }
            setShowForm(false);
            setNewExpense({ description: '', amount: 0, category: 'material', date: new Date().toISOString().split('T')[0] });
            fetchExpenses();
            alert('Despesa cadastrada com sucesso!');
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

    const totalExpenses = useMemo(() => {
        return expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    }, [expenses]);

    const totalRevenue = useMemo(() => {
        return leads.filter(l => l.status === 'Pago').reduce((acc, l) => acc + (l.paid_amount || 0), 0);
    }, [leads]);

    const netProfit = totalRevenue - totalExpenses;

    const expensesByCategory = useMemo(() => {
        const grouped: Record<string, number> = {};
        expenses.forEach(exp => {
            if (!grouped[exp.category]) grouped[exp.category] = 0;
            grouped[exp.category] += exp.amount || 0;
        });
        return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    }, [expenses]);

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            material: 'Material',
            equipamento: 'Equipamento',
            marketing: 'Marketing',
            infraestrutura: 'Infraestrutura',
            servico: 'Serviço',
            outro: 'Outro'
        };
        return labels[cat] || cat;
    };

    const getCategoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            material: 'bg-blue-100 text-blue-700',
            equipamento: 'bg-purple-100 text-purple-700',
            marketing: 'bg-pink-100 text-pink-700',
            infraestrutura: 'bg-orange-100 text-orange-700',
            servico: 'bg-teal-100 text-teal-700',
            outro: 'bg-gray-100 text-gray-700'
        };
        return colors[cat] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-900 text-lg flex items-center gap-3">
                    <DollarSign className="text-red-500" /> Registro de Despesas
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-black transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Nova Despesa
                </button>
            </div>

            {showForm && (
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-sm font-black text-gray-700">Descrição</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 font-bold"
                                placeholder="Ex: Material de escritório"
                                value={newExpense.description}
                                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-black text-gray-700">Valor (R$)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 font-bold"
                                placeholder="0,00"
                                value={newExpense.amount || ''}
                                onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-black text-gray-700">Categoria</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 font-bold"
                                value={newExpense.category}
                                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                            >
                                <option value="material">Material</option>
                                <option value="equipamento">Equipamento</option>
                                <option value="marketing">Marketing</option>
                                <option value="infraestrutura">Infraestrutura</option>
                                <option value="servico">Serviço</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Save size={16} />} Salvar
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-5 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <TrendingUp size={16} />
                        <span className="text-[10px] font-black uppercase">Receita Total</span>
                    </div>
                    <p className="text-2xl font-black">{totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-[2rem] p-5 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <TrendingDown size={16} />
                        <span className="text-[10px] font-black uppercase">Despesas Total</span>
                    </div>
                    <p className="text-2xl font-black">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className={`bg-gradient-to-br rounded-[2rem] p-5 text-white shadow-lg ${netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-gray-700 to-gray-800'}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <DollarSign size={16} />
                        <span className="text-[10px] font-black uppercase">Lucro Líquido</span>
                    </div>
                    <p className="text-2xl font-black">{netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>

            {expensesByCategory.length > 0 && (
                <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-lg">
                    <h4 className="font-black text-gray-900 text-sm mb-4">Despesas por Categoria</h4>
                    <div className="space-y-3">
                        {expensesByCategory.map(([cat, amount]) => (
                            <div key={cat} className="flex items-center justify-between">
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${getCategoryColor(cat)}`}>
                                    {getCategoryLabel(cat)}
                                </span>
                                <span className="font-black text-gray-900">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">
                        <Loader2 className="animate-spin text-red-500 w-6 h-6 mx-auto" />
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase">Nenhuma despesa registrada</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-4 text-[10px] font-black uppercase text-left text-gray-500">Descrição</th>
                                <th className="p-4 text-[10px] font-black uppercase text-left text-gray-500">Categoria</th>
                                <th className="p-4 text-[10px] font-black uppercase text-left text-gray-500">Data</th>
                                <th className="p-4 text-[10px] font-black uppercase text-right text-gray-500">Valor</th>
                                <th className="p-4 text-[10px] font-black uppercase text-center text-gray-500">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-900 text-sm">{exp.description}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${getCategoryColor(exp.category)}`}>
                                            {getCategoryLabel(exp.category)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-sm font-bold">{exp.date}</td>
                                    <td className="p-4 text-right font-black text-red-600">{exp.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleDelete(exp.id || '')}
                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
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
