import React, { useState } from 'react';
import { Layout, ListChecks, Plus, Ticket, ListFilter, Award, Terminal, LogOut, QrCode, Tag, BarChart3, UserCheck, FileText, FileCheck, Wallet, Signature, Settings, Calendar, ClipboardList, Mail, Send, Smartphone, Eye } from 'lucide-react';
import { AppConfig, Lead, UserRole, Coupon } from '../../types';
import { ProductConfig } from './ProductConfig';
import { LeadsReportV2 } from './LeadsReportV2';
import { TicketGenerator } from './TicketGenerator';
import { TicketLogs } from './TicketLogs';
import { CertificateGenerator } from './CertificateGenerator';
import { CertificateSender } from './CertificateSender';
import { TicketSender } from './TicketSender';
import { CustomEmailSender } from './CustomEmailSender';
import { AutomationDashboard } from './AutomationDashboard';
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
import { EmailMarketingDashboard } from './EmailMarketingDashboard';
import { CheckoutsDashboard } from './CheckoutsDashboard';

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
    onDeleteCheckout: (id: string) => Promise<void>;
    onSaveConfig: (config: AppConfig, asNew: boolean) => Promise<void>;
    uploadService: (file: File) => Promise<string | null>;
    isUploading: string | null;
    onUpdateLeadStatus: (id: string, status: Lead['status']) => void;
    onUpdateLeadPaidAmount: (id: string, amount: string) => void;
    onDeleteLead: (id: string) => void;
    onSaveManualLead: (lead: Lead) => Promise<void>;
    onPrintLeads: () => void;
    onReprintTicket: (lead: Lead) => void;
    savingId: string | null;
    onSaveCoupon: (coupon: Coupon) => Promise<void>;
    onDeleteCoupon: (id: string) => Promise<void>;
    onToggleCouponActive: (id: string, isActive: boolean) => Promise<void>;
    onCheckIn: (leadId: string, checkedIn: boolean) => Promise<void>;
    isOnline: boolean;
    pendingSyncCount: number;
    onSync: () => Promise<void>;
}

type TabId = 'list' | 'product' | 'integrations' | 'leads' | 'tickets' | 'ticket_logs' | 'send_tickets' | 'certificates' | 'send_certificates' | 'custom_email' | 'automacao' | 'scanner' | 'coupons' | 'overview' | 'checkin' | 'materials' | 'solicitacoes' | 'financeiro' | 'signatures' | 'views' | 'remarketing' | 'global_settings' | 'turmas' | 'email_marketing';

export const Dashboard: React.FC<DashboardProps> = ({
    userRole,
    checkouts,
    leads,
    onLogout,
    onViewSite,
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
    const [setupTab, setSetupTab] = useState<TabId>(userRole === 'manager' ? 'checkin' : 'overview');
    const [selectedSignature, setSelectedSignature] = useState<string>(() => localStorage.getItem('vox_selected_signature') || '');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const handleSaveConfigWrapper = async (asNew = false) => {
        setIsSubmitting(true);
        await onSaveConfig(currentConfig, asNew);
        setIsSubmitting(false);
        setSetupTab('list');
    };

    const handleUpdateLeadField = async (leadId: string, fields: Record<string, any>) => {
        if (!supabase) return;
        try {
            const { error } = await supabase.from('leads').update(fields).eq('id', leadId);
            if (error) throw error;
        } catch (err) {
            console.error('Erro ao atualizar lead:', err);
        }
    };

    const handleCreateCheckout = () => {
        setCurrentConfig(createInitialConfig());
        setSetupTab('product');
    };

    const handleEditCheckout = (checkout: AppConfig) => {
        setCurrentConfig({ ...checkout, benefits: checkout.benefits || [] });
        setSetupTab('product');
    };

    const allNavItems = [
        { id: 'overview', label: 'Visão Geral', icon: BarChart3, roles: ['master'], category: 'vendas' },
        { id: 'turmas', label: 'Turmas', icon: Calendar, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'leads', label: 'Relatório Vendas', icon: ClipboardList, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'checkin', label: 'Check-in', icon: UserCheck, roles: ['master', 'manager'], category: 'vendas' },
        { id: 'views', label: 'Visualizações', icon: Eye, roles: ['master'], category: 'vendas' },
        { id: 'ticket_logs', label: 'Histórico de Ingressos', icon: ListFilter, roles: ['master', 'manager'], category: 'vendas' },

        { id: 'list', label: 'Checkouts', icon: ListChecks, roles: ['master', 'manager'], category: 'produtos' },
        { id: 'product', label: 'Novo Checkout', icon: Plus, roles: ['master'], category: 'produtos' },
        { id: 'coupons', label: 'Cupons', icon: Tag, roles: ['master'], category: 'produtos' },
        { id: 'materials', label: 'Materiais', icon: FileText, roles: ['master'], category: 'produtos' },

        { id: 'tickets', label: 'Gerar Ingresso', icon: Ticket, roles: ['master'], category: 'operacoes' },
        { id: 'send_tickets', label: 'Enviar Ingressos', icon: Send, roles: ['master'], category: 'operacoes' },
        { id: 'certificates', label: 'Gerar Certificado', icon: Award, roles: ['master'], category: 'operacoes' },
        { id: 'send_certificates', label: 'Enviar Certificados', icon: Mail, roles: ['master'], category: 'operacoes' },
        { id: 'custom_email', label: 'Email Personalizado', icon: Mail, roles: ['master'], category: 'operacoes' },
        { id: 'automacao', label: 'Automação WhatsApp', icon: Smartphone, roles: ['master'], category: 'operacoes' },
        { id: 'email_marketing', label: 'Email Marketing', icon: Send, roles: ['master'], category: 'operacoes' },
        { id: 'solicitacoes', label: 'Pedidos de Certificado', icon: FileCheck, roles: ['master'], category: 'operacoes' },
        { id: 'scanner', label: 'Escanear QR Code', icon: QrCode, roles: ['master', 'manager'], category: 'operacoes' },

        { id: 'financeiro', label: 'Financeiro', icon: Wallet, roles: ['master'], category: 'adm' },
        { id: 'signatures', label: 'Assinaturas', icon: Signature, roles: ['master'], category: 'adm' },
        { id: 'global_settings', label: 'Analytics & Pixel', icon: Settings, roles: ['master'], category: 'adm' },
        { id: 'integrations', label: 'Sistema', icon: Terminal, roles: ['master'], category: 'adm' }
    ] as const;

    const navItems = userRole === 'manager'
        ? allNavItems.filter(item => ['turmas', 'leads', 'checkin', 'scanner', 'ticket_logs', 'list'].includes(item.id))
        : allNavItems.filter(item => item.roles.includes(userRole));

    const handleTabChange = (id: string) => {
        if (id === 'product') handleCreateCheckout();
        else setSetupTab(id as TabId);
        setIsMobileMenuOpen(false);
    };

    const renderNavGroup = (category: 'vendas' | 'produtos' | 'operacoes' | 'adm') => {
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
                    <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">{categoryLabels[category]}</span>
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
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row font-sans text-gray-900">
            <aside className="hidden md:flex flex-col w-72 bg-gray-900 text-white h-screen sticky top-0 border-r border-gray-800">
                <div className="p-8 pb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Layout size={20} /></div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight leading-none">Vox Control</h1>
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest mt-1 block">{userRole === 'master' ? 'Master Admin' : 'Gerente / Prof'}</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 overflow-y-auto">
                    {(['vendas', 'produtos', 'operacoes', 'adm'] as const).map(renderNavGroup)}
                </nav>

                <div className="p-6 border-t border-gray-800">
                    <button onClick={onViewSite} className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all mb-4 border border-white/5">VISUALIZAR SITE</button>
                    <button onClick={onLogout} className="w-full text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-white flex items-center justify-center gap-2 transition-all"><LogOut size={16} /> Encerrar Sessão</button>
                </div>
            </aside>

            <header className="md:hidden bg-gray-900 text-white p-6 flex justify-between items-center sticky top-0 z-50 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Layout size={16} /></div>
                    <h1 className="text-md font-black tracking-tight">Vox Control</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 rounded-xl"><ListFilter size={24} /></button>
            </header>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <nav className="absolute top-0 right-0 w-4/5 h-[100dvh] overflow-y-auto bg-gray-900 p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pb-20">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/40 hover:text-white"><Plus size={24} className="rotate-45" /></button>
                        </div>
                        <div className="flex-1 space-y-6 overflow-y-auto">
                            {(['vendas', 'produtos', 'operacoes', 'adm'] as const).map(renderNavGroup)}
                        </div>
                        <div className="pt-6 border-t border-gray-800 space-y-3">
                            <button onClick={onViewSite} className="w-full bg-white/5 text-white py-4 rounded-xl font-black text-xs uppercase transition-all">VISUALIZAR SITE</button>
                            <button onClick={onLogout} className="w-full text-red-400/60 font-black text-xs uppercase flex items-center justify-center gap-2 py-3"><LogOut size={16} /> Sair</button>
                        </div>
                    </nav>
                </div>
            )}

            <main className="flex-1 overflow-x-hidden p-4 md:p-12">
                <div className="max-w-7xl mx-auto">
                    {setupTab === 'list' && (
                        <CheckoutsDashboard
                            checkouts={checkouts}
                            leads={leads}
                            userRole={userRole}
                            savingId={savingId}
                            onCreateCheckout={handleCreateCheckout}
                            onEditCheckout={handleEditCheckout}
                            onDeleteCheckout={onDeleteCheckout}
                        />
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
                        <LeadsReportV2
                            userRole={userRole}
                            leads={leads}
                            allCheckouts={checkouts}
                            savingId={savingId}
                            onUpdateStatus={onUpdateLeadStatus}
                            onUpdatePaidAmount={onUpdateLeadPaidAmount}
                            onDeleteLead={onDeleteLead}
                            onCheckIn={onCheckIn}
                            onSaveManualLead={onSaveManualLead}
                            onUpdateLeadField={handleUpdateLeadField}
                        />
                    )}

                    {setupTab === 'turmas' && (
                        <TurmasDashboard
                            checkouts={checkouts}
                            leads={leads}
                            userRole={userRole}
                            onUpdateLeadStatus={onUpdateLeadStatus}
                            onUpdatePaidAmount={onUpdateLeadPaidAmount}
                            onDeleteLead={onDeleteLead}
                            onCheckIn={onCheckIn}
                            onEditCheckout={handleEditCheckout}
                            onCreateCheckout={handleCreateCheckout}
                            onToggleCheckoutActive={(checkoutId, nextIsActive) => {
                                const checkout = checkouts.find(c => c.id === checkoutId);
                                if (checkout) onSaveConfig({ ...checkout, isActive: nextIsActive }, false);
                            }}
                            savingId={savingId}
                        />
                    )}

                    {setupTab === 'scanner' && <TicketScanner leads={leads} allCheckouts={checkouts} onUpdateStatus={onUpdateLeadStatus} />}
                    {setupTab === 'tickets' && <TicketGenerator allCheckouts={checkouts} />}
                    {setupTab === 'send_tickets' && <TicketSender leads={leads} checkouts={checkouts} uploadService={uploadService} isUploading={isUploading} />}
                    {setupTab === 'ticket_logs' && <TicketLogs leads={leads} allCheckouts={checkouts} savingId={savingId} onDeleteLead={onDeleteLead} onReprintTicket={onReprintTicket} />}
                    {setupTab === 'coupons' && <CouponManager coupons={coupons} allCheckouts={checkouts} onSave={onSaveCoupon} onDelete={onDeleteCoupon} onToggleActive={onToggleCouponActive} />}
                    {setupTab === 'certificates' && <CertificateGenerator allCheckouts={checkouts} leads={leads} uploadService={uploadService} isUploading={isUploading} defaultSignature={selectedSignature} />}
                    {setupTab === 'send_certificates' && <CertificateSender leads={leads} checkouts={checkouts} />}
                    {setupTab === 'custom_email' && <CustomEmailSender userRole={userRole} />}
                    {setupTab === 'automacao' && <AutomationDashboard userRole={userRole} />}
                    {setupTab === 'global_settings' && <GlobalSettings />}
                    {setupTab === 'integrations' && <IntegrationsStatus dbStatus={dbStatus} onRetry={onRetryDb} />}
                    {setupTab === 'materials' && <SupportMaterials checkouts={checkouts} />}
                    {setupTab === 'overview' && <OverviewDashboard leads={leads} checkouts={checkouts} />}
                    {setupTab === 'checkin' && <CheckInDashboard leads={leads} checkouts={checkouts} onCheckIn={onCheckIn} />}
                    {setupTab === 'solicitacoes' && <SolicitacoesDashboard checkouts={checkouts} />}
                    {setupTab === 'financeiro' && (
                        <div className="animate-in fade-in duration-500">
                            <FinancialDashboard leads={leads} checkouts={checkouts} />
                            <div className="mt-8"><ExpenseManager leads={leads} /></div>
                        </div>
                    )}
                    {setupTab === 'signatures' && (
                        <SignatureManager
                            uploadService={uploadService}
                            isUploading={isUploading}
                            selectedSignature={selectedSignature}
                            onSelectSignature={(url) => {
                                setSelectedSignature(url);
                                localStorage.setItem('vox_selected_signature', url);
                            }}
                        />
                    )}
                    {setupTab === 'views' && <CheckoutViews checkouts={checkouts} />}
                    {setupTab === 'remarketing' && <RemarketingDashboard checkouts={checkouts} />}
                    {setupTab === 'email_marketing' && <EmailMarketingDashboard leads={leads} checkouts={checkouts} />}
                </div>
            </main>
        </div>
    );
};
