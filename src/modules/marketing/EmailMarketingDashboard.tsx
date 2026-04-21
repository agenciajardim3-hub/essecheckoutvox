import React, { useState, useEffect } from 'react';
import { Mail, Settings, Send, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { Lead, AppConfig } from '../../shared';
import { useSupabase } from '../../services/useSupabase';

interface EmailConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
}

interface EmailMarketingDashboardProps {
  leads: Lead[];
  checkouts: AppConfig[];
}

export const EmailMarketingDashboard: React.FC<EmailMarketingDashboardProps> = ({
  leads,
  checkouts
}) => {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState<'config' | 'send'>('send');

  // Email Configuration
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => {
    const saved = localStorage.getItem('vox_email_config');
    return saved ? JSON.parse(saved) : {
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_password: '',
      smtp_from_name: 'Vox Academy',
      smtp_from_email: ''
    };
  });

  // Email Sending
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendingMessage, setSendingMessage] = useState('');

  const [configSaved, setConfigSaved] = useState(false);
  const [configError, setConfigError] = useState('');

  // Get unique turmas from leads
  const turmas = Array.from(new Set(leads.filter(l => l.turma).map(l => l.turma)));

  // Filter leads by turma
  const filteredLeads = selectedTurma
    ? leads.filter(l => l.turma === selectedTurma)
    : leads;

  // Handle configuration save
  const handleSaveConfig = () => {
    setConfigError('');
    if (!emailConfig.smtp_host || !emailConfig.smtp_user || !emailConfig.smtp_password || !emailConfig.smtp_from_email) {
      setConfigError('Preencha todos os campos obrigatórios');
      return;
    }

    localStorage.setItem('vox_email_config', JSON.stringify(emailConfig));
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  // Handle email sending
  const handleSendEmails = async () => {
    if (selectedLeads.length === 0) {
      setSendingMessage('Selecione ao menos um destinatário');
      setSendingStatus('error');
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      setSendingMessage('Preencha o assunto e corpo do email');
      setSendingStatus('error');
      return;
    }

    // Check if config is set
    if (!emailConfig.smtp_host || !emailConfig.smtp_user) {
      setSendingMessage('Configure o SMTP antes de enviar emails');
      setSendingStatus('error');
      return;
    }

    setIsSending(true);
    setSendingStatus('sending');
    setSendingMessage('Enviando emails...');

    try {
      const leadsToSend = leads.filter(l => selectedLeads.includes(l.id));

      // In a real scenario, you'd call an Edge Function to send emails
      // For now, we'll simulate the process
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: leadsToSend.map(l => ({ email: l.email, name: l.name })),
          subject: emailSubject,
          body: emailBody,
          smtpConfig: emailConfig
        })
      }).catch(() => {
        // If API endpoint doesn't exist, show alternative message
        throw new Error('Endpoint não configurado. Configure a Edge Function para enviar emails.');
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar emails');
      }

      setSendingStatus('success');
      setSendingMessage(`✓ ${selectedLeads.length} email(s) enviado(s) com sucesso!`);
      setSelectedLeads([]);
      setEmailSubject('');
      setEmailBody('');

      setTimeout(() => setSendingStatus('idle'), 3000);
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

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('send')}
          className={`px-6 py-4 font-black text-sm uppercase transition-all ${
            activeTab === 'send'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Send size={16} className="inline mr-2" />
          Enviar Emails
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-4 font-black text-sm uppercase transition-all ${
            activeTab === 'config'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings size={16} className="inline mr-2" />
          Configuração
        </button>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Mail size={24} className="text-blue-600" />
              Configuração SMTP
            </h3>

            {configError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <span className="text-sm font-bold text-red-700">{configError}</span>
              </div>
            )}

            {configSaved && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <Check size={20} className="text-green-600 flex-shrink-0" />
                <span className="text-sm font-bold text-green-700">Configuração salva com sucesso!</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Host SMTP</label>
                <input
                  type="text"
                  placeholder="smtp.hostinger.com"
                  value={emailConfig.smtp_host}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Porta</label>
                  <input
                    type="number"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email (Login)</label>
                <input
                  type="email"
                  placeholder="seu-email@hostinger.com"
                  value={emailConfig.smtp_user}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Senha/App Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={emailConfig.smtp_password}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Remetente</label>
                <input
                  type="text"
                  placeholder="Vox Academy"
                  value={emailConfig.smtp_from_name}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email para Envio</label>
                <input
                  type="email"
                  placeholder="seu-email@hostinger.com"
                  value={emailConfig.smtp_from_email}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-6"
              >
                <Check size={18} />
                Salvar Configuração
              </button>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-900 font-bold">
                💡 <strong>Dica:</strong> Se usar Hostinger, use seu email com @hostinger.com como usuario SMTP. A senha pode ser a do cPanel ou uma App Password.
              </p>
            </div>
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border border-blue-200">
              <h4 className="font-black text-lg text-blue-900 mb-4">Configurando com Hostinger</h4>
              <ol className="space-y-3 text-sm text-blue-800 font-bold">
                <li className="flex gap-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs">1</span>
                  <span>Acesse seu cPanel Hostinger</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs">2</span>
                  <span>Crie um email no seu domínio (se ainda não tiver)</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs">3</span>
                  <span>Copie as configurações SMTP do cPanel</span>
                </li>
                <li className="flex gap-3">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-black text-xs">4</span>
                  <span>Cole aqui e salve</span>
                </li>
              </ol>
            </div>

            <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200">
              <h4 className="font-black text-lg text-amber-900 mb-4">⚠️ Importante</h4>
              <ul className="space-y-2 text-sm text-amber-800 font-bold">
                <li>• Guarde suas credenciais com segurança</li>
                <li>• Não compartilhe a senha com terceiros</li>
                <li>• Verifique o limite de emails/dia</li>
                <li>• Sempre teste com um email antes</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Send Emails Tab */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Email Composer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-8 border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6">Compor Email</h3>

              {sendingStatus !== 'idle' && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                  sendingStatus === 'sending'
                    ? 'bg-blue-50 border-blue-200'
                    : sendingStatus === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  {sendingStatus === 'sending' && <Loader2 size={20} className="text-blue-600 animate-spin flex-shrink-0" />}
                  {sendingStatus === 'success' && <Check size={20} className="text-green-600 flex-shrink-0" />}
                  {sendingStatus === 'error' && <AlertCircle size={20} className="text-red-600 flex-shrink-0" />}
                  <span className={`text-sm font-bold ${
                    sendingStatus === 'sending' ? 'text-blue-700'
                    : sendingStatus === 'success' ? 'text-green-700'
                    : 'text-red-700'
                  }`}>
                    {sendingMessage}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assunto do Email</label>
                  <input
                    type="text"
                    placeholder="Ex: Bem-vindo ao curso!"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Corpo do Email</label>
                  <textarea
                    placeholder="Digite aqui o conteúdo do seu email..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div className="text-xs text-gray-500 font-bold p-3 bg-gray-50 rounded-xl">
                  💡 Dica: Use {`{name}`} para inserir o nome do destinatário no email
                </div>
              </div>
            </div>
          </div>

          {/* Recipients Selector */}
          <div className="space-y-6">
            {/* Filter by Turma */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                Filtrar por Turma
              </h4>

              <select
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
              >
                <option value="">Todas as turmas ({leads.length})</option>
                {turmas.map(turma => {
                  const count = leads.filter(l => l.turma === turma).length;
                  return (
                    <option key={turma} value={turma}>
                      {turma} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Recipients List */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <h4 className="font-black text-gray-900 mb-4">
                Destinatários ({selectedLeads.length} selecionados)
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum lead encontrado</p>
                ) : (
                  filteredLeads.map(lead => (
                    <label
                      key={lead.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads([...selectedLeads, lead.id]);
                          } else {
                            setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {filteredLeads.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedLeads.length === filteredLeads.length) {
                      setSelectedLeads([]);
                    } else {
                      setSelectedLeads(filteredLeads.map(l => l.id));
                    }
                  }}
                  className="w-full mt-4 px-4 py-2 text-xs font-bold uppercase text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-blue-200"
                >
                  {selectedLeads.length === filteredLeads.length ? 'Desselecionar Tudo' : 'Selecionar Tudo'}
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendEmails}
              disabled={isSending || selectedLeads.length === 0 || !emailSubject || !emailBody}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Enviar Emails
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
