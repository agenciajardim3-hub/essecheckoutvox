import React from 'react';
import { Target, Building2, Hotel, Fuel, Cpu, Utensils, Users, Receipt, HelpCircle } from 'lucide-react';
import { ExpenseCategory } from '../types';

export interface CategoryConfig {
    key: string;
    label: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const STANDARDIZED_EXPENSE_CATEGORIES: CategoryConfig[] = [
    {
        key: 'Tráfego Pago',
        label: 'Tráfego Pago',
        badgeBg: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200',
        icon: Target,
    },
    {
        key: 'Sala / Local',
        label: 'Sala / Local',
        badgeBg: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: Building2,
    },
    {
        key: 'Hotel / Hospedagem',
        label: 'Hotel / Hospedagem',
        badgeBg: 'bg-violet-50',
        textColor: 'text-violet-700',
        borderColor: 'border-violet-200',
        icon: Hotel,
    },
    {
        key: 'Gasolina / Deslocamento',
        label: 'Gasolina / Deslocamento',
        badgeBg: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: Fuel,
    },
    {
        key: 'Infraestrutura',
        label: 'Infraestrutura',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-300',
        icon: Cpu,
    },
    {
        key: 'Alimentação',
        label: 'Alimentação',
        badgeBg: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        icon: Utensils,
    },
    {
        key: 'Equipe',
        label: 'Equipe',
        badgeBg: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        icon: Users,
    },
    {
        key: 'Taxas / Outros',
        label: 'Taxas / Outros',
        badgeBg: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        icon: Receipt,
    },
];

/**
 * Normaliza categorias antigas para as novas padronizadas
 */
export function normalizeExpenseCategory(rawCategory?: string): string {
    if (!rawCategory) return 'Taxas / Outros';
    const lower = rawCategory.toLowerCase().trim();

    if (lower === 'marketing' || lower.includes('trafego') || lower.includes('tráfego') || lower.includes('ads')) {
        return 'Tráfego Pago';
    }
    if (lower.includes('sala') || lower.includes('local') || lower.includes('espaco') || lower.includes('espaço')) {
        return 'Sala / Local';
    }
    if (lower.includes('hotel') || lower.includes('hospedagem') || lower.includes('pousada')) {
        return 'Hotel / Hospedagem';
    }
    if (lower.includes('gasolina') || lower.includes('deslocamento') || lower.includes('transporte') || lower.includes('uber') || lower.includes('voo')) {
        return 'Gasolina / Deslocamento';
    }
    if (lower === 'infraestrutura' || lower === 'equipamento' || lower.includes('som') || lower.includes('telao') || lower.includes('telão')) {
        return 'Infraestrutura';
    }
    if (lower === 'material' || lower.includes('alimentacao') || lower.includes('alimentação') || lower.includes('coffee') || lower.includes('almoço')) {
        return 'Alimentação';
    }
    if (lower === 'servico' || lower.includes('equipe') || lower.includes('monitor') || lower.includes('staff')) {
        return 'Equipe';
    }
    if (lower === 'outro' || lower.includes('taxa') || lower.includes('imposto')) {
        return 'Taxas / Outros';
    }

    // Se já corresponder a uma das padronizadas
    const match = STANDARDIZED_EXPENSE_CATEGORIES.find(c => c.key.toLowerCase() === lower);
    if (match) return match.key;

    return rawCategory;
}

/**
 * Obtém a configuração visual de uma categoria
 */
export function getExpenseCategoryConfig(rawCategory?: string): CategoryConfig {
    const normalized = normalizeExpenseCategory(rawCategory);
    const found = STANDARDIZED_EXPENSE_CATEGORIES.find(c => c.key === normalized);
    if (found) return found;

    return {
        key: normalized,
        label: normalized,
        badgeBg: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        icon: HelpCircle,
    };
}
