import { Lead, AppConfig, Expense, BreakEvenMetrics } from '../types';
import { isConfirmedPayment } from './leadStatus';

export const calculateBreakEven = (
    turmaCheckout: AppConfig,
    leads: Lead[],
    expenses: Expense[]
): BreakEvenMetrics => {
    // Leads confirmados desta turma
    const turmaLeads = leads.filter(l => l.product_id === turmaCheckout.id);
    const confirmedLeads = turmaLeads.filter(isConfirmedPayment);

    const totalRevenue = confirmedLeads.reduce((acc, l) => acc + (l.paid_amount || 0), 0);
    const totalFees = confirmedLeads.reduce((acc, l) => acc + (Number(l.mp_fee_amount) || 0), 0);
    const netRevenue = totalRevenue - totalFees;

    // Despesas desta turma (checkout_id === turmaCheckout.id)
    const turmaExpenses = expenses
        .filter(e => e.checkout_id === turmaCheckout.id)
        .reduce((acc, e) => acc + (e.amount || 0), 0);

    const confirmedStudentsCount = confirmedLeads.length;
    const netProfit = netRevenue - turmaExpenses;
    const profitMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // Preço médio líquido por aluno
    const catalogPrice = parseFloat(String(turmaCheckout.productPrice || '0').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
    const estimatedNetTicket = catalogPrice * 0.95; // 5% de taxa estimada caso ainda não haja vendas
    const averageNetTicket = confirmedStudentsCount > 0
        ? netRevenue / confirmedStudentsCount
        : estimatedNetTicket;

    const studentsNeededToBreakEven = (averageNetTicket > 0 && turmaExpenses > 0)
        ? Math.ceil(turmaExpenses / averageNetTicket)
        : 0;

    const remainingStudentsToBreakEven = Math.max(0, studentsNeededToBreakEven - confirmedStudentsCount);

    let breakEvenStatus: 'lucro' | 'equilibrio' | 'prejuizo' = 'equilibrio';
    if (turmaExpenses === 0 && confirmedStudentsCount > 0) {
        breakEvenStatus = 'lucro';
    } else if (netProfit > 0) {
        breakEvenStatus = 'lucro';
    } else if (netProfit < 0) {
        breakEvenStatus = 'prejuizo';
    }

    const breakEvenProgressPercent = studentsNeededToBreakEven > 0
        ? Math.min(100, Math.round((confirmedStudentsCount / studentsNeededToBreakEven) * 100))
        : (confirmedStudentsCount > 0 || turmaExpenses === 0 ? 100 : 0);

    return {
        totalRevenue,
        netRevenue,
        totalExpenses: turmaExpenses,
        netProfit,
        profitMarginPercent,
        confirmedStudentsCount,
        averageNetTicket,
        studentsNeededToBreakEven,
        remainingStudentsToBreakEven,
        breakEvenStatus,
        breakEvenProgressPercent
    };
};
