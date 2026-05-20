import React, { useState, useRef } from 'react';
import { Mail, Send, Loader2, Check, AlertCircle, Upload, Image as ImageIcon, X } from 'lucide-react';

interface CustomEmailSenderProps {
    userRole: string;
}

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';
const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';

export const CustomEmailSender: React.FC<CustomEmailSenderProps> = ({ userRole }) => {
    const [recipientEmail, setRecipientEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const testEmail = import.meta.env.VITE_TEST_EMAIL || 'rodrigomesquita58@gmail.com';
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    message: imageUrl.trim()
                        ? `${htmlBody}\n<div style="text-align:center;margin:20px 0;"><img src="${imageUrl.trim()}" alt="Imagem" style="max-width:100%;height:auto;border-radius:12px;" /></div>`
                        : htmlBody,
                    ticketUrl: '',
                    certificateUrl: '',
                    preserveCertificateLayout: true
                })
            });

            const responseText = await response.text();
            let result: any = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(`Resposta inválida da função. Endpoint chamado: ${SEND_EMAIL_ENDPOINT}. Resposta: ${responseText.slice(0, 120)}`);
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
                        Modelos Prontos
                    </label>
                    <select
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-sm mb-4 bg-gray-50 text-gray-700"
                        onChange={(e) => {
                            if (e.target.value) {
                                setHtmlBody(e.target.value);
                            }
                        }}
                    >
                        <option value="">Selecione um template lindo...</option>
                        <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Bem-vindo(a) à Vox! 🚀</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>[Nome do Aluno]</b>,</p>
    <p>É um prazer ter você conosco! Sua jornada de aprendizado acaba de começar.</p>
    <p>Prepare-se para ter acesso aos melhores conteúdos e um suporte de primeira linha.</p>
    <br/>
    <p>Qualquer dúvida, estamos à disposição!</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
    &copy; ${new Date().getFullYear()} Vox Marketing Academy. Todos os direitos reservados.
  </div>
</div>`}>Boas Vindas (Azul/Roxo)</option>
                        <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: #111827; padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px; color: #f59e0b;">Oferta Exclusiva Liberada! ⚡</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6; text-align: center;">
    <p>Olá,</p>
    <p>Liberamos uma oportunidade única para você dar o próximo passo.</p>
    <p>Garanta sua vaga no nosso novo treinamento com <b>condições especiais</b> apenas para quem já é aluno!</p>
    <div style="margin: 30px 0;">
      <a href="SEU_LINK_AQUI" style="background: #f59e0b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">GARANTIR MINHA VAGA</a>
    </div>
    <p style="font-size: 12px; color: #9ca3af;">Atenção: Oferta válida por tempo limitadíssimo.</p>
  </div>
</div>`}>Oferta Exclusiva (Escuro/Dourado)</option>
                        <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-left: 4px solid #ef4444; background: #fef2f2; border-radius: 8px; overflow: hidden;">
  <div style="padding: 30px 20px; color: #7f1d1d; line-height: 1.6;">
    <h2 style="margin-top: 0; color: #991b1b;">⚠️ Aviso Importante</h2>
    <p>Olá,</p>
    <p>Gostaríamos de informar sobre uma atualização importante no seu acesso ao sistema.</p>
    <p>[Descreva sua atualização aqui]</p>
    <br/>
    <p>Atenciosamente,<br/><b>Equipe Vox</b></p>
  </div>
</div>`}>Aviso Urgente (Vermelho)</option>
                        <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Falta Pouco! ⏳</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>[Nome do Aluno]</b>,</p>
    <p>O grande dia está chegando! Faltam poucos dias para o nosso encontro.</p>
    <p>Recomendamos que você se prepare, separe seu material e chegue com antecedência para aproveitar tudo ao máximo.</p>
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <b>📅 Data:</b> [Data do Evento]<br/>
      <b>📍 Local:</b> [Local / Link do Zoom]
    </div>
    <p>Estamos muito animados para te ver lá!</p>
  </div>
</div>`}>Tá Chegando a Hora (Verde Esmeralda)</option>
                        <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #f3f4f6;">
    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
    <h1 style="margin: 0; font-size: 24px; color: #111827;">Pagamento Confirmado!</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>[Nome do Aluno]</b>,</p>
    <p>Recebemos o seu pagamento com sucesso. Sua vaga já está 100% garantida.</p>
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">Resumo da Compra</p>
      <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #0f172a;">[Nome do Curso / Treinamento]</p>
    </div>
    <p>Em breve você receberá mais instruções sobre os próximos passos. Se precisar de ajuda, basta responder este email.</p>
    <p>Bem-vindo(a) ao time!</p>
  </div>
</div>`}>Pagamento Confirmado (Branco/Clean)</option>
                        <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: #25D366; padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Entre no Grupo VIP 💬</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6; text-align: center;">
    <p>Olá <b>[Nome do Aluno]</b>,</p>
    <p>Toda a nossa comunicação oficial, links de aulas, materiais e avisos importantes serão enviados <b>exclusivamente</b> através do nosso Grupo VIP no WhatsApp.</p>
    <p>Não fique de fora! Clique no botão abaixo para entrar agora mesmo:</p>
    <div style="margin: 30px 0;">
      <a href="SEU_LINK_DO_GRUPO_AQUI" style="background: #128C7E; color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">ENTRAR NO GRUPO VIP</a>
    </div>
    <p style="font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 15px; border-radius: 8px;">
      <b>Regra importante:</b> O grupo é silenciado e apenas os administradores enviam mensagens. Fique tranquilo, você não será incomodado!
    </p>
  </div>
</div>`}>Link do Grupo WhatsApp (Verde Zap)</option>
                    </select>

                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">
                        Corpo do Email (HTML)
                    </label>
                    <textarea
                        placeholder="Digite o conteúdo do email em HTML ou escolha um modelo acima."
                        value={htmlBody}
                        onChange={(e) => setHtmlBody(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-xs text-gray-700 bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        💡 Dica: Você pode editar o HTML livremente após carregar um modelo.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">
                        Imagem / Mídia
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-violet-400 transition-all flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-violet-600 bg-gray-50"
                        >
                            <Upload size={16} /> Fazer Upload
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                    setErrorMessage('Imagem muito grande. Máximo 5MB.');
                                    return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                    setImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                            }}
                        />
                        <span className="text-xs text-gray-400 self-center">ou</span>
                        <input
                            type="url"
                            placeholder="Cole a URL da imagem"
                            value={imageUrl.startsWith('data:') ? '' : imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold text-xs"
                        />
                    </div>
                    {imageUrl && (
                        <div className="mt-3 relative inline-block">
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="max-h-32 rounded-lg border border-gray-200 shadow-sm"
                                onError={() => setErrorMessage('Não foi possível carregar a imagem')}
                            />
                            <button
                                type="button"
                                onClick={() => setImageUrl('')}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
                            >
                                <X size={14} />
                            </button>
                            <p className="text-xs text-emerald-600 font-bold mt-1">✓ Imagem carregada</p>
                        </div>
                    )}
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
