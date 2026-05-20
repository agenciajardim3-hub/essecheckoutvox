import React, { useMemo, useState, useEffect } from 'react';
import { Lead, AppConfig } from '../../types';
import { DollarSign, UserPlus, Filter, Wallet, TrendingUp, BarChart3, Settings, Save } from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';

interface OverviewDashboardProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

type Tab = 'financeiro' | 'inteligencia' | 'configuracao';

type Expenses = {
  trafego: number;
  estrutura: number;
  alimentacao: number;
  deslocamento: number;
  equipe: number;
};

const EMPTY_EXPENSES: Expenses = {
  trafego: 0,
  estrutura: 0,
  alimentacao: 0,
  deslocamento: 0,
  equipe: 0,
};

const loadExpenses = (): Record<string, Expenses> => {
  try {
    return JSON.parse(localStorage.getItem('vox_overview_expenses') || '{}');
  } catch {
    return {};
  }
};

const saveExpenses = (value: Record<string, Expenses>) => {
  localStorage.setItem('vox_overview_expenses', JSON.stringify(value));
};

const safeDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ leads, checkouts }) => {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState<Tab>('financeiro');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [expenses, setExpenses] = useState<Record<string, Expenses>>(loadExpenses);
  const [globalExpenses, setGlobalExpenses] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchGlobalExpenses = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.from('expenses').select('amount');
        if (data) {
          const total = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          setGlobalExpenses(total);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchGlobalExpenses();
  }, [supabase]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);

  const filteredLeads = useMemo(() => {
    let data = [...leads];

    if (selectedProduct !== 'all') {
      data = data.filter((lead) => lead.product_id === selectedProduct);
    }

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      data = data.filter((lead) => {
        const date = safeDate(lead.created_at || lead.date);
        return date ? date >= cutoff : false;
      });
    }

    return data;
  }, [leads, selectedProduct, dateRange]);

  const paidLeads = useMemo(() => filteredLeads.filter((lead) => lead.status === 'Pago' || lead.status === 'Aprovado'), [filteredLeads]);
  const allPaidLeads = useMemo(() => leads.filter((lead) => lead.status === 'Pago' || lead.status === 'Aprovado'), [leads]);

  const totalExpenses = useMemo(() => {
    const local = Object.values(expenses).reduce((sum, item) => sum + Object.values(item).reduce((s, v) => s + (Number(v) || 0), 0), 0);
    return local + globalExpenses;
  }, [expenses, globalExpenses]);

  const metrics = useMemo(() => {
    const revenue = paidLeads.reduce((sum, lead) => sum + (lead.paid_amount || 0), 0);
    const profit = revenue - totalExpenses;
    const conversion = filteredLeads.length > 0 ? (paidLeads.length / filteredLeads.length) * 100 : 0;

    return {
      revenue,
      expenses: totalExpenses,
      profit,
      conversion,
      paid: paidLeads.length,
      pending: filteredLeads.filter((lead) => lead.status === 'Pendente').length,
      signal: filteredLeads.filter((lead) => lead.status === 'Sinal').length,
      payDay: filteredLeads.filter((lead) => lead.status === 'Pagar no dia').length,
      newLeads: filteredLeads.filter((lead) => !lead.status || lead.status === 'Novo').length,
    };
  }, [filteredLeads, paidLeads, totalExpenses]);

  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    paidLeads.forEach((lead) => {
      const date = safeDate(lead.created_at || lead.date);
      if (!date) return;
      const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
      map[key] = (map[key] || 0) + (lead.paid_amount || 0);
    });

    return Object.entries(map).slice(-10).map(([label, value]) => ({ label, value }));
  }, [paidLeads]);

  const maxDaily = Math.max(...dailyRevenue.map((item) => item.value), 1);

  const paymentMethods = useMemo(() => {
    const map: Record<string, number> = {};
    paidLeads.forEach((lead) => {
      const method = lead.payment_method || 'Outro';
      map[method] = (map[method] || 0) + (lead.paid_amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [paidLeads]);

  const productRows = useMemo(() => {
    return checkouts.map((checkout) => {
      const productLeads = leads.filter((lead) => lead.product_id === checkout.id);
      const productPaid = productLeads.filter((lead) => lead.status === 'Pago' || lead.status === 'Aprovado');
      const revenue = productPaid.reduce((sum, lead) => sum + (lead.paid_amount || 0), 0);
      const exp = expenses[checkout.id] || EMPTY_EXPENSES;
      const cost = Object.values(exp).reduce((sum, value) => sum + (Number(value) || 0), 0);

      return {
        checkout,
        revenue,
        trafego: exp.trafego || 0,
        cost,
        profit: revenue - cost,
        paid: productPaid.length,
        leads: productLeads.length,
        conversion: productLeads.length > 0 ? (productPaid.length / productLeads.length) * 100 : 0,
      };
    });
  }, [checkouts, leads, expenses]);

  const latestPaid = useMemo(() => {
    return [...allPaidLeads].sort((a, b) => (safeDate(b.created_at || b.date)?.getTime() || 0) - (safeDate(a.created_at || a.date)?.getTime() || 0))[0];
  }, [allPaidLeads]);

  const latestLead = useMemo(() => {
    return [...leads].sort((a, b) => (safeDate(b.created_at || b.date)?.getTime() || 0) - (safeDate(a.created_at || a.date)?.getTime() || 0))[0];
  }, [leads]);

  const updateExpense = (checkoutId: string, field: keyof Expenses, value: string) => {
    setExpenses((prev) => ({
      ...prev,
      [checkoutId]: {
        ...(prev[checkoutId] || EMPTY_EXPENSES),
        [field]: Number(value) || 0,
      },
    }));
  };

  const handleSave = () => {
    saveExpenses(expenses);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const statCards = [
    { label: 'Receita Total', value: formatCurrency(metrics.revenue), icon: DollarSign, className: 'text-emerald-600' },
    { label: 'Despesas', value: formatCurrency(metrics.expenses), icon: Wallet, className: 'text-orange-600' },
    { label: 'Lucro Líquido', value: formatCurrency(metrics.profit), icon: TrendingUp, className: 'text-emerald-600' },
    { label: 'Taxa Conversão', value: `${metrics.conversion.toFixed(1)}%`, icon: BarChart3, className: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Visão Geral</h2>
        <p className="text-sm text-gray-400 font-medium mt-1">Painel de inteligência e performance.</p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          {latestPaid && (
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3 min-w-[220px]">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><DollarSign size={18} /></div>
              <div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Última Venda</p>
                <p className="text-sm font-black text-gray-900">{latestPaid.name?.split(' ')[0] || 'Aluno'}</p>
                <p className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg inline-block">{latestPaid.turma || latestPaid.product_name || 'Produto'}</p>
              </div>
            </div>
          )}
          {latestLead && (
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-center gap-3 min-w-[220px]">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><UserPlus size={18} /></div>
              <div>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Último Cadastro</p>
                <p className="text-sm font-black text-gray-900">{latestLead.name?.split(' ')[0] || 'Lead'}</p>
                <p className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg inline-block">{latestLead.turma || latestLead.product_name || 'Produto'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
        {[
          ['financeiro', '📊 Financeiro'],
          ['inteligencia', '📈 Inteligência'],
          ['configuracao', '⚙️ Configuração'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as Tab)}
            className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${activeTab === id ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'financeiro' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3 items-center">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400"><Filter size={13} /> Filtro</div>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-black bg-white">
              <option value="all">Todos os Produtos</option>
              {checkouts.map((checkout) => <option key={checkout.id} value={checkout.id}>{checkout.productName} {checkout.turma ? `- ${checkout.turma}` : ''}</option>)}
            </select>
            <div className="flex gap-2 w-full md:w-auto">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button key={range} onClick={() => setDateRange(range)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${dateRange === range ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{range === 'all' ? 'Todos' : range.replace('d', ' dias')}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${card.className}`}>{card.label}</p>
                      <p className="text-2xl font-black text-gray-900 mt-2">{card.value}</p>
                    </div>
                    <Icon size={20} className={card.className} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniStatus label="Pagos" value={metrics.paid} color="emerald" />
            <MiniStatus label="Pendentes" value={metrics.pending} color="amber" />
            <MiniStatus label="Sinal" value={metrics.signal} color="blue" />
            <MiniStatus label="Pagar Dia" value={metrics.payDay} color="orange" />
            <MiniStatus label="Novos" value={metrics.newLeads} color="gray" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-gray-900 mb-5">Receita Diária</h3>
              <div className="space-y-3">
                {dailyRevenue.length > 0 ? dailyRevenue.map((item) => (
                  <div key={item.label} className="grid grid-cols-[70px_1fr_90px] items-center gap-3 text-xs font-bold">
                    <span className="text-gray-400">{item.label}</span>
                    <div className="h-5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.max(4, (item.value / maxDaily) * 100)}%` }} /></div>
                    <span className="text-right bg-emerald-500 text-white px-2 py-1 rounded-lg text-[10px]">{formatCurrency(item.value)}</span>
                  </div>
                )) : <p className="text-sm text-gray-400 font-bold">Sem receita no período.</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-gray-900 mb-5">Meios de Pagamento</h3>
              <div className="space-y-4">
                {paymentMethods.length > 0 ? paymentMethods.map(([method, value]) => (
                  <div key={method}>
                    <div className="flex justify-between text-xs font-black mb-2"><span>{method}</span><span>{formatCurrency(value)}</span></div>
                    <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-slate-400 rounded-full" style={{ width: `${Math.max(4, (value / Math.max(metrics.revenue, 1)) * 100)}%` }} /></div>
                  </div>
                )) : <p className="text-sm text-gray-400 font-bold">Sem meios de pagamento registrados.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'inteligencia' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-black text-gray-900 mb-5">Inteligência por Turma</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                <tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Turma</th><th className="px-4 py-3">Cadastros</th><th className="px-4 py-3">Pagos</th><th className="px-4 py-3">Receita</th><th className="px-4 py-3">Conversão</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productRows.map((row) => <tr key={row.checkout.id}><td className="px-4 py-3 font-black text-xs">{row.checkout.productName}</td><td className="px-4 py-3 text-xs font-bold text-violet-600">{row.checkout.turma || '—'}</td><td className="px-4 py-3 text-xs font-bold">{row.leads}</td><td className="px-4 py-3 text-xs font-bold text-emerald-600">{row.paid}</td><td className="px-4 py-3 text-xs font-black">{formatCurrency(row.revenue)}</td><td className="px-4 py-3 text-xs font-bold">{row.conversion.toFixed(1)}%</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'configuracao' && (
        <div className="bg-violet-50/40 rounded-2xl border border-violet-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div><h3 className="font-black text-gray-900 flex items-center gap-2"><Settings size={16} /> Configuração de Despesas</h3><p className="text-xs text-gray-400 font-bold mt-1">Clique em editar para gerenciar as despesas de cada turma.</p></div>
            <button onClick={handleSave} className="bg-violet-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Save size={13} /> {saved ? 'Salvo!' : 'Salvar Tudo'}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase tracking-widest text-gray-400 font-black"><tr><th className="px-4 py-3">Produto / Turma</th><th className="px-4 py-3">Receita</th><th className="px-4 py-3">Tráfego</th><th className="px-4 py-3">Total Custos</th><th className="px-4 py-3">Lucro</th><th className="px-4 py-3">Ações</th></tr></thead>
              <tbody className="divide-y divide-violet-100/60">
                {productRows.map((row) => {
                  const exp = expenses[row.checkout.id] || EMPTY_EXPENSES;
                  const isEditing = editingId === row.checkout.id;
                  return <React.Fragment key={row.checkout.id}>
                    <tr><td className="px-4 py-3 font-black text-xs">{row.checkout.productName} <span className="ml-2 text-[9px] text-violet-600 uppercase">{row.checkout.turma}</span></td><td className="px-4 py-3 text-xs font-black text-emerald-600">{formatCurrency(row.revenue)}</td><td className="px-4 py-3 text-xs font-black text-blue-600">{formatCurrency(row.trafego)}</td><td className="px-4 py-3 text-xs font-black text-orange-600">{formatCurrency(row.cost)}</td><td className="px-4 py-3 text-xs font-black text-emerald-600">{formatCurrency(row.profit)}</td><td className="px-4 py-3"><button onClick={() => setEditingId(isEditing ? null : row.checkout.id)} className="bg-violet-100 text-violet-700 px-4 py-2 rounded-lg text-[9px] font-black uppercase">{isEditing ? 'Fechar' : 'Editar'}</button></td></tr>
                    {isEditing && <tr><td colSpan={6} className="px-4 py-4 bg-white/70"><div className="grid grid-cols-1 md:grid-cols-5 gap-3">{(['trafego', 'estrutura', 'alimentacao', 'deslocamento', 'equipe'] as const).map((field) => <label key={field} className="text-[10px] font-black uppercase text-gray-500">{field}<input type="number" value={exp[field]} onChange={(e) => updateExpense(row.checkout.id, field, e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold" /></label>)}</div></td></tr>}
                  </React.Fragment>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniStatus: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-50 text-gray-700',
  };
  return <div className={`${colorMap[color]} rounded-xl px-4 py-3`}><p className="text-xl font-black">{value}</p><p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div>;
};
