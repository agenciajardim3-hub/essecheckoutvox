import React, { useState } from 'react';
import { Award, Layers } from 'lucide-react';
import { AppConfig, Lead } from '../../types';
import { CertificateGenerator } from './CertificateGenerator';
import { CertificateSender } from './CertificateSender';

interface CertificateHubProps {
  allCheckouts: AppConfig[];
  leads: Lead[];
  uploadService: (file: File) => Promise<string | null>;
  isUploading: string | null;
  defaultSignature?: string;
}

type CertificateTab = 'individual' | 'mass';

export const CertificateHub: React.FC<CertificateHubProps> = ({
  allCheckouts,
  leads,
  uploadService,
  isUploading,
  defaultSignature = '',
}) => {
  const [activeTab, setActiveTab] = useState<CertificateTab>('individual');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Certificados</h2>
          <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">
            Gere certificados individuais ou em massa usando o mesmo layout oficial
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm flex gap-2">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeTab === 'individual'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Award size={16} /> Individual
          </button>
          <button
            onClick={() => setActiveTab('mass')}
            className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeTab === 'mass'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-100'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Layers size={16} /> Em Massa
          </button>
        </div>
      </div>

      {activeTab === 'individual' ? (
        <CertificateGenerator
          allCheckouts={allCheckouts}
          leads={leads}
          uploadService={uploadService}
          isUploading={isUploading}
          defaultSignature={defaultSignature}
        />
      ) : (
        <CertificateSender leads={leads} checkouts={allCheckouts} />
      )}
    </div>
  );
};
