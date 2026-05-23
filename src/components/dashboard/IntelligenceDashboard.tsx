import React, { useMemo, useState } from 'react';
import { Lead, AppConfig } from '../../types';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as RechartsLineChart,
} from 'recharts';
import { TrendingUp, Calendar, Users, DollarSign, Award } from 'lucide-react';

interface IntelligenceDashboardProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const safeDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value || 0);

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ leads, checkouts }) => {
  const [growthLayoutMode, setGrowthLayoutMode] = useState<'aggregated' | 'cards' | 'tabs' | 'single'>('aggregated');
  const [topCount, setTopCount] = useState<8 | 5 | 3>(8);
  const [visibleTurmas, setVisibleTurmas] = useState<Set<string>>(new Set());
  const [selectedTurma, setSelectedTurma] = useState<string>('');

  const paidLeads = useMemo(() => leads.filter((l) => l.status === 'Pago' || l.status === 'Aprovado'), [leads]);

  // 📊 Melhor dias da semana
  const bestDaysOfWeek = useMemo(() => {
    const daysMap: Record<number, { count: number; revenue: number }> = {};
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Segunda to Domingo

    paidLeads.forEach((lead) => {
      const date = safeDate(lead.created_at || lead.date);
      if (!date) return;
      const dayOfWeek = date.getDay();
      if (!daysMap[dayOfWeek]) daysMap[dayOfWeek] = { count: 0, revenue: 0 };
      daysMap[dayOfWeek].count++;
      daysMap[dayOfWeek].revenue += lead.paid_amount || 0;
    });

    return dayOrder
      .filter(day => daysMap[day])
      .map(day => ({
        name: dayNames[day],
        vendas: daysMap[day].count,
        receita: daysMap[day].revenue,
      }));
  }, [paidLeads]);

  // 📅 Melhor dias do mês
  const bestDaysOfMonth = useMemo(() => {
    const daysMap: Record<number, { count: number; revenue: number }> = {};

    paidLeads.forEach((lead) => {
      const date = safeDate(lead.created_at || lead.date);
      if (!date) return;
      const dayOfMonth = date.getDate();
      if (!daysMap[dayOfMonth]) daysMap[dayOfMonth] = { count: 0, revenue: 0 };
      daysMap[dayOfMonth].count++;
      daysMap[dayOfMonth].revenue += lead.paid_amount || 0;
    });

    return Object.entries(daysMap)
      .map(([day, data]) => ({
        dia: parseInt(day),
        vendas: data.count,
        receita: data.revenue,
      }))
      .sort((a, b) => a.dia - b.dia);
  }, [paidLeads]);

  // 🏆 Turmas que mais venderam
  const topClasses = useMemo(() => {
    const classMap: Record<string, { revenue: number; count: number; avgTicket: number }> = {};

    paidLeads.forEach((lead) => {
      const turma = lead.turma || 'Sem turma';
      if (!classMap[turma]) classMap[turma] = { revenue: 0, count: 0, avgTicket: 0 };
      classMap[turma].count++;
      classMap[turma].revenue += lead.paid_amount || 0;
    });

    return Object.entries(classMap)
      .map(([turma, data]) => ({
        turma,
        receita: data.revenue,
        vendas: data.count,
        ticketMedio: data.revenue / data.count,
      }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 8);
  }, [paidLeads]);

  // 🎯 Get top turmas list (with configurable count for tabs mode)
  const topTurmasList = useMemo(() => {
    const turmaLeadCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const turma = lead.turma || 'Sem turma';
      turmaLeadCounts[turma] = (turmaLeadCounts[turma] || 0) + 1;
    });

    return Object.entries(turmaLeadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCount)
      .map(([turma]) => turma);
  }, [leads, topCount]);

  // 📊 Individual turma growth curves (for cards mode)
  const individualTurmaGrowth = useMemo(() => {
    const result: Record<string, any[]> = {};

    checkouts.forEach((checkout) => {
      const turmaName = checkout.turma || checkout.productName;
      if (!topTurmasList.includes(turmaName)) return;

      const classLeads = leads.filter((l) => l.product_id === checkout.id);
      const sorted = classLeads.sort((a, b) => {
        const dateA = safeDate(a.created_at || a.date)?.getTime() || 0;
        const dateB = safeDate(b.created_at || b.date)?.getTime() || 0;
        return dateA - dateB;
      });

      let accumulative = 0;
      result[turmaName] = sorted
        .slice(-20)
        .map((lead) => {
          accumulative++;
          const date = safeDate(lead.created_at || lead.date);
          return {
            dateStr: date ? date.toLocaleDateString('pt-BR') : 'N/A',
            cumulativeCount: accumulative,
          };
        });
    });

    return result;
  }, [leads, checkouts, topTurmasList]);

  // 📊 All turmas list for selector
  const allTurmasList = useMemo(() => {
    const turmaLeadCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const turma = lead.turma || 'Sem turma';
      turmaLeadCounts[turma] = (turmaLeadCounts[turma] || 0) + 1;
    });
    return Object.entries(turmaLeadCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([turma]) => turma);
  }, [leads]);

  // 📊 Single turma growth data (for bar chart mode)
  const singleTurmaGrowthData = useMemo(() => {
    if (!selectedTurma) return [];

    const turmaLeads = leads.filter((l) => (l.turma || 'Sem turma') === selectedTurma);
    const sorted = turmaLeads.sort((a, b) => {
      const dateA = safeDate(a.created_at || a.date)?.getTime() || 0;
      const dateB = safeDate(b.created_at || b.date)?.getTime() || 0;
      return dateA - dateB;
    });

    const dateMap: Record<string, number> = {};
    sorted.forEach((lead) => {
      const date = safeDate(lead.created_at || lead.date);
      if (!date) return;
      const dateStr = date.toLocaleDateString('pt-BR');
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });

    return Object.entries(dateMap)
      .sort((a, b) => new Date(a[0].split('/').reverse().join('-')).getTime() - new Date(b[0].split('/').reverse().join('-')).getTime())
      .slice(-20)
      .map(([dateStr, count]) => ({
        dateStr,
        vendas: count,
      }));
  }, [leads, selectedTurma]);

  // 📈 Curva de crescimento acumulado por turma (aggregated mode)
  const growthCurves = useMemo(() => {
    const turmaLeadCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      const turma = lead.turma || 'Sem turma';
      turmaLeadCounts[turma] = (turmaLeadCounts[turma] || 0) + 1;
    });

    const topTurmas = Object.entries(turmaLeadCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([turma]) => turma);

    const turmaData: Record<string, any[]> = {};

    checkouts.forEach((checkout) => {
      const turmaName = checkout.turma || checkout.productName;
      if (!topTurmas.includes(turmaName)) return;

      const classLeads = leads.filter((l) => l.product_id === checkout.id);
      const sorted = classLeads.sort((a, b) => {
        const dateA = safeDate(a.created_at || a.date)?.getTime() || 0;
        const dateB = safeDate(b.created_at || b.date)?.getTime() || 0;
        return dateA - dateB;
      });

      let accumulative = 0;
      turmaData[turmaName] = sorted.map((lead) => {
        accumulative++;
        const date = safeDate(lead.created_at || lead.date);
        return {
          dateStr: date ? date.toLocaleDateString('pt-BR') : 'N/A',
          date: date || new Date(),
          cumulativeCount: accumulative,
        };
      });
    });

    const allDates = new Set<string>();
    Object.values(turmaData).forEach((data) => {
      data.forEach((item) => allDates.add(item.dateStr));
    });

    const consolidated = Array.from(allDates)
      .sort((a, b) => new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime())
      .slice(-20)
      .map((dateStr) => {
        const entry: any = { dateStr };
        Object.entries(turmaData).forEach(([turma, data]) => {
          const latestEntry = data.find((d) => d.dateStr === dateStr);
          entry[turma] = latestEntry?.cumulativeCount || 0;
        });
        return entry;
      });

    return consolidated;
  }, [leads, checkouts]);

  // Initialize visible turmas on first render
  useMemo(() => {
    if (visibleTurmas.size === 0 && growthCurves.length > 0) {
      const initialTurmas = Object.keys(growthCurves[0] || {}).filter((key) => key !== 'dateStr');
      setVisibleTurmas(new Set(initialTurmas));
    }
  }, [growthCurves, visibleTurmas]);

  // 📊 Média por turma
  const classAverages = useMemo(() => {
    const classMap: Record<string, { total: number; count: number }> = {};

    paidLeads.forEach((lead) => {
      const turma = lead.turma || 'Sem turma';
      if (!classMap[turma]) classMap[turma] = { total: 0, count: 0 };
      classMap[turma].count++;
      classMap[turma].total += lead.paid_amount || 0;
    });

    return Object.entries(classMap)
      .map(([turma, data]) => ({
        turma,
        ticketMedio: data.count > 0 ? data.total / data.count : 0,
        vendas: data.count,
      }))
      .sort((a, b) => b.ticketMedio - a.ticketMedio)
      .slice(0, 8);
  }, [paidLeads]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Vendas"
          value={paidLeads.length}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Receita Total"
          value={formatCurrency(paidLeads.reduce((sum, l) => sum + (l.paid_amount || 0), 0))}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          label="Ticket Médio"
          value={formatCurrency(
            paidLeads.length > 0
              ? paidLeads.reduce((sum, l) => sum + (l.paid_amount || 0), 0) / paidLeads.length
              : 0
          )}
          icon={Award}
          color="purple"
        />
        <StatCard
          label="Turmas Ativas"
          value={new Set(leads.map((l) => l.turma)).size}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Melhor dias da semana */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={18} /> Melhor Dias da Semana
          </h3>
          {bestDaysOfWeek.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bestDaysOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [value, 'Vendas']}
                />
                <Bar dataKey="vendas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 font-bold">Sem dados</p>
          )}
        </div>

        {/* Melhor dias do mês */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={18} /> Melhor Dias do Mês
          </h3>
          {bestDaysOfMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={bestDaysOfMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => [value, 'Vendas']}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 font-bold">Sem dados</p>
          )}
        </div>
      </div>

      {/* Curva de Crescimento com 3 layouts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} /> Curva de Crescimento por Turma (Pré-Evento)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setGrowthLayoutMode('aggregated')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                growthLayoutMode === 'aggregated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Gráfico
            </button>
            <button
              onClick={() => setGrowthLayoutMode('tabs')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                growthLayoutMode === 'tabs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Abas
            </button>
            <button
              onClick={() => setGrowthLayoutMode('cards')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                growthLayoutMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setGrowthLayoutMode('single')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                growthLayoutMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Selecionar
            </button>
          </div>
        </div>

        {growthCurves.length > 0 ? (
          <>
            {/* Option 3: Aggregated Interactive Chart */}
            {growthLayoutMode === 'aggregated' && (
              <div className="animate-in fade-in duration-300">
                <p className="text-xs text-gray-500 font-bold mb-4">💡 Clique na legenda para mostrar/ocultar turmas</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={growthCurves}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="dateStr" tick={{ fontSize: 11, fontWeight: 600 }} angle={-45} height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => [value, 'Pessoas']}
                    />
                    <Legend
                      onClick={(e) => {
                        const turma = e.dataKey;
                        const newVisible = new Set(visibleTurmas);
                        if (newVisible.has(turma)) {
                          newVisible.delete(turma);
                        } else {
                          newVisible.add(turma);
                        }
                        setVisibleTurmas(newVisible);
                      }}
                      wrapperStyle={{ cursor: 'pointer' }}
                    />
                    {Object.keys(growthCurves[0] || {})
                      .filter((key) => key !== 'dateStr' && visibleTurmas.has(key))
                      .map((key, idx) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Option 2: Tabs Mode */}
            {growthLayoutMode === 'tabs' && (
              <div className="animate-in fade-in duration-300">
                <div className="flex gap-3 mb-4">
                  {[8, 5, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => setTopCount(count as 8 | 5 | 3)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        topCount === count
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Top {count}
                    </button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={growthCurves}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="dateStr" tick={{ fontSize: 11, fontWeight: 600 }} angle={-45} height={80} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => [value, 'Pessoas']}
                    />
                    <Legend />
                    {Object.keys(growthCurves[0] || {})
                      .filter((key) => key !== 'dateStr' && topTurmasList.includes(key))
                      .map((key, idx) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Option 1: Individual Cards */}
            {growthLayoutMode === 'cards' && (
              <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topTurmasList.map((turma, idx) => {
                    const turmaData = individualTurmaGrowth[turma] || [];
                    return (
                      <div key={turma} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h4 className="text-sm font-black text-gray-900 mb-3 truncate">{turma}</h4>
                        {turmaData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={turmaData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="dateStr" tick={{ fontSize: 10 }} angle={-45} height={50} />
                              <YAxis tick={{ fontSize: 10 }} width={35} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                }}
                                formatter={(value: any) => [value, 'Pessoas']}
                              />
                              <Line
                                type="monotone"
                                dataKey="cumulativeCount"
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-xs text-gray-400 font-bold text-center py-8">Sem dados</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Option 4: Single Turma with Bar Chart */}
            {growthLayoutMode === 'single' && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <label className="block text-xs font-black text-gray-700 mb-2">Selecione a Turma</label>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Selecione uma turma --</option>
                    {allTurmasList.map((turma) => (
                      <option key={turma} value={turma}>
                        {turma}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTurma && singleTurmaGrowthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={singleTurmaGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="dateStr" tick={{ fontSize: 12, fontWeight: 600 }} angle={-45} height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) => [value, 'Vendas']}
                      />
                      <Bar dataKey="vendas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : selectedTurma ? (
                  <p className="text-sm text-gray-400 font-bold text-center py-12">Sem dados para esta turma</p>
                ) : (
                  <p className="text-sm text-gray-400 font-bold text-center py-12">Selecione uma turma para visualizar</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 font-bold">Sem dados</p>
        )}
      </div>

      {/* Ranking de Turmas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Turmas por Receita */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">🏆 Turmas que Mais Venderam</h3>
          <div className="space-y-3">
            {topClasses.length > 0 ? (
              topClasses.map((item, idx) => (
                <div key={item.turma} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{item.turma}</p>
                      <p className="text-[10px] text-gray-400">{item.vendas} vendas</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-emerald-600">{formatCurrency(item.receita)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 font-bold">Sem dados</p>
            )}
          </div>
        </div>

        {/* Ticket Médio por Turma */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">💰 Ticket Médio por Turma</h3>
          <div className="space-y-3">
            {classAverages.length > 0 ? (
              classAverages.map((item, idx) => (
                <div key={item.turma} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">{item.turma}</p>
                      <p className="text-[10px] text-gray-400">{item.vendas} vendas</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-purple-600">{formatCurrency(item.ticketMedio)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 font-bold">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">📋 Inteligência Detalhada por Turma</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3 text-right">Vendas</th>
                <th className="px-4 py-3 text-right">Receita Total</th>
                <th className="px-4 py-3 text-right">Ticket Médio</th>
                <th className="px-4 py-3 text-right">% da Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topClasses.map((item) => {
                const totalRevenue = paidLeads.reduce((sum, l) => sum + (l.paid_amount || 0), 0);
                const percentage = totalRevenue > 0 ? (item.receita / totalRevenue) * 100 : 0;
                return (
                  <tr key={item.turma} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">{item.turma}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{item.vendas}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">{formatCurrency(item.receita)}</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-600">{formatCurrency(item.ticketMedio)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="font-black text-gray-700 w-12 text-right">{percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: any;
  color: string;
}> = ({ label, value, icon: Icon, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`${colorMap[color]} rounded-2xl p-6 border shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest`}>{label}</p>
          <p className="text-2xl font-black text-gray-900 mt-2">{value}</p>
        </div>
        <Icon size={20} className={colorMap[color].split(' ')[1]} />
      </div>
    </div>
  );
};
