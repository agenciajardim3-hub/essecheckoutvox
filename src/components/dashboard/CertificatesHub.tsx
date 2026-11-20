import React, { useState } from 'react';
import { Award, Mail, FileCheck } from 'lucide-react';
import { AppConfig, Lead } from '../../types';
import { CertificateGenerator } from './CertificateGenerator';
import { CertificateSender } from './CertificateSender';
import { SolicitacoesDashboard } from './SolicitacoesDashboard';

interface CertificatesHubProps {
    leads: Lead[];
    checkouts: AppConfig[];
    uploadService: (file: File) => Promise<string | null>;
    isUploading: string | null;
    selectedSignature: string;
    initialSubTab?: 'sender' | 'generator' | 'solicitacoes';
}

export const CertificatesHub: React.FC<CertificatesHubProps> = ({
    leads,
    checkouts,
    uploadService,
    isUploading,
    selectedSignature,
    initialSubTab = 'sender'
}) => {
    const [subTab, setSubTab] = useState<'sender' | 'generator' | 'solicitacoes'>(initialSubTab);

    const tabs = [
        { id: 'sender', label: 'Envio em Lote', icon: Mail },
        { id: 'generator', label: 'Gerador Individual & Template', icon: Award },
        { id: 'solicitacoes', label: 'Pedidos dos Alunos', icon: FileCheck },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header com Navegação Integrada estilo Pill Tabs */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                            <Award size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Hub de Certificados</h2>
                            <p className="text-xs text-gray-500 font-medium">Emissão personalizada, disparo automatizado e gestão de solicitações</p>
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
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
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
                {subTab === 'sender' && (
                    <CertificateSender
                        leads={leads}
                        checkouts={checkouts}
                    />
                )}

                {subTab === 'generator' && (
                    <CertificateGenerator
                        allCheckouts={checkouts}
                        leads={leads}
                        uploadService={uploadService}
                        isUploading={isUploading}
                        defaultSignature={selectedSignature}
                    />
                )}

                {subTab === 'solicitacoes' && (
                    <SolicitacoesDashboard
                        checkouts={checkouts}
                    />
                )}
            </div>
        </div>
    );
};
