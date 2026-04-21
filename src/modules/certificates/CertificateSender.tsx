import React, { useState, useMemo } from 'react';
import { Send, GraduationCap, Loader2, Check, Mail, AlertCircle } from 'lucide-react';
import { Lead, AppConfig } from '../../shared';

interface CertificateSenderProps {
    leads: Lead[];
    checkouts: AppConfig[];
}

export const CertificateSender: React.FC<CertificateSenderProps> = ({ leads, checkouts }) => {
    const [selectedTurma, setSelectedTurma] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'completed' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    // Get unique turmas from leads
    const turmas = useMemo(() => {
        const turmaSet = new Set<string>();
        leads.forEach(l => {
            if (l.turma) turmaSet.add(l.turma);
        });
        return Array.from(turmaSet).sort();
    }, [leads]);

    // Filter leads by selected turma that have paid status
    const turmaLeads = useMemo(() => {
        if (!selectedTurma) return [];
        return leads.filter(
            l => l.turma === selectedTurma &&
            (l.status === 'Pago' || l.status === 'Aprovado') &&
            l.email
        );
    }, [leads, selectedTurma]);

    const handleSendCertificates = async () => {
        if (!selectedTurma) {
            alert('Selecione uma turma');
            return;
        }

        if (turmaLeads.length === 0) {
            alert('Nenhum aluno com pagamento confirmado nesta turma');
            return;
        }

        const confirmSend = confirm(
            `Enviar certificados para ${turmaLeads.length} aluno(s) da turma ${selectedTurma}?\n\nEach aluno receberá seu certificado correto por email.`
        );

        if (!confirmSend) return;

        setIsSending(true);
        setSendingStatus('sending');
        setSentCount(0);
        setFailedCount(0);
        setStatusMessage('Iniciando envio de certificados...');

        let successful = 0;
        let failed = 0;

        for (const lead of turmaLeads) {
            try {
                setStatusMessage(`Enviando para ${lead.name}...`);

                // Generate certificate URL
                const certUrl = `${window.location.origin}/?mode=certificate&checkout=${lead.product_id}&cpf=${lead.cpf}`;

                // Try to send via fetch - this would need a backend endpoint
                const response = await fetch('/api/send-certificate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: lead.email,
                        name: lead.name,
                        turma: selectedTurma,
                        certificateUrl: certUrl,
                        productName: lead.product_name
                    })
                });

                if (response.ok) {
                    successful++;
                    setSentCount(successful);
                } else {
                    // Fallback: Open mailto link
                    const subject = encodeURIComponent(`Seu Certificado - ${lead.product_name || 'Curso'}`);
                    const body = encodeURIComponent(
                        `Olá ${lead.name},\n\nParabéns pela conclusão do curso!\n\nSegue o link do seu certificado:\n${certUrl}\n\nAbs`
                    );
                    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank');
                    successful++;
                    setSentCount(successful);
                }

                // Add small delay to avoid overwhelming
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
                console.error(`Erro ao enviar para ${lead.name}:`, err);
                failed++;
                setFailedCount(failed);
            }
        }

        setIsSending(false);
        setSendingStatus('completed');
        setStatusMessage(
            `✓ ${successful} certificados enviados${failed > 0 ? `, ${failed} falharam` : ''}`
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Enviar Certificados</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Envie certificados automaticamente para todos os alunos de uma turma
                    </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
                    <Mail size={32} className="text-purple-600" />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                        <div className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">
                            Turmas Disponíveis
                        </div>
                        <div className="text-3xl font-black text-blue-900">{turmas.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200">
                        <div className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-2">
                            Alunos Selecionados
                        </div>
                        <div className="text-3xl font-black text-emerald-900">{turmaLeads.length}</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                        <div className="text-sm font-bold text-purple-600 uppercase tracking-widest mb-2">
                            Certificados Enviados
                        </div>
                        <div className="text-3xl font-black text-purple-900">{sentCount}</div>
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
                            }}
                            disabled={isSending}
                            className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">-- Selecione uma turma --</option>
                            {turmas.map(turma => {
                                const turmaLeadCount = leads.filter(
                                    l => l.turma === turma &&
                                    (l.status === 'Pago' || l.status === 'Aprovado') &&
                                    l.email
                                ).length;
                                return (
                                    <option key={turma} value={turma}>
                                        {turma} ({turmaLeadCount} aluno{turmaLeadCount !== 1 ? 's' : ''})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {selectedTurma && turmaLeads.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-black text-blue-900 text-sm mb-1">
                                        {turmaLeads.length} aluno{turmaLeads.length !== 1 ? 's' : ''} receberá{turmaLeads.length !== 1 ? 'ão' : ''} certificado{turmaLeads.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="text-xs text-blue-700">
                                        Cada aluno receberá seu certificado correto por email
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTurma && turmaLeads.length > 0 && (
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
                                Alunos que receberão certificado:
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {turmaLeads.map((lead, idx) => (
                                    <div
                                        key={lead.id}
                                        className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-all"
                                    >
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-xs font-black text-purple-600 flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-sm truncate">
                                                {lead.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {lead.email}
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0">
                                            ✓ Pago
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sendingStatus !== 'idle' && (
                        <div className={`rounded-2xl p-4 border-2 ${
                            sendingStatus === 'sending'
                                ? 'bg-blue-50 border-blue-200'
                                : sendingStatus === 'completed'
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3">
                                {sendingStatus === 'sending' && (
                                    <Loader2 size={20} className="text-blue-600 animate-spin" />
                                )}
                                {sendingStatus === 'completed' && (
                                    <Check size={20} className="text-emerald-600" />
                                )}
                                <div>
                                    <div className={`font-bold text-sm ${
                                        sendingStatus === 'sending'
                                            ? 'text-blue-900'
                                            : sendingStatus === 'completed'
                                            ? 'text-emerald-900'
                                            : 'text-red-900'
                                    }`}>
                                        {statusMessage}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSendCertificates}
                        disabled={isSending || !selectedTurma || turmaLeads.length === 0}
                        className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${
                            isSending || !selectedTurma || turmaLeads.length === 0
                                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:-translate-y-1 shadow-purple-200'
                        }`}
                    >
                        {isSending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Enviar {turmaLeads.length > 0 ? `Certificados (${turmaLeads.length})` : 'Certificados'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-amber-800">
                        <div className="font-bold mb-2">ℹ️ Como funciona:</div>
                        <ul className="space-y-1 text-xs list-disc list-inside">
                            <li>Selecione uma turma para ver todos os alunos que pagaram</li>
                            <li>Clique em "Enviar Certificados" para iniciar o envio</li>
                            <li>Cada aluno receberá um link direto para SEU certificado correto</li>
                            <li>Os emails serão abertos no seu cliente de email para confirmação</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
