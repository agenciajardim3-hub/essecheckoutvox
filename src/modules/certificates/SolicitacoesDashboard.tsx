
import React, { useState, useEffect } from 'react';
import { Send, Mail, Loader2, Check, X, Calendar, User, Phone, FileText, Plus, Trash2, Award, Download, MessageCircle, Save, Square, CheckSquare, Filter } from 'lucide-react';
import { useSupabase } from '../../services/useSupabase';
import { FormRequest } from '../../shared';

interface SolicitacoesDashboardProps {
    checkouts: any[];
}

export const SolicitacoesDashboard: React.FC<SolicitacoesDashboardProps> = ({ checkouts }) => {
    const supabase = useSupabase();
    const [solicitations, setSolicitations] = useState<FormRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [newRequest, setNewRequest] = useState({
        full_name: '',
        participation_date: '',
        whatsapp: '',
        email: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<string>('');

    useEffect(() => {
        fetchSolicitations();
    }, []);

    const fetchSolicitations = async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('form_requests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setSolicitations(data || []);
        } catch (err) {
            console.error('Error fetching solicitations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!supabase) return;
        if (!newRequest.full_name || !newRequest.participation_date || !newRequest.whatsapp || !newRequest.email) {
            alert('Preencha todos os campos!');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase.from('form_requests').insert({
                full_name: newRequest.full_name,
                participation_date: newRequest.participation_date,
                whatsapp: newRequest.whatsapp,
                email: newRequest.email,
                status: 'pendente'
            });
            
            if (error) throw error;
            
            setShowForm(false);
            setNewRequest({ full_name: '', participation_date: '', whatsapp: '', email: '' });
            fetchSolicitations();
        } catch (err) {
            console.error('Error creating request:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendWhatsApp = async (sol: FormRequest) => {
        if (!supabase) return;
        setSendingId(sol.id || null);
        
        const whatsappMessage = `Olá ${sol.full_name}, seu certificado do evento está pronto! Em breve enviaremos o link para download.`;
        const whatsappLink = `https://wa.me/55${sol.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
        
        window.open(whatsappLink, '_blank');
        
        if (supabase) {
            await supabase.from('form_requests').update({ status: 'enviado_whatsapp' }).eq('id', sol.id);
            setSolicitations(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'enviado_whatsapp' } : s));
        }
        setSendingId(null);
    };

    const handleSendEmail = async (sol: FormRequest) => {
        setSendingId(sol.id || null);
        const subject = encodeURIComponent('Seu Certificado - Evento');
        const body = encodeURIComponent(`Olá ${sol.full_name},\n\nSegue em anexo o certificado do evento que participou em ${sol.participation_date}.\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\nEquipe`);
        window.open(`mailto:${sol.email}?subject=${subject}&body=${body}`, '_blank');
        
        if (supabase) {
            await supabase.from('form_requests').update({ status: 'enviado_email' }).eq('id', sol.id);
            setSolicitations(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'enviado_email' } : s));
        }
        setSendingId(null);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta solicitação?')) return;
        if (!supabase) return;
        try {
            await supabase.from('form_requests').delete().eq('id', id);
            setSolicitations(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const handleGenerateCertificate = (sol: FormRequest) => {
        const certificateUrl = `${window.location.origin}/?mode=certificate&name=${encodeURIComponent(sol.full_name)}&course=Evento&date=${encodeURIComponent(sol.participation_date)}`;
        window.open(certificateUrl, '_blank');
    };

    const handleSaveCertificate = async (sol: FormRequest) => {
        if (!supabase) return;
        try {
            const { error } = await supabase.from('form_requests').update({
                status: 'certificado_salvo',
                certificate_url: `${window.location.origin}/?mode=certificate&name=${encodeURIComponent(sol.full_name)}&course=Evento&date=${encodeURIComponent(sol.participation_date)}`
            }).eq('id', sol.id);
            
            if (error) throw error;
            
            fetchSolicitations();
            alert('Certificado salvo com sucesso!');
        } catch (err) {
            console.error('Error saving certificate:', err);
            alert('Erro ao salvar certificado');
        }
    };

    // Download certificate directly
    const handleDownloadCertificate = (sol: FormRequest) => {
        const certificateUrl = `${window.location.origin}/?mode=certificate&name=${encodeURIComponent(sol.full_name)}&course=Evento&date=${encodeURIComponent(sol.participation_date)}`;
        window.open(certificateUrl, '_blank');
    };

    // Bulk selection
    const toggleSelectAll = () => {
        if (selectedIds.length === solicitations.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(solicitations.map(s => s.id || ''));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Bulk status update
    const handleBulkStatusUpdate = async () => {
        if (!bulkStatus || selectedIds.length === 0) return;
        if (!supabase) return;

        try {
            await supabase.from('form_requests').update({ status: bulkStatus }).in('id', selectedIds);
            fetchSolicitations();
            setSelectedIds([]);
            setShowBulkActions(false);
            setBulkStatus('');
            alert(`${selectedIds.length} solicitações atualizadas!`);
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status');
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'pendente': return 'bg-amber-100 text-amber-700';
            case 'enviado_whatsapp': return 'bg-emerald-100 text-emerald-700';
            case 'enviado_email': return 'bg-blue-100 text-blue-700';
            case 'concluido': return 'bg-gray-100 text-gray-700';
            case 'certificado_salvo': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Solicitações de Certificado</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gerencie pedidos de certificados</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    <Plus size={18} /> Nova Solicitação
                </button>
            </div>

            {showForm && (
                <div className="bg-blue-50/50 border-2 border-blue-100 p-10 rounded-[3rem] animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                            <User className="text-blue-600" /> Nova Solicitação
                        </h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-black text-gray-700">Nome Completo *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="Nome completo do participante"
                                value={newRequest.full_name}
                                onChange={(e) => setNewRequest({ ...newRequest, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-black text-gray-700">Data de Participação *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="Ex: Janeiro/2024"
                                value={newRequest.participation_date}
                                onChange={(e) => setNewRequest({ ...newRequest, participation_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-black text-gray-700">WhatsApp *</label>
                            <input
                                type="tel"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="(00) 00000-0000"
                                value={newRequest.whatsapp}
                                onChange={(e) => setNewRequest({ ...newRequest, whatsapp: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-black text-gray-700">E-mail *</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="email@exemplo.com"
                                value={newRequest.email}
                                onChange={(e) => setNewRequest({ ...newRequest, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Check size={18} />} Salvar
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="bg-gray-200 text-gray-600 px-8 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <span className="font-black">{selectedIds.length} selecionados</span>
                        <button onClick={() => setSelectedIds([])} className="text-xs underline">Limpar seleção</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="px-4 py-2 rounded-lg text-xs font-black text-gray-900"
                        >
                            <option value="">Alterar Status...</option>
                            <option value="pendente">PENDENTE</option>
                            <option value="enviado_whatsapp">ENVIADO WHATSAPP</option>
                            <option value="enviado_email">ENVIADO EMAIL</option>
                            <option value="certificado_salvo">CERTIFICADO SALVO</option>
                            <option value="concluido">CONCLUÍDO</option>
                        </select>
                        <button
                            onClick={handleBulkStatusUpdate}
                            disabled={!bulkStatus}
                            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-black text-xs uppercase disabled:opacity-50"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[3rem] shadow-xl border overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <Loader2 className="animate-spin text-blue-600 w-8 h-8 mx-auto" />
                    </div>
                ) : solicitations.length === 0 ? (
                    <div className="p-20 text-center text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-bold uppercase tracking-widest text-xs">Nenhuma solicitação encontrada</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-900 text-white">
                                <th className="p-4 text-[10px] font-black uppercase w-12">
                                    <button onClick={toggleSelectAll}>
                                        {selectedIds.length === solicitations.length ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                </th>
                                <th className="p-4 text-[10px] font-black uppercase"><div className="flex items-center gap-2"><User size={12} /> Nome</div></th>
                                <th className="p-4 text-[10px] font-black uppercase"><div className="flex items-center gap-2"><Phone size={12} /> WhatsApp</div></th>
                                <th className="p-4 text-[10px] font-black uppercase"><div className="flex items-center gap-2"><Calendar size={12} /> Data</div></th>
                                <th className="p-4 text-[10px] font-black uppercase"><div className="flex items-center gap-2"><FileText size={12} /> Status</div></th>
                                <th className="p-4 text-[10px] font-black uppercase text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {solicitations.map((sol) => (
                                <tr key={sol.id} className="border-b border-gray-50 hover:bg-blue-50/20">
                                    <td className="p-4">
                                        <button onClick={() => toggleSelect(sol.id || '')}>
                                            {selectedIds.includes(sol.id || '') ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-black text-gray-900 text-sm">{sol.full_name}</div>
                                        <div className="text-[10px] text-gray-400">{sol.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold text-emerald-600">{sol.whatsapp}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold text-gray-600">{sol.participation_date}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${getStatusColor(sol.status)}`}>
                                            {sol.status?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleDownloadCertificate(sol)}
                                                className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center hover:bg-purple-500 hover:text-white transition-all"
                                                title="Baixar Certificado"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleSaveCertificate(sol)}
                                                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all"
                                                title="Salvar Certificado"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleGenerateCertificate(sol)}
                                                className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"
                                                title="Gerar Certificado PDF"
                                            >
                                                <Award size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleSendWhatsApp(sol)}
                                                disabled={sendingId === sol.id}
                                                className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
                                                title="Enviar WhatsApp"
                                            >
                                                {sendingId === sol.id ? <Loader2 className="animate-spin" size={16} /> : <MessageCircle size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleSendEmail(sol)}
                                                disabled={sendingId === sol.id}
                                                className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                                title="Enviar E-mail"
                                            >
                                                <Mail size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sol.id || '')}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
