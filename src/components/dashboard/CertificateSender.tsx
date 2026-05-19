import React, { useMemo, useState } from 'react';
import { Send, GraduationCap, Loader2, Check, AlertCircle, FileCheck, XCircle, Eye, ExternalLink, X } from 'lucide-react';
import { Lead, AppConfig } from '../../types';

interface CertificateSenderProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

type GeneratedCertificate = {
  id: string;
  leadId: string;
  name: string;
  email: string;
  cpf: string;
  productName: string;
  turma: string;
  date: string;
  hours: string;
  instructorName: string;
  signatureUrl: string;
  certificateUrl: string;
  certificateHtml: string;
  emailHtml: string;
  status: 'generated' | 'sent' | 'error';
  message: string;
};

const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

const isPaid = (lead: Lead) => lead.status === 'Pago' || lead.status === 'Aprovado';

const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getSavedSignature = () => {
  try {
    const saved = localStorage.getItem('vox_selected_signature') || '';
    return saved.startsWith('http') || saved.startsWith('data:') ? saved : '';
  } catch {
    return '';
  }
};

const getCertificateUrl = (lead: Lead, signatureUrl: string) => {
  const url = new URL(window.location.origin);
  url.searchParams.set('mode', 'certificate');
  url.searchParams.set('checkout', lead.product_id || '');
  url.searchParams.set('cpf', lead.cpf || '');
  url.searchParams.set('download', '1');
  if (signatureUrl) url.searchParams.set('sig', signatureUrl);
  return url.toString();
};

const getCertificateCardHtml = (certificate: Pick<GeneratedCertificate, 'name' | 'productName' | 'hours' | 'date' | 'instructorName' | 'signatureUrl'>) => `
  <div class="certificate-wrapper" style="width:1122px;height:794px;background:#ffffff;position:relative;overflow:hidden;box-sizing:border-box;box-shadow:0 22px 70px rgba(15,23,42,0.16);border-radius:8px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
    <div style="position:relative;z-index:10;padding:50px 80px;text-align:center;height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;">
      <div style="margin-top:20px;">
        <div style="font-size:72px;font-weight:900;color:#4b5563;margin:0;line-height:1;letter-spacing:10px;">VOX</div>
        <div style="font-size:14px;font-weight:700;color:#0ea5e9;letter-spacing:8px;margin-top:5px;margin-bottom:30px;">MARKETING ACADEMY</div>
      </div>
      <div style="font-size:28px;font-weight:700;color:#6b7280;letter-spacing:4px;margin-bottom:40px;">CERTIFICADO DE CONCLUSÃO</div>
      <div style="font-size:42px;font-weight:400;color:#6b7280;margin-bottom:40px;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(certificate.name || 'NOME')}</div>
      <div style="font-size:18px;font-weight:700;color:#000;margin-bottom:20px;max-width:850px;line-height:1.35;">
        Completou com êxito o ${escapeHtml(certificate.productName || 'Curso de Tráfego Pago - Meta Ads')}, com carga horária de ${escapeHtml(certificate.hours || '8')} horas.
      </div>
      <div style="font-size:16px;line-height:1.6;color:#111827;max-width:900px;margin:0 auto;font-weight:400;text-align:center;">
        Na Vox Marketing Academy, ministrado por ${escapeHtml(certificate.instructorName || 'Rodrigo Jardim')}, no dia ${escapeHtml(certificate.date)}. Durante o curso, demonstrou dedicação e empenho exemplares, adquirindo habilidades valiosas em estratégias de tráfego pago. Parabéns pela conclusão bem-sucedida deste curso!
      </div>
      <div style="margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:20px;">
        <div style="position:relative;width:180px;height:240px;margin-left:20px;margin-bottom:15px;">
          <div style="position:absolute;bottom:20px;left:20px;width:50px;height:100px;background:linear-gradient(to right,#9ca3af,#d1d5db,#9ca3af);z-index:1;transform:rotate(25deg);"></div>
          <div style="position:absolute;bottom:20px;right:20px;width:50px;height:100px;background:linear-gradient(to right,#9ca3af,#d1d5db,#9ca3af);z-index:1;transform:rotate(-25deg);"></div>
          <div style="position:absolute;top:0;left:0;width:180px;height:180px;border-radius:50%;background:linear-gradient(135deg,#e5e7eb 0%,#ffffff 50%,#9ca3af 100%);border:4px solid #f3f4f6;box-shadow:0 10px 20px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.8);z-index:2;display:flex;justify-content:center;align-items:center;text-align:center;">
            <div style="width:160px;height:160px;border-radius:50%;border:1px solid #d1d5db;display:flex;justify-content:center;align-items:center;"><div style="font-size:80px;color:#4b5563;line-height:1;">★</div></div>
          </div>
        </div>
        <div style="text-align:center;margin-right:60px;width:300px;margin-bottom:30px;">
          ${certificate.signatureUrl ? `<img src="${escapeHtml(certificate.signatureUrl)}" alt="Assinatura" style="height:80px;max-width:280px;object-fit:contain;margin-bottom:-10px;display:inline-block;" />` : `<div style="font-size:32px;color:#000;margin-bottom:8px;line-height:1.1;">${escapeHtml(certificate.instructorName || 'Rodrigo Jardim')}</div>`}
          <div style="width:100%;height:2px;background:#1e3a8a;margin-top:10px;"></div>
        </div>
      </div>
    </div>
  </div>
`;

