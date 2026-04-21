
import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Trash2, Plus, Signature, Check, X } from 'lucide-react';
import { useSupabase } from '../../services/useSupabase';

interface SignatureTemplate {
    id?: string;
    name: string;
    image_url: string;
    created_at?: string;
}

interface SignatureManagerProps {
    onSelectSignature?: (url: string) => void;
    uploadService: (file: File) => Promise<string | null>;
    isUploading?: string | null;
    selectedSignature?: string;
}

export const SignatureManager: React.FC<SignatureManagerProps> = ({ 
    onSelectSignature, 
    uploadService, 
    isUploading,
    selectedSignature: externalSelectedSignature = ''
}) => {
    const supabase = useSupabase();
    const [signatures, setSignatures] = useState<SignatureTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newSignature, setNewSignature] = useState({ name: '', image_url: '' });
    const [saving, setSaving] = useState(false);
    const [selectedSignature, setSelectedSignature] = useState<string>(externalSelectedSignature);

    // Sync with external selected signature
    useEffect(() => {
        if (externalSelectedSignature) {
            setSelectedSignature(externalSelectedSignature);
        } else {
            // Try to load from localStorage
            const saved = localStorage.getItem('vox_selected_signature');
            if (saved) {
                setSelectedSignature(saved);
            }
        }
    }, [externalSelectedSignature]);

    useEffect(() => {
        fetchSignatures();
    }, []);

    const fetchSignatures = async () => {
        if (!supabase) {
            // Load from localStorage as fallback
            const saved = localStorage.getItem('vox_signature_templates');
            if (saved) {
                try {
                    setSignatures(JSON.parse(saved));
                } catch {}
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('signature_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSignatures(data || []);
        } catch (err) {
            console.error('Error fetching signatures:', err);
            // Fallback to localStorage
            const saved = localStorage.getItem('vox_signature_templates');
            if (saved) {
                try {
                    setSignatures(JSON.parse(saved));
                } catch {}
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadService(file);
            if (url) {
                setNewSignature(prev => ({ ...prev, image_url: url }));
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!newSignature.name || !newSignature.image_url) {
            alert('Preencha o nome e faça upload da assinatura!');
            return;
        }

        setSaving(true);
        try {
            let savedId = '';
            if (supabase) {
                const { data, error } = await supabase.from('signature_templates').insert({
                    name: newSignature.name,
                    image_url: newSignature.image_url
                }).select().single();
                if (error) throw error;
                savedId = data?.id;
            } else {
                // Fallback to localStorage
                const newSig = { ...newSignature, id: crypto.randomUUID(), created_at: new Date().toISOString() };
                const updated = [...signatures, newSig];
                setSignatures(updated);
                localStorage.setItem('vox_signature_templates', JSON.stringify(updated));
                savedId = newSig.id;
            }

            setShowForm(false);
            setNewSignature({ name: '', image_url: '' });
            fetchSignatures();
            
            // Auto-select the newly saved signature
            if (onSelectSignature) {
                onSelectSignature(newSignature.image_url);
                localStorage.setItem('vox_selected_signature', newSignature.image_url);
            }
        } catch (err) {
            console.error('Error saving:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta assinatura?')) return;

        try {
            if (supabase) {
                await supabase.from('signature_templates').delete().eq('id', id);
            }
            setSignatures(prev => prev.filter(s => s.id !== id));
            localStorage.setItem('vox_signature_templates', JSON.stringify(signatures.filter(s => s.id !== id)));
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const handleSelect = (sig: SignatureTemplate) => {
        if (onSelectSignature) {
            onSelectSignature(sig.image_url);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                        <Signature className="text-blue-600" /> Modelos de Assinatura
                    </h3>
                    <p className="text-gray-500 text-xs font-medium">Gerencie assinaturas para certificados</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-blue-700 transition-all"
                >
                    <Plus size={16} /> Nova Assinatura
                </button>
            </div>

            {showForm && (
                <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-black text-gray-700 block mb-2">Nome da Assinatura</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="Ex: Rodrigo Jardim"
                                value={newSignature.name}
                                onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-black text-gray-700 block mb-2">Arquivo da Assinatura</label>
                            <div className="flex items-center gap-3">
                                <label className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-500 transition-all">
                                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                                    <div className="flex items-center justify-center gap-2 text-gray-500 font-bold text-sm">
                                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                                        {newSignature.image_url ? 'Alterar imagem' : 'Selecionar imagem'}
                                    </div>
                                </label>
                                {newSignature.image_url && (
                                    <img src={newSignature.image_url} alt="Preview" className="w-16 h-16 object-contain bg-white rounded-xl border" />
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving || uploading}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-blue-700 transition-all"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : <Check size={16} />} Salvar
                        </button>
                        <button
                            onClick={() => { setShowForm(false); setNewSignature({ name: '', image_url: '' }); }}
                            className="bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-black text-xs uppercase hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-10">
                    <Loader2 className="animate-spin text-blue-600 w-6 h-6 mx-auto" />
                </div>
            ) : signatures.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <Signature size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase">Nenhuma assinatura cadastrada</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {signatures.map((sig) => (
                        <div key={sig.id} className={`border-2 rounded-2xl p-4 transition-all ${selectedSignature === sig.image_url ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                            <div className="aspect-[3/1] bg-gray-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                                <img src={sig.image_url} alt={sig.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-black text-sm text-gray-900 truncate">{sig.name}</span>
                                <div className="flex gap-1">
                                    {onSelectSignature && (
                                        <button
                                            onClick={() => handleSelect(sig)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedSignature === sig.image_url ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white'}`}
                                            title="Usar esta assinatura"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(sig.id || '')}
                                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            {selectedSignature === sig.image_url && (
                                <div className="mt-2 text-center">
                                    <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">ASSINATURA ATIVA</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
