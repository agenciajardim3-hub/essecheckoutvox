import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './services/useSupabase';
import { AppConfig, Lead, UserRole, Coupon, Expense } from './shared';
import { LeadsReportV2 } from './vendas/LeadsReportV2';
import { LeadsReport } from './vendas/LeadsReport';
import { TurmasDashboard } from './turmas/TurmasDashboard';
import { FinancialDashboard } from './financeiro/FinancialDashboard';
import { ExpenseManager } from './financeiro/ExpenseManager';
import { Expense } from '../shared';
import { CouponManager } from './financeiro/CouponManager';
import { ProductConfig } from './config/ProductConfig';
import { GlobalSettings } from './config/GlobalSettings';
import { IntegrationsStatus } from './config/IntegrationsStatus';
import { CheckoutViews } from './config/CheckoutViews';
import { CheckInDashboard } from './checkin/CheckInDashboard';
import { TicketScanner } from './checkin/TicketScanner';
import { TicketGenerator } from './tickets/TicketGenerator';
import { TicketSender } from './tickets/TicketSender';
import { TicketLogs } from './tickets/TicketLogs';
import { CertificateGenerator } from './certificates/CertificateGenerator';
import { CertificateSender } from './certificates/CertificateSender';
import { SolicitacoesDashboard } from './certificates/SolicitacoesDashboard';
import { SignatureManager } from './certificates/SignatureManager';
import { RemarketingDashboard } from './marketing/RemarketingDashboard';
import { EmailMarketingDashboard } from './marketing/EmailMarketingDashboard';
import { SupportMaterials } from './marketing/SupportMaterials';
import { EmailSender } from './marketing/EmailSender';

import { 
  LayoutDashboard, Users, GraduationCap, DollarSign, 
  Ticket, Award, QrCode, Send, FileText, Settings,
  Zap, Mail, FolderOpen, Plus, ChevronDown
} from 'lucide-react';

interface DashboardProps {
  userRole: UserRole;
  checkouts: AppConfig[];
  leads: Lead[];
  coupons: Coupon[];
  expenses?: Expense[];
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  onUpdatePaidAmount: (id: string, amount: string) => void;
  onDeleteLead: (id: string) => void;
  onSaveCheckout: (config: AppConfig) => void;
  onDeleteCheckout: (id: string) => void;
  onCheckIn: (leadId: string, checkedIn: boolean) => Promise<void>;
  onUpdateLeadField: (id: string, fields: Record<string, any>) => Promise<void>;
  onSaveManualLead: (lead: Partial<Lead>) => Promise<void>;
  onApplyCoupon: (code: string) => Promise<Coupon | null>;
  savingId: string | null;
}

type DashboardSection = 
  | 'overview' | 'leads' | 'leads-legacy' | 'turmas'
  | 'financeiro' | 'expenses' | 'coupons'
  | 'checkin' | 'scanner'
  | 'tickets' | 'ticket-sender' | 'ticket-logs'
  | 'certificates' | 'certificate-sender' | 'solicitacoes' | 'signatures'
  | 'remarketing' | 'email-marketing' | 'email-sender' | 'support'
  | 'products' | 'settings' | 'integrations' | 'views';

