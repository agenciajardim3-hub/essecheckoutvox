import React, { useMemo, useState } from 'react';
import { Send, GraduationCap, Loader2, Check, Mail, AlertCircle, FileCheck, Link as LinkIcon, XCircle, Eye, ExternalLink, X } from 'lucide-react';
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
    certificateUrl: string;
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

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

    const buildCertificateUrl = (lead: Lead) => {
        return `${window.location.origin}/?mode=certificate&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`;
    };

    const handleGenerateCertificates = async () => {
        if (!selectedTurma) {
            alert('Selecione uma turma');
            return;
        }

        if (turmaLeads.length === 0) {
            alert('Nenhum aluno pago com email e CPF nesta turma');
            return;
        }

        setIsGenerating(true);
        setSendingStatus('generating');
        setStatusMessage('Gerando certificados em massa...');
        setGeneratedCertificates([]);
        setSelectedCertificate(null);
        setSentCount(0);
        setFailedCount(0);

        try {
            const generated: GeneratedCertificate[] = turmaLeads.map((lead) => ({
                id: crypto.randomUUID(),
                leadId: lead.id,
                name: lead.name || 'Aluno',
                email: lead.email || '',
                cpf: lead.cpf || '',
                productName: lead.product_name || selectedTurma,
                turma: lead.turma || selectedTurma,
                certificateUrl: buildCertificateUrl(lead),
                status: 'generated',
                message: 'Certificado gerado e pronto para envio',
            }));

            setGeneratedCertificates(generated);
            setSelectedCertificate(generated[0] || null);
            setSendingStatus('completed');
            setStatusMessage(`✓ ${generated.length} certificado(s) gerado(s) em massa. Revise a prévia e depois envie por email.`);
        } catch (error) {
            console.error('Erro ao gerar certificados em massa:', error);
            setSendingStatus('error');
            setStatusMessage(error instanceof Error ? error.message : 'Erro ao gerar certificados');
        } finally {
            setIsGenerating(false);
        }
    };

    const sendCertificateEmail = async (certificate: GeneratedCertificate) => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (SUPABASE_ANON_KEY) {
            headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
            headers.apikey = SUPABASE_ANON_KEY;
        }

        const htmlMessage = `
            <p>Olá <strong>${escapeHtml(certificate.name)}</strong>,</p>
            <p>Parabéns pela conclusão do curso <strong>${escapeHtml(certificate.productName)}</strong>!</p>
            <p>Seu certificado individual foi gerado com sucesso.</p>
            <p style="margin-top: 22px;">
                <a href="${certificate.certificateUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:bold;">
                    Abrir meu certificado
                </a>
            </p>
            <p style="font-size:13px;color:#6b7280;margin-top:22px;">
                Caso o botão não funcione, copie e cole este link no navegador:<br />
                ${certificate.certificateUrl}
            </p>
            <p style="margin-top:26px;">Atenciosamente,<br /><strong>Vox Marketing Academy</strong></p>
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

        if (!response.ok || result.error) {
            throw new Error(result.error || result.message || 'Erro ao enviar certificado por email');
        }

        return result;
    };

    const updateCertificateStatus = (id: string, status: GeneratedCertificate['status'], message: string) => {
        setGeneratedCertificates((previous) => previous.map((cert) => cert.id === id ? { ...cert, status, message } : cert));
        setSelectedCertificate((previous) => previous?.id === id ? { ...previous, status, message } : previous);
    };

    const handleSendGeneratedCertificates = async () => {
        if (generatedCertificates.length === 0) {
            alert('Primeiro gere os certificados em massa');
            return;
        }

        const certificatesToSend = generatedCertificates.filter((cert) => cert.status === 'generated' || cert.status === 'error');

        if (certificatesToSend.length === 0) {
            alert('Todos os certificados gerados já foram enviados');
            return;
        }

        const confirmSend = confirm(
            `Enviar ${certificatesToSend.length} certificado(s) gerado(s) por email?\n\nCada aluno receberá seu link individual.`
        );

        if (!confirmSend) return;

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
        setStatusMessage(
            `✓ ${successful} certificado(s) enviado(s)${failed > 0 ? `, ${failed} falharam` : ''}`
        );
    };

    const handleGenerateAndSend = async () => {
        await handleGenerateCertificates();
        setTimeout(() => {
            setStatusMessage('Certificados gerados. Confira a prévia e clique em “Enviar Certificados Gerados”.');
        }, 200);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Certificados em Massa</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Gere certificados individuais em massa, visualize cada certificado e envie por email
                    </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
                    <FileCheck size={32} className="text-purple-600" />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                        <div className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">Turmas</div>
                        <div className="text-3xl font-black text-blue-900">{turmas.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
                        <div className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-2">Alunos</div>
                        <div className="text-3xl font-black text-emerald-900">{turmaLeads.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                        <div className="text-sm font-bold text-purple-600 uppercase tracking-widest mb-2">Gerados</div>
                        <div className="text-3xl font-black text-purple-900">{generatedCount}</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
                        <div className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-2">Pendentes</div>
                        <div className="text-3xl font-black text-orange-900">{pendingToSend}</div>
                    </div>
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
                                return (
                                    <option key={turma} value={turma}>
                                        {turma} ({turmaLeadCount} aluno{turmaLeadCount !== 1 ? 's' : ''})
                                    </option>
                                );
                            })}
                        </select>
                        <p className="text-xs text-gray-400 font-bold mt-2">
                            Só entram alunos pagos/aprovados com email e CPF cadastrados.
                        </p>
                    </div>

                    {selectedTurma && turmaLeads.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-black text-blue-900 text-sm mb-1">
                                        {turmaLeads.length} aluno{turmaLeads.length !== 1 ? 's' : ''} pronto{turmaLeads.length !== 1 ? 's' : ''} para gerar certificado
                                    </div>
                                    <div className="text-xs text-blue-700">
                                        O sistema vai criar um link individual de certificado para cada aluno, usando checkout + CPF.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleGenerateCertificates}
                            disabled={isGenerating || isSending || !selectedTurma || turmaLeads.length === 0}
                            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${
                                isGenerating || isSending || !selectedTurma || turmaLeads.length === 0
                                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:-translate-y-1 shadow-purple-200'
                            }`}
                        >
                            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Gerando...</> : <><FileCheck size={18} /> Gerar Certificados em Massa</>}
                        </button>

                        <button
                            onClick={handleSendGeneratedCertificates}
                            disabled={isSending || isGenerating || generatedCertificates.length === 0 || pendingToSend === 0}
                            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${
                                isSending || isGenerating || generatedCertificates.length === 0 || pendingToSend === 0
                                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:-translate-y-1 shadow-emerald-200'
                            }`}
                        >
                            {isSending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar Certificados Gerados</>}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerateAndSend}
                        disabled={isGenerating || isSending || !selectedTurma || turmaLeads.length === 0}
                        className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Fluxo recomendado: primeiro gerar em massa, revisar a prévia, depois enviar
                    </button>

                    {sendingStatus !== 'idle' && (
                        <div className={`rounded-2xl p-4 border-2 ${
                            sendingStatus === 'sending' || sendingStatus === 'generating' ? 'bg-blue-50 border-blue-200' :
                            sendingStatus === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                            'bg-red-50 border-red-200'
                        }`}>
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
                                    <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                        Certificados gerados em massa
                                    </div>
                                    <div className="text-[10px] font-black text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">
                                        Enviados: {sentCount} | Falhas: {failedCount}
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-[520px] overflow-y-auto">
                                    {generatedCertificates.map((cert, idx) => (
                                        <div key={cert.id} className={`p-3 bg-white rounded-xl border transition-all ${selectedCertificate?.id === cert.id ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-300'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-xs font-black text-purple-600 flex-shrink-0">{idx + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm truncate">{cert.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{cert.email}</div>
                                                    <div className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-1">
                                                        <LinkIcon size={10} /> {cert.certificateUrl}
                                                    </div>
                                                    {cert.message && <div className="text-[10px] text-gray-500 font-bold mt-1">{cert.message}</div>}
                                                </div>
                                                <div className={`text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${
                                                    cert.status === 'sent' ? 'text-emerald-600 bg-emerald-50' :
                                                    cert.status === 'error' ? 'text-red-600 bg-red-50' :
                                                    'text-purple-600 bg-purple-50'
                                                }`}>
                                                    {cert.status === 'sent' ? '✓ Enviado' : cert.status === 'error' ? 'Falhou' : 'Gerado'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <button
                                                    onClick={() => setSelectedCertificate(cert)}
                                                    className="px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-black uppercase hover:bg-purple-100 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <Eye size={13} /> Visualizar
                                                </button>
                                                <button
                                                    onClick={() => window.open(cert.certificateUrl, '_blank')}
                                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <ExternalLink size={13} /> Abrir
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 min-h-[520px]">
                                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-white font-black text-sm">Prévia do certificado</p>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate max-w-[260px]">
                                            {selectedCertificate ? selectedCertificate.name : 'Selecione um certificado'}
                                        </p>
                                    </div>
                                    {selectedCertificate && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => window.open(selectedCertificate.certificateUrl, '_blank')} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20" title="Abrir em nova aba">
                                                <ExternalLink size={15} />
                                            </button>
                                            <button onClick={() => setSelectedCertificate(null)} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20" title="Fechar prévia">
                                                <X size={15} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedCertificate ? (
                                    <div className="h-[620px] bg-white">
                                        <iframe
                                            title={`Prévia certificado ${selectedCertificate.name}`}
                                            src={selectedCertificate.certificateUrl}
                                            className="w-full h-full border-0"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-[620px] flex items-center justify-center text-center p-8">
                                        <div>
                                            <Eye size={42} className="text-slate-600 mx-auto mb-4" />
                                            <p className="text-white font-black">Nenhum certificado selecionado</p>
                                            <p className="text-slate-400 text-sm font-bold mt-2">Clique em “Visualizar” na lista ao lado para conferir o certificado gerado.</p>
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
                            <li>Primeiro o sistema gera um certificado individual para cada aluno da turma.</li>
                            <li>Depois você visualiza cada certificado na prévia dentro do painel.</li>
                            <li>Se estiver tudo certo, envie por email direto pelo Supabase.</li>
                            <li>Cada pessoa recebe um link exclusivo usando o CPF e o checkout correto.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
