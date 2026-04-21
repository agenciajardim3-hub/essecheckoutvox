import React, { useState } from 'react';
import { Database as DatabaseIcon, Save, RotateCcw, ShieldCheck, Globe } from 'lucide-react';
import { Input } from '../../shared/components/Input';

interface IntegrationsStatusProps {
    dbStatus: 'online' | 'offline' | 'error';
    onRetry: () => void;
}

export const IntegrationsStatus: React.FC<IntegrationsStatusProps> = ({ dbStatus, onRetry }) => {
    const [url, setUrl] = useState(localStorage.getItem('supabase_url') || '');
    const [key, setKey] = useState(localStorage.getItem('supabase_key') || '');

    const handleSave = () => {
        if (!url || !key) {
            alert('Por favor, preencha a URL e a Key!');
            return;
        }
        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);
        alert('Configurações salvas! A página será recarregada.');
        window.location.reload();
    };

    const handleReset = () => {
        if (confirm('Deseja resetar para as chaves padrão do sistema?')) {
            localStorage.removeItem('supabase_url');
            localStorage.removeItem('supabase_key');
            window.location.reload();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
            {/* Status Card */}
            <div className="p-8 md:p-12 bg-white rounded-[3.5rem] border shadow-xl text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${dbStatus === 'online' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <DatabaseIcon size={40} />
                </div>
                <h2 className="text-xl font-black mb-2 text-gray-900">Status da Base de Dados</h2>
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-6">
                    {dbStatus === 'online' ? 'Conexão Estabelecida' : 'Erro de Conexão'}
                </p>
                <div className="flex gap-4 max-w-sm mx-auto">
                    <button onClick={onRetry} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-black transition-all">Testar Agora</button>
                </div>
            </div>

            {/* Config Card */}
            <div className="p-8 md:p-12 bg-white rounded-[3.5rem] border shadow-xl">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Configuração Supabase</h3>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Aponte para o seu próprio banco de dados</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <Globe size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Project URL</span>
                        </div>
                        <Input
                            placeholder="https://sua-url.supabase.co"
                            value={url}
                            onChange={setUrl}
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <ShieldCheck size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Anon Public Key</span>
                        </div>
                        <Input
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                            value={key}
                            onChange={setKey}
                            type="password"
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200"
                    >
                        <Save size={18} /> Salvar e Conectar
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-8 py-5 text-gray-400 font-black text-xs uppercase hover:text-red-500 transition-all flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} /> Resetar Padrão
                    </button>
                </div>

                <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                        ⚠️ Ao trocar o banco de dados, você precisará rodar o script SQL fornecido no seu novo painel do Supabase para que o sistema funcione corretamente.
                    </p>
                </div>
            </div>
        </div>
    );
};
