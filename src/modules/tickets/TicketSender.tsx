import React, { useState, useMemo } from 'react';
import { Send, GraduationCap, Loader2, Check, Mail, MessageCircle, Image as ImageIcon, Type, AlertCircle, Copy, Eye } from 'lucide-react';
import { Lead, AppConfig } from '../../shared';

interface TicketSenderProps {
    leads: Lead[];
    checkouts: AppConfig[];
    uploadService: (file: File) => Promise<string | null>;
    isUploading: string | null;
}

export const TicketSender: React.FC<TicketSenderProps> = ({ leads, checkouts, uploadService, isUploading }) => {
    const [selectedTurma, setSelectedTurma] = useState<string>('');
    const [messageText, setMessageText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email'>('whatsapp');
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
            (sendMethod === 'email' ? l.email : l.phone)
        );
    }, [leads, selectedTurma, sendMethod]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = await uploadService(file);
        if (url) {
            setImageUrl(url);
        }
    };

    const handleSendTickets = async () => {
        if (!selectedTurma) {
            alert('Selecione uma turma');
            return;
        }

        if (turmaLeads.length === 0) {
            alert('Nenhum aluno com pagamento confirmado nesta turma');
            return;
        }

        if (!messageText.trim()) {
            alert('Escreva uma mensagem para enviar');
            return;
        }

        const confirmSend = confirm(
            `Enviar ingressos para ${turmaLeads.length} aluno(s) via ${sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}?\n\nEach aluno receberá seu ingresso único.`
        );

        if (!confirmSend) return;

        setIsSending(true);
        setSendingStatus('sending');
        setSentCount(0);
        setFailedCount(0);
        setStatusMessage('Iniciando envio de ingressos...');

        let successful = 0;
        let failed = 0;

        for (const lead of turmaLeads) {
            try {
                setStatusMessage(`Enviando para ${lead.name}...`);

                // Generate ticket URL
                const ticketUrl = `${window.location.origin}/?mode=ticket&checkout=${lead.product_id}&cpf=${lead.cpf}`;

                if (sendMethod === 'whatsapp') {
                    // WhatsApp message
                    const phoneNumber = lead.phone?.replace(/\D/g, '');
                    if (!phoneNumber) {
                        failed++;
                        setFailedCount(failed);
                        continue;
                    }

                    let whatsappMessage = messageText;
                    whatsappMessage += `\n\n🎫 Seu Ingresso: ${ticketUrl}`;
                    if (imageUrl) {
                        whatsappMessage += `\n📸 Imagem: ${imageUrl}`;
                    }

                    const encodedMessage = encodeURIComponent(whatsappMessage);
                    const whatsappLink = `https://wa.me/55${phoneNumber}?text=${encodedMessage}`;
                    window.open(whatsappLink, '_blank');

                    successful++;
                    setSentCount(successful);
                } else {
                    // Email
                    if (!lead.email) {
                        failed++;
                        setFailedCount(failed);
                        continue;
                    }

                    let emailBody = messageText;
                    emailBody += `\n\n🎫 Seu Ingresso: ${ticketUrl}`;
                    if (imageUrl) {
                        emailBody += `\n📸 Imagem: ${imageUrl}`;
                    }

                    const subject = encodeURIComponent(`Seu Ingresso - ${lead.product_name || 'Curso'}`);
                    const body = encodeURIComponent(emailBody);
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
            `✓ ${successful} ingressos enviados${failed > 0 ? `, ${failed} falharam` : ''}`
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Enviar Ingressos</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Envie ingressos com mensagem personalizada via WhatsApp ou Email
                    </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center">
                    <Mail size={32} className="text-blue-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 p-8 space-y-6">
                    {/* Turma Selection */}
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
                            className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">-- Selecione uma turma --</option>
                            {turmas.map(turma => {
                                const turmaLeadCount = leads.filter(
                                    l => l.turma === turma &&
                                    (l.status === 'Pago' || l.status === 'Aprovado')
                                ).length;
                                return (
                                    <option key={turma} value={turma}>
                                        {turma} ({turmaLeadCount} aluno{turmaLeadCount !== 1 ? 's' : ''})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Send Method Selection */}
                    <div>
                        <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
                            Método de Envio *
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSendMethod('whatsapp')}
                                disabled={isSending}
                                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                                    sendMethod === 'whatsapp'
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400'
                                } disabled:opacity-50`}
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>
                            <button
                                onClick={() => setSendMethod('email')}
                                disabled={isSending}
                                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                                    sendMethod === 'email'
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'
                                } disabled:opacity-50`}
                            >
                                <Mail size={16} /> Email
                            </button>
                        </div>
                    </div>

                    {/* Message Text */}
                    <div>
                        <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
                            <Type size={16} className="inline mr-2" /> Mensagem Personalizada *
                        </label>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            disabled={isSending}
                            placeholder="Ex: Olá! 🎉 Aqui está seu ingresso para o curso. Não se esqueça de confirmar sua presença!"
                            className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none h-32"
                        />
                        <div className="text-xs text-gray-400 mt-2">
                            O link do ingresso será adicionado automaticamente ao final
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">
                            <ImageIcon size={16} className="inline mr-2" /> Imagem (Opcional)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isSending || isUploading === 'ticket-image'}
                                className="hidden"
                                id="ticket-image-input"
                            />
                            {!imageUrl ? (
                                <label
                                    htmlFor="ticket-image-input"
                                    className={`block px-6 py-8 rounded-2xl border-2 border-dashed border-gray-300 text-center cursor-pointer transition-all ${
                                        isSending || isUploading === 'ticket-image'
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:border-blue-500 hover:bg-blue-50'
                                    }`}
                                >
                                    {isUploading === 'ticket-image' ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 size={20} className="animate-spin text-blue-600" />
                                            <span className="font-bold text-blue-600">Enviando imagem...</span>
                                        </div>
                                    ) : (
                                        <div>
                                            <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                                            <div className="font-bold text-gray-700">Clique para adicionar imagem</div>
                                            <div className="text-xs text-gray-500 mt-1">PNG, JPG ou GIF (máx 10MB)</div>
                                        </div>
                                    )}
                                </label>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        className="w-full h-48 object-cover rounded-2xl border-2 border-gray-200"
                                    />
                                    <button
                                        onClick={() => setImageUrl('')}
                                        className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Messages */}
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

                    {/* Send Button */}
                    <button
                        onClick={handleSendTickets}
                        disabled={isSending || !selectedTurma || turmaLeads.length === 0 || !messageText.trim()}
                        className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${
                            isSending || !selectedTurma || turmaLeads.length === 0 || !messageText.trim()
                                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:-translate-y-1 shadow-blue-200'
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
                                Enviar {turmaLeads.length > 0 ? `Ingressos (${turmaLeads.length})` : 'Ingressos'}
                            </>
                        )}
                    </button>
                </div>

                {/* Preview Sidebar */}
                <div className="lg:col-span-1 bg-gray-50 rounded-3xl border border-gray-200 p-6 h-fit sticky top-24">
                    <div className="flex items-center gap-2 mb-6">
                        <Eye size={18} className="text-gray-700" />
                        <h3 className="font-black text-gray-900">Pré-visualização</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Message Preview */}
                        <div className="bg-white rounded-2xl p-4 border border-gray-200">
                            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Mensagem</div>
                            {messageText ? (
                                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                    {messageText}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400 italic">Digite uma mensagem...</div>
                            )}
                        </div>

                        {/* Image Preview */}
                        {imageUrl && (
                            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Imagem</div>
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="w-full h-32 object-cover rounded-lg"
                                />
                            </div>
                        )}

                        {/* Recipients Info */}
                        <div className="bg-white rounded-2xl p-4 border border-gray-200">
                            <div className="text-xs font-bold text-gray-500 uppercase mb-3">Informações</div>
                            <div className="space-y-2">
                                <div>
                                    <div className="text-xs text-gray-600">Turma</div>
                                    <div className="font-bold text-gray-900">
                                        {selectedTurma || 'Nenhuma selecionada'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Método</div>
                                    <div className="font-bold text-gray-900">
                                        {sendMethod === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Alunos que receberão</div>
                                    <div className="font-bold text-gray-900">
                                        {turmaLeads.length > 0 ? turmaLeads.length : 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-amber-800">
                        <div className="font-bold mb-2">ℹ️ Como funciona:</div>
                        <ul className="space-y-1 text-xs list-disc list-inside">
                            <li>Selecione uma turma para ver todos os alunos que pagaram</li>
                            <li>Escolha o método: WhatsApp (mais rápido) ou Email</li>
                            <li>Escreva sua mensagem personalizada</li>
                            <li>Adicione uma imagem opcional (banner, flyer, etc)</li>
                            <li>Clique em "Enviar Ingressos" - cada aluno receberá seu ingresso único</li>
                            <li>Os links se abrem no seu navegador para confirmar antes de enviar</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
