import React from 'react';
import { Loader2 } from 'lucide-react';
import { useGenerateCertificates } from '../../hooks/useGenerateCertificates';

interface BulkCertificatePanelProps {
  selectedLeads: string[];
}

export const BulkCertificatePanel = ({ selectedLeads }: BulkCertificatePanelProps) => {
  const { generateCertificates, loading, progress, error } = useGenerateCertificates();

  const handleGenerate = async () => {
    if (selectedLeads.length === 0) return;
    await generateCertificates(selectedLeads);
  };

  if (selectedLeads.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-indigo-900">Gerar Certificados em Massa</h3>
          <p className="text-xs text-indigo-600 mt-0.5">{selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selecionado{selectedLeads.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs uppercase hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Gerar Certificados'}
        </button>
      </div>
      {loading && (
        <div className="mt-3">
          <div className="w-full bg-indigo-100 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-indigo-600 mt-1">Gerando certificados... {progress}%</p>
        </div>
      )}
      {error && <p className="text-red-600 text-xs mt-2 font-bold">Erro: {error}</p>}
    </div>
  );
};
