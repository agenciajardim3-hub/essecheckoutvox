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
        if (saved.startsWith('http') || saved.startsWith('data:')) return saved;
        return '';
    } catch {
        return '';
    }
};

const getOfficialCertificateHtml = (certificate: Omit<GeneratedCertificate, 'certificateHtml'>) => `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado - ${escapeHtml(certificate.name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Great+Vibes&display=swap');
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f3f4f6;
      font-family: 'Montserrat', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-wrapper {
      width: 1122px;
      height: 794px;
      background: white;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 22px 70px rgba(15, 23, 42, 0.16);
      border-radius: 8px;
    }
    .content {
      position: relative;
      z-index: 10;
      padding: 50px 80px;
      text-align: center;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header { margin-top: 20px; }
    .vox-title {
      font-size: 72px;
      font-weight: 900;
      color: #4b5563;
      margin: 0;
      line-height: 1;
      letter-spacing: 10px;
    }
    .vox-subtitle {
      font-size: 14px;
      font-weight: 700;
      color: #0ea5e9;
      letter-spacing: 8px;
      margin-top: 5px;
      margin-bottom: 30px;
    }
    .cert-title {
      font-size: 28px;
      font-weight: 700;
      color: #6b7280;
      letter-spacing: 4px;
      margin-bottom: 40px;
    }
    .student-name {
      font-size: 42px;
      font-weight: 400;
      color: #6b7280;
      margin-bottom: 40px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .course-desc-bold {
      font-size: 18px;
      font-weight: 700;
      color: #000;
      margin-bottom: 20px;
      max-width: 850px;
      line-height: 1.35;
    }
    .course-desc-text {
      font-size: 16px;
      line-height: 1.6;
      color: #111827;
      max-width: 900px;
      margin: 0 auto;
      font-weight: 400;
      text-align: center;
    }
    .footer {
      margin-top: auto;
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 20px;
    }
    .medal-container {
      position: relative;
      width: 180px;
      height: 240px;
      margin-left: 20px;
      margin-bottom: 15px;
    }
    .ribbon {
      position: absolute;
      bottom: 20px;
      width: 50px;
      height: 100px;
      background: linear-gradient(to right, #9ca3af, #d1d5db, #9ca3af);
      z-index: 1;
    }
    .ribbon.left { left: 20px; transform: rotate(25deg); }
    .ribbon.right { right: 20px; transform: rotate(-25deg); }
    .ribbon:after {
      content: '';
      position: absolute;
      bottom: -25px;
      left: 0;
      border-left: 25px solid transparent;
      border-right: 25px solid transparent;
      border-top: 25px solid #9ca3af;
    }
    .medal {
      position: absolute;
      top: 0;
      left: 0;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e5e7eb 0%, #ffffff 50%, #9ca3af 100%);
      border: 4px solid #f3f4f6;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.8);
      z-index: 2;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .medal-inner {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      border: 1px solid #d1d5db;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .medal-star { font-size: 80px; color: #4b5563; line-height: 1; }
    .signature-box {
      text-align: center;
      margin-right: 60px;
      width: 300px;
      margin-bottom: 30px;
    }
    .signature-img {
      height: 80px;
      max-width: 280px;
      object-fit: contain;
      margin-bottom: -10px;
      display: inline-block;
    }
    .signature-text {
      font-family: 'Great Vibes', cursive;
      font-size: 56px;
      color: #000;
      margin-bottom: -10px;
      line-height: 1;
    }
    .signature-line {
      width: 100%;
      height: 2px;
      background: #1e3a8a;
      margin-top: 10px;
    }
    .controls {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 9999;
    }
    .controls button {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      color: white;
      font-weight: 800;
      cursor: pointer;
      background: #2563eb;
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate-wrapper { box-shadow: none; border-radius: 0; }
      .controls { display: none; }
      @page { size: landscape; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="controls">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  <div class="certificate-wrapper">
    <div class="content">
      <div class="header">
        <div class="vox-title">VOX</div>
        <div class="vox-subtitle">MARKETING ACADEMY</div>
      </div>
      <div class="cert-title">CERTIFICADO DE CONCLUSÃO</div>
      <div class="student-name">${escapeHtml(certificate.name || 'NOME')}</div>
      <div class="course-desc-bold">
        Completou com êxito o ${escapeHtml(certificate.productName || 'Curso de Tráfego Pago - Meta Ads')}, com carga horária de ${escapeHtml(certificate.hours || '8')} horas.
      </div>
      <div class="course-desc-text">
        Na Vox Marketing Academy, ministrado por ${escapeHtml(certificate.instructorName || 'Rodrigo Jardim')}, no dia ${escapeHtml(certificate.date || new Date().toLocaleDateString('pt-BR'))}. Durante o curso, demonstrou dedicação e empenho exemplares, adquirindo habilidades valiosas em estratégias de tráfego pago. Parabéns pela conclusão bem-sucedida deste curso! Desejamos sucesso contínuo em suas futuras iniciativas e carreira profissional.
      </div>
      <div class="footer">
        <div class="medal-container">
          <div class="ribbon left"></div>
          <div class="ribbon right"></div>
          <div class="medal"><div class="medal-inner"><div class="medal-star">★</div></div></div>
        </div>
        <div class="signature-box">
          ${certificate.signatureUrl ? `<img src="${escapeHtml(certificate.signatureUrl)}" class="signature-img" />` : `<div class="signature-text">${escapeHtml(certificate.instructorName || 'Rodrigo Jardim')}</div>`}
          <div class="signature-line"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

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
        certificateUrl: `${window.location.origin}/?mode=certificate&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`,
        status: 'generated' as const,
        message: savedSignature ? 'Certificado gerado com a assinatura salva' : 'Certificado gerado sem assinatura salva',
    };

    return {
        ...base,
        certificateHtml: getOfficialCertificateHtml(base),
    };
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
        checkouts
            .filter((checkout) => checkout.turma === turma || checkout.productName === turma)
            .map((checkout) => checkout.id)
    );

    const getLeadsForTurma = (turma: string) => {
        const checkoutIds = getCheckoutIdsForTurma(turma);
        return leads.filter((lead) => {
            const belongsToTurma = lead.turma === turma || checkoutIds.has(lead.product_id || '');
            return belongsToTurma && isPaid(lead) && Boolean(lead.email) && Boolean(lead.cpf);
        });
    };

    const turmaLeads = useMemo(() => {
        if (!selectedTurma) return [];
        return getLeadsForTurma(selectedTurma);
    }, [leads, checkouts, selectedTurma]);

    const generatedCount = generatedCertificates.length;
    const pendingToSend = generatedCertificates.filter((cert) => cert.status === 'generated').length;

    const handleGenerateCertificates = async () => {
        if (!selectedTurma) return alert('Selecione uma turma');
        if (turmaLeads.length === 0) return alert('Nenhum aluno pago com email e CPF nesta turma');

        const savedSignature = getSavedSignature();
        if (!savedSignature) {
            const continueWithoutSignature = confirm('Não encontrei assinatura salva em Assinaturas. Deseja gerar mesmo assim sem imagem de assinatura?');
            if (!continueWithoutSignature) return;
        }

        setIsGenerating(true);
        setSendingStatus('generating');
        setStatusMessage('Gerando certificados em massa com assinatura salva...');
        setGeneratedCertificates([]);
        setSelectedCertificate(null);
        setSentCount(0);
        setFailedCount(0);

        try {
            const generated = turmaLeads.map((lead) => createCertificate(lead, selectedTurma));
            setGeneratedCertificates(generated);
            setSelectedCertificate(generated[0] || null);
            setSendingStatus('completed');
            setStatusMessage(`✓ ${generated.length} certificado(s) gerado(s) ${savedSignature ? 'com a assinatura salva.' : 'sem assinatura salva.'}`);
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

        const htmlMessage = `
            <p>Olá <strong>${escapeHtml(certificate.name)}</strong>,</p>
            <p>Parabéns pela conclusão do curso <strong>${escapeHtml(certificate.productName)}</strong>!</p>
            <p>Seu certificado foi gerado com o layout oficial da Vox Marketing Academy${certificate.signatureUrl ? ' e com a assinatura salva.' : '.'}</p>
            <p style="font-size:13px;color:#6b7280;">Abaixo está uma prévia do certificado. Para salvar em PDF, use o botão abrir/imprimir dentro do sistema.</p>
            <div style="max-width:900px;overflow:auto;border:1px solid #e5e7eb;border-radius:18px;margin-top:18px;">
              ${certificate.certificateHtml.replace(/<script[\s\S]*?<\/script>/gi, '')}
            </div>
        `;

        const response = await fetch(SEND_EMAIL_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                to: certificate.email,
                name: certificate.name,
                subject: `Seu Certificado - ${certificate.productName}`,
                productName: certificate.productName,
                message: htmlMessage,
                ticketUrl: '',
                certificateUrl: certificate.certificateUrl
            })
        });

        const text = await response.text();
        let result: any = {};

        try {
            result = text ? JSON.parse(text) : {};
        } catch {
            throw new Error(`Resposta inválida da função: ${text.slice(0, 120)}`);
        }

        if (!response.ok || result.error) throw new Error(result.error || result.message || 'Erro ao enviar certificado por email');
        return result;
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
        setStatusMessage('Enviando certificados gerados...');

        let successful = 0;
        let failed = 0;

        for (const certificate of certificatesToSend) {
            try {
                setStatusMessage(`Enviando certificado para ${certificate.name}...`);
                await sendCertificateEmail(certificate);
                successful++;
                setSentCount(successful);
                updateCertificateStatus(certificate.id, 'sent', 'Enviado com sucesso');
                await new Promise(resolve => setTimeout(resolve, 350));
            } catch (err) {
                console.error(`Erro ao enviar para ${certificate.name}:`, err);
                failed++;
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
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Gere em massa usando o mesmo layout oficial e a assinatura salva
                    </p>
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
                        <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
                            <GraduationCap size={16} className="inline mr-2" /> Selecione a Turma *
                        </label>
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
                        <button
                            onClick={handleGenerateCertificates}
                            disabled={isGenerating || isSending || !selectedTurma || turmaLeads.length === 0}
                            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${isGenerating || isSending || !selectedTurma || turmaLeads.length === 0 ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:-translate-y-1 shadow-purple-200'}`}
                        >
                            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Gerando...</> : <><FileCheck size={18} /> Gerar Certificados em Massa</>}
                        </button>

                        <button
                            onClick={handleSendGeneratedCertificates}
                            disabled={isSending || isGenerating || generatedCertificates.length === 0 || pendingToSend === 0}
                            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${isSending || isGenerating || generatedCertificates.length === 0 || pendingToSend === 0 ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:-translate-y-1 shadow-emerald-200'}`}
                        >
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
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">Certificados gerados com assinatura</div>
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
                                                <div className={`text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${cert.status === 'sent' ? 'text-emerald-600 bg-emerald-50' : cert.status === 'error' ? 'text-red-600 bg-red-50' : 'text-purple-600 bg-purple-50'}`}>
                                                    {cert.status === 'sent' ? '✓ Enviado' : cert.status === 'error' ? 'Falhou' : 'Gerado'}
                                                </div>
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
                                            <p className="text-slate-400 text-sm font-bold mt-2">Clique em “Visualizar” para conferir o certificado com a assinatura salva.</p>
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
                            <li>O certificado em massa agora busca a assinatura salva na área Assinaturas.</li>
                            <li>Se existir uma assinatura salva, ela aparece como imagem no certificado.</li>
                            <li>Se não existir assinatura salva, o sistema avisa antes de gerar.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Stat: React.FC<{ label: string; value: number; tone: 'blue' | 'emerald' | 'purple' | 'orange' }> = ({ label, value, tone }) => {
    const tones = {
        blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600 text-blue-900',
        emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600 text-emerald-900',
        purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600 text-purple-900',
        orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-600 text-orange-900',
    };
    const classes = tones[tone].split(' ');
    return (
        <div className={`bg-gradient-to-br ${classes[0]} ${classes[1]} p-6 rounded-2xl border ${classes[2]}`}>
            <div className={`text-sm font-bold ${classes[3]} uppercase tracking-widest mb-2`}>{label}</div>
            <div className={`text-3xl font-black ${classes[4]}`}>{value}</div>
        </div>
    );
};