const Dashboard: React.FC<DashboardProps> = ({
  userRole,
  checkouts,
  leads,
  coupons,
  expenses = [],
  onUpdateStatus,
  onUpdatePaidAmount,
  onDeleteLead,
  onSaveCheckout,
  onDeleteCheckout,
  onCheckIn,
  onUpdateLeadField,
  onSaveManualLead,
  onApplyCoupon,
  savingId
}) => {
  const [section, setSection] = useState<DashboardSection>('overview');
  const [activeProduct, setActiveProduct] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<AppConfig | null>(null);

  const products = useMemo(() => checkouts.map(c => ({ id: c.id, name: c.productName, turma: c.turma })), [checkouts]);
  const allLeads = leads;
  const allCheckouts = checkouts;

  const renderSection = () => {
    switch (section) {
      case 'overview':
        return (
          <OverviewDashboard
            leads={allLeads}
            checkouts={allCheckouts}
          />
        );
      case 'leads':
        return (
          <LeadsReportV2
            userRole={userRole}
            leads={allLeads}
            allCheckouts={allCheckouts}
            onUpdateStatus={onUpdateStatus}
            onUpdatePaidAmount={onUpdatePaidAmount}
            onDeleteLead={onDeleteLead}
            onCheckIn={onCheckIn}
            onUpdateLeadField={onUpdateLeadField}
            onSaveManualLead={onSaveManualLead}
            savingId={savingId}
          />
        );
      case 'leads-legacy':
        return (
          <LeadsReport
            leads={allLeads}
            checkouts={allCheckouts}
            userRole={userRole}
            onUpdateStatus={onUpdateStatus}
            onDeleteLead={onDeleteLead}
            onUpdateLeadField={onUpdateLeadField}
            savingId={savingId}
          />
        );
      case 'turmas':
        return (
          <TurmasDashboard
            checkouts={allCheckouts}
            leads={allLeads}
            onSave={onSaveCheckout}
            onDelete={onDeleteCheckout}
          />
        );
      case 'financeiro':
        return (
          <FinancialDashboard
            leads={allLeads}
            checkouts={allCheckouts}
            expenses={expenses}
          />
        );
      case 'expenses':
        return <ExpenseManager leads={allLeads} />;
      case 'coupons':
        return (
          <CouponManager
            checkouts={allCheckouts}
            onApplyCoupon={onApplyCoupon}
          />
        );
      case 'checkin':
        return (
          <CheckInDashboard
            leads={allLeads}
            checkouts={allCheckouts}
            onCheckIn={onCheckIn}
          />
        );
      case 'scanner':
        return <TicketScanner />;
      case 'tickets':
        return <TicketGenerator checkouts={allCheckouts} leads={allLeads} />;
      case 'ticket-sender':
        return <TicketSender leads={allLeads} checkouts={allCheckouts} />;
      case 'ticket-logs':
        return <TicketLogs leads={allLeads} onDeleteLead={onDeleteLead} />;
      case 'certificates':
        return (
          <CertificateGenerator
            leads={allLeads}
            checkouts={allCheckouts}
          />
        );
      case 'certificate-sender':
        return <CertificateSender leads={allLeads} checkouts={allCheckouts} />;
      case 'solicitacoes':
        return <SolicitacoesDashboard checkouts={allCheckouts} />;
      case 'signatures':
        return <SignatureManager />;
      case 'remarketing':
        return <RemarketingDashboard checkouts={allCheckouts} />;
      case 'email-marketing':
        return <EmailMarketingDashboard />;
      case 'email-sender':
        return <EmailSender />;
      case 'support':
        return <SupportMaterials />;
      case 'products':
        return (
          <ProductConfig
            checkouts={allCheckouts}
            leads={allLeads}
            onSave={onSaveCheckout}
            onDelete={onDeleteCheckout}
          />
        );
      case 'settings':
        return <GlobalSettings />;
      case 'integrations':
        return <IntegrationsStatus />;
      case 'views':
        return (
          <CheckoutViews
            checkouts={allCheckouts}
            onUpdate={onSaveCheckout}
          />
        );
      default:
        return (
          <OverviewDashboard
            leads={allLeads}
            checkouts={allCheckouts}
          />
        );
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'leads', label: 'Vendas', icon: Users },
    { id: 'turmas', label: 'Turmas', icon: GraduationCap },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'checkin', label: 'Check-in', icon: FileText },
    { id: 'tickets', label: 'Ingressos', icon: Ticket },
    { id: 'certificates', label: 'Certificados', icon: Award },
    { id: 'remarketing', label: 'Marketing', icon: Zap },
    { id: 'email-sender', label: 'Enviar Email', icon: Mail },
    { id: 'products', label: 'Produtos', icon: FolderOpen },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 overflow-y-auto">
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-black tracking-tight">Checkout<span className="text-blue-500">Vox</span></h1>
            <p className="text-xs text-gray-500 font-medium mt-1">Painel Administrativo</p>
          </div>
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id as DashboardSection)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    section === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 ml-64 p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;