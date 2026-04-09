
import React, { useState } from 'react';
import { Layout, ListChecks, Plus, Ticket, ListFilter, Award, Terminal, LogOut, Eye, Link as LinkIcon, CopyPlus, Loader2, Trash2, GraduationCap, QrCode, Tag, DollarSign, BarChart3, UserCheck, Layers, FileText, FileCheck, Wallet, Signature, Monitor, MessageCircle, Settings, Calendar, ClipboardList, Folder } from 'lucide-react';
import { AppConfig, Lead, UserRole, Coupon } from '../../types';
import { ProductConfig } from './ProductConfig';
import { LeadsReport } from './LeadsReport';
import { TicketGenerator } from './TicketGenerator';
import { TicketLogs } from './TicketLogs';
import { CertificateGenerator } from './CertificateGenerator';
import { IntegrationsStatus } from './IntegrationsStatus';
import { TicketScanner } from './TicketScanner';
import { CouponManager } from './CouponManager';
import { OverviewDashboard } from './OverviewDashboard';
import { useSupabase } from '../../hooks/useSupabase';
import { CheckInDashboard } from './CheckInDashboard';
import { SupportMaterials } from './SupportMaterials';
import { SolicitacoesDashboard } from './SolicitacoesDashboard';
import { ExpenseManager } from './ExpenseManager';
import { FinancialDashboard } from './FinancialDashboard';
import { SignatureManager } from './SignatureManager';
import { CheckoutViews } from './CheckoutViews';
import { RemarketingDashboard } from './RemarketingDashboard';
import { GlobalSettings } from './GlobalSettings';
import { TurmasDashboard } from './TurmasDashboard';
import { FolderManager } from './FolderManager';

