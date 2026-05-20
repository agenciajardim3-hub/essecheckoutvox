import React from 'react';
import { useCertificateSelection } from '../../hooks/useCertificateSelection';
import { Loader2 } from 'lucide-react';
import { useGenerateCertificates } from '../../hooks/useGenerateCertificates';

export const BulkCertificatePanel = () => {
  const { selectedLeads, clearSelection } = useCertificateSelection();
  const { generateCertificates, loading, progress, error } = useGenerateCertificates();

  const handleGenerate = async () => {
    if (selectedLeads.length === 0) return;
    await generateCertificates(selectedLeads.map(l => l.id));
    clearSelection();
  };

  return (
    <div className="mt-4 p-4 bg-white bg-opacity-30 backdrop-blur-sm rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">Gerar Certificados em Massa</h3>
      <p className="mb-2">Leads selecionados: {selectedLeads.length}</p>
      {selectedLeads.length > 0 && (
        <ul className="max-h-40 overflow-y-auto mb-3 list-disc list-inside text-sm">
          {selectedLeads.map(lead => (
            <li key={lead.id}>{lead.name} {lead.email && `(${lead.email})`}</li>
          ))}
        </ul>
      )}
      {loading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded h-2">
            <div className="bg-indigo-600 h-2 rounded" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-1">Gerando certificados... {progress}%</p>
        </div>
      )}
      {error && <p className="text-red-600 text-sm">Erro: {error}</p>}
      <button
        onClick={handleGenerate}
        disabled={selectedLeads.length === 0 || loading}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : 'Gerar Certificados'}
      </button>
    </div>
  );
};
