import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, ExternalLink, FileCheck, GraduationCap, Loader2, Mail, Send } from 'lucide-react';
import { Lead, AppConfig } from '../../types';
import { DEFAULT_SUPABASE_KEY } from '../../hooks/useSupabase';

interface CertificateSenderProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

type GeneratedCertificate = {
  id: string;
  leadId: string;
  name: string;
  email: string;
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
  DEFAULT_SUPABASE_KEY;

const normalize = (value?: string | null) => String(value || '').trim().toLowerCase();
const isPaid = (lead: Lead) => lead.status === 'Pago' || lead.status === 'Aprovado';
const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const formatInputDateToBr = (value: string) => {
  if (!value) return new Date().toLocaleDateString('pt-BR');
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const getSavedSignature = () => {
  try {
    const saved = localStorage.getItem('vox_selected_signature') || '';
    return saved.startsWith('http') || saved.startsWith('data:') ? saved : '';
  } catch {
    return '';
  }
};

const getCertificateUrl = (name: string, productName: string, date: string, hours: string, instructorName: string, signatureUrl: string) => {
  const url = new URL(window.location.origin);
  url.searchParams.set('mode', 'certificate');
  url.searchParams.set('name', name);
  url.searchParams.set('course', productName);
  url.searchParams.set('date', date);
  url.searchParams.set('hours', hours);
  url.searchParams.set('instructor', instructorName);
  if (signatureUrl) url.searchParams.set('sig', signatureUrl);
  return url.toString();
};

const getCertificateCardHtml = (certificate: Pick<GeneratedCertificate, 'name' | 'productName' | 'hours' | 'date' | 'instructorName' | 'signatureUrl'>) => `
  <div class="certificate-wrapper">
    <div class="brand">VOX</div>
    <div class="academy">MARKETING ACADEMY</div>
    <div class="title">CERTIFICADO DE CONCLUSÃO</div>
    <div class="student">${escapeHtml(certificate.name || 'NOME')}</div>
    <div class="main-text">Completou com êxito o ${escapeHtml(certificate.productName || 'Curso de Tráfego Pago - Meta Ads')}, com carga horária de ${escapeHtml(certificate.hours || '8')} horas.</div>
    <div class="desc">Na Vox Marketing Academy, ministrado por ${escapeHtml(certificate.instructorName || 'Rodrigo Jardim')}, no dia ${escapeHtml(certificate.date)}. Durante o curso, demonstrou dedicação e empenho exemplares, adquirindo habilidades valiosas em estratégias de tráfego pago. Parabéns pela conclusão bem-sucedida deste curso!</div>
    <div class="footer">
      <div class="medal">★</div>
      <div class="signature">
        ${certificate.signatureUrl ? `<img src="${escapeHtml(certificate.signatureUrl)}" alt="Assinatura" />` : `<span>${escapeHtml(certificate.instructorName || 'Rodrigo Jardim')}</span>`}
        <b></b>
      </div>
    </div>
  </div>
`;

const getCertificateDocument = (title: string, certificatesHtml: string) => `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:28px; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .controls { position:fixed; top:16px; right:16px; z-index:9999; display:flex; gap:10px; }
    .controls button { border:0; border-radius:12px; padding:12px 16px; color:white; font-weight:800; cursor:pointer; background:#2563eb; }
    .stack { display:flex; flex-direction:column; gap:28px; align-items:center; }
    .certificate-wrapper { width:1122px; height:794px; background:#fff; position:relative; overflow:hidden; box-shadow:0 22px 70px rgba(15,23,42,.16); border-radius:8px; margin:0 auto; padding:50px 80px; text-align:center; display:flex; flex-direction:column; align-items:center; page-break-after:always; }
    .brand { font-size:72px; font-weight:900; color:#4b5563; line-height:1; letter-spacing:10px; margin-top:20px; }
    .academy { font-size:14px; font-weight:700; color:#0ea5e9; letter-spacing:8px; margin-top:5px; margin-bottom:30px; }
    .title { font-size:28px; font-weight:700; color:#6b7280; letter-spacing:4px; margin-bottom:40px; }
    .student { font-size:42px; font-weight:400; color:#6b7280; margin-bottom:40px; text-transform:uppercase; letter-spacing:1px; }
    .main-text { font-size:18px; font-weight:700; color:#000; margin-bottom:20px; max-width:850px; line-height:1.35; }
    .desc { font-size:16px; line-height:1.6; color:#111827; max-width:900px; margin:0 auto; font-weight:400; text-align:center; }
    .footer { margin-top:auto; width:100%; display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:20px; }
    .medal { width:180px; height:180px; border-radius:50%; background:linear-gradient(135deg,#e5e7eb,#fff,#9ca3af); display:grid; place-items:center; font-size:80px; color:#4b5563; box-shadow:0 10px 20px rgba(0,0,0,.2); }
    .signature { text-align:center; margin-right:60px; width:300px; margin-bottom:30px; }
    .signature img { height:80px; max-width:280px; object-fit:contain; margin-bottom:-10px; display:inline-block; }
    .signature span { display:block; font-size:32px; color:#000; margin-bottom:8px; line-height:1.1; }
    .signature b { display:block; width:100%; height:2px; background:#1e3a8a; margin-top:10px; }
    @media print { body{background:white;padding:0;} .stack{gap:0;} .certificate-wrapper{box-shadow:none!important;border-radius:0!important;margin:0;} .controls{display:none!important;} @page{size:landscape;margin:0;} }
  </style>
</head>
<body>
  <div class="controls"><button onclick="window.print()">📥 Baixar em PDF</button></div>
  <div class="stack">${certificatesHtml}</div>
</body>
</html>`;

const createCertificate = (lead: Lead, selectedTurma: string, certificateDateBr: string, customCourseName: string): GeneratedCertificate => {
  const signatureUrl = getSavedSignature();
  const name = lead.name || 'Aluno';
  const productName = customCourseName.trim() || lead.product_name || selectedTurma || 'Curso de Tráfego Pago - Meta Ads';
  const date = certificateDateBr;
  const hours = '8';
  const instructorName = 'Rodrigo Jardim';
  const certificateUrl = getCertificateUrl(name, productName, date, hours, instructorName, signatureUrl);

  const base = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${lead.id}-${Date.now()}`,
    leadId: lead.id,
    name,
    email: lead.email || '',
    productName,
    turma: lead.turma || selectedTurma,
    date,
    hours,
    instructorName,
    signatureUrl,
    certificateUrl,
    certificateHtml: '',
    emailHtml: '',
    status: 'generated' as const,
    message: signatureUrl ? `Gerado com assinatura salva • Curso: ${productName}` : `Gerado sem assinatura salva • Curso: ${productName}`,
  } as GeneratedCertificate;

  base.certificateHtml = getCertificateDocument(`Certificado - ${name}`, getCertificateCardHtml(base));
  base.emailHtml = `<p>Olá <strong>${escapeHtml(name)}</strong>, seu certificado do curso <strong>${escapeHtml(productName)}</strong> está pronto.</p><p><a href="${escapeHtml(certificateUrl)}">Abrir certificado</a></p>`;
  return base;
};

const openHtml = (html: string) => {
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert('O navegador bloqueou a nova aba. Libere pop-ups para abrir os certificados.');
    return false;
  }
  newWindow.document.write(html);
  newWindow.document.close();
  return true;
};

export const CertificateSender: React.FC<CertificateSenderProps> = ({ leads, checkouts }) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [customCourseName, setCustomCourseName] = useState('');
  const [certificateDate, setCertificateDate] = useState(todayInputValue());
  const [generatedCertificates, setGeneratedCertificates] = useState<GeneratedCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<GeneratedCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const certificateDateBr = useMemo(() => formatInputDateToBr(certificateDate), [certificateDate]);

  const turmas = useMemo(() => {
    const set = new Set<string>();
    checkouts.forEach((checkout) => {
      if (checkout.turma?.trim()) set.add(checkout.turma.trim());
      if (checkout.productName?.trim()) set.add(checkout.productName.trim());
    });
    leads.forEach((lead) => {
      if (lead.turma?.trim()) set.add(lead.turma.trim());
      if (lead.product_name?.trim()) set.add(lead.product_name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [checkouts, leads]);

  const getCheckoutIdsForTurma = (turma: string) => new Set(
    checkouts
      .filter((checkout) => normalize(checkout.turma) === normalize(turma) || normalize(checkout.productName) === normalize(turma))
      .map((checkout) => checkout.id)
  );

  const getLeadsForTurma = (turma: string) => {
    const checkoutIds = getCheckoutIdsForTurma(turma);
    return leads.filter((lead) => {
      const belongsToTurma = normalize(lead.turma) === normalize(turma) || normalize(lead.product_name) === normalize(turma) || checkoutIds.has(lead.product_id || '');
      return belongsToTurma && isPaid(lead);
    });
  };

  const turmaLeads = useMemo(() => selectedTurma ? getLeadsForTurma(selectedTurma) : [], [selectedTurma, leads, checkouts]);
  const withEmailCount = generatedCertificates.filter(cert => Boolean(cert.email) && cert.status !== 'sent').length;

  const resetGenerated = () => {
    setGeneratedCertificates([]);
    setSelectedCertificate(null);
    setStatusMessage('');
  };

  const handleGenerateCertificates = () => {
    if (!selectedTurma) return alert('Selecione uma turma');
    if (!certificateDate) return alert('Informe a data oficial do certificado');
    if (turmaLeads.length === 0) return alert('Nenhum aluno pago/aprovado encontrado nessa turma.');

    setIsGenerating(true);
    setStatusMessage('Gerando certificados...');

    try {
      const generated = turmaLeads.map((lead) => createCertificate(lead, selectedTurma, certificateDateBr, customCourseName));
      setGeneratedCertificates(generated);
      setSelectedCertificate(generated[0] || null);
      const courseLabel = (customCourseName.trim() || selectedTurma).trim();
      setStatusMessage(`✅ ${generated.length} certificado(s) gerado(s) com a data ${certificateDateBr}${courseLabel ? ` • Curso/Turma: ${courseLabel}` : ''}.`);
      openHtml(getCertificateDocument('Certificados em Massa', generated.map(getCertificateCardHtml).join('')));
    } finally {
      setIsGenerating(false);
    }
  };

  const openAllCertificates = () => {
    if (generatedCertificates.length === 0) return alert('Primeiro clique em GERAR CERTIFICADOS AGORA.');
    openHtml(getCertificateDocument('Certificados em Massa', generatedCertificates.map(getCertificateCardHtml).join('')));
  };

  const sendCertificateEmail = async (certificate: GeneratedCertificate) => {
    if (!certificate.email) throw new Error('Aluno sem e-mail cadastrado');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      headers.apikey = SUPABASE_ANON_KEY;
    }

    const response = await fetch(SEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: certificate.email,
        name: certificate.name,
        subject: `Seu Certificado - ${certificate.productName}`,
        productName: certificate.productName,
        message: certificate.emailHtml,
        ticketUrl: '',
        certificateUrl: certificate.certificateUrl,
        signatureUrl: certificate.signatureUrl,
        preserveCertificateLayout: true,
      }),
    });

    const text = await response.text();
    let result: any = {};
    try { result = text ? JSON.parse(text) : {}; } catch { result = { raw: text }; }
    if (!response.ok || result.error) throw new Error(result.error || result.message || `Erro HTTP ${response.status}`);
  };

  const sendAllWithEmail = async () => {
    const certificatesToSend = generatedCertificates.filter(cert => cert.email && cert.status !== 'sent');
    if (certificatesToSend.length === 0) return alert('Nenhum certificado com e-mail disponível para enviar.');
    if (!confirm(`Enviar ${certificatesToSend.length} certificado(s) por e-mail?`)) return;

    setIsSending(true);
    let sent = 0;
    let failed = 0;

    for (const cert of certificatesToSend) {
      try {
        setStatusMessage(`Enviando para ${cert.name}...`);
        await sendCertificateEmail(cert);
        sent += 1;
        setGeneratedCertificates(prev => prev.map(item => item.id === cert.id ? { ...item, status: 'sent', message: 'Enviado por e-mail' } : item));
      } catch (error) {
        failed += 1;
        setGeneratedCertificates(prev => prev.map(item => item.id === cert.id ? { ...item, status: 'error', message: error instanceof Error ? error.message : 'Erro ao enviar' } : item));
      }
    }

    setStatusMessage(`✅ ${sent} enviado(s)${failed ? `, ${failed} falharam` : ''}.`);
    setIsSending(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Certificados em Massa</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Selecione uma turma, defina a data e gere todos os certificados</p>
        </div>
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
          <FileCheck size={32} className="text-purple-600" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 md:p-8 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Stat label="Turmas" value={turmas.length} tone="blue" />
          <Stat label="Alunos" value={turmaLeads.length} tone="emerald" />
          <Stat label="Gerados" value={generatedCertificates.length} tone="purple" />
          <Stat label="Com e-mail" value={withEmailCount} tone="orange" />
        </div>

        <div>
          <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
            <GraduationCap size={16} className="inline mr-2" /> Selecione a Turma *
          </label>
          <select
            value={selectedTurma}
            onChange={(event) => {
              const turma = event.target.value;
              setSelectedTurma(turma);
              setCustomCourseName(turma);
              resetGenerated();
            }}
            disabled={isGenerating || isSending}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          >
            <option value="">-- Selecione uma turma --</option>
            {turmas.map((turma) => {
              const count = getLeadsForTurma(turma).length;
              return <option key={turma} value={turma}>{turma} ({count} aluno{count !== 1 ? 's' : ''})</option>;
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
            🏷️ Nome da turma ou curso no certificado *
          </label>
          <input
            type="text"
            value={customCourseName}
            onChange={(event) => {
              setCustomCourseName(event.target.value);
              resetGenerated();
            }}
            placeholder="Ex: IA Ads - Turma Julho / Google Meu Negócio Noturno"
            disabled={isGenerating || isSending || !selectedTurma}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <p className="text-xs text-gray-400 font-bold mt-2">Esse texto aparecerá no certificado e no assunto/e-mail enviado para todos da turma.</p>
        </div>

        <div>
          <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
            📅 Data oficial do certificado *
          </label>
          <input
            type="date"
            value={certificateDate}
            onChange={(event) => {
              setCertificateDate(event.target.value);
              resetGenerated();
            }}
            disabled={isGenerating || isSending}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
          />
          <p className="text-xs text-gray-400 font-bold mt-2">Essa data será aplicada em todos os certificados gerados nesta turma: {certificateDateBr}</p>
        </div>

        {selectedTurma && (
          <button
            type="button"
            onClick={handleGenerateCertificates}
            disabled={isGenerating || isSending || turmaLeads.length === 0 || !certificateDate || !customCourseName.trim()}
            className="w-full rounded-2xl p-5 bg-blue-600 text-white font-black text-base md:text-xl uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={22} className="animate-spin" /> : <FileCheck size={22} />}
            {isGenerating ? 'Gerando...' : `Gerar ${turmaLeads.length} Certificados Agora`}
          </button>
        )}

        {selectedTurma && turmaLeads.length === 0 && (
          <div className="rounded-2xl p-4 border-2 bg-amber-50 border-amber-200 text-sm font-bold text-amber-800">
            Nenhum aluno pago/aprovado encontrado nessa turma.
          </div>
        )}

        {statusMessage && (
          <div className="rounded-2xl p-4 border-2 bg-emerald-50 border-emerald-200 text-sm font-bold text-emerald-800 flex items-center gap-2">
            <Check size={18} /> {statusMessage}
          </div>
        )}

        {generatedCertificates.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={openAllCertificates} className="w-full rounded-2xl p-4 bg-indigo-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <ExternalLink size={18} /> Abrir Todos / Baixar PDF
              </button>
              <button onClick={sendAllWithEmail} disabled={isSending || withEmailCount === 0} className="w-full rounded-2xl p-4 bg-emerald-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Enviar por E-mail ({withEmailCount})
              </button>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {generatedCertificates.map((cert, index) => (
                <div key={cert.id} className={`p-4 bg-gray-50 rounded-2xl border ${selectedCertificate?.id === cert.id ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-xs font-black text-purple-600 flex-shrink-0">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-900 text-sm truncate">{cert.name}</div>
                      <div className="text-xs text-gray-500 truncate">{cert.email || 'Sem e-mail cadastrado'}</div>
                      <div className="text-[10px] text-purple-600 font-bold mt-1">{cert.message} • Data: {cert.date}</div>
                    </div>
                    <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${cert.status === 'sent' ? 'text-emerald-600 bg-emerald-50' : cert.status === 'error' ? 'text-red-600 bg-red-50' : 'text-purple-600 bg-purple-50'}`}>{cert.status === 'sent' ? 'Enviado' : cert.status === 'error' ? 'Falhou' : 'Gerado'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={() => setSelectedCertificate(cert)} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-black uppercase">Visualizar</button>
                    <button onClick={() => openHtml(cert.certificateHtml)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase">Abrir</button>
                  </div>
                </div>
              ))}
            </div>

            {selectedCertificate && (
              <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-black text-sm">Prévia do certificado oficial</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate max-w-[260px]">{selectedCertificate.name}</p>
                  </div>
                </div>
                <div className="h-[620px] bg-white">
                  <iframe title={`Prévia certificado ${selectedCertificate.name}`} srcDoc={selectedCertificate.certificateHtml} className="w-full h-full border-0" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-1" />
          <div className="text-sm text-amber-800">
            <div className="font-bold mb-2">ℹ️ Como funciona:</div>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Você escolhe a turma para localizar os alunos pagos/aprovados.</li>
              <li>Você pode digitar o nome exato do curso ou turma que aparecerá no certificado.</li>
              <li>A mesma data e o mesmo nome de curso/turma serão aplicados em todos os certificados gerados.</li>
              <li>Se errar a data ou o nome, altere o campo e gere novamente.</li>
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
    <div className={`bg-gradient-to-br ${classes[0]} ${classes[1]} p-4 md:p-6 rounded-2xl border ${classes[2]}`}>
      <div className={`text-[10px] md:text-sm font-bold ${classes[3]} uppercase tracking-widest mb-2`}>{label}</div>
      <div className={`text-2xl md:text-3xl font-black ${classes[4]}`}>{value}</div>
    </div>
  );
};