import React, { useMemo, useState } from 'react';
import { Mail, Settings, Send, Loader2, Check, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Lead, AppConfig } from '../../types';

interface EmailMarketingDashboardProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

type EmailConfig = {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
};

type SentLog = {
  id: string;
  date: string;
  email: string;
  name: string;
  subject: string;
  status: 'success' | 'error';
  message: string;
};

const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

const loadSentLogs = (): SentLog[] => {
  try {
    return JSON.parse(localStorage.getItem('vox_email_sent_logs') || '[]');
  } catch {
    return [];
  }
};

export const EmailMarketingDashboard: React.FC<EmailMarketingDashboardProps> = ({ leads, checkouts }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'config'>('send');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendingMessage, setSendingMessage] = useState('');
  const [configSaved, setConfigSaved] = useState(false);
  const [sentLogs, setSentLogs] = useState<SentLog[]>(loadSentLogs);

  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => {
    const saved = localStorage.getItem('vox_email_config');
    return saved ? JSON.parse(saved) : {
      smtp_host: 'smtp.hostinger.com',
      smtp_port: '465',
      smtp_user: 'vox@voxmarketingacademy.com',
      smtp_password: '',
      smtp_from_name: 'Vox Marketing Academy',
      smtp_from_email: 'vox@voxmarketingacademy.com'
    };
  });

  const turmas = Array.from(new Set([
    ...checkouts.map(c => c.turma || c.productName).filter(Boolean),
    ...leads.filter(lead => lead.turma).map(lead => lead.turma)
  ]));
  const filteredLeads = selectedTurma ? leads.filter((lead) => lead.turma === selectedTurma || lead.product_name === selectedTurma) : leads;

  const sentStats = useMemo(() => {
    const success = sentLogs.filter((log) => log.status === 'success').length;
    const errors = sentLogs.filter((log) => log.status === 'error').length;
    return { success, errors, total: sentLogs.length };
  }, [sentLogs]);

  const pushLog = (log: Omit<SentLog, 'id' | 'date'>) => {
    const nextLog: SentLog = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString('pt-BR'),
      ...log,
    };
    setSentLogs((previous) => {
      const next = [nextLog, ...previous].slice(0, 80);
      localStorage.setItem('vox_email_sent_logs', JSON.stringify(next));
      return next;
    });
  };

  const clearLogs = () => {
    if (!confirm('Limpar histórico de e-mails enviados?')) return;
    localStorage.removeItem('vox_email_sent_logs');
    setSentLogs([]);
  };

  const saveConfig = () => {
    localStorage.setItem('vox_email_config', JSON.stringify(emailConfig));
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const sendOneEmail = async (lead: Lead) => {
    if (!lead.email) throw new Error(`Lead ${lead.name || lead.id} está sem email`);

    const personalizedBody = emailBody.replaceAll('{name}', lead.name || 'aluno');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      headers.apikey = SUPABASE_ANON_KEY;
    }

    const response = await fetch(SEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: lead.email,
        name: lead.name || 'Aluno',
        subject: emailSubject,
        productName: lead.product_name || lead.turma || 'Vox Marketing Academy',
        message: personalizedBody,
        ticketUrl: '',
        certificateUrl: '',
        preserveCertificateLayout: true
      })
    });

    const text = await response.text();
    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Resposta inválida da Edge Function. Resposta: ${text.slice(0, 120)}`);
    }

    if (!response.ok || result.error) {
      throw new Error(result.error || result.message || `Erro ao enviar para ${lead.email}`);
    }

    return result;
  };

  const handleSendEmails = async () => {
    if (selectedLeads.length === 0) {
      setSendingStatus('error');
      setSendingMessage('Selecione ao menos um destinatário');
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      setSendingStatus('error');
      setSendingMessage('Preencha o assunto e corpo do email');
      return;
    }

    setIsSending(true);
    setSendingStatus('sending');
    setSendingMessage('Enviando emails pelo Supabase...');

    const leadsToSend = leads.filter((lead) => selectedLeads.includes(lead.id) && lead.email);
    if (leadsToSend.length === 0) {
      setSendingStatus('error');
      setSendingMessage('Nenhum destinatário selecionado possui email válido');
      setIsSending(false);
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const lead of leadsToSend) {
      try {
        await sendOneEmail(lead);
        sent += 1;
        pushLog({
          email: lead.email || '',
          name: lead.name || 'Aluno',
          subject: emailSubject,
          status: 'success',
          message: 'Enviado com sucesso',
        });
      } catch (error) {
        failed += 1;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar';
        pushLog({
          email: lead.email || '',
          name: lead.name || 'Aluno',
          subject: emailSubject,
          status: 'error',
          message: errorMessage,
        });
      }

      setSendingMessage(`Enviando... ${sent + failed}/${leadsToSend.length} | Sucesso: ${sent} | Falhas: ${failed}`);
    }

    if (sent > 0) {
      setSendingStatus('success');
      setSendingMessage(`✓ ${sent} email(s) enviado(s) com sucesso${failed > 0 ? ` e ${failed} falharam` : ''}.`);
      setSelectedLeads([]);
      setEmailSubject('');
      setEmailBody('');
    } else {
      setSendingStatus('error');
      setSendingMessage(`Nenhum email foi enviado. Falhas: ${failed}.`);
    }

    setIsSending(false);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Email Marketing</h2>
        <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Gerencie, dispare e acompanhe campanhas de email</p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
        <button onClick={() => setActiveTab('send')} className={`px-6 py-4 font-black text-sm uppercase transition-all whitespace-nowrap ${activeTab === 'send' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Send size={16} className="inline mr-2" /> Enviar Emails
        </button>
        <button onClick={() => setActiveTab('config')} className={`px-6 py-4 font-black text-sm uppercase transition-all whitespace-nowrap ${activeTab === 'config' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Settings size={16} className="inline mr-2" /> Configuração
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Mail size={24} className="text-blue-600" /> Configuração SMTP
            </h3>

            {configSaved && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <Check size={20} className="text-green-600 flex-shrink-0" />
                <span className="text-sm font-bold text-green-700">Configuração salva com sucesso!</span>
              </div>
            )}

            <div className="space-y-4">
              <ConfigInput label="Host SMTP" value={emailConfig.smtp_host} onChange={(value) => setEmailConfig({ ...emailConfig, smtp_host: value })} placeholder="smtp.hostinger.com" />
              <ConfigInput label="Porta" value={emailConfig.smtp_port} onChange={(value) => setEmailConfig({ ...emailConfig, smtp_port: value })} placeholder="465" />
              <ConfigInput label="Email (Login)" value={emailConfig.smtp_user} onChange={(value) => setEmailConfig({ ...emailConfig, smtp_user: value })} placeholder="vox@voxmarketingacademy.com" />
              <ConfigInput label="Senha/App Password" value={emailConfig.smtp_password} onChange={(value) => setEmailConfig({ ...emailConfig, smtp_password: value })} placeholder="••••••••" type="password" />
              <ConfigInput label="Nome do Remetente" value={emailConfig.smtp_from_name} onChange={(value) => setEmailConfig({ ...emailConfig, smtp_from_name: value })} placeholder="Vox Marketing Academy" />
              <ConfigInput label="Email para Envio" value={emailConfig.smtp_from_email} onChange={(value) => setEmailConfig({ ...emailConfig, smtp_from_email: value })} placeholder="vox@voxmarketingacademy.com" />

              <button onClick={saveConfig} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-6">
                <Check size={18} /> Salvar Configuração
              </button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-900 font-bold">
                O envio real usa a Edge Function do Supabase já configurada com SMTP Hostinger. Esta tela salva apenas referência visual/local.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border border-blue-200">
              <h4 className="font-black text-lg text-blue-900 mb-4">Configuração usada no Supabase</h4>
              <ol className="space-y-3 text-sm text-blue-800 font-bold">
                <li>1. Função: send-ticket-email</li>
                <li>2. Host: smtp.hostinger.com</li>
                <li>3. Email: vox@voxmarketingacademy.com</li>
                <li>4. Porta recomendada: 465 com SSL/TLS</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl p-8 border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6">Compor Email</h3>

              {sendingStatus !== 'idle' && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${sendingStatus === 'sending' ? 'bg-blue-50 border-blue-200' : sendingStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {sendingStatus === 'sending' && <Loader2 size={20} className="text-blue-600 animate-spin flex-shrink-0" />}
                  {sendingStatus === 'success' && <Check size={20} className="text-green-600 flex-shrink-0" />}
                  {sendingStatus === 'error' && <AlertCircle size={20} className="text-red-600 flex-shrink-0" />}
                  <span className={`text-sm font-bold ${sendingStatus === 'sending' ? 'text-blue-700' : sendingStatus === 'success' ? 'text-green-700' : 'text-red-700'}`}>{sendingMessage}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assunto do Email</label>
                  <input type="text" placeholder="Ex: Bem-vindo ao curso!" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Modelos Prontos</label>
                    <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm mb-4 bg-gray-50 text-gray-700"
                    onChange={(e) => {
                      if (e.target.value) setEmailBody(e.target.value);
                    }}
                  >
                    <option value="">Selecione um template lindo...</option>
                    <option value={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Bem-vindo(a) à Vox! 🚀</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>{name}</b>,</p>
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
    <p>Olá <b>{name}</b>,</p>
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
    <p>Olá <b>{name}</b>,</p>
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
    <p>Olá <b>{name}</b>,</p>
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
    <p>Olá <b>{name}</b>,</p>
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
    <p>Olá <b>{name}</b>,</p>
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
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Corpo do Email (HTML)</label>
                  <textarea placeholder="Digite aqui o conteúdo do seu email..." value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white" />
                </div>

                <div className="text-xs text-gray-500 font-bold p-3 bg-gray-50 rounded-xl">
                  💡 Dica: Use {'{name}'} para inserir o nome do destinatário no email.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 mt-6">
              <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Mail size={18} className="text-blue-600" /> Filtrar por Turma</h4>
              <select value={selectedTurma} onChange={(e) => setSelectedTurma(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                <option value="">Todas as turmas ({leads.length})</option>
                {turmas.map((turma) => <option key={turma} value={turma}>{turma} ({leads.filter((lead) => lead.turma === turma).length})</option>)}
              </select>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 mt-6">
              <h4 className="font-black text-gray-900 mb-4">Destinatários ({selectedLeads.length} selecionados)</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLeads.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Nenhum lead encontrado</p> : filteredLeads.map((lead) => (
                  <label key={lead.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={(e) => e.target.checked ? setSelectedLeads([...selectedLeads, lead.id]) : setSelectedLeads(selectedLeads.filter((id) => id !== lead.id))} className="w-4 h-4 rounded cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                    </div>
                  </label>
                ))}
              </div>

              {filteredLeads.length > 0 && (
                <button onClick={() => selectedLeads.length === filteredLeads.length ? setSelectedLeads([]) : setSelectedLeads(filteredLeads.map((lead) => lead.id))} className="w-full mt-4 px-4 py-2 text-xs font-bold uppercase text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-blue-200">
                  {selectedLeads.length === filteredLeads.length ? 'Desselecionar Tudo' : 'Selecionar Tudo'}
                </button>
              )}
            </div>

            <button onClick={handleSendEmails} disabled={isSending || selectedLeads.length === 0 || !emailSubject || !emailBody} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar Emails</>}
            </button>
          </div>

          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-black text-gray-900">E-mails enviados</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Sucesso e falhas</p>
                </div>
                <Clock size={20} className="text-gray-400" />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-50 rounded-2xl p-3 text-center"><p className="text-xl font-black text-gray-900">{sentStats.total}</p><p className="text-[9px] font-black uppercase text-gray-400">Total</p></div>
                <div className="bg-emerald-50 rounded-2xl p-3 text-center"><p className="text-xl font-black text-emerald-700">{sentStats.success}</p><p className="text-[9px] font-black uppercase text-emerald-600">Enviados</p></div>
                <div className="bg-red-50 rounded-2xl p-3 text-center"><p className="text-xl font-black text-red-700">{sentStats.errors}</p><p className="text-[9px] font-black uppercase text-red-600">Falhas</p></div>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {sentLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm font-bold">Nenhum envio registrado ainda.</div>
                ) : sentLogs.map((log) => (
                  <div key={log.id} className={`p-3 rounded-2xl border ${log.status === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-start gap-2">
                      {log.status === 'success' ? <Check size={16} className="text-emerald-600 mt-0.5" /> : <XCircle size={16} className="text-red-600 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-gray-900 truncate">{log.name}</p>
                        <p className="text-[11px] font-bold text-gray-500 truncate">{log.email}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">{log.date}</p>
                        <p className={`text-[11px] font-bold mt-1 ${log.status === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{log.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {sentLogs.length > 0 && (
                <button onClick={clearLogs} className="w-full mt-4 px-4 py-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 text-xs font-black uppercase transition-all">
                  Limpar histórico
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigInput: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
    <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </div>
);
