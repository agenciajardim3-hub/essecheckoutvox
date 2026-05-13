import React, { useMemo, useState } from 'react';
import { Settings, Smartphone, MessageCircle, Check, AlertCircle, Loader2, Eye, EyeOff, Send, Mail, Plus, Trash2, Pencil, Zap } from 'lucide-react';

type AutomationChannel = 'whatsapp' | 'email' | 'ambos';
type AutomationTrigger = 'payment_approved' | 'registration_created' | 'before_event' | 'after_event' | 'manual';

type AutomationRule = {
  id: string;
  name: string;
  channel: AutomationChannel;
  trigger: AutomationTrigger;
  delayMinutes: number;
  subject: string;
  body: string;
  active: boolean;
};

interface AutomationDashboardProps {
  userRole: string;
}

const defaultRules: AutomationRule[] = [
  {
    id: crypto.randomUUID(),
    name: 'Mensagem automática ao pagar',
    channel: 'whatsapp',
    trigger: 'payment_approved',
    delayMinutes: 0,
    subject: 'Pagamento confirmado',
    body: 'Olá {nome}!\n\nSeu pagamento para {produto} foi confirmado.\n\nValor: R$ {valor}\n\nObrigado por confiar na Vox Marketing Academy! 🙏',
    active: false,
  },
  {
    id: crypto.randomUUID(),
    name: 'Mensagem de agradecimento',
    channel: 'ambos',
    trigger: 'payment_approved',
    delayMinutes: 5,
    subject: 'Obrigado pela sua inscrição',
    body: 'Olá {nome}!\n\nObrigado pela sua inscrição no {produto}.\n\nEstamos felizes em ter você com a gente. Em breve você receberá mais informações.',
    active: false,
  },
];

const triggerLabels: Record<AutomationTrigger, string> = {
  payment_approved: 'Quando o pagamento for aprovado',
  registration_created: 'Quando o cadastro for criado',
  before_event: 'Antes do evento/curso',
  after_event: 'Depois do evento/curso',
  manual: 'Manual / usar quando quiser',
};

const channelLabels: Record<AutomationChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  ambos: 'Email + WhatsApp',
};

