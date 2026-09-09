import React, { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { useGenerateCertificates } from '../../hooks/useGenerateCertificates';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { DEFAULT_SUPABASE_KEY } from '../../hooks/useSupabase';

interface BulkCertificatePanelProps {
  selectedLeads: string[];
}

const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';

const getSupabaseKey = () =>
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  DEFAULT_SUPABASE_KEY;

const getTemplateSubject = (templateName?: string) => {
  if (!templateName) return 'Contato - Vox Marketing Academy';
  const name = templateName.toLowerCase();
  if (name.includes('boas')) return 'Bem-vindo(a) à Vox Marketing Academy';
  if (name.includes('pagamento')) return 'Pagamento confirmado - Vox Marketing Academy';
  if (name.includes('grupo')) return 'Entre no grupo oficial da turma';
  if (name.includes('hora')) return 'Está chegando a hora do nosso encontro';
  if (name.includes('oferta')) return 'Oferta exclusiva para você';
  if (name.includes('aviso')) return 'Aviso importante - Vox Marketing Academy';
  return templateName;
};

const getSelectedRowsFromTable = () => {
  const rows = Array.from(document.querySelectorAll('tbody tr'));

  return rows
    .filter((row) => {
      const checkbox = row.querySelector('td:first-child input[type="checkbox"]') as HTMLInputElement | null;
      return Boolean(checkbox?.checked);
    })
    .map((row) => {
      const name = row.querySelector('td:nth-child(3) .font-bold')?.textContent?.trim() || 'Aluno';
      const email = row.querySelector('td:nth-child(4) span.truncate')?.textContent?.trim() || '';
      const productName = row.querySelector('td:nth-child(7) span')?.textContent?.trim() || 'Vox Marketing Academy';
      return { name, email, productName };
    })
    .filter((lead) => Boolean(lead.email));
};

export const BulkCertificatePanel = ({ selectedLeads }: BulkCertificatePanelProps) => {
  const { generateCertificates, loading, progress, error } = useGenerateCertificates();
  const { templates } = useEmailTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const handleGenerate = async () => {
    if (selectedLeads.length === 0) return;
    await generateCertificates(selectedLeads);
  };

  const handleSendEmails = async () => {
    const selectedRows = getSelectedRowsFromTable();

    if (selectedLeads.length === 0) return;
    if (selectedRows.length === 0) {
      alert('Nenhum selecionado com e-mail encontrado na tabela.');
      return;
    }

    const template = templates.find((item) => item.id === selectedTemplateId);
    const templateName = template?.name || 'Padrão';

    if (!confirm(`Enviar o modelo "${templateName}" para ${selectedRows.length} aluno(s) selecionado(s)?`)) return;

    const supabaseKey = getSupabaseKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabaseKey) {
      headers.Authorization = `Bearer ${supabaseKey}`;
      headers.apikey = supabaseKey;
    }

    setEmailLoading(true);
    setEmailStatus(`Enviando 0/${selectedRows.length}...`);

    let success = 0;
    let failed = 0;

    for (const lead of selectedRows) {
      try {
        const message = template
          ? template.html.replace(/{name}/g, lead.name || 'Aluno')
          : `<p>Olá <strong>${lead.name || 'Aluno'}</strong>,</p><p>Entramos em contato sobre sua inscrição na Vox Marketing Academy.</p><p>Atenciosamente,<br/>Equipe Vox Marketing Academy</p>`;

        const response = await fetch(SEND_EMAIL_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: lead.email,
            name: lead.name || 'Aluno',
            subject: getTemplateSubject(template?.name),
            message,
            ticketUrl: '',
            productName: lead.productName || 'Vox Marketing Academy',
            preserveCertificateLayout: true,
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.error) throw new Error(result.error || result.message || 'Erro ao enviar e-mail');
        success += 1;
      } catch (err) {
        console.error('Erro ao enviar e-mail em massa:', lead.email, err);
        failed += 1;
      }

      setEmailStatus(`Enviando ${success + failed}/${selectedRows.length}...`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setEmailStatus(`✅ ${success} e-mail(s) enviado(s)${failed ? `, ${failed} falharam` : ''}.`);
    setEmailLoading(false);
  };

  if (selectedLeads.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-indigo-900">Ações em Massa</h3>
          <p className="text-xs text-indigo-600 mt-0.5">
            {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selecionado{selectedLeads.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs uppercase hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Gerar Certificados'}
          </button>

          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 font-bold text-xs min-w-[220px]"
          >
            <option value="">Modelo padrão</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>

          <button
            onClick={handleSendEmails}
            disabled={emailLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs uppercase hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {emailLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Enviar E-mails
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-3">
          <div className="w-full bg-indigo-100 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-indigo-600 mt-1">Gerando certificados... {progress}%</p>
        </div>
      )}

      {emailStatus && <p className="text-blue-700 text-xs mt-2 font-bold flex items-center gap-1"><Send size={12} /> {emailStatus}</p>}
      {error && <p className="text-red-600 text-xs mt-2 font-bold">Erro: {error}</p>}
    </div>
  );
};
