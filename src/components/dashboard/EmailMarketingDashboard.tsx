import React, { useMemo, useState } from 'react';
import { Mail, Settings, Send, Loader2, Check, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Lead, AppConfig } from '../../types';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';

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
const SUPABASE_ANON_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';
const SUPABASE_ANON_KEY =
  localStorage.getItem('supabase_key') ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  SUPABASE_ANON_FALLBACK;

const loadSentLogs = (): SentLog[] => {
  try {
    return JSON.parse(localStorage.getItem('vox_email_sent_logs') || '[]');
  } catch {
    return [];
  }
};

export const EmailMarketingDashboard: React.FC<EmailMarketingDashboardProps> = ({ leads, checkouts }) => {
  const { templates } = useEmailTemplates();
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    };

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

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-2">Turma</label>
                  <select value={selectedTurma} onChange={(event) => { setSelectedTurma(event.target.value); setSelectedLeads([]); }} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold bg-white">
                    <option value="">Todas as turmas</option>
                    {turmas.map((turma) => <option key={turma} value={turma}>{turma}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-2">Modelo</label>
                  <select onChange={(event) => { const template = templates.find(item => item.id === event.target.value); if (template) setEmailBody(template.html); }} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold bg-white">
                    <option value="">Selecione um modelo</option>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-2">Assunto</label>
                  <input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold" placeholder="Assunto do email" />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-2">Corpo do email</label>
                  <textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} rows={12} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-mono text-sm" placeholder="Escolha um modelo ou escreva o conteúdo" />
                </div>

                <button onClick={handleSendEmails} disabled={isSending} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Enviar Emails
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-gray-900">Destinatários</h3>
                <button onClick={() => setSelectedLeads(selectedLeads.length === filteredLeads.length ? [] : filteredLeads.map(lead => lead.id))} className="text-xs font-black text-blue-600">
                  {selectedLeads.length === filteredLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="max-h-[460px] overflow-y-auto space-y-2">
                {filteredLeads.map((lead) => (
                  <label key={lead.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => setSelectedLeads((previous) => previous.includes(lead.id) ? previous.filter(id => id !== lead.id) : [...previous, lead.id])} />
                    <div className="min-w-0"><p className="font-bold text-sm truncate">{lead.name}</p><p className="text-xs text-gray-500 truncate">{lead.email || 'Sem email'}</p></div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><Clock size={18} className="mx-auto text-blue-500 mb-2" /><p className="text-xl font-black">{sentStats.total}</p><p className="text-[10px] uppercase font-black text-gray-400">Total</p></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><Check size={18} className="mx-auto text-green-500 mb-2" /><p className="text-xl font-black">{sentStats.success}</p><p className="text-[10px] uppercase font-black text-gray-400">Enviados</p></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center"><XCircle size={18} className="mx-auto text-red-500 mb-2" /><p className="text-xl font-black">{sentStats.errors}</p><p className="text-[10px] uppercase font-black text-gray-400">Falhas</p></div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4"><h3 className="font-black text-gray-900">Histórico</h3><button onClick={clearLogs} className="text-xs font-black text-red-500">Limpar</button></div>
              <div className="space-y-3 max-h-[340px] overflow-y-auto">
                {sentLogs.length === 0 ? <p className="text-sm text-gray-400">Nenhum envio registrado.</p> : sentLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-gray-50"><p className="text-xs font-black">{log.email}</p><p className="text-[10px] text-gray-500">{log.date}</p><p className={`text-[10px] font-bold mt-1 ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{log.message}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigInput: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-xs font-black uppercase text-gray-500 tracking-widest mb-2">{label}</label>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold" />
  </div>
);
