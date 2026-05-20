import React, { useMemo, useState } from 'react';
import {
    BarChart3, Users, DollarSign, TrendingUp, Search, Filter,
    Download, Mail, MessageCircle, Eye, Edit2, Trash2, Check,
    AlertCircle, Calendar, MapPin, Phone, GraduationCap, Loader2,
    Copy, FileText, Printer, Smartphone, Send, Ticket, Award, UserCheck,
    UserPlus, X, Wallet
} from 'lucide-react';
import { Lead, AppConfig, UserRole } from '../../types';

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
    const [itemsPerPageOption, setItemsPerPageOption] = useState<12 | 24 | 50 | 'todos'>(12);

    const itemsPerPage = itemsPerPageOption === 'todos' ? 999999 : itemsPerPageOption;

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

    // Filter controls state
    const [showFilters, setShowFilters] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('all');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Filtrar e ordenar leads
    const filteredAndSortedLeads = useMemo(() => {
        let result = leads;

        // Filtro por período
        if (dateRange !== 'all') {
            const now = new Date();
            const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 0;
            if (days > 0) {
                const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
                result = result.filter(l => {
                    const d = l.created_at ? new Date(l.created_at) : null;
                    return d ? d >= cutoff : false;
                });
            }
        }

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

    // Paginação com memoização otimizada
    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedLeads, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
    }, [filteredAndSortedLeads.length, itemsPerPage]);

    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

    const handleSendAutomatedEmail = async (lead: Lead) => {
        if (!lead.email) {
            alert('Lead sem email cadastrado.');
            return;
        }

        setSendingEmailId(lead.id);

        try {
            const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';
            const FRONTEND_URL = window.location.origin;

            let subject = "Contato - Vox Marketing Academy";
            let body = `<p>Olá ${lead.name || 'Aluno'},</p>`;
            let ticketUrl = '';

            if (lead.status === 'Abandonado') {
                subject = `Finalize sua inscrição - ${lead.product_name || 'Vox'}`;
                const checkoutUrl = `${FRONTEND_URL}/?checkout=${lead.product_id || ''}`;
                body = `<p>Olá ${lead.name || 'Aluno'},</p><p>Vimos que você iniciou sua compra para o <b>${lead.product_name || 'curso'}</b> mas não finalizou.</p><p>Se precisar de ajuda com o pagamento ou tiver alguma dúvida, estamos à disposição!</p><p><a href="${checkoutUrl}">Clique aqui para concluir sua inscrição</a></p><p>Atenciosamente,<br>Equipe Vox Marketing Academy</p>`;
            } else if (lead.status === 'Pago' || lead.status === 'Aprovado') {
                subject = `Inscrição Confirmada - ${lead.product_name || 'Vox'}`;
                ticketUrl = `${FRONTEND_URL}/?mode=ticket&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`;
                body = `<p>Olá ${lead.name || 'Aluno'},</p><p>Sua inscrição para o <b>${lead.product_name || 'curso'}</b> foi confirmada com sucesso!</p><p>Seja muito bem-vindo(a)! Acesse seu ingresso abaixo.</p><p>Atenciosamente,<br>Equipe Vox Marketing Academy</p>`;
            } else {
                 body = `<p>Olá ${lead.name || 'Aluno'},</p><p>Gostaríamos de entrar em contato sobre a sua inscrição no <b>${lead.product_name || 'curso'}</b>.</p><p>Atenciosamente,<br>Equipe Vox Marketing Academy</p>`;
            }

            const response = await fetch('https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    to: lead.email,
                    name: lead.name || 'Aluno',
                    subject: subject,
                    message: body,
                    ticketUrl: ticketUrl,
                    productName: lead.product_name || 'Vox Marketing Academy',
                    preserveCertificateLayout: true
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.error) {
                throw new Error(result.error || result.message || 'Erro ao enviar email');
            }

            alert('✅ Email disparado com sucesso!');
        } catch (err) {
            console.error('Erro ao enviar email:', err);
            alert(`❌ Erro ao enviar email: ${err instanceof Error ? err.message : 'Desconhecido'}`);
        } finally {
            setSendingEmailId(null);
        }
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

        // Comparação com 30 dias atrás
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last30DaysLeads = leads.filter(l => {
            const d = l.created_at ? new Date(l.created_at) : null;
            return d && d >= thirtyDaysAgo && d <= now;
        });
        const last30DaysPaid = last30DaysLeads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
        const last30DaysRevenue = last30DaysPaid.reduce((sum, l) => sum + (l.paid_amount || 0), 0);

        const revenueDelta = last30DaysRevenue > 0 ? ((totalRevenue - last30DaysRevenue) / last30DaysRevenue) * 100 : 0;
        const ticketMedio = paidLeads.length > 0 ? totalRevenue / paidLeads.length : 0;

        return { paidLeads, totalRevenue, pendingLeads, conversionRate, revenueDelta, ticketMedio };
    }, [filteredAndSortedLeads, leads]);

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
        setManualLead({ ...manualLead, paid_amount: value as any });
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

    const handleDeleteWithConfirm = async (leadId: string) => {
        setShowDeleteConfirm(leadId);
    };

    const confirmDelete = async (leadId: string) => {
        await onDeleteLead(leadId);
        setShowDeleteConfirm(null);
    };

    const handleUpdatePaidAmountWithLog = (leadId: string, value: string) => {
        onUpdatePaidAmount(leadId, value);
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

            {/* Manual Lead Form Modal */}
            {userRole === 'master' && showManualLeadForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <UserPlus className="text-blue-600" size={20} />
                                    {editingLeadId ? 'Editar Aluno' : 'Adicionar Aluno'}
                                </h3>
                                <button onClick={() => {
                                    setShowManualLeadForm(false);
                                    setManualLead({});
                                    setEditingLeadId(null);
                                }} className="text-gray-300 hover:text-gray-600 text-2xl font-bold transition-colors">
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Nome completo"
                                    value={manualLead.name || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={manualLead.email || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="tel"
                                    placeholder="Telefone"
                                    value={manualLead.phone || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="CPF"
                                    value={manualLead.cpf || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, cpf: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Cidade"
                                    value={manualLead.city || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, city: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Selecione Produto</option>
                                    {allCheckouts.map(c => <option key={c.id} value={c.id}>{c.productName}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select
                                    value={manualLead.status || 'Novo'}
                                    onChange={(e) => setManualLead({ ...manualLead, status: e.target.value as any })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Novo">Novo</option>
                                    <option value="Pago">Pago</option>
                                    <option value="Pendente">Pendente</option>
                                    <option value="Sinal">Sinal</option>
                                    <option value="Abandonado">Abandonado</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Valor (Ex: 100,50)"
                                    value={manualLead.paid_amount || ''}
                                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Pago por"
                                    value={manualLead.payer_name || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, payer_name: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Onde foi pago"
                                    value={manualLead.payment_location || ''}
                                    onChange={(e) => setManualLead({ ...manualLead, payment_location: e.target.value })}
                                    className="px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowManualLeadForm(false);
                                    setManualLead({});
                                    setEditingLeadId(null);
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleManualLeadSubmit}
                                disabled={isSubmittingManualLead}
                                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmittingManualLead ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {isSubmittingManualLead ? (editingLeadId ? 'Atualizando...' : 'Salvando...') : (editingLeadId ? 'Atualizar' : 'Salvar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                                <AlertCircle size={24} className="text-red-600" />
                                Confirmar Exclusão
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm font-bold text-gray-700">
                                Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-red-700">Esta operação é irreversível</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => confirmDelete(showDeleteConfirm)}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                Deletar
                            </button>
                        </div>
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
                            <p className="text-[11px] text-gray-400 font-medium mt-1">Leads registrados</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Receita</p>
                            <p className="text-3xl font-black text-gray-900">R$ {(stats.totalRevenue / 1000).toFixed(1)}k</p>
                            <div className="flex items-center gap-1 mt-1">
                                <span className={`text-[11px] font-bold ${stats.revenueDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {stats.revenueDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueDelta).toFixed(0)}%
                                </span>
                                <span className="text-[10px] text-gray-400">vs 30d</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <DollarSign size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ticket Médio</p>
                            <p className="text-3xl font-black text-purple-600">R$ {stats.ticketMedio.toFixed(0)}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-1">{stats.paidLeads.length} vendas</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Wallet size={24} className="text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Taxa Conversão</p>
                            <p className="text-3xl font-black text-orange-600">{stats.conversionRate}%</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-1">{stats.paidLeads.length}/{filteredAndSortedLeads.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <TrendingUp size={24} className="text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Busca Principal */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 sticky top-0 z-30">
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

            {/* Filtros e Configurações (Collapse) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-gray-600" />
                        <span className="font-bold text-gray-800">Filtros & Configurações</span>
                    </div>
                    <span className={`text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {showFilters && (
                    <div className="border-t border-gray-100 p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Período</label>
                                <select
                                    value={dateRange}
                                    onChange={(e) => {
                                        setDateRange(e.target.value as any);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                >
                                    <option value="all">Todos</option>
                                    <option value="7d">Últimos 7d</option>
                                    <option value="30d">Últimos 30d</option>
                                    <option value="90d">Últimos 90d</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Produto</label>
                                <select
                                    value={selectedProduct}
                                    onChange={(e) => {
                                        setSelectedProduct(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                >
                                    <option value="all">Todos</option>
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
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                >
                                    <optgroup label="Confirmado">
                                        <option value="Pago">Pago</option>
                                        <option value="Aprovado">Aprovado</option>
                                    </optgroup>
                                    <optgroup label="Aguardando">
                                        <option value="Novo">Novo</option>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Sinal">Sinal</option>
                                        <option value="Pagar no dia">Pagar no dia</option>
                                    </optgroup>
                                    <optgroup label="Finalizado">
                                        <option value="Cancelado">Cancelado</option>
                                        <option value="Devolvido">Devolvido</option>
                                        <option value="Abandonado">Abandonado</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Ordenar por</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
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
                                        className={`flex-1 px-2 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${
                                            viewMode === 'grid'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Grid
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`flex-1 px-2 py-2.5 rounded-xl font-bold text-xs uppercase transition-all ${
                                            viewMode === 'table'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Tabela
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Itens/Página</label>
                                <select
                                    value={itemsPerPageOption}
                                    onChange={(e) => {
                                        setItemsPerPageOption(e.target.value as any);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                >
                                    <option value={12}>12</option>
                                    <option value={24}>24</option>
                                    <option value={50}>50</option>
                                    <option value="todos">Todos ({filteredAndSortedLeads.length})</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Ferramentas Sticky */}
            <div className="sticky top-16 z-20 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 backdrop-blur-sm bg-white/95">
                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">📋 Área de Transferência</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                onClick={copyAllNames}
                                className={`px-3 py-2 rounded-xl font-bold text-xs uppercase transition-all border flex items-center justify-center gap-2 ${
                                    copiedNames
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                            >
                                {copiedNames ? <Check size={14} /> : <Copy size={14} />}
                                {copiedNames ? 'Copiado!' : 'Nomes'}
                            </button>

                            <button
                                onClick={copyAllPhones}
                                className={`px-3 py-2 rounded-xl font-bold text-xs uppercase transition-all border flex items-center justify-center gap-2 ${
                                    copiedPhones
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                            >
                                {copiedPhones ? <Check size={14} /> : <Smartphone size={14} />}
                                {copiedPhones ? 'Copiado!' : 'Telefones'}
                            </button>

                            <button
                                onClick={copyAllEmails}
                                className={`px-3 py-2 rounded-xl font-bold text-xs uppercase transition-all border flex items-center justify-center gap-2 ${
                                    copiedEmails
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                }`}
                            >
                                {copiedEmails ? <Check size={14} /> : <Mail size={14} />}
                                {copiedEmails ? 'Copiado!' : 'Emails'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">📁 Exportação</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                onClick={exportCSV}
                                className="px-3 py-2 rounded-xl font-bold text-xs uppercase transition-all border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-2"
                            >
                                <FileText size={14} />
                                Exportar CSV
                            </button>

                            <button
                                onClick={handlePrint}
                                className="px-3 py-2 rounded-xl font-bold text-xs uppercase transition-all border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2"
                            >
                                <Printer size={14} />
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {paginatedLeads.map((lead, index) => {
                            const leadNumber = (currentPage - 1) * itemsPerPage + index + 1;
                            return (
                            <div key={lead.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all relative">
                                {/* Número sequencial + Verificado */}
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <button
                                        onClick={() => toggleVerified(lead.id)}
                                        className={`px-2 py-1 rounded-full font-black text-xs transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                                            verifiedLeads.has(lead.id)
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                        }`}
                                        title="Marcar como verificado"
                                    >
                                        <Check size={14} />
                                        {verifiedLeads.has(lead.id) ? 'Verif.' : ''}
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
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs pt-1">
                                        <span className="font-bold text-gray-500 uppercase whitespace-nowrap">Pago por:</span>
                                        <input
                                            type="text"
                                            value={tempPayerNames[lead.id] !== undefined ? tempPayerNames[lead.id] : (lead.payer_name || '')}
                                            onChange={(e) => handlePayerNameChange(lead.id, e.target.value)}
                                            placeholder="Nome"
                                            className="flex-1 px-2 py-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>

                                    {/* Onde foi pago */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                        <span className="font-bold text-gray-500 uppercase whitespace-nowrap">Local:</span>
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
                                            onClick={() => handleDeleteWithConfirm(lead.id)}
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
                                    const leadNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                    <tr key={lead.id} className="hover:bg-blue-50/30 transition-all">
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center gap-2 justify-center flex-wrap">
                                                <button
                                                    onClick={() => toggleVerified(lead.id)}
                                                    className={`px-1.5 py-0.5 rounded-full font-black text-[10px] transition-all flex items-center justify-center gap-0.5 ${
                                                        verifiedLeads.has(lead.id)
                                                            ? 'bg-cyan-600 text-white'
                                                            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                                    }`}
                                                    title="Marcar como verificado"
                                                >
                                                    <Check size={12} />
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
                                            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                                                {lead.phone}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                                <span className="truncate flex-1">{lead.email}</span>
                                                {lead.email && (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(lead.email || '');
                                                            alert('Email copiado!');
                                                        }}
                                                        className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="Copiar email"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                )}
                                            </div>
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
                                                <button
                                                    onClick={() => viewTicket(lead)}
                                                    className="px-2 py-1 rounded-lg bg-purple-50 text-purple-600 font-bold text-[10px] uppercase hover:bg-purple-100 transition-all flex items-center gap-1"
                                                    title="Ver Ingresso"
                                                >
                                                    <Ticket size={12} />
                                                </button>
                                                <button
                                                    onClick={() => viewCertificate(lead)}
                                                    className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-bold text-[10px] uppercase hover:bg-amber-100 transition-all flex items-center gap-1"
                                                    title="Ver Certificado"
                                                >
                                                    <Award size={12} />
                                                </button>
                                                <button
                                                    onClick={() => toggleCheckIn(lead)}
                                                    className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center gap-1 ${
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
                                                        className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] uppercase hover:bg-indigo-100 transition-all flex items-center gap-1"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                                {lead.email && (
                                                    <button
                                                        onClick={() => handleSendAutomatedEmail(lead)}
                                                        disabled={sendingEmailId === lead.id}
                                                        className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center gap-1 ${
                                                            sendingEmailId === lead.id
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                        }`}
                                                        title="Disparar Email"
                                                    >
                                                        {sendingEmailId === lead.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Send size={12} />
                                                        )}
                                                    </button>
                                                )}
                                                {lead.phone && (
                                                    <a
                                                        href={`https://wa.me/55${lead.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(generateWhatsAppMessage(lead))}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase hover:bg-emerald-100 transition-all flex items-center gap-1"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle size={12} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteWithConfirm(lead.id)}
                                                    disabled={savingId === lead.id}
                                                    className="px-2 py-1 rounded-lg bg-red-50 text-red-600 font-bold text-[10px] uppercase hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                                    title="Apagar"
                                                >
                                                    {savingId === lead.id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={12} />
                                                    )}
                                                </button>
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
            {filteredAndSortedLeads.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-600">
                        {itemsPerPageOption === 'todos' ? (
                            <span>Mostrando {filteredAndSortedLeads.length} resultado{filteredAndSortedLeads.length !== 1 ? 's' : ''}</span>
                        ) : (
                            <span>
                                Página {currentPage} de {totalPages} • {filteredAndSortedLeads.length} resultado{filteredAndSortedLeads.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    {totalPages > 1 && itemsPerPageOption !== 'todos' && (
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