const getOfficialCertificateHtml = (certificate: GeneratedCertificate | Omit<GeneratedCertificate, 'certificateHtml' | 'emailHtml'>) => `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado - ${escapeHtml(certificate.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0;padding:28px;min-height:100vh;display:flex;justify-content:center;align-items:center;background:#f3f4f6;-webkit-print-color-adjust:exact;print-color-adjust:exact; }
    .controls { position:fixed;top:16px;right:16px;z-index:9999; }
    .controls button { border:0;border-radius:12px;padding:12px 16px;color:white;font-weight:800;cursor:pointer;background:#2563eb; }
    @media print { body{background:white;padding:0;} .certificate-wrapper{box-shadow:none!important;border-radius:0!important;} .controls{display:none!important;} @page{size:landscape;margin:0;} }
  </style>
</head>
<body>
  <div class="controls"><button onclick="window.print()">📥 Baixar certificado em PDF</button></div>
  ${getCertificateCardHtml(certificate)}
</body>
</html>`;

const getCertificateEmailHtml = (certificate: GeneratedCertificate) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;background:#eef1f5;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <div style="width:100%;max-width:1122px;overflow-x:auto;">
        ${getCertificateCardHtml(certificate)}
      </div>
      <div style="margin-top:22px;text-align:center;">
        <a href="${escapeHtml(certificate.certificateUrl)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;padding:16px 26px;border-radius:16px;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;">
          Abrir e baixar certificado em PDF
        </a>
      </div>
      <p style="margin:14px auto 0;max-width:720px;font-size:12px;line-height:1.5;color:#6b7280;text-align:center;">
        Caso o botão não funcione, copie e cole este link no navegador:<br />
        <span style="word-break:break-all;color:#2563eb;">${escapeHtml(certificate.certificateUrl)}</span>
      </p>
    </td>
  </tr>