interface DashboardProps {
    userRole: UserRole;
    checkouts: AppConfig[];
    leads: Lead[];
    coupons: Coupon[];
    onLogout: () => void;
    onViewSite: () => void;
    isLoading: boolean;
    totalRevenue: number;
    totalLeadsCount: number;
    dbStatus: 'online' | 'offline' | 'error';
    onRetryDb: () => void;
    // Actions
    onDeleteCheckout: (id: string) => Promise<void>;
    onSaveConfig: (config: AppConfig, asNew: boolean) => Promise<void>;
    uploadService: (file: File) => Promise<string | null>;
    isUploading: string | null;
    onUpdateLeadStatus: (id: string, status: Lead['status']) => void;
    onUpdateLeadPaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    onSaveManualLead: (lead: Lead) => Promise<void>;
    onPrintLeads: () => void;
    // Reprints
    onReprintTicket: (lead: Lead) => void;
    savingId: string | null;
    // Coupons
    onSaveCoupon: (coupon: Coupon) => Promise<void>;
    onDeleteCoupon: (id: string) => Promise<void>;
    onToggleCouponActive: (id: string, isActive: boolean) => Promise<void>;
    // Check-in
    // Check-in
    onCheckIn: (leadId: string, checkedIn: boolean) => Promise<void>;
    // Offline Mode
    isOnline: boolean;
    pendingSyncCount: number;
    onSync: () => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
    userRole,
    checkouts,
    leads,
    onLogout,
    onViewSite,
    isLoading,
    totalRevenue,
    totalLeadsCount,
    dbStatus,
    onRetryDb,
    onDeleteCheckout,
    onSaveConfig,
    uploadService,
    isUploading,
    onUpdateLeadStatus,
    onUpdateLeadPaidAmount,
    onDeleteLead,
    onSaveManualLead,
    onPrintLeads,
    onReprintTicket,
    savingId,
    coupons,
    onSaveCoupon,
    onDeleteCoupon,
    onToggleCouponActive,
    onCheckIn,
    isOnline,
    pendingSyncCount,
    onSync
}) => {
    const supabase = useSupabase();

    const handleMoveLeadTurma = async (leadId: string, newTurma: string) => {
        if (!newTurma) return;
        if (!supabase) {
            console.warn('Supabase client not available');
            return;
        }
        try {
            const { error } = await supabase.from('leads').update({ turma: newTurma }).eq('id', leadId);
            if (error) throw error;
            // Simple refresh: trigger a full reload to reflect changes
            window.location.reload();
        } catch (err) {
            console.error('Erro ao mover lead para nova turma:', err);
        }
    };

    const handleCreateFolder = async (folderName: string) => {
        // Folder is created by assigning it to a product, just show success
        alert(`Pasta "${folderName}" criada com sucesso! Agora você pode atribuir produtos a ela.`);
    };

    const handleRenameFolder = async (oldName: string, newName: string) => {
        setIsLoadingFolder(true);
        try {
            // Update all checkouts with the old folder name to the new folder name
            const checkoutsToUpdate = checkouts.filter(c => c.folder === oldName);
            for (const checkout of checkoutsToUpdate) {
                await onSaveConfig({ ...checkout, folder: newName }, false);
            }
            alert(`Pasta renomeada de "${oldName}" para "${newName}" com sucesso!`);
        } catch (err) {
            console.error('Erro ao renomear pasta:', err);
            alert('Erro ao renomear pasta. Tente novamente.');
        } finally {
            setIsLoadingFolder(false);
        }
    };

    const handleDeleteFolder = async (folderName: string) => {
        setIsLoadingFolder(true);
        try {
            // This shouldn't happen if validation works, but just in case
            const checkoutsInFolder = checkouts.filter(c => c.folder === folderName);
            if (checkoutsInFolder.length > 0) {
                throw new Error('Pasta não está vazia');
            }
            alert(`Pasta "${folderName}" deletada com sucesso!`);
        } catch (err) {
            console.error('Erro ao deletar pasta:', err);
            alert('Erro ao deletar pasta. Tente novamente.');
        } finally {
            setIsLoadingFolder(false);
        }
    };
    const [setupTab, setSetupTab] = useState<'list' | 'product' | 'integrations' | 'leads' | 'tickets' | 'ticket_logs' | 'certificates' | 'scanner' | 'coupons' | 'overview' | 'checkin' | 'materials' | 'solicitacoes' | 'financeiro' | 'signatures' | 'views' | 'remarketing' | 'global_settings' | 'turmas' | 'folders'>(
        userRole === 'manager' ? 'scanner' : 'overview'
    );
    
    // Load saved signature from localStorage
    const [selectedSignature, setSelectedSignature] = useState<string>(() => {
        return localStorage.getItem('vox_selected_signature') || '';
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedVariationId, setExpandedVariationId] = useState<string | null>(null);

    const createInitialConfig = (): AppConfig => ({
        id: crypto.randomUUID(),
        mercadoPagoLink: '',
        productName: '',
        productPrice: '',
        productImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
        bannerImage: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&auto=format&fit=crop&q=60',
        productDescription: '',
        benefits: ['Acesso imediato', 'Suporte VIP WhatsApp', 'Material Complementar'],
        turma: '',
        eventDate: '',
        eventStartTime: '',
        eventEndTime: '',
        eventLocation: '',
        ga4Id: '',
        metaPixelId: '',
        isActive: true,
        slug: ''
    });

    const [currentConfig, setCurrentConfig] = useState<AppConfig>(createInitialConfig);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingFolder, setIsLoadingFolder] = useState(false);

    const handleSaveConfigWrapper = async (asNew = false) => {
        setIsSubmitting(true);
        await onSaveConfig(currentConfig, asNew);
        setIsSubmitting(false);
        setSetupTab('list');
    };

    const allNavItems = [
        // Vendas & Gestão
        { id: 'overview', label: 'Visão Geral', icon: BarChart3, roles: ['master'], category: 'vendas' },
        { id: 'leads', label: 'Relatório Vendas', icon: ClipboardList, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'turmas', label: 'Turmas', icon: Calendar, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'checkin', label: 'Check-in', icon: UserCheck, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'ticket_logs', label: 'Ingressos', icon: ListFilter, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'views', label: 'Visualizações', icon: Eye, roles: ['master'], category: 'vendas' },
        { id: 'remarketing', label: 'Remarketing', icon: MessageCircle, roles: ['master'], category: 'vendas' },
        
        // Produtos
        { id: 'list', label: 'Checkouts', icon: ListChecks, roles: ['master', 'manager'], category: 'produtos' },
        { id: 'product', label: 'Novo Checkout', icon: Plus, roles: ['master'], category: 'produtos' },
        { id: 'folders', label: 'Pastas', icon: Folder, roles: ['master'], category: 'produtos' },
        { id: 'materials', label: 'Materiais', icon: FileText, roles: ['master'], category: 'produtos' },
        { id: 'coupons', label: 'Cupons', icon: Tag, roles: ['master'], category: 'produtos' },
        
        // Operações
        { id: 'tickets', label: 'Gerar Ingresso', icon: Ticket, roles: ['master'], category: 'operacoes' },
        { id: 'scanner', label: 'Escanear', icon: QrCode, roles: ['master', 'manager'], category: 'operacoes' },
        { id: 'certificates', label: 'Certificados', icon: Award, roles: ['master'], category: 'operacoes' },
        { id: 'solicitacoes', label: 'Solicitações', icon: FileCheck, roles: ['master'], category: 'operacoes' },
        
        // Administrativo
        { id: 'financeiro', label: 'Financeiro', icon: Wallet, roles: ['master'], category: 'adm' },
        { id: 'signatures', label: 'Assinaturas', icon: Signature, roles: ['master'], category: 'adm' },
        { id: 'global_settings', label: 'Rastreamento', icon: Settings, roles: ['master'], category: 'adm' },
        { id: 'integrations', label: 'Sistema', icon: Terminal, roles: ['master'], category: 'adm' }
    ];

    const navItems = userRole === 'manager' ? allNavItems.filter(item => item.id === 'checkin') : allNavItems.filter(item => item.roles.includes(userRole));

    const handleTabChange = (id: string) => {
        if (id === 'product') {
            setCurrentConfig(createInitialConfig());
            setSetupTab('product');
        } else {
            setSetupTab(id as any);
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row font-sans text-gray-900">

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-72 bg-gray-900 text-white h-screen sticky top-0 border-r border-gray-800">
                <div className="p-8 pb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Layout size={20} /></div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight leading-none">Vox Control</h1>
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mt-1 block">
                            {userRole === 'master' ? 'Master Admin' : 'Gerente / Prof'}
                        </span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 overflow-y-auto">
                    {(['vendas', 'produtos', 'operacoes', 'adm'] as const).map(category => {
                        const categoryItems = navItems.filter(item => item.category === category);
                        if (categoryItems.length === 0) return null;
                        
                        const categoryLabels: Record<string, string> = {
                            vendas: 'Vendas & Gestão',
                            produtos: 'Produtos',
                            operacoes: 'Operações',
                            adm: 'Administrativo'
                        };
                        
                        return (
                            <div key={category} className="mb-6">
                                <div className="px-4 mb-2">
                                    <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">
                                        {categoryLabels[category]}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {categoryItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabChange(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all duration-200 ${setupTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <item.icon size={16} /> {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-gray-800">
                    <button onClick={onViewSite} className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-4 border border-white/5">VISUALIZAR SITE</button>
                    <button onClick={onLogout} className="w-full text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white flex items-center justify-center gap-2 transition-all"><LogOut size={16} /> Encerrar Sessão</button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-gray-900 text-white p-6 flex justify-between items-center sticky top-0 z-50 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Layout size={16} /></div>
                    <h1 className="text-md font-black tracking-tight">Vox Control</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 rounded-xl">
                    <ListFilter size={24} />
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <nav className="absolute top-0 right-0 w-4/5 h-[100dvh] overflow-y-auto bg-gray-900 p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pb-20">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/40 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                        </div>
                        <div className="flex-1 space-y-6 overflow-y-auto">
                            {(['vendas', 'produtos', 'operacoes', 'adm'] as const).map(category => {
                                const categoryItems = navItems.filter(item => item.category === category);
                                if (categoryItems.length === 0) return null;
                                
                                const categoryLabels: Record<string, string> = {
                                    vendas: 'Vendas & Gestão',
                                    produtos: 'Produtos',
                                    operacoes: 'Operações',
                                    adm: 'Administrativo'
                                };
                                
                                return (
                                    <div key={category}>
                                        <div className="px-2 mb-2">
                                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">
                                                {categoryLabels[category]}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            {categoryItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleTabChange(item.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all ${setupTab === item.id ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                                >
                                                    <item.icon size={18} /> {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-6 border-t border-gray-800 space-y-3">
                            <button onClick={onViewSite} className="w-full bg-white/5 text-white py-4 rounded-xl font-black text-xs uppercase transition-all">VISUALIZAR SITE</button>
                            <button onClick={onLogout} className="w-full text-red-400/60 font-black text-xs uppercase flex items-center justify-center gap-2 py-3"><LogOut size={16} /> Sair</button>
                        </div>
                    </nav>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden p-4 md:p-12">
                <div className="max-w-7xl mx-auto">

                    {setupTab === 'list' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Meus Produtos</h2>
                                    <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Gerencie seus checkouts ativos</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <button onClick={() => setSetupTab('folders')} className="bg-purple-100 hover:bg-purple-600 text-purple-600 hover:text-white px-6 py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2"><Folder size={18} /> Gerenciar Pastas</button>
                                    <button onClick={() => (setCurrentConfig(createInitialConfig()), setSetupTab('product'))} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2"><Plus size={18} /> Novo Checkout</button>
                                </div>
                            </div>

                            {checkouts.length === 0 ? (
                                <div className="bg-white rounded-[3rem] border border-gray-100 p-20 text-center flex flex-col items-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300"><ListChecks size={48} /></div>
                                    <h3 className="text-xl font-black text-gray-900">Nenhum checkout criado ainda</h3>
                                    <p className="text-gray-400 max-w-sm mt-2 font-bold">Comece criando seu primeiro produto para começar as vendas.</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Group checkouts by folder */}
                                    {Object.entries(
                                        checkouts.reduce((acc, c) => {
                                            const folder = c.folder || 'Sem Pasta';
                                            if (!acc[folder]) acc[folder] = [];
                                            acc[folder].push(c);
                                            return acc;
                                        }, {} as Record<string, typeof checkouts>)
                                    ).map(([folder, folderCheckouts]) => (
                                        <div key={folder} className="mb-12">
                                            <div className="mb-6">
                                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                                    {folder}
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full ml-2">{folderCheckouts.length}</span>
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {folderCheckouts.map(c => {
                                        const isDeleting = savingId === c.id;
                                        return (
                                            <div key={c.id} className={`p-6 md:p-8 rounded-[3rem] bg-white border-2 transition-all group hover:shadow-2xl hover:shadow-blue-900/5 ${c.isActive ? 'border-transparent shadow-xl' : 'border-gray-100 opacity-60'}`}>
                                                <div className="aspect-[4/3] rounded-[2rem] bg-gray-50 mb-7 overflow-hidden relative border border-gray-100">
                                                    <img
                                                        src={c.productImage}
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800'; }}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        alt=""
                                                    />
                                                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                                        {c.isActive && <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">Ativo</div>}
                                                        {c.folder && <div className="bg-purple-600/90 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2"><Layers size={12} /> {c.folder}</div>}
                                                        {c.turma && <div className="bg-gray-900/80 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2"><GraduationCap size={12} /> {c.turma}</div>}
                                                    </div>
                                                </div>

                                                <div className="mb-8">
                                                    <h3 className="text-xl font-black truncate text-gray-900 leading-tight">{c.productName}</h3>
                                                    {userRole === 'master' && (
                                                        <p className="text-blue-600 font-black text-sm mt-1">R$ {c.productPrice || '0,00'}</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-3">
                                                    {userRole === 'master' && (
                                                        <button onClick={() => { setCurrentConfig({ ...c, benefits: c.benefits || [] }); setSetupTab('product'); }} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg">
                                                            Configurar Produto
                                                        </button>
                                                    )}

                                                    <div className={`grid ${userRole === 'master' ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                                                        <button onClick={() => {
                                                            const url = new URL(window.location.origin + window.location.pathname);
                                                            if (c.slug) url.searchParams.set('p', c.slug); else url.searchParams.set('checkout', c.id);
                                                            window.open(url.toString(), '_blank');
                                                        }} className={`p-4 ${userRole === 'master' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white col-span-1'} rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-md`} title="Visualizar Checkout">
                                                            <Eye size={20} />
                                                        </button>

                                                        <button onClick={() => {
                                                            const url = new URL(window.location.origin + window.location.pathname);
                                                            if (c.slug) url.searchParams.set('p', c.slug); else url.searchParams.set('checkout', c.id);
                                                            navigator.clipboard.writeText(url.toString());
                                                            alert('Link Checkout Copiado!');
                                                        }} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center" title="Copiar Link Checkout">
                                                            <LinkIcon size={20} />
                                                        </button>

                                                        <button onClick={() => {
                                                            const url = new URL(window.location.origin + window.location.pathname);
                                                            if (c.slug) url.searchParams.set('p', c.slug); else url.searchParams.set('checkout', c.id);
                                                            url.searchParams.set('mode', 'reg');
                                                            navigator.clipboard.writeText(url.toString());
                                                            alert('Link de Registro Copiado!');
                                                        }} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center" title="Copiar Link Registro">
                                                            <CopyPlus size={20} />
                                                        </button>

                                                        {userRole === 'master' && (
                                                            <button
                                                                onClick={() => { if (confirm('Excluir este checkout permanentemente?')) onDeleteCheckout(c.id); }}
                                                                disabled={isDeleting}
                                                                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                                                                title="Excluir"
                                                            >
                                                                {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Variations Toggle Button */}
                                                    {c.variations && c.variations.length > 0 && (
                                                        <div className="mt-3">
                                                            <button
                                                                onClick={() => setExpandedVariationId(expandedVariationId === c.id ? null : c.id)}
                                                                className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${expandedVariationId === c.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                                            >
                                                                <Layers size={14} />
                                                                {expandedVariationId === c.id ? 'Ocultar Variações' : `Ver Variações (${c.variations.length})`}
                                                            </button>

                                                            {expandedVariationId === c.id && (
                                                                <div className="mt-3 space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                                                    {c.variations.map(v => (
                                                                        <div key={v.id} className="bg-white p-3 rounded-xl flex items-center justify-between shadow-sm">
                                                                            <div>
                                                                                <p className="font-bold text-xs text-gray-900">{v.name}</p>
                                                                                <p className="text-[10px] text-gray-500 font-medium">R$ {v.price}</p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const url = new URL(window.location.origin + window.location.pathname);
                                                                                    url.searchParams.set('p', v.slug);
                                                                                    navigator.clipboard.writeText(url.toString());
                                                                                    alert(`Link da variação "${v.name}" copiado!`);
                                                                                }}
                                                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors"
                                                                                title="Copiar Link"
                                                                            >
                                                                                <LinkIcon size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {setupTab === 'product' && (
                        <ProductConfig
                            config={currentConfig}
                            setConfig={setCurrentConfig}
                            isUploading={isUploading}
                            uploadService={uploadService}
                            onSave={handleSaveConfigWrapper}
                            isSubmitting={isSubmitting}
                            onCancel={() => setSetupTab('list')}
                            allCheckouts={checkouts}
                            leads={leads}
                        />
                    )}

                    {setupTab === 'leads' && (
                        <div className="animate-in fade-in duration-500">
                            <LeadsReport
                                userRole={userRole}
                                leads={leads}
                                allCheckouts={checkouts}
                                totalRevenue={totalRevenue}
                                totalLeadsCount={totalLeadsCount}
                                savingId={savingId}
                                onUpdateStatus={onUpdateLeadStatus}
                                onUpdatePaidAmount={onUpdateLeadPaidAmount}
                                onDeleteLead={onDeleteLead}
                                onSaveManualLead={onSaveManualLead}
                                onPrintLeads={onPrintLeads}
                                isOnline={isOnline}
                                pendingSyncCount={pendingSyncCount}
                                onSync={onSync}
                                onMoveLeadTurma={handleMoveLeadTurma}
                                onCheckIn={onCheckIn}
                            />
                        </div>
                    )}

                    {setupTab === 'scanner' && (
                        <div className="animate-in fade-in duration-500">
                            <TicketScanner
                                leads={leads}
                                allCheckouts={checkouts}
                                onUpdateStatus={onUpdateLeadStatus}
                            />
                        </div>
                    )}

                    {setupTab === 'turmas' && (
                        <div className="animate-in fade-in duration-500">
                            <TurmasDashboard
                                checkouts={checkouts}
                                leads={leads}
                                userRole={userRole}
                                onUpdateLeadStatus={onUpdateLeadStatus}
                                onUpdatePaidAmount={onUpdateLeadPaidAmount}
                                onDeleteLead={onDeleteLead}
                                onCheckIn={onCheckIn}
                                onToggleCheckoutActive={(checkoutId, isActive) => {
                                    const checkout = checkouts.find(c => c.id === checkoutId);
                                    if (checkout) {
                                        onSaveConfig({ ...checkout, isActive }, false);
                                    }
                                }}
                                savingId={savingId}
                            />
                        </div>
                    )}

                    {setupTab === 'folders' && (
                        <div className="animate-in fade-in duration-500">
                            <FolderManager
                                checkouts={checkouts}
                                onCreateFolder={handleCreateFolder}
                                onRenameFolder={handleRenameFolder}
                                onDeleteFolder={handleDeleteFolder}
                                isLoading={isLoadingFolder}
                            />
                        </div>
                    )}

                    {setupTab === 'tickets' && (
                        <div className="animate-in fade-in duration-500">
                            <TicketGenerator allCheckouts={checkouts} />
                        </div>
                    )}

                    {setupTab === 'ticket_logs' && (
                        <div className="animate-in fade-in duration-500">
                            <TicketLogs
                                leads={leads}
                                allCheckouts={checkouts}
                                savingId={savingId}
                                onDeleteLead={onDeleteLead}
                                onReprintTicket={onReprintTicket}
                            />
                        </div>
                    )}

                    {setupTab === 'coupons' && (
                        <div className="animate-in fade-in duration-500">
                            <CouponManager
                                coupons={coupons}
                                allCheckouts={checkouts}
                                onSave={onSaveCoupon}
                                onDelete={onDeleteCoupon}
                                onToggleActive={onToggleCouponActive}
                            />
                        </div>
                    )}

                    {setupTab === 'certificates' && (
                        <div className="animate-in fade-in duration-500">
                            <CertificateGenerator
                                allCheckouts={checkouts}
                                leads={leads}
                                uploadService={uploadService}
                                isUploading={isUploading}
                                defaultSignature={selectedSignature}
                            />
                        </div>
                    )}

                    {setupTab === 'global_settings' && (
                        <div className="animate-in fade-in duration-500">
                            <GlobalSettings />
                        </div>
                    )}

                    {setupTab === 'integrations' && (
                        <div className="animate-in fade-in duration-500">
                            <IntegrationsStatus dbStatus={dbStatus} onRetry={onRetryDb} />
                        </div>
                    )}

                    {setupTab === 'materials' && (
                        <div className="animate-in fade-in duration-500">
                            <SupportMaterials checkouts={checkouts} />
                        </div>
                    )}

                    {setupTab === 'overview' && (
                        <div className="animate-in fade-in duration-500">
                            <OverviewDashboard leads={leads} checkouts={checkouts} />
                        </div>
                    )}

                    {setupTab === 'checkin' && (
                        <div className="animate-in fade-in duration-500">
                            <CheckInDashboard
                                leads={leads}
                                checkouts={checkouts}
                                onCheckIn={onCheckIn}
                            />
                        </div>
                    )}

                    {setupTab === 'solicitacoes' && (
                        <div className="animate-in fade-in duration-500">
                            <SolicitacoesDashboard checkouts={checkouts} />
                        </div>
                    )}

                    {setupTab === 'financeiro' && (
                        <div className="animate-in fade-in duration-500">
                            <FinancialDashboard leads={leads} checkouts={checkouts} />
                            <div className="mt-8">
                                <ExpenseManager leads={leads} />
                            </div>
                        </div>
                    )}

                    {setupTab === 'signatures' && (
                        <div className="animate-in fade-in duration-500">
                            <SignatureManager 
                                uploadService={uploadService}
                                isUploading={isUploading}
                                selectedSignature={selectedSignature}
                                onSelectSignature={(url) => {
                                    setSelectedSignature(url);
                                    localStorage.setItem('vox_selected_signature', url);
                                }}
                            />
                        </div>
                    )}

                    {setupTab === 'views' && (
                        <div className="animate-in fade-in duration-500">
                            <CheckoutViews checkouts={checkouts} />
                        </div>
                    )}

                    {setupTab === 'remarketing' && (
                        <div className="animate-in fade-in duration-500">
                            <RemarketingDashboard checkouts={checkouts} />
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};
