import React, { useState } from 'react';
import { Smartphone, Send, Mail, FileText } from 'lucide-react';
import { AppConfig, Lead, UserRole } from '../../types';
import { AutomationDashboard } from './AutomationDashboard';
import { EmailMarketingDashboard } from './EmailMarketingDashboard';
import { CustomEmailSender } from './CustomEmailSender';
import { EmailTemplatesDashboard } from './EmailTemplatesDashboard';

interface MessagingHubProps {
    userRole: UserRole;
    leads: Lead[];
    checkouts: AppConfig[];
    initialSubTab?: 'whatsapp' | 'email_marketing' | 'custom_email' | 'templates';
}

export const MessagingHub: React.FC<MessagingHubProps> = ({
    userRole,
    leads,
    checkouts,
    initialSubTab = 'whatsapp'
}) => {
    const [subTab, setSubTab] = useState<'whatsapp' | 'email_marketing' | 'custom_email' | 'templates'>(initialSubTab);

    const tabs = [
        { id: 'whatsapp', label: 'WhatsApp & Agentes', icon: Smartphone, color: 'emerald' },
        { id: 'email_marketing', label: 'Campanhas de Email', icon: Send, color: 'blue' },
        { id: 'custom_email', label: 'Disparo Direto', icon: Mail, color: 'purple' },
        { id: 'templates', label: 'Modelos de Email', icon: FileText, color: 'indigo' },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header com Navegação Integrada estilo Pill Tabs */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                            <Send size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Central de Comunicação & Mensageria</h2>
                            <p className="text-xs text-gray-500 font-medium">Automações WhatsApp, disparos de e-mail marketing e modelos inteligentes</p>
                        </div>
                    </div>
                </div>

                {/* Sub-abas pill */}
                <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 p-1.5 rounded-2xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = subTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSubTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                    isActive
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                            >
                                <Icon size={15} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Conteúdo da Sub-Aba selecionada */}
            <div className="transition-opacity duration-200">
                {subTab === 'whatsapp' && (
                    <AutomationDashboard userRole={userRole} />
                )}

                {subTab === 'email_marketing' && (
                    <EmailMarketingDashboard leads={leads} checkouts={checkouts} />
                )}

                {subTab === 'custom_email' && (
                    <CustomEmailSender userRole={userRole} />
                )}

                {subTab === 'templates' && (
                    <EmailTemplatesDashboard />
                )}
            </div>
        </div>
    );
};