const loadRules = (): AutomationRule[] => {
  try {
    const saved = localStorage.getItem('vox_automation_rules');
    return saved ? JSON.parse(saved) : defaultRules;
  } catch {
    return defaultRules;
  }
};

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ userRole }) => {
  const [uazapiUrl, setUazapiUrl] = useState(localStorage.getItem('vox_uazapi_url') || '');
  const [uazapiKey, setUazapiKey] = useState(localStorage.getItem('vox_uazapi_key') || '');
  const [whatsappNumber, setWhatsappNumber] = useState(localStorage.getItem('vox_whatsapp_number') || '');
  const [isConnected, setIsConnected] = useState(Boolean(localStorage.getItem('vox_uazapi_key')));
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rules, setRules] = useState<AutomationRule[]>(loadRules);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(rules[0]?.id || null);

  const activeRules = useMemo(() => rules.filter((rule) => rule.active).length, [rules]);
  const editingRule = rules.find((rule) => rule.id === editingRuleId) || null;

  const persistRules = (next: AutomationRule[]) => {
    setRules(next);
    localStorage.setItem('vox_automation_rules', JSON.stringify(next));
  };

  const updateRule = (id: string, fields: Partial<AutomationRule>) => {
    persistRules(rules.map((rule) => (rule.id === id ? { ...rule, ...fields } : rule)));
  };

  const createRule = () => {
    const rule: AutomationRule = {
      id: crypto.randomUUID(),
      name: 'Nova automação',
      channel: 'ambos',
      trigger: 'payment_approved',
      delayMinutes: 0,
      subject: 'Mensagem Vox Marketing Academy',
      body: 'Olá {nome}!\n\nDigite aqui sua mensagem personalizada para {produto}.',
      active: false,
    };
    const next = [rule, ...rules];
    persistRules(next);
    setEditingRuleId(rule.id);
  };

  const deleteRule = (id: string) => {
    if (!confirm('Excluir esta automação?')) return;
    const next = rules.filter((rule) => rule.id !== id);
    persistRules(next);
    if (editingRuleId === id) setEditingRuleId(next[0]?.id || null);
  };

  const handleTestConnection = async () => {
    if (!uazapiUrl || !uazapiKey || !whatsappNumber) {
      setErrorMessage('Preencha URL, API Key e número do WhatsApp');
      return;
    }

    setIsTesting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (uazapiUrl.includes('http') && uazapiKey.length > 10 && whatsappNumber.match(/^\d{10,15}$/)) {
        setIsConnected(true);
        setSuccessMessage('✅ Conexão salva com sucesso!');
        localStorage.setItem('vox_uazapi_url', uazapiUrl);
        localStorage.setItem('vox_uazapi_key', uazapiKey);
        localStorage.setItem('vox_whatsapp_number', whatsappNumber);
      } else {
        setErrorMessage('Dados inválidos. Verifique URL, API Key e número.');
        setIsConnected(false);
      }
    } catch (err) {
      setErrorMessage(`Erro ao conectar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveRules = () => {
    localStorage.setItem('vox_automation_rules', JSON.stringify(rules));
    setSuccessMessage('✅ Automações salvas com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSendTestMessage = async () => {
    if (!editingRule) {
      setErrorMessage('Selecione uma automação para testar');
      return;
    }

    setIsTesting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const testMessage = editingRule.body
        .replaceAll('{nome}', 'João Teste')
        .replaceAll('{produto}', 'Curso Premium')
        .replaceAll('{valor}', '199,90')
        .replaceAll('{link_ingresso}', 'https://payvoxmarketingacademy.online/?mode=ticket')
        .replaceAll('{link_certificado}', 'https://payvoxmarketingacademy.online/?mode=certificate');

      console.log('Teste de automação:', {
        channel: editingRule.channel,
        trigger: editingRule.trigger,
        subject: editingRule.subject,
        body: testMessage,
      });

      setSuccessMessage(`✅ Teste preparado para ${channelLabels[editingRule.channel]}. Confira o console/log do navegador.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(`Erro ao testar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (userRole !== 'master') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Automação</h2>
          <p className="text-gray-400 text-sm font-bold mt-1 uppercase tracking-widest">
            Configure mensagens automáticas de WhatsApp e Email do seu jeito
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[260px]">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{rules.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Regras</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{activeRules}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Ativas</p>
          </div>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div className={`rounded-xl p-3 flex items-start gap-3 border ${successMessage ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {successMessage ? <Check size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm font-bold ${successMessage ? 'text-emerald-700' : 'text-red-700'}`}>{successMessage || errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Smartphone size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Conexão WhatsApp</h3>
              {isConnected && <Check size={18} className="text-emerald-600 ml-auto" />}
            </div>

            <div className="space-y-4 mb-6">
              <Input label="URL Base do UazAPI" value={uazapiUrl} onChange={setUazapiUrl} placeholder="https://api.uazapi.com" />
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">Chave de API</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sua-chave-api"
                    value={uazapiKey}
                    onChange={(e) => setUazapiKey(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-sm"
                  />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Input label="Número WhatsApp raiz" value={whatsappNumber} onChange={setWhatsappNumber} placeholder="5535999999999" />
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTesting || !uazapiUrl || !uazapiKey || !whatsappNumber}
              className="w-full px-4 py-3 rounded-xl font-bold text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700"
            >
              {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {isTesting ? 'Testando...' : 'Salvar/Testar Conexão'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-gray-900">Minhas automações</h3>
              <button onClick={createRule} className="bg-blue-600 text-white rounded-xl px-3 py-2 text-xs font-black uppercase flex items-center gap-1">
                <Plus size={14} /> Nova
              </button>
            </div>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setEditingRuleId(rule.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${editingRuleId === rule.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-gray-900 truncate">{rule.name}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1">{channelLabels[rule.channel]} • {triggerLabels[rule.trigger]}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{rule.active ? 'Ativa' : 'Off'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          {editingRule ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Configurar automação</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Email, WhatsApp ou os dois</p>
                  </div>
                </div>
                <button onClick={() => deleteRule(editingRule.id)} className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-xs font-black uppercase flex items-center gap-2">
                  <Trash2 size={15} /> Excluir
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome da automação" value={editingRule.name} onChange={(value) => updateRule(editingRule.id, { name: value })} placeholder="Ex: Agradecimento pós-pagamento" />
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">Canal</label>
                  <select value={editingRule.channel} onChange={(e) => updateRule(editingRule.id, { channel: e.target.value as AutomationChannel })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="ambos">Email + WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">Quando enviar</label>
                  <select value={editingRule.trigger} onChange={(e) => updateRule(editingRule.id, { trigger: e.target.value as AutomationTrigger })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                    {Object.entries(triggerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <Input label="Atraso em minutos" type="number" value={String(editingRule.delayMinutes)} onChange={(value) => updateRule(editingRule.id, { delayMinutes: Number(value) || 0 })} placeholder="0" />
              </div>

              {(editingRule.channel === 'email' || editingRule.channel === 'ambos') && (
                <Input label="Assunto do email" value={editingRule.subject} onChange={(value) => updateRule(editingRule.id, { subject: value })} placeholder="Ex: Obrigado pela sua inscrição" />
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">Mensagem</label>
                <textarea
                  value={editingRule.body}
                  onChange={(e) => updateRule(editingRule.id, { body: e.target.value })}
                  rows={9}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs text-gray-700 bg-white"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Variáveis: {'{nome}'}, {'{produto}'}, {'{valor}'}, {'{link_ingresso}'}, {'{link_certificado}'}.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Prévia</p>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {editingRule.body
                    .replaceAll('{nome}', 'João Teste')
                    .replaceAll('{produto}', 'Curso Premium')
                    .replaceAll('{valor}', '199,90')
                    .replaceAll('{link_ingresso}', 'https://payvoxmarketingacademy.online/?mode=ticket')
                    .replaceAll('{link_certificado}', 'https://payvoxmarketingacademy.online/?mode=certificate')}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={() => updateRule(editingRule.id, { active: !editingRule.active })}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase transition-all flex items-center justify-center gap-2 ${editingRule.active ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  <Check size={16} /> {editingRule.active ? 'Automação ativa' : 'Ativar automação'}
                </button>
                <button onClick={handleSendTestMessage} disabled={isTesting} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200">
                  {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Testar mensagem
                </button>
                <button onClick={handleSaveRules} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  <Check size={16} /> Salvar regras
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <Pencil size={44} className="mx-auto text-gray-300 mb-4" />
              <p className="font-black text-gray-900">Crie uma automação para começar.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-900 font-bold">
        Esta tela salva as regras no painel. Para disparar automaticamente ao pagamento, o próximo passo é conectar essas regras ao webhook do Mercado Pago/Supabase Worker.
      </div>
    </div>
  );
};

const Input: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-widest">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
    />
  </div>
);