</table>`;

const createCertificate = (lead: Lead, selectedTurma: string): GeneratedCertificate => {
  const savedSignature = getSavedSignature();
  const base = {
    id: crypto.randomUUID(),
    leadId: lead.id,
    name: lead.name || 'Aluno',
    email: lead.email || '',
    cpf: lead.cpf || '',
    productName: lead.product_name || selectedTurma || 'Curso de Tráfego Pago - Meta Ads',
    turma: lead.turma || selectedTurma,
    date: new Date().toLocaleDateString('pt-BR'),
    hours: '8',
    instructorName: 'Rodrigo Jardim',
    signatureUrl: savedSignature,
    certificateUrl: getCertificateUrl(lead, savedSignature),
    status: 'generated' as const,
    message: savedSignature ? 'Certificado gerado com assinatura e layout oficial' : 'Certificado gerado sem assinatura salva',
  };

  const generated = {
    ...base,
    certificateHtml: '',
    emailHtml: '',
  } as GeneratedCertificate;

  generated.certificateHtml = getOfficialCertificateHtml(generated);
  generated.emailHtml = getCertificateEmailHtml(generated);
  return generated;
};

const postJsonWithXhr = async (url: string, payload: any, headers: Record<string, string>) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  
  let result: any = {};
  const text = await response.text();
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }
  
  if (!response.ok || result.error) {
    throw new Error(result.error || result.message || `Erro HTTP ${response.status}`);
  }
  
  return result;
};

export const CertificateSender: React.FC<CertificateSenderProps> = ({ leads, checkouts }) => {
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [generatedCertificates, setGeneratedCertificates] = useState<GeneratedCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<GeneratedCertificate | null>(null);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'generating' | 'sending' | 'completed' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const turmas = useMemo(() => {
    const turmaSet = new Set<string>();
    checkouts.forEach((checkout) => {
      if (checkout.turma?.trim()) turmaSet.add(checkout.turma.trim());
      else if (checkout.productName?.trim()) turmaSet.add(checkout.productName.trim());
    });
    leads.forEach((lead) => {
      if (lead.turma?.trim()) turmaSet.add(lead.turma.trim());
    });
    return Array.from(turmaSet).sort((a, b) => a.localeCompare(b));
  }, [leads, checkouts]);

  const getCheckoutIdsForTurma = (turma: string) => new Set(
    checkouts.filter((checkout) => checkout.turma === turma || checkout.productName === turma).map((checkout) => checkout.id)
  );

  const getLeadsForTurma = (turma: string) => {
    const checkoutIds = getCheckoutIdsForTurma(turma);
    return leads.filter((lead) => {
      const belongsToTurma = lead.turma === turma || checkoutIds.has(lead.product_id || '');
      return belongsToTurma && isPaid(lead) && Boolean(lead.email) && Boolean(lead.cpf);
    });
  };

  const turmaLeads = useMemo(() => selectedTurma ? getLeadsForTurma(selectedTurma) : [], [leads, checkouts, selectedTurma]);
  const generatedCount = generatedCertificates.length;
  const pendingToSend = generatedCertificates.filter((cert) => cert.status === 'generated').length;

  const handleGenerateCertificates = async () => {
    if (!selectedTurma) return alert('Selecione uma turma');
    if (turmaLeads.length === 0) return alert('Nenhum aluno pago com email e CPF nesta turma');

    const savedSignature = getSavedSignature();
    if (!savedSignature && !confirm('Não encontrei assinatura salva em Assinaturas. Deseja gerar mesmo assim sem imagem de assinatura?')) return;

    setIsGenerating(true);
    setSendingStatus('generating');
    setStatusMessage('Gerando certificados em massa com layout oficial...');
    setGeneratedCertificates([]);
    setSelectedCertificate(null);
    setSentCount(0);
    setFailedCount(0);

    try {
      const generated = turmaLeads.map((lead) => createCertificate(lead, selectedTurma));
      setGeneratedCertificates(generated);
      setSelectedCertificate(generated[0] || null);
      setSendingStatus('completed');
      setStatusMessage(`✓ ${generated.length} certificado(s) gerado(s) com layout oficial.`);
    } catch (error) {
      console.error('Erro ao gerar certificados em massa:', error);
      setSendingStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Erro ao gerar certificados');
    } finally {
      setIsGenerating(false);
    }
  };

  const openOfficialCertificate = (certificate: GeneratedCertificate) => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.write(certificate.certificateHtml);
    newWindow.document.close();
  };

  const sendCertificateEmail = async (certificate: GeneratedCertificate) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      headers.apikey = SUPABASE_ANON_KEY;
    }

    return postJsonWithXhr(SEND_EMAIL_ENDPOINT, {
      to: certificate.email,
      name: certificate.name,
      subject: `Seu Certificado - ${certificate.productName}`,
      productName: certificate.productName,
      message: certificate.emailHtml,
      ticketUrl: '',
      certificateUrl: certificate.certificateUrl,
      signatureUrl: certificate.signatureUrl,
      preserveCertificateLayout: true,
    }, headers);
  };

  const updateCertificateStatus = (id: string, status: GeneratedCertificate['status'], message: string) => {
    setGeneratedCertificates((previous) => previous.map((cert) => cert.id === id ? { ...cert, status, message } : cert));
    setSelectedCertificate((previous) => previous?.id === id ? { ...previous, status, message } : previous);
  };

  const handleSendGeneratedCertificates = async () => {
    if (generatedCertificates.length === 0) return alert('Primeiro gere os certificados em massa');
    const certificatesToSend = generatedCertificates.filter((cert) => cert.status === 'generated' || cert.status === 'error');
    if (certificatesToSend.length === 0) return alert('Todos os certificados gerados já foram enviados');
    if (!confirm(`Enviar ${certificatesToSend.length} certificado(s) gerado(s) por email?`)) return;

    setIsSending(true);
    setSendingStatus('sending');
    setSentCount(0);
    setFailedCount(0);
    setStatusMessage('Enviando certificados com o layout oficial...');

    let successful = 0;
    let failed = 0;
    for (const certificate of certificatesToSend) {
      try {
        setStatusMessage(`Enviando certificado para ${certificate.name}...`);
        await sendCertificateEmail(certificate);
        successful += 1;
        setSentCount(successful);
        updateCertificateStatus(certificate.id, 'sent', 'Enviado com layout oficial');
        await new Promise(resolve => setTimeout(resolve, 350));
      } catch (err) {
        console.error(`Erro ao enviar para ${certificate.name}:`, err);
        failed += 1;
        setFailedCount(failed);
        updateCertificateStatus(certificate.id, 'error', err instanceof Error ? err.message : 'Erro ao enviar');
      }
    }

    setIsSending(false);
    setSendingStatus(failed > 0 && successful === 0 ? 'error' : 'completed');
    setStatusMessage(`✓ ${successful} certificado(s) enviado(s)${failed > 0 ? `, ${failed} falharam` : ''}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Certificados em Massa</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gere e envie certificados usando o mesmo layout oficial</p>
        </div>
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
          <FileCheck size={32} className="text-purple-600" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Stat label="Turmas" value={turmas.length} tone="blue" />
          <Stat label="Alunos" value={turmaLeads.length} tone="emerald" />
          <Stat label="Gerados" value={generatedCount} tone="purple" />
          <Stat label="Pendentes" value={pendingToSend} tone="orange" />
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3"><GraduationCap size={16} className="inline mr-2" /> Selecione a Turma *</label>
            <select
              value={selectedTurma}
              onChange={(e) => {
                setSelectedTurma(e.target.value);
                setSendingStatus('idle');
                setStatusMessage('');
                setGeneratedCertificates([]);
                setSelectedCertificate(null);
                setSentCount(0);
                setFailedCount(0);
              }}
              disabled={isGenerating || isSending}
              className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Selecione uma turma --</option>
              {turmas.map(turma => {
                const turmaLeadCount = getLeadsForTurma(turma).length;
                return <option key={turma} value={turma}>{turma} ({turmaLeadCount} aluno{turmaLeadCount !== 1 ? 's' : ''})</option>;
              })}
            </select>
            <p className="text-xs text-gray-400 font-bold mt-2">Só entram alunos pagos/aprovados com email e CPF cadastrados.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleGenerateCertificates} disabled={isGenerating || isSending || !selectedTurma || turmaLeads.length === 0} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${isGenerating || isSending || !selectedTurma || turmaLeads.length === 0 ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:-translate-y-1 shadow-purple-200'}`}>
              {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Gerando...</> : <><FileCheck size={18} /> Gerar Certificados em Massa</>}
            </button>

            <button onClick={handleSendGeneratedCertificates} disabled={isSending || isGenerating || generatedCertificates.length === 0 || pendingToSend === 0} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${isSending || isGenerating || generatedCertificates.length === 0 || pendingToSend === 0 ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:-translate-y-1 shadow-emerald-200'}`}>
              {isSending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar Certificados Gerados</>}
            </button>
          </div>

          {sendingStatus !== 'idle' && (
            <div className={`rounded-2xl p-4 border-2 ${sendingStatus === 'sending' || sendingStatus === 'generating' ? 'bg-blue-50 border-blue-200' : sendingStatus === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-3">
                {(sendingStatus === 'sending' || sendingStatus === 'generating') && <Loader2 size={20} className="text-blue-600 animate-spin" />}
                {sendingStatus === 'completed' && <Check size={20} className="text-emerald-600" />}
                {sendingStatus === 'error' && <XCircle size={20} className="text-red-600" />}
                <div className="font-bold text-sm text-gray-900">{statusMessage}</div>
              </div>
            </div>
          )}

          {generatedCertificates.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">Certificados gerados</div>
                  <div className="text-[10px] font-black text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">Enviados: {sentCount} | Falhas: {failedCount}</div>
                </div>
                <div className="space-y-2 max-h-[520px] overflow-y-auto">
                  {generatedCertificates.map((cert, idx) => (
                    <div key={cert.id} className={`p-3 bg-white rounded-xl border transition-all ${selectedCertificate?.id === cert.id ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-xs font-black text-purple-600 flex-shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{cert.name}</div>
                          <div className="text-xs text-gray-500 truncate">{cert.email}</div>
                          <div className="text-[10px] text-purple-600 font-bold mt-1">{cert.signatureUrl ? 'Com assinatura salva' : 'Sem assinatura salva'}</div>
                          {cert.message && <div className="text-[10px] text-gray-500 font-bold mt-1">{cert.message}</div>}
                        </div>
                        <div className={`text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${cert.status === 'sent' ? 'text-emerald-600 bg-emerald-50' : cert.status === 'error' ? 'text-red-600 bg-red-50' : 'text-purple-600 bg-purple-50'}`}>{cert.status === 'sent' ? '✓ Enviado' : cert.status === 'error' ? 'Falhou' : 'Gerado'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button onClick={() => setSelectedCertificate(cert)} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-black uppercase hover:bg-purple-100 transition-all flex items-center justify-center gap-1"><Eye size={13} /> Visualizar</button>
                        <button onClick={() => openOfficialCertificate(cert)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all flex items-center justify-center gap-1"><ExternalLink size={13} /> Abrir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 min-h-[520px]">
                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-black text-sm">Prévia do certificado oficial</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate max-w-[260px]">{selectedCertificate ? selectedCertificate.name : 'Selecione um certificado'}</p>
                  </div>
                  {selectedCertificate && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openOfficialCertificate(selectedCertificate)} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20" title="Abrir em nova aba"><ExternalLink size={15} /></button>
                      <button onClick={() => setSelectedCertificate(null)} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20" title="Fechar prévia"><X size={15} /></button>
                    </div>
                  )}
                </div>

                {selectedCertificate ? (
                  <div className="h-[620px] bg-white">
                    <iframe title={`Prévia certificado ${selectedCertificate.name}`} srcDoc={selectedCertificate.certificateHtml} className="w-full h-full border-0" />
                  </div>
                ) : (
                  <div className="h-[620px] flex items-center justify-center text-center p-8">
                    <div>
                      <Eye size={42} className="text-slate-600 mx-auto mb-4" />
                      <p className="text-white font-black">Nenhum certificado selecionado</p>
                      <p className="text-slate-400 text-sm font-bold mt-2">Clique em “Visualizar” para conferir o certificado.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-1" />
          <div className="text-sm text-amber-800">
            <div className="font-bold mb-2">ℹ️ Como funciona:</div>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>O e-mail agora envia o card do certificado no próprio corpo do e-mail.</li>
              <li>O botão abre o certificado correto para baixar em PDF.</li>
              <li>A assinatura salva é enviada junto no link público do certificado.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; tone: 'blue' | 'emerald' | 'purple' | 'orange' }> = ({ label, value, tone }) => {
  const tones = {
    blue: ['from-blue-50', 'to-blue-100', 'border-blue-200', 'text-blue-600', 'text-blue-900'],
    emerald: ['from-emerald-50', 'to-emerald-100', 'border-emerald-200', 'text-emerald-600', 'text-emerald-900'],
    purple: ['from-purple-50', 'to-purple-100', 'border-purple-200', 'text-purple-600', 'text-purple-900'],
    orange: ['from-orange-50', 'to-orange-100', 'border-orange-200', 'text-orange-600', 'text-orange-900'],
  } as const;
  const classes = tones[tone];
  return (
    <div className={`bg-gradient-to-br ${classes[0]} ${classes[1]} p-6 rounded-2xl border ${classes[2]}`}>
      <div className={`text-sm font-bold ${classes[3]} uppercase tracking-widest mb-2`}>{label}</div>
      <div className={`text-3xl font-black ${classes[4]}`}>{value}</div>
    </div>
  );
};
