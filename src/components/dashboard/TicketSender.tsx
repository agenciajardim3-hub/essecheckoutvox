import React, { useMemo, useState } from 'react';
import { Send, GraduationCap, Loader2, Check, Mail, MessageCircle, Image as ImageIcon, Type, AlertCircle, Eye } from 'lucide-react';
import { Lead, AppConfig } from '../../types';

interface TicketSenderProps {
  leads: Lead[];
  checkouts: AppConfig[];
  uploadService: (file: File) => Promise<string | null>;
  isUploading: string | null;
}

const SEND_EMAIL_ENDPOINT = 'https://emdsgvuqrhpjdgrgaslo.supabase.co/functions/v1/send-ticket-email';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

const isPaid = (lead: Lead) => lead.status === 'Pago' || lead.status === 'Aprovado';

export const TicketSender: React.FC<TicketSenderProps> = ({ leads, checkouts, uploadService, isUploading }) => {
  const [selectedTurma, setSelectedTurma] = useState('');
  const [messageText, setMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'completed' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const turmas = useMemo(() => {
    const set = new Set<string>();
    checkouts.forEach((checkout) => {
      if (checkout.turma?.trim()) set.add(checkout.turma.trim());
      else if (checkout.productName?.trim()) set.add(checkout.productName.trim());
    });
    leads.forEach((lead) => {
      if (lead.turma?.trim()) set.add(lead.turma.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [checkouts, leads]);

  const checkoutIdsForSelectedTurma = useMemo(() => {
    if (!selectedTurma) return new Set<string>();
    return new Set(
      checkouts
        .filter((checkout) => checkout.turma === selectedTurma || checkout.productName === selectedTurma)
        .map((checkout) => checkout.id)
    );
  }, [checkouts, selectedTurma]);

  const getLeadsForTurma = (turma: string, method: 'whatsapp' | 'email' = sendMethod) => {
    const checkoutIds = new Set(
      checkouts
        .filter((checkout) => checkout.turma === turma || checkout.productName === turma)
        .map((checkout) => checkout.id)
    );

    return leads.filter((lead) => {
      const belongsToTurma = lead.turma === turma || checkoutIds.has(lead.product_id || '');
      const hasContact = method === 'email' ? Boolean(lead.email) : Boolean(lead.phone);
      return belongsToTurma && isPaid(lead) && hasContact;
    });
  };

  const turmaLeads = useMemo(() => {
    if (!selectedTurma) return [];
    return leads.filter((lead) => {
      const belongsToTurma = lead.turma === selectedTurma || checkoutIdsForSelectedTurma.has(lead.product_id || '');
      const hasContact = sendMethod === 'email' ? Boolean(lead.email) : Boolean(lead.phone);
      return belongsToTurma && isPaid(lead) && hasContact;
    });
  }, [leads, selectedTurma, checkoutIdsForSelectedTurma, sendMethod]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await uploadService(file);
    if (url) setImageUrl(url);
  };

  const sendTicketEmail = async (lead: Lead, ticketUrl: string) => {
    if (!lead.email) throw new Error('Sem email');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (SUPABASE_ANON_KEY) {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      headers.apikey = SUPABASE_ANON_KEY;
    }

    const htmlMessage = `
      <p>${messageText.replace(/\n/g, '<br />')}</p>
      <p style="margin-top: 18px;"><strong>🎫 Seu ingresso:</strong></p>
      <p><a href="${ticketUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:bold;">Abrir ingresso</a></p>
      <p style="font-size:13px;color:#6b7280;">Caso o botão não funcione, copie e cole este link no navegador:<br />${ticketUrl}</p>
      ${imageUrl ? `<p><img src="${imageUrl}" style="max-width:100%;border-radius:16px;margin-top:16px;" /></p>` : ''}
    `;

    const response = await fetch(SEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: lead.email,
        name: lead.name || 'Aluno',
        subject: `Seu Ingresso - ${lead.product_name || selectedTurma}`,
        productName: lead.product_name || selectedTurma || 'Vox Marketing Academy',
        message: htmlMessage,
        ticketUrl,
        certificateUrl: ''
      })
    });

    const text = await response.text();
    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Resposta inválida da função: ${text.slice(0, 120)}`);
    }

    if (!response.ok || result.error) {
      throw new Error(result.error || result.message || 'Erro ao enviar email');
    }

    return result;
  };

  const handleSendTickets = async () => {
    if (!selectedTurma) return alert('Selecione uma turma');
    if (turmaLeads.length === 0) return alert('Nenhum aluno pago com contato nesta turma');
    if (!messageText.trim()) return alert('Escreva uma mensagem para enviar');

    const confirmSend = confirm(`Enviar ingressos para ${turmaLeads.length} aluno(s) via ${sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}?`);
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
        const ticketUrl = `${window.location.origin}/?mode=ticket&checkout=${encodeURIComponent(lead.product_id || '')}&cpf=${encodeURIComponent(lead.cpf || '')}`;

        if (sendMethod === 'whatsapp') {
          const phoneNumber = lead.phone?.replace(/\D/g, '');
          if (!phoneNumber) throw new Error('Sem telefone');
          let whatsappMessage = `${messageText}\n\n🎫 Seu Ingresso: ${ticketUrl}`;
          if (imageUrl) whatsappMessage += `\n📸 Imagem: ${imageUrl}`;
          window.open(`https://wa.me/55${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
        } else {
          await sendTicketEmail(lead, ticketUrl);
        }

        successful += 1;
        setSentCount(successful);
        await new Promise((resolve) => setTimeout(resolve, sendMethod === 'email' ? 350 : 200));
      } catch (error) {
        console.error(`Erro ao enviar para ${lead.name}:`, error);
        failed += 1;
        setFailedCount(failed);
      }
    }

    setIsSending(false);
    setSendingStatus(failed > 0 && successful === 0 ? 'error' : 'completed');
    setStatusMessage(`✓ ${successful} ingressos enviados${failed > 0 ? `, ${failed} falharam` : ''}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Enviar Ingressos</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Envie ingressos com mensagem personalizada via WhatsApp ou Email</p>
        </div>
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center"><Mail size={32} className="text-blue-600" /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 p-8 space-y-6">
          <div>
            <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3"><GraduationCap size={16} className="inline mr-2" /> Selecione a Turma *</label>
            <select value={selectedTurma} onChange={(e) => { setSelectedTurma(e.target.value); setSendingStatus('idle'); setStatusMessage(''); }} disabled={isSending} className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">-- Selecione uma turma --</option>
              {turmas.map((turma) => {
                const count = getLeadsForTurma(turma).length;
                return <option key={turma} value={turma}>{turma} ({count} aluno{count !== 1 ? 's' : ''})</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3">Método de Envio *</label>
            <div className="flex gap-4">
              <button onClick={() => setSendMethod('whatsapp')} disabled={isSending} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${sendMethod === 'whatsapp' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400'} disabled:opacity-50`}><MessageCircle size={16} /> WhatsApp</button>
              <button onClick={() => setSendMethod('email')} disabled={isSending} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${sendMethod === 'email' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'} disabled:opacity-50`}><Mail size={16} /> Email</button>
            </div>
            {sendMethod === 'email' && (
              <div className="mt-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-4 py-3 text-xs font-bold">
                O email será enviado direto pelo sistema, sem abrir mailto ou programa de email.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3"><Type size={16} className="inline mr-2" /> Mensagem Personalizada *</label>
            <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} disabled={isSending} placeholder="Ex: Olá! 🎉 Aqui está seu ingresso para o curso." className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none h-32" />
            <div className="text-xs text-gray-400 mt-2">O link do ingresso será adicionado automaticamente ao final</div>
          </div>

          <div>
            <label className="block text-sm font-black uppercase text-gray-700 tracking-widest mb-3"><ImageIcon size={16} className="inline mr-2" /> Imagem (Opcional)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isSending || isUploading === 'ticket-image'} className="w-full px-6 py-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white text-gray-500 font-bold" />
            {imageUrl && <img src={imageUrl} alt="Preview" className="mt-4 w-full h-48 object-cover rounded-2xl border-2 border-gray-200" />}
          </div>

          {sendingStatus !== 'idle' && <div className={`rounded-2xl p-4 border-2 ${sendingStatus === 'sending' ? 'bg-blue-50 border-blue-200' : sendingStatus === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}><div className="flex items-center gap-3">{sendingStatus === 'sending' ? <Loader2 size={20} className="text-blue-600 animate-spin" /> : <Check size={20} className={sendingStatus === 'completed' ? 'text-emerald-600' : 'text-red-600'} />}<div className="font-bold text-sm text-gray-900">{statusMessage}</div></div></div>}

          <button onClick={handleSendTickets} disabled={isSending || !selectedTurma || turmaLeads.length === 0 || !messageText.trim()} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white shadow-lg ${isSending || !selectedTurma || turmaLeads.length === 0 || !messageText.trim() ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:-translate-y-1 shadow-blue-200'}`}>
            {isSending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar {turmaLeads.length > 0 ? `Ingressos (${turmaLeads.length})` : 'Ingressos'}</>}
          </button>
        </div>

        <div className="lg:col-span-1 bg-gray-50 rounded-3xl border border-gray-200 p-6 h-fit sticky top-24">
          <div className="flex items-center gap-2 mb-6"><Eye size={18} className="text-gray-700" /><h3 className="font-black text-gray-900">Pré-visualização</h3></div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200"><div className="text-xs font-bold text-gray-500 uppercase mb-2">Mensagem</div>{messageText ? <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{messageText}</div> : <div className="text-sm text-gray-400 italic">Digite uma mensagem...</div>}</div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200"><div className="text-xs font-bold text-gray-500 uppercase mb-3">Informações</div><div className="space-y-2"><div><div className="text-xs text-gray-600">Turma</div><div className="font-bold text-gray-900">{selectedTurma || 'Nenhuma selecionada'}</div></div><div><div className="text-xs text-gray-600">Método</div><div className="font-bold text-gray-900">{sendMethod === 'whatsapp' ? '💬 WhatsApp' : '📧 Email pelo sistema'}</div></div><div><div className="text-xs text-gray-600">Alunos que receberão</div><div className="font-bold text-gray-900">{turmaLeads.length}</div></div></div></div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200"><div className="text-xs font-bold text-gray-500 uppercase mb-2">Resumo</div><div className="text-sm text-gray-700 font-bold">Enviados: {sentCount} | Falhas: {failedCount}</div></div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6"><div className="flex items-start gap-3"><AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-1" /><div className="text-sm text-amber-800"><div className="font-bold mb-2">ℹ️ Como funciona:</div><ul className="space-y-1 text-xs list-disc list-inside"><li>Agora o sistema lista turmas vindas de checkouts e leads.</li><li>No modo Email, o envio é feito direto pelo Supabase, sem mailto.</li><li>Cada aluno recebe seu ingresso único.</li></ul></div></div></div>
    </div>
  );
};
