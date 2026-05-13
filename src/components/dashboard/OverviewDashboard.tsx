import React from 'react';
import { Lead, AppConfig } from '../../types';

interface OverviewDashboardProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ leads, checkouts }) => {
  const paidLeads = leads.filter((lead) => lead.status === 'Pago' || lead.status === 'Aprovado');
  const revenue = paidLeads.reduce((sum, lead) => sum + (lead.paid_amount || 0), 0);
  const conversion = leads.length > 0 ? (paidLeads.length / leads.length) * 100 : 0;
  const averageTicket = paidLeads.length > 0 ? revenue / paidLeads.length : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const products = checkouts.map((checkout) => {
    const productLeads = leads.filter((lead) => lead.product_id === checkout.id);
    const productPaid = productLeads.filter((lead) => lead.status === 'Pago' || lead.status === 'Aprovado');
    const productRevenue = productPaid.reduce((sum, lead) => sum + (lead.paid_amount || 0), 0);
    return {
      id: checkout.id,
      name: checkout.productName || 'Produto sem nome',
      turma: checkout.turma || 'Geral',
      leads: productLeads.length,
      paid: productPaid.length,
      revenue: productRevenue,
      conversion: productLeads.length > 0 ? (productPaid.length / productLeads.length) * 100 : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2x md:text-3xl font-black text-gray-900 tracking-tight">Visão Geral</h2>
        <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">
          Painel resumido de vendas, cadastros e performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-emerald-600 text-white rounded-[2rem] p-6 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Receita Total</p>
          <p className="text-2xl font-black mt-2">{formatCurrency(revenue)}</p>
        </div>
        <div className="bg-blue-600 text-white rounded-[2rem] p-6 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Cadastros</p>
          <p className="text-2xl font-black mt-2">{leads.length}</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-[2rem] p-6 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Pagos</p>
          <p className="text-2xl font-black mt-2">{paidLeads.length}</p>
        </div>
        <div className="bg-gray-900 text-white rounded-[2rem] p-6 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ticket Médio</p>
          <p className="text-2xl font-black mt-2">{formatCurrency(averageTicket)}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-900">Performance por Produto/Turma</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Receita, alunos pagos e conversão geral: {conversion.toFixed(1)}.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Turma</th>
                <th className="px-6 py-4">Cadastros</th>
                <th className="px-6 py-4">Pagos</th>
                <th className="px-6 py-4">Receita</th>
                <th className="px-6 py-4">Conversão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.length > 0 ? products.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-black text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-500">{item.turma}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">{item.leads}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">{item.paid}</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">{formatCurrency(item.revenue)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">{item.conversion.toFixed(1)}%</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-400 font-bold" colSpan={6}>
                    Nenhum produto ou turma encontrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
