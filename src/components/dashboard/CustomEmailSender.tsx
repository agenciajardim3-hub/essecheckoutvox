import React, { useState } from 'react';
import { Mail, Send, Loader2, Check, AlertCircle } from 'lucide-react';

interface CustomEmailSenderProps {
    userRole: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';
const SEND_EMAIL_ENDPOINT = `${SUPABASE_URL}/functions/v1/send-ticket-email`;

export const CustomEmailSender: React.FC<CustomEmailSenderProps> = ({ userRole }) => {
    const [recipientEmail, setRecipientEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const testEmail = import.meta.env.VITE_TEST_EMAIL || 'rodrigomesquita58@gmail.com';

    const sendEmail = async (email: string, isTest: boolean = false) => {
        if (!subject.trim() || !htmlBody.trim()) {
            setErrorMessage('Assunto e corpo são obrigatórios');
            return;
        }

        if (!isTest && !email.trim()) {
            setErrorMessage('Email do destinatário é obrigatório');
            return;
        }

        setIsSending(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const targetEmail = isTest ? testEmail : email.trim();

            const response = await fetch(SEND_EMAIL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    to: targetEmail,
                    name: isTest ? 'Teste' : 'Destinatário',
                    subject,
                    productName: 'Vox Marketing Academy',
                    message: htmlBody,
                    ticketUrl: '',
                    certificateUrl: ''
                })
            });

            const responseText = await response.text();
            let result: any = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(`Resposta inválida da função: ${responseText.slice(0, 120)}`);
            }

            if (!response.ok || result.error) {
                throw new Error(result.error || result.message || 'Erro ao enviar email');
            }

            setSuccessMessage(
                isTest
                    ? `Email de teste enviado para ${targetEmail}`
                    : `Email enviado para ${targetEmail}`
            );

            if (!isTest) {
                setRecipientEmail('');
                setSubject('');
                setHtmlBody('');
            }
        } catch (err) {
            setErrorMessage(`Erro ao enviar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setIsSending(false);
        }
    };

    if (userRole !== 'master') {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Mail size={20} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Envio de Email Personalizado</h3>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">
                        Email do Destinatário
                    </label>
                    <input
                        type="email"
                        placeholder="exemplo@email.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">
                        Assunto
                    </label>
                    <input
                        type="text"
                        placeholder="Assunto do email"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">
                        Corpo do Email (HTML)
                    </label>
                    <textarea
                        placeholder="Digite o conteúdo do email em HTML. Exemplo: <p>Olá!</p><p>Este é um email de teste.</p>"
                        value={htmlBody}
                        onChange={(e) => setHtmlBody(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-xs text-gray-700 bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        💡 Dica: Use HTML para formatação. Exemplo: <code className="bg-gray-100 px-2 py-1 rounded">&lt;b&gt;texto em negrito&lt;/b&gt;</code>
                    </p>
                </div>

                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                        <Check size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-emerald-700">{successMessage}</p>
                    </div>
                )}

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                        <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-red-700">{errorMessage}</p>
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => sendEmail('', true)}
                    disabled={isSending || !subject.trim() || !htmlBody.trim()}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200"
                >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Enviar Teste
                </button>

                <button
                    onClick={() => sendEmail(recipientEmail)}
                    disabled={isSending || !recipientEmail.trim() || !subject.trim() || !htmlBody.trim()}
                    className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm uppercase hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Enviar
                </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
                📧 Email de teste será enviado para: <strong>{testEmail}</strong>
            </p>
        </div>
    );
};
