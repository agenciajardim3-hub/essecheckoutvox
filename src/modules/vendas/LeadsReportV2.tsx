import React, { useMemo, useState } from 'react';
import {
    BarChart3, Users, DollarSign, TrendingUp, Search, Filter,
    Download, Mail, MessageCircle, Eye, Edit2, Trash2, Check,
    AlertCircle, Calendar, MapPin, Phone, GraduationCap, Loader2,
    Copy, FileText, Printer, Smartphone, Send, Ticket, Award, UserCheck,
    UserPlus, X
} from 'lucide-react';
import { Lead, AppConfig, UserRole } from '../../shared';

interface TooltipProps {
    children: React.ReactNode;
    text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
    return (
        <div className="group relative inline-block">
            {children}
            <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-bold text-white bg-gray-900 rounded whitespace-nowrap z-50 transition-all">
                {text}
            </span>
        </div>
    );
};

interface LeadsReportV2Props {
    userRole: UserRole;
    leads: Lead[];
    allCheckouts: AppConfig[];
    onUpdateStatus: (id: string, status: Lead['status']) => void;
    onUpdatePaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    savingId: string | null;
    onCheckIn?: (leadId: string, checkedIn: boolean) => Promise<void>;
    onUpdateLeadField?: (id: string, fields: Record<string, any>) => Promise<void>;
    onSaveManualLead?: (lead: Partial<Lead>) => Promise<void>;
}

type ViewMode = 'grid' | 'table' | 'stats';
type SortBy = 'date' | 'name' | 'status' | 'amount';

export const LeadsReportV2: React.FC<LeadsReportV2Props> = ({
    userRole,
    leads,
    allCheckouts,
    onUpdateStatus,
    onUpdatePaidAmount,
    onDeleteLead,
    savingId,
    onCheckIn,
    onUpdateLeadField,
    onSaveManualLead
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [sortBy, setSortBy] = useState<SortBy>('date');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // Copy to clipboard states
    const [copiedNames, setCopiedNames] = useState(false);
    const [copiedPhones, setCopiedPhones] = useState(false);
    const [copiedEmails, setCopiedEmails] = useState(false);

    // Manual Lead Form states
    const [showManualLeadForm, setShowManualLeadForm] = useState(false);
    const [manualLead, setManualLead] = useState<Partial<Lead>>({});
    const [isSubmittingManualLead, setIsSubmittingManualLead] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

    // Temporary states for field editing
    const [tempPayerNames, setTempPayerNames] = useState<Record<string, string>>({});
    const [tempPaymentLocations, setTempPaymentLocations] = useState<Record<string, string>>({});

    // Verification states
    const [verifiedLeads, setVerifiedLeads] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('vox_verified_leads');
        return new Set(saved ? JSON.parse(saved) : []);
    });

    // Filtrar e ordenar leads
    const filteredAndSortedLeads = useMemo(() => {
        let result = leads;

        // Filtro por produto
        if (selectedProduct !== 'all') {
            result = result.filter(l => l.product_id === selectedProduct);
        }

        // Filtro por status
        if (selectedStatus !== 'all') {
            result = result.filter(l => l.status === selectedStatus);
        }

        // Busca por texto
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(l =>
                l.name?.toLowerCase().includes(term) ||
                l.email?.toLowerCase().includes(term) ||
                l.phone?.includes(term) ||
                l.cpf?.includes(term)
            );
        }

        // Ordenação
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                case 'amount':
                    return (b.paid_amount || 0) - (a.paid_amount || 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [leads, selectedProduct, selectedStatus, searchTerm, sortBy]);

    // Paginação com memoização
    const paginatedLeads = useMemo(() => {
        if (pageSize === -1) {
            return filteredAndSortedLeads;
        }
        const startIndex = (currentPage - 1) * pageSize;
        return filteredAndSortedLeads.slice(startIndex, startIndex + pageSize);
    }, [filteredAndSortedLeads, currentPage, pageSize]);

    const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredAndSortedLeads.length / pageSize);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    // Cálculos de estatísticas
    const stats = useMemo(() => {
        const paidLeads = filteredAndSortedLeads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
        const totalRevenue = paidLeads.reduce((sum, l) => sum + (l.paid_amount || 0), 0);
        const pendingLeads = filteredAndSortedLeads.filter(l =>
            l.status !== 'Pago' && l.status !== 'Aprovado' && l.status !== 'Cancelado' && l.status !== 'Devolvido'
        );
        const conversionRate = filteredAndSortedLeads.length > 0
            ? ((paidLeads.length / filteredAndSortedLeads.length) * 100).toFixed(1)
            : '0';

        return { paidLeads, totalRevenue, pendingLeads, conversionRate };
    }, [filteredAndSortedLeads]);

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Pago':
            case 'Aprovado':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Pendente':
            case 'Sinal':
            case 'Pagar no dia':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Cancelado':
            case 'Devolvido':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'Abandonado':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    // Copy functions
    const copyAllNames = () => {
        const names = filteredAndSortedLeads.map(l => l.name).join('\n');
        navigator.clipboard.writeText(names);
        setCopiedNames(true);
        setTimeout(() => setCopiedNames(false), 2000);
    };

    const copyAllPhones = () => {
        const phones = filteredAndSortedLeads
            .map(l => l.phone?.replace(/\D/g, ''))
            .filter(Boolean)
            .join('\n');
        navigator.clipboard.writeText(phones);
        setCopiedPhones(true);
        setTimeout(() => setCopiedPhones(false), 2000);
    };

    const copyAllEmails = () => {
        const emails = filteredAndSortedLeads
            .map(l => l.email)
            .filter(Boolean)
            .join('\n');
        navigator.clipboard.writeText(emails);
        setCopiedEmails(true);
        setTimeout(() => setCopiedEmails(false), 2000);
    };

    const exportCSV = () => {
        const headers = ['#', 'Nome', 'Email', 'Telefone', 'CPF', 'Cidade', 'Pago por', 'Onde foi pago', 'Status', 'Produto', 'Turma', 'Valor Pago', 'Data e Hora'];
        const rows = filteredAndSortedLeads.map((l, index) => [
            String(index + 1),
            l.name || '',
            l.email || '',
            l.phone?.replace(/\D/g, '') || '',
            l.cpf || '',
            l.city || '',
            l.payer_name || '',
            l.payment_location || '',
            l.status || '',
            l.product_name || '',
            l.turma || '',
            l.paid_amount != null ? String(l.paid_amount) : '',
            l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : ''
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_vendas_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    const generateWhatsAppMessage = (lead: Lead) => {
        const firstName = lead.name?.split(' ')[0] || 'Olá';
        const productName = lead.product_name || 'turma';

        if (lead.status === 'Pago' || lead.status === 'Aprovado') {
            return `Oi ${firstName}, tudo bem? Vi que sua inscrição na ${productName} foi confirmada! Seja bem-vindo(a)!`;
        } else if (lead.status === 'Abandonado') {
            return `Oi ${firstName}, tudo bem? Vi que você começou sua inscrição na ${productName} mas não finalizou. Ficou com alguma dúvida? Posso te ajudar?`;
        } else {
            return `Oi ${firstName}, tudo bem? Vi que você tentou se inscrever na ${productName} mas o pagamento não confirmou. Teve alguma dúvida?`;
        }
    };

    const viewTicket = (lead: Lead) => {
        const ticketUrl = `${window.location.origin}/?mode=ticket&checkout=${lead.product_id}&cpf=${lead.cpf}`;
        window.open(ticketUrl, '_blank');
    };

    const viewCertificate = (lead: Lead) => {
        const certUrl = `${window.location.origin}/?mode=certificate&checkout=${lead.product_id}&cpf=${lead.cpf}`;
        window.open(certUrl, '_blank');
    };

    const toggleCheckIn = async (lead: Lead) => {
        try {
            await onCheckIn?.(lead.id, !lead.checked_in);
        } catch (err) {
            console.error('Erro ao atualizar check-in:', err);
        }
    };

    const toggleVerified = (leadId: string) => {
        const newVerified = new Set(verifiedLeads);
        if (newVerified.has(leadId)) {
            newVerified.delete(leadId);
        } else {
            newVerified.add(leadId);
        }
        setVerifiedLeads(newVerified);
        localStorage.setItem('vox_verified_leads', JSON.stringify(Array.from(newVerified)));
    };

    // Handle payer_name changes with debounce
    const handlePayerNameChange = (leadId: string, value: string) => {
        setTempPayerNames(prev => ({ ...prev, [leadId]: value }));
        // Debounce save
        const timer = setTimeout(() => {
            onUpdateLeadField?.(leadId, { payer_name: value });
        }, 1000);
        return () => clearTimeout(timer);
    };

    // Handle payment_location changes with debounce
    const handlePaymentLocationChange = (leadId: string, value: string) => {
        setTempPaymentLocations(prev => ({ ...prev, [leadId]: value }));
        // Debounce save
        const timer = setTimeout(() => {
            onUpdateLeadField?.(leadId, { payment_location: value });
        }, 1000);
        return () => clearTimeout(timer);
    };

    const handleEditLead = (lead: Lead) => {
        setManualLead(lead);
        setEditingLeadId(lead.id);
        setShowManualLeadForm(true);
    };

    // Handle payment amount changes
    const handlePaidAmountChange = (value: string) => {
        console.log('Valor digitado:', value, 'chars:', [...value].map((c, i) => `${i}:${c}(${c.charCodeAt(0)})`)); // DEBUG
        setManualLead({ ...manualLead, paid_amount: value as any });
    };

    // Wrapper para onUpdatePaidAmount com log
    const handleUpdatePaidAmountWithLog = (id: string, value: string) => {
        console.log('Atualizando valor:', value); // DEBUG
        onUpdatePaidAmount(id, value);
    };

    const handleManualLeadSubmit = async () => {
        if (!manualLead.name || !manualLead.product_id) {
            alert('Nome e Produto são obrigatórios');
            return;
        }
        try {
            setIsSubmittingManualLead(true);
            if (editingLeadId) {
                // Update existing lead
                await onUpdateLeadField?.(editingLeadId, manualLead);
            } else {
                // Create new lead
                await onSaveManualLead?.(manualLead);
            }
            setManualLead({});
            setEditingLeadId(null);
            setShowManualLeadForm(false);
        } catch (err) {
            alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsSubmittingManualLead(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Relatório de Vendas</h2>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                        {filteredAndSortedLeads.length} registros • {stats.paidLeads.length} pagos
                    </p>
                </div>
                {userRole === 'master' && (
                    <button
                        onClick={() => {
                            setShowManualLeadForm(!showManualLeadForm);
                            if (!showManualLeadForm) {
                                setManualLead({});
                                setEditingLeadId(null);
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg"
                    >
                        <UserPlus size={18} /> Adicionar Aluno
                    </button>
                )}
            </div>

            {/* Manual Lead Form */}
            {userRole === 'master' && showManualLeadForm && (
                <div className="bg-blue-50 border-2 border-blue-200 p-8 rounded-2xl mb-8 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                            <UserPlus className="text-blue-600" size={24} />
                            {editingLeadId ? 'Editar Aluno' : 'Adicionar Aluno Manualmente'}
                        </h3>
                        <button onClick={() => {
                            setShowManualLeadForm(false);
                            setManualLead({});
                            setEditingLeadId(null);
                        }} className="text-gray-400 hover:text-red-500 transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Nome completo"
                            value={manualLead.name || ''}
                            onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={manualLead.email || ''}
                            onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="tel"
                            placeholder="Telefone"
                            value={manualLead.phone || ''}
                            onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="CPF"
                            value={manualLead.cpf || ''}
                            onChange={(e) => setManualLead({ ...manualLead, cpf: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="Cidade"
                            value={manualLead.city || ''}
                            onChange={(e) => setManualLead({ ...manualLead, city: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={manualLead.product_id || ''}
                            onChange={(e) => {
                                const checkout = allCheckouts.find(c => c.id === e.target.value);
                                setManualLead({
                                    ...manualLead,
                                    product_id: e.target.value,
                                    product_name: checkout?.productName,
                                    turma: checkout?.turma
                                });
                            }}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecione Produto</option>
                            {allCheckouts.map(c => <option key={c.id} value={c.id}>{c.productName} ({c.turma || 'Geral'})</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <select
                            value={manualLead.status || 'Novo'}
                            onChange={(e) => setManualLead({ ...manualLead, status: e.target.value as any })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Novo">Novo</option>
                            <option value="Pago">Pago</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Sinal">Sinal</option>
                            <option value="Abandonado">Abandonado</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Ex: 100,50"
                            value={manualLead.paid_amount || ''}
                            onChange={(e) => handlePaidAmountChange(e.target.value)}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="Pago por"
                            value={manualLead.payer_name || ''}
                            onChange={(e) => setManualLead({ ...manualLead, payer_name: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="Onde foi pago"
                            value={manualLead.payment_location || ''}
                            onChange={(e) => setManualLead({ ...manualLead, payment_location: e.target.value })}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleManualLeadSubmit}
                            disabled={isSubmittingManualLead}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmittingManualLead ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {isSubmittingManualLead ? (editingLeadId ? 'Atualizando...' : 'Salvando...') : (editingLeadId ? 'Atualizar' : 'Salvar')}
                        </button>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total de Leads</p>
                            <p className="text-3xl font-black text-gray-900">{filteredAndSortedLeads.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pagos</p>
                            <p className="text-3xl font-black text-emerald-600">{stats.paidLeads.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Check size={24} className="text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Receita</p>
                            <p className="text-3xl font-black text-gray-900">R$ {(stats.totalRevenue / 1000).toFixed(1)}k</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Taxa Conversão</p>
                            <p className="text-3xl font-black text-orange-600">{stats.conversionRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingUp size={24} className="text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Controles */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                {/* Busca */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email, telefone ou CPF..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        />
                    </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Produto</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                            <option value="all">Todos os produtos</option>
                            {allCheckouts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.productName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                            <option value="all">Todos os status</option>
                            <option value="Pago">Pagos</option>
                            <option value="Pendente">Pendentes</option>
                            <option value="Abandonado">Abandonados</option>
                            <option value="Cancelado">Cancelados</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Ordenar por</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                        >
                            <option value="date">Data (Recente)</option>
                            <option value="name">Nome</option>
                            <option value="status">Status</option>
                            <option value="amount">Valor</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Visualização</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Tabela
                            </button>
                        </div>
                        <div className="mt-3">
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Itens por página</label>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            >
                                <option value={12}>12 por página</option>
                                <option value={24}>24 por página</option>
                                <option value={48}>48 por página</option>
                                <option value={96}>96 por página</option>
                                <option value={-1}>Todos</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ferramentas e Ações em Massa */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                <p className="text-xs font-bold text-gray-600 uppercase mb-4 tracking-widest">Ferramentas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <button
                        onClick={copyAllNames}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm border flex items-center justify-center gap-2 ${
                            copiedNames
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-gray-900 text-white border-gray-900 hover:bg-black'
                        }`}
                    >
                        {copiedNames ? <Check size={16} /> : <Copy size={16} />}
                        {copiedNames ? 'Copiado!' : 'Copiar Nomes'}
                    </button>

                    <button
                        onClick={copyAllPhones}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm border flex items-center justify-center gap-2 ${
                            copiedPhones
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        {copiedPhones ? <Check size={16} /> : <Smartphone size={16} />}
                        {copiedPhones ? 'Copiado!' : 'Copiar Telefones'}
                    </button>

                    <button
                        onClick={copyAllEmails}
                        className={`px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm border flex items-center justify-center gap-2 ${
                            copiedEmails
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                        }`}
                    >
                        {copiedEmails ? <Check size={16} /> : <Send size={16} />}
                        {copiedEmails ? 'Copiado!' : 'Copiar Emails'}
                    </button>

                    <button
                        onClick={exportCSV}
                        className="px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                    >
                        <FileText size={16} />
                        Exportar CSV
                    </button>

                    <button
                        onClick={handlePrint}
                        className="px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2"
                    >
                        <Printer size={16} />
                        Imprimir
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {paginatedLeads.map((lead, index) => {
                            const leadNumber = pageSize === -1 
                                ? index + 1 
                                : (currentPage - 1) * pageSize + index + 1;
                            return (
                            <div key={lead.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all relative">
                                {/* Número sequencial + Verificado */}
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <button
                                        onClick={() => toggleVerified(lead.id)}
                                        className={`w-8 h-8 rounded-full font-black text-xs transition-all flex items-center justify-center ${
                                            verifiedLeads.has(lead.id)
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                        }`}
                                        title="Marcar como verificado"
                                    >
                                        ✓
                                    </button>
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs">
                                        {leadNumber}
                                    </div>
                                </div>

                                {/* Header do Card */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-100">
                                    <h3 className="font-black text-gray-900 mb-1 truncate pr-8">{lead.name}</h3>
                                    <p className="text-xs text-gray-500 font-bold truncate">{lead.email}</p>
                                </div>

                                {/* Conteúdo */}
                                <div className="p-4 space-y-3">
                                    {/* Contato */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={16} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-bold text-gray-700 truncate">{lead.phone}</span>
                                    </div>

                                    {/* Localização */}
                                    {lead.city && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-bold text-gray-700">{lead.city}</span>
                                        </div>
                                    )}

                                    {/* Pago por */}
                                    <div className="flex items-center gap-2 text-xs pt-1">
                                        <span className="font-bold text-gray-500 uppercase">Pago por:</span>
                                        <input
                                            type="text"
                                            value={tempPayerNames[lead.id] !== undefined ? tempPayerNames[lead.id] : (lead.payer_name || '')}
                                            onChange={(e) => handlePayerNameChange(lead.id, e.target.value)}
                                            placeholder="Nome"
                                            className="flex-1 px-2 py-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>

                                    {/* Onde foi pago */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-bold text-gray-500 uppercase">Local:</span>
                                        <input
                                            type="text"
                                            value={tempPaymentLocations[lead.id] !== undefined ? tempPaymentLocations[lead.id] : (lead.payment_location || '')}
                                            onChange={(e) => handlePaymentLocationChange(lead.id, e.target.value)}
                                            placeholder="Onde foi pago"
                                            className="flex-1 px-2 py-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>

                                    {/* Turma */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <GraduationCap size={16} className="text-gray-400 flex-shrink-0" />
                                        <span className="font-bold text-gray-700 truncate">{lead.turma || 'Sem turma'}</span>
                                    </div>

                                    {/* Status */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <select
                                            value={lead.status || 'Novo'}
                                            onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                                            className={`w-full px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${getStatusColor(lead.status)}`}
                                        >
                                            {['Novo', 'Pago', 'Pendente', 'Sinal', 'Pagar no dia', 'Aprovado', 'Cancelado', 'Devolvido', 'Abandonado'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Valor */}
                                    {userRole === 'master' && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                            <span className="text-xs font-bold text-gray-600 uppercase">Valor:</span>
                                            <input
                                                type="text"
                                                value={lead.paid_amount || ''}
                                                onChange={(e) => handleUpdatePaidAmountWithLog(lead.id, e.target.value)}
                                                placeholder="0,00"
                                                className="flex-1 px-2 py-1.5 text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            />
                                        </div>
                                    )}

                                    {/* Data e Hora */}
                                    <div className="text-xs text-gray-400 font-bold text-right pt-2 border-t border-gray-100">
                                        {lead.created_at && new Date(lead.created_at).toLocaleString('pt-BR', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            onClick={() => viewTicket(lead)}
                                            className="px-2 py-1.5 rounded-lg bg-purple-50 text-purple-600 font-bold text-[10px] uppercase hover:bg-purple-100 transition-all flex items-center justify-center gap-1"
                                            title="Ver Ingresso"
                                        >
                                            <Ticket size={12} />
                                        </button>
                                        <button
                                            onClick={() => viewCertificate(lead)}
                                            className="px-2 py-1.5 rounded-lg bg-amber-50 text-amber-600 font-bold text-[10px] uppercase hover:bg-amber-100 transition-all flex items-center justify-center gap-1"
                                            title="Ver Certificado"
                                        >
                                            <Award size={12} />
                                        </button>
                                        <button
                                            onClick={() => toggleCheckIn(lead)}
                                            className={`px-2 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-1 ${
                                                lead.checked_in
                                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                            title="Toggle Check-in"
                                        >
                                            <Check size={12} />
                                        </button>
                                        {userRole === 'master' && (
                                            <button
                                                onClick={() => handleEditLead(lead)}
                                                className="px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] uppercase hover:bg-indigo-100 transition-all flex items-center justify-center gap-1"
                                                title="Editar"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {lead.phone && (
                                            <a
                                                href={`https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(generateWhatsAppMessage(lead))}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase hover:bg-emerald-100 transition-all flex items-center justify-center gap-1"
                                            >
                                                <MessageCircle size={12} /> Chat
                                            </a>
                                        )}
                                        <button
                                            onClick={() => onDeleteLead(lead.id)}
                                            disabled={savingId === lead.id}
                                            className="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-[10px] uppercase hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            {savingId === lead.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={12} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-900 text-white">
                                    <th className="px-4 py-3 text-center font-black uppercase text-xs w-12">#</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Nome</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Contato</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Pago por</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Local Pag.</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Produto</th>
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Status</th>
                                    {userRole === 'master' && (
                                        <th className="px-4 py-3 text-left font-black uppercase text-xs">Valor</th>
                                    )}
                                    <th className="px-4 py-3 text-left font-black uppercase text-xs">Data</th>
                                    <th className="px-4 py-3 text-center font-black uppercase text-xs">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedLeads.map((lead, index) => {
                                    const leadNumber = pageSize === -1 
                                        ? index + 1 
                                        : (currentPage - 1) * pageSize + index + 1;
                                    return (
                                    <tr key={lead.id} className="hover:bg-blue-50/30 transition-all">
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <button
                                                    onClick={() => toggleVerified(lead.id)}
                                                    className={`w-6 h-6 rounded-full font-black text-xs transition-all flex items-center justify-center ${
                                                        verifiedLeads.has(lead.id)
                                                            ? 'bg-cyan-600 text-white'
                                                            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                                    }`}
                                                    title="Marcar como verificado"
                                                >
                                                    ✓
                                                </button>
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs">
                                                    {leadNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{lead.name}</div>
                                            {lead.city && <div className="text-xs text-gray-500">{lead.city}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs font-bold text-emerald-600">{lead.phone}</div>
                                            <div className="text-xs text-gray-500 truncate">{lead.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={tempPayerNames[lead.id] !== undefined ? tempPayerNames[lead.id] : (lead.payer_name || '')}
                                                onChange={(e) => handlePayerNameChange(lead.id, e.target.value)}
                                                placeholder="Nome"
                                                className="w-full px-2 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={tempPaymentLocations[lead.id] !== undefined ? tempPaymentLocations[lead.id] : (lead.payment_location || '')}
                                                onChange={(e) => handlePaymentLocationChange(lead.id, e.target.value)}
                                                placeholder="Local"
                                                className="w-full px-2 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-block bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                                {lead.turma || 'Sem turma'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={lead.status || 'Novo'}
                                                onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                                                className={`px-2 py-1.5 rounded-lg text-xs font-bold uppercase border ${getStatusColor(lead.status)}`}
                                            >
                                                {['Novo', 'Pago', 'Pendente', 'Sinal', 'Pagar no dia', 'Aprovado', 'Cancelado', 'Devolvido', 'Abandonado'].map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </td>
                                        {userRole === 'master' && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={lead.paid_amount || ''}
                                                    onChange={(e) => handleUpdatePaidAmountWithLog(lead.id, e.target.value)}
                                                    placeholder="0,00"
                                                    className="w-24 px-2 py-1.5 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-xs font-bold text-gray-500">
                                            {lead.created_at && new Date(lead.created_at).toLocaleString('pt-BR', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                <Tooltip text="Gerar Ticket">
                                                    <button
                                                        onClick={() => viewTicket(lead)}
                                                        className="px-2 py-1 rounded-lg bg-purple-50 text-purple-600 font-bold text-[10px] uppercase hover:bg-purple-100 transition-all flex items-center gap-1"
                                                    >
                                                        <Ticket size={12} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Ver Certificado">
                                                    <button
                                                        onClick={() => viewCertificate(lead)}
                                                        className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-bold text-[10px] uppercase hover:bg-amber-100 transition-all flex items-center gap-1"
                                                    >
                                                        <Award size={12} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="Check-in">
                                                    <button
                                                        onClick={() => toggleCheckIn(lead)}
                                                        className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center gap-1 ${
                                                            lead.checked_in
                                                                ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                        }`}
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                </Tooltip>
                                                {userRole === 'master' && (
                                                    <Tooltip text="Editar">
                                                        <button
                                                            onClick={() => handleEditLead(lead)}
                                                            className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] uppercase hover:bg-indigo-100 transition-all flex items-center gap-1"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {lead.phone && (
                                                    <Tooltip text="WhatsApp">
                                                        <a
                                                            href={`https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(generateWhatsAppMessage(lead))}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase hover:bg-emerald-100 transition-all flex items-center gap-1"
                                                        >
                                                            <MessageCircle size={12} />
                                                        </a>
                                                    </Tooltip>
                                                )}
                                                {lead.email && (
                                                    <Tooltip text="Enviar Email">
                                                        <a
                                                            href={`mailto:${lead.email}?subject=${encodeURIComponent(`Confirmação de inscrição - ${lead.product_name || 'Evento'}`)}&body=${encodeURIComponent(`Olá ${lead.name},\n\nSua inscrição foi confirmada!\n\nProduto: ${lead.product_name || 'Evento'}\nTurma: ${lead.turma || 'Geral'}\n\nEm breve você receberá mais informações.`)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px] uppercase hover:bg-blue-100 transition-all flex items-center gap-1"
                                                        >
                                                            <Mail size={12} />
                                                        </a>
                                                    </Tooltip>
                                                )}
                                                <Tooltip text="Apagar">
                                                    <button
                                                        onClick={() => onDeleteLead(lead.id)}
                                                        disabled={savingId === lead.id}
                                                        className="px-2 py-1 rounded-lg bg-red-50 text-red-600 font-bold text-[10px] uppercase hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {savingId === lead.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={12} />
                                                        )}
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Paginação */}
            {(totalPages > 1 || pageSize === -1) && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-600">
                        {pageSize === -1 
                            ? `Mostrando todos os ${filteredAndSortedLeads.length} registros`
                            : `Página ${currentPage} de ${totalPages} • ${filteredAndSortedLeads.length} resultados`
                        }
                    </div>
                    {pageSize !== -1 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs uppercase disabled:opacity-50"
                            >
                                ← Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs uppercase disabled:opacity-50"
                            >
                                Próximo →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Vazio */}
            {filteredAndSortedLeads.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="font-bold text-gray-600 mb-2">Nenhum resultado encontrado</p>
                    <p className="text-sm text-gray-500">Tente alterar os filtros de busca</p>
                </div>
            )}
        </div>
    );
};
