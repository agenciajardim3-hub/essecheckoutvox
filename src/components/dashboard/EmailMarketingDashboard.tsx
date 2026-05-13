import React, { useState } from 'react';
import { Mail, Settings, Send, Loader2, Check, AlertCircle } from 'lucide-react';
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

const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

export const EmailMarketingDashboard: React.FC<EmailMarketingDashboardProps> = ({ leads }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'config'>('send');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendingMessage, setSendingMessage] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

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

  const turmas = Array.from(new Set(leads.filter((lead) => lead.turma).map((lead) => lead.turma)));
  const filteredLeads = selectedTurma ? leads.filter((lead) => lead.turma === selectedTurma) : leads;

  const saveConfig = () => {
    localStorage.setItem('vox_email_config', JSON.stringify(emailConfig));
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const sendOneEmail = async (lead: Lead) => {
    if (!lead.email) throw new Error(`Lead ${lead.name || lead.id} está sem email`);
    if (!SUPABASE_ANON_KEY) {
      throw new Error('Falta configurar a variável VITE_SUPABASE_ANON_KEY na Hostinger. Sem ela o Supabase recusa o envio.');
    }

    const personalizedBody = emailBody.replaceAll('{name}', lead.name || 'aluno');

    const response = await fetch(SEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        to: lead.email,
        name: lead.name || 'Aluno',
        subject: emailSubject,
        productName: lead.product_name || lead.turma || 'Vox Marketing Academy',
        message: personalizedBody,
        ticketUrl: '',
        certificateUrl: ''
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

    try {
      const leadsToSend = leads.filter((lead) => selectedLeads.includes(lead.id) && lead.email);
      if (leadsToSend.length === 0) throw new Error('Nenhum destinatário selecionado possui email válido');

      let sent = 0;
      for (const lead of leadsToSend) {
        await sendOneEmail(lead);
        sent += 1;
        setSendingMessage(`Enviando... ${sent}/${leadsToSend.length}`);
      }

      setSendingStatus('success');
      setSendingMessage(`✓ ${sent} email(s) enviado(s) com sucesso!`);
      setSelectedLeads([]);
      setEmailSubject('');
      setEmailBody('');
      setTimeout(() => setSendingStatus('idle'), 4000);
    } catch (error) {
      console.error('Erro ao enviar emails:', error);
      setSendingStatus('error');
      setSendingMessage(error instanceof Error ? error.message : 'Erro ao enviar emails');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Email Marketing</h2>
        <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">Gerencie e dispare campanhas de email</p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button onClick={() => setActiveTab('send')} className={`px-6 py-4 font-black text-sm uppercase transition-all ${activeTab === 'send' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Send size={16} className="inline mr-2" /> Enviar Emails
        </button>
        <button onClick={() => setActiveTab('config')} className={`px-6 py-4 font-black text-sm uppercase transition-all ${activeTab === 'config' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
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

            <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200">
              <h4 className="font-black text-lg text-amber-900 mb-4">⚠️ Importante</h4>
              <ul className="space-y-2 text-sm text-amber-800 font-bold">
                <li>• Não use Outlook como login SMTP da Hostinger</li>
                <li>• O erro com DOCTYPE era rota inexistente do frontend</li>
                <li>• O disparo agora vai direto para o Supabase</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Corpo do Email</label>
                  <textarea placeholder="Digite aqui o conteúdo do seu email..." value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                </div>

                <div className="text-xs text-gray-500 font-bold p-3 bg-gray-50 rounded-xl">
                  💡 Dica: Use {'{name}'} para inserir o nome do destinatário no email.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Mail size={18} className="text-blue-600" /> Filtrar por Turma</h4>
              <select value={selectedTurma} onChange={(e) => setSelectedTurma(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                <option value="">Todas as turmas ({leads.length})</option>
                {turmas.map((turma) => <option key={turma} value={turma}>{turma} ({leads.filter((lead) => lead.turma === turma).length})</option>)}
              </select>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100">
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

            <button onClick={handleSendEmails} disabled={isSending || selectedLeads.length === 0 || !emailSubject || !emailBody} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar Emails</>}
            </button>
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
