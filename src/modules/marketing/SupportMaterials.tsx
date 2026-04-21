import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    FileText, Copy, Check, Calendar, Clock, MapPin, DollarSign,
    Plus, Trash2, Edit, Save, X, Image, Link, Download, ExternalLink,
    FolderOpen, Upload, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { AppConfig } from '../../shared';
import { useSupabase } from '../../services/useSupabase';

interface SupportMaterial {
    id: string;
    checkout_id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    location_url: string;
    link_oficial: string;
    link_pagamento: string;
    investment_12x: string;
    investment_pix: string;
    observation: string;
    created_at: string;
}

interface SavedArt {
    id: string;
    checkout_id: string;
    name: string;
    url: string;
    created_at: string;
}

interface SupportMaterialsProps {
    checkouts: AppConfig[];
}

export const SupportMaterials: React.FC<SupportMaterialsProps> = ({ checkouts }) => {
    const supabase = useSupabase();
    const [materials, setMaterials] = useState<SupportMaterial[]>([]);
    const [arts, setArts] = useState<SavedArt[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showArts, setShowArts] = useState(false);
    const [selectedCheckout, setSelectedCheckout] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState<Partial<SupportMaterial>>({
        date: '',
        start_time: '09:00',
        end_time: '17:00',
        location: '',
        location_url: '',
        link_oficial: '',
        link_pagamento: '',
        investment_12x: '',
        investment_pix: '',
        observation: ''
    });

    const [artForm, setArtForm] = useState({
        checkoutId: '',
        name: '',
        url: ''
    });

    const loadData = useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const [materialsRes, artsRes] = await Promise.all([
                supabase.from('support_materials').select('*').order('created_at', { ascending: false }),
                supabase.from('saved_arts').select('*').order('created_at', { ascending: false })
            ]);
            
            if (materialsRes.data) setMaterials(materialsRes.data);
            if (artsRes.data) setArts(artsRes.data);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredMaterials = useMemo(() => {
        if (!selectedCheckout) return materials;
        return materials.filter(m => m.checkout_id === selectedCheckout);
    }, [materials, selectedCheckout]);

    const filteredArts = useMemo(() => {
        if (!selectedCheckout) return arts;
        return arts.filter(a => a.checkout_id === selectedCheckout);
    }, [arts, selectedCheckout]);

    const generateMessage = (material: SupportMaterial): string => {
        const checkout = checkouts.find(c => c.id === material.checkout_id);
        const productName = checkout?.productName || 'Curso';
        const turma = checkout?.turma || '';

        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            const [year, month, day] = dateStr.split('-');
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            return `${day} de ${months[parseInt(month) - 1]}`;
        };

        const formatWeekday = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr + 'T12:00:00');
            const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return weekdays[date.getDay()];
        };

        const dateFormatted = formatDate(material.date);
        const weekday = formatWeekday(material.date);

        let message = `🚀 ${productName}${turma ? ` - ${turma}` : ''} - ${dateFormatted} 🚀\n\n`;
        message += `🗓 ${weekday} - ${dateFormatted}\n`;
        message += `🕘 Horário: Das ${material.start_time}h às ${material.end_time}h\n`;

        if (material.observation) {
            message += `📝 ${material.observation}\n`;
        }

        message += `\n📍 Local: ${material.location}\n`;
        if (material.location_url) {
            message += `📌 Local Google: ${material.location_url}\n`;
        }

        if (material.link_oficial) {
            message += `\n🔗 Link Oficial do ${productName}: ${material.link_oficial}\n`;
        }

        message += `\n💳 Investimento:\n\n`;

        if (material.investment_12x) {
            message += `✅ 12x de R$ ${material.investment_12x} no cartão de crédito\n`;
        }
        if (material.investment_pix) {
            message += `✅ Ou R$ ${material.investment_pix} à vista via PIX\n`;
        }
        if (material.link_pagamento) {
            message += `🔗 Link de Pagamento: ${material.link_pagamento}\n`;
        }

        message += `Chave Pix CNPJ:\n50208258/0001-56`;

        return message;
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    };

    const handleSave = async () => {
        if (!form.date || !form.checkout_id || !supabase) return;
        setIsSaving(true);

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('support_materials')
                    .update({
                        checkout_id: form.checkout_id,
                        date: form.date,
                        start_time: form.start_time || '09:00',
                        end_time: form.end_time || '17:00',
                        location: form.location || '',
                        location_url: form.location_url || '',
                        link_oficial: form.link_oficial || '',
                        link_pagamento: form.link_pagamento || '',
                        investment_12x: form.investment_12x || '',
                        investment_pix: form.investment_pix || '',
                        observation: form.observation || ''
                    })
                    .eq('id', editingId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('support_materials')
                    .insert({
                        checkout_id: form.checkout_id,
                        date: form.date,
                        start_time: form.start_time || '09:00',
                        end_time: form.end_time || '17:00',
                        location: form.location || '',
                        location_url: form.location_url || '',
                        link_oficial: form.link_oficial || '',
                        link_pagamento: form.link_pagamento || '',
                        investment_12x: form.investment_12x || '',
                        investment_pix: form.investment_pix || '',
                        observation: form.observation || ''
                    });

                if (error) throw error;
            }

            await loadData();
            resetForm();
        } catch (err) {
            console.error('Erro ao salvar:', err);
            alert('Erro ao salvar. Tente novamente.');
        }
        setIsSaving(false);
    };

    const handleEdit = (material: SupportMaterial) => {
        setForm({
            checkout_id: material.checkout_id,
            date: material.date,
            start_time: material.start_time,
            end_time: material.end_time,
            location: material.location,
            location_url: material.location_url,
            link_oficial: material.link_oficial,
            link_pagamento: material.link_pagamento,
            investment_12x: material.investment_12x,
            investment_pix: material.investment_pix,
            observation: material.observation
        });
        setEditingId(material.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!supabase) return;
        if (!confirm('Tem certeza que deseja excluir?')) return;

        try {
            const { error } = await supabase
                .from('support_materials')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadData();
        } catch (err) {
            console.error('Erro ao excluir:', err);
            alert('Erro ao excluir. Tente novamente.');
        }
    };

    const resetForm = () => {
        setForm({
            date: '',
            start_time: '09:00',
            end_time: '17:00',
            location: '',
            location_url: '',
            link_oficial: '',
            link_pagamento: '',
            investment_12x: '',
            investment_pix: '',
            observation: ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSaveArt = async () => {
        if (!artForm.url || !artForm.checkoutId || !supabase) return;

        try {
            const payload: any = {
                checkout_id: artForm.checkoutId,
                name: artForm.name || 'Arte',
                url: artForm.url
            };
            const { error } = await supabase
                .from('saved_arts')
                .insert(payload);

            if (error) throw error;
            await loadData();
            setArtForm({ checkoutId: '', name: '', url: '' });
        } catch (err) {
            console.error('Erro ao salvar arte:', err);
            alert('Erro ao salvar arte. Tente novamente.');
        }
    };

    const handleDeleteArt = async (id: string) => {
        if (!supabase) return;
        if (!confirm('Tem certeza que deseja excluir esta arte?')) return;

        try {
            const { error } = await supabase
                .from('saved_arts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadData();
        } catch (err) {
            console.error('Erro ao excluir arte:', err);
            alert('Erro ao excluir arte. Tente novamente.');
        }
    };

    const getCheckoutName = (id: string) => {
        const checkout = checkouts.find(c => c.id === id);
        return checkout ? `${checkout.productName}${checkout.turma ? ` (${checkout.turma})` : ''}` : 'Desconhecido';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Materiais de Apoio</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gerencie mensagens e artes por turma</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowArts(!showArts)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${showArts ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}
                    >
                        <Image size={14} /> Artes {showArts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${showForm ? 'bg-gray-900 text-white' : 'bg-indigo-600 text-white'}`}
                    >
                        <Plus size={14} /> Nova Mensagem {showForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                </div>
            </div>

            {/* Filtro por Turma */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <FolderOpen size={16} className="text-gray-400" />
                <select
                    value={selectedCheckout}
                    onChange={(e) => setSelectedCheckout(e.target.value)}
                    className="flex-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                    <option value="">Todas as Turmas</option>
                    {checkouts.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.productName} {c.turma ? `(${c.turma})` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Formulário de Nova Mensagem */}
            {showForm && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl p-6 border border-indigo-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-sm text-gray-800">{editingId ? 'Editar Mensagem' : 'Nova Mensagem'}</h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Produto / Turma *</label>
                            <select
                                value={form.checkout_id || ''}
                                onChange={(e) => setForm({ ...form, checkout_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            >
                                <option value="">Selecione...</option>
                                {checkouts.map(c => (
                                    <option key={c.id} value={c.id}>{c.productName} {c.turma ? `(${c.turma})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Data *</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Horário Início</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Horário Término</label>
                            <input
                                type="time"
                                value={form.end_time}
                                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Local (Endereço)</label>
                            <input
                                type="text"
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                placeholder="Ex: R. Dr. Cândido Rodrigues, 221 - Centro, Bragança Paulista - SP"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Link Google Maps</label>
                            <input
                                type="url"
                                value={form.location_url}
                                onChange={(e) => setForm({ ...form, location_url: e.target.value })}
                                placeholder="https://share.google/..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Link Oficial do Curso</label>
                            <input
                                type="url"
                                value={form.link_oficial}
                                onChange={(e) => setForm({ ...form, link_oficial: e.target.value })}
                                placeholder="https://www.voxmarketingacademy.com.br/..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Link de Pagamento</label>
                            <input
                                type="url"
                                value={form.link_pagamento}
                                onChange={(e) => setForm({ ...form, link_pagamento: e.target.value })}
                                placeholder="https://checkoutvoxmarketingacademy.online/?p=..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Investimento 12x (R$)</label>
                            <input
                                type="text"
                                value={form.investment_12x}
                                onChange={(e) => setForm({ ...form, investment_12x: e.target.value })}
                                placeholder="21,74"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Investimento PIX (R$)</label>
                            <input
                                type="text"
                                value={form.investment_pix}
                                onChange={(e) => setForm({ ...form, investment_pix: e.target.value })}
                                placeholder="232,00"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Observação</label>
                            <input
                                type="text"
                                value={form.observation}
                                onChange={(e) => setForm({ ...form, observation: e.target.value })}
                                placeholder="Ex: Levar notebook para praticar bastante"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={resetForm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                            {editingId ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Seção de Artes */}
            {showArts && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-sm text-gray-800 flex items-center gap-2">
                            <Image size={16} className="text-purple-500" /> Artes Salvas
                        </h3>
                    </div>

                    {/* Formulário de nova arte */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-purple-50 rounded-xl">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Turma</label>
                            <select
                                value={artForm.checkoutId}
                                onChange={(e) => setArtForm({ ...artForm, checkoutId: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-purple-200 outline-none focus:ring-2 focus:ring-purple-300 font-bold text-xs"
                            >
                                <option value="">Selecione...</option>
                                {checkouts.map(c => (
                                    <option key={c.id} value={c.id}>{c.productName} {c.turma ? `(${c.turma})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Nome da Arte</label>
                            <input
                                type="text"
                                value={artForm.name}
                                onChange={(e) => setArtForm({ ...artForm, name: e.target.value })}
                                placeholder="Ex: Banner Instagram"
                                className="w-full px-3 py-2 rounded-lg border border-purple-200 outline-none focus:ring-2 focus:ring-purple-300 font-bold text-xs"
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">URL da Imagem</label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={artForm.url}
                                    onChange={(e) => setArtForm({ ...artForm, url: e.target.value })}
                                    placeholder="https://..."
                                    className="flex-1 px-3 py-2 rounded-lg border border-purple-200 outline-none focus:ring-2 focus:ring-purple-300 font-bold text-xs"
                                />
                                <button
                                    onClick={handleSaveArt}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-purple-700 transition-colors"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de artes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredArts.map(art => (
                            <div key={art.id} className="relative group bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                <div className="aspect-square bg-gray-200 relative">
                                    <img
                                        src={art.url}
                                        alt={art.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23e5e7eb" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">Imagem</text></svg>';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <a
                                            href={art.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                        <button
                                            onClick={() => copyToClipboard(art.url, `art-${art.id}`)}
                                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100"
                                        >
                                            {copiedId === `art-${art.id}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteArt(art.id)}
                                            className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white hover:bg-red-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <p className="text-[10px] font-bold text-gray-700 truncate">{art.name}</p>
                                    <p className="text-[8px] text-gray-400 truncate">{getCheckoutName(art.checkout_id)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredArts.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <Image size={40} className="mx-auto mb-3 opacity-50" />
                            <p className="text-xs font-bold">Nenhuma arte salva</p>
                        </div>
                    )}
                </div>
            )}

            {/* Lista de Mensagens */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {filteredMaterials.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-bold">Nenhuma mensagem criada</p>
                        <p className="text-xs mt-1">Clique em "Nova Mensagem" para começar</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredMaterials.map(material => {
                            const message = generateMessage(material);
                            return (
                                <div key={material.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                                {getCheckoutName(material.checkout_id)}
                                            </span>
                                            <p className="text-lg font-black text-gray-900 mt-1">
                                                {new Date(material.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(material)}
                                                className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(material.id)}
                                                className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap text-gray-700 leading-relaxed">
                                        {message}
                                    </div>

                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={() => copyToClipboard(message, material.id)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${copiedId === material.id
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                }`}
                                        >
                                            {copiedId === material.id ? <Check size={14} /> : <Copy size={14} />}
                                            {copiedId === material.id ? 'Copiado!' : 'Copiar Mensagem'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
