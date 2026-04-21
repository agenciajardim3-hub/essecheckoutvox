import React, { useState } from 'react';
import { Mail, Send, Loader2, TestTube, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useSupabase } from '../../services/useSupabase';

interface EmailSenderProps {
    onClose?: () => void;
}

export const EmailSender: React.FC<EmailSenderProps> = ({ onClose }) => {
    const supabase = useSupabase();
    const [recipientEmail, setRecipientEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const handleSendTest = async () => {
        const testEmail = import.meta.env.VITE_ADMIN_EMAIL;
        if (!testEmail) {
            setMessage({ type: 'error', text: 'VITE_ADMIN_EMAIL não configurado no .env' });
            return;
        }
        await sendEmail(testEmail, true);
    };

    const handleSend = async () => {
        if (!recipientEmail) {
            setMessage({ type: 'error', text: 'Por favor, insira o email do destinatário' });
            return;
        }
        if (!subject || !body) {
            setMessage({ type: 'error', text: 'Por favor, preencha o assunto e o corpo do email' });
            return;
        }
        await sendEmail(recipientEmail, false);
    };

    const sendEmail = async (to: string, isTest: boolean) => {
        setIsSending(true);
        setMessage(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    to,
                    subject: isTest ? `[TESTE] ${subject}` : subject,
                    body,
                    isHtml: true
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ao enviar: ${response.statusText}`);
            }

            setMessage({ 
                type: 'success', 
                text: isTest 
                    ? `Email de teste enviado para ${to}!` 
                    : `Email enviado com sucesso para ${to}!`
            });
        } catch (err: any) {
            console.error('Email error:', err);
            setMessage({ 
                type: 'error', 
                text: err.message || 'Falha ao enviar email. Verifique a configuração da Edge Function.' 
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Mail className="text-white" size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-lg">Envio de Email Personalizado</h3>
                        <p className="text-blue-100 text-xs font-medium">Compose and send custom emails</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {message && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${
                        message.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                        <span className="font-bold text-sm">{message.text}</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                        Destinatário
                    </label>
                    <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                        Assunto
                    </label>
                    <input
                        type="text"
                        placeholder="Assunto do email"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                            Corpo do Email (HTML)
                        </label>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showPreview ? 'Editar' : 'Pré-visualizar'}
                        </button>
                    </div>
                    
                    {showPreview ? (
                        <div 
                            className="w-full min-h-[300px] p-4 border border-gray-200 rounded-xl bg-gray-50 overflow-auto"
                            dangerouslySetInnerHTML={{ __html: body }}
                        />
                    ) : (
                        <textarea
                            placeholder="<h1>Título</h1><p>Seu conteúdo HTML aqui...</p>"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full min-h-[300px] px-4 py-3 border border-gray-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                    )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleSendTest}
                        disabled={isSending || !subject || !body}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <TestTube size={18} />}
                        Enviar Teste
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || !recipientEmail || !subject || !body}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};