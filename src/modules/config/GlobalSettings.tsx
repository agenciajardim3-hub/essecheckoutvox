import React, { useState, useEffect } from 'react';
import { Settings, Save, Eye, Globe, Key, Check, Loader2, Info } from 'lucide-react';

interface GlobalSettingsProps {
    onSave?: (settings: GlobalSettings) => void;
}

interface GlobalSettings {
    globalPixelId: string;
    globalGa4Id: string;
    pixelEnabled: boolean;
    ga4Enabled: boolean;
}

const STORAGE_KEY = 'vox_global_tracking_settings';

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ onSave }) => {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<GlobalSettings>({
        globalPixelId: '',
        globalGa4Id: '',
        pixelEnabled: true,
        ga4Enabled: true
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load from localStorage
        const savedSettings = localStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings));
            } catch {}
        }
    }, []);

    const handleSave = () => {
        setLoading(true);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            setSaved(true);
            if (onSave) onSave(settings);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                    <Settings className="text-blue-600" /> Configurações Globais de Rastreamento
                </h3>
                <p className="text-gray-500 text-xs font-medium">Configure o rastreamento que será aplicado em todas as páginas</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold">Rastreamento Global vs Individual</p>
                    <p className="text-xs mt-1">
                        As configurações aqui são <strong>globais</strong> e funcionam em todas as páginas. 
                        Você também pode configurar Pixel/GA4 <strong>por checkout</strong> na edição de cada produto - 
                        o rastreamento por checkout tem prioridade sobre o global.
                    </p>
                </div>
            </div>

            {/* Meta Pixel Global */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Globe className="text-white" size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900">Meta Pixel Global</h4>
                            <p className="text-xs text-gray-500">Rastreamento em todas as páginas</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={settings.pixelEnabled}
                            onChange={(e) => setSettings({ ...settings, pixelEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-black text-gray-700 block mb-2">Meta Pixel ID</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder="Ex: 123456789012345"
                                value={settings.globalPixelId}
                                onChange={(e) => setSettings({ ...settings, globalPixelId: e.target.value })}
                                disabled={!settings.pixelEnabled}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Encontrado no Gerenciador de Eventos → Fontes de Dados</p>
                    </div>
                </div>
            </div>

            {/* GA4 Global */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                            <Eye className="text-white" size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-gray-900">Google Analytics 4 (GA4)</h4>
                            <p className="text-xs text-gray-500">Rastreamento completo de analytics</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={settings.ga4Enabled}
                            onChange={(e) => setSettings({ ...settings, ga4Enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-black text-gray-700 block mb-2">GA4 Measurement ID</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                placeholder="Ex: G-XXXXXXXXXX"
                                value={settings.globalGa4Id}
                                onChange={(e) => setSettings({ ...settings, globalGa4Id: e.target.value })}
                                disabled={!settings.ga4Enabled}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Encontrado em Administrador → Propriedade → ID de medição</p>
                    </div>
                </div>
            </div>

            {/* Resumo */}
            {(settings.globalPixelId || settings.globalGa4Id) && (
                <div className="bg-gray-900 rounded-2xl p-6 text-white">
                    <h4 className="font-black text-sm mb-3 flex items-center gap-2">
                        <Check size={16} className="text-emerald-400" /> Configurações Ativas
                    </h4>
                    <div className="space-y-2 text-xs">
                        {settings.pixelEnabled && settings.globalPixelId && (
                            <p className="flex items-center gap-2">
                                <span className="text-blue-400">●</span> Meta Pixel: <span className="font-mono">{settings.globalPixelId}</span>
                            </p>
                        )}
                        {settings.ga4Enabled && settings.globalGa4Id && (
                            <p className="flex items-center gap-2">
                                <span className="text-emerald-400">●</span> GA4: <span className="font-mono">{settings.globalGa4Id}</span>
                            </p>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg"
            >
                {loading ? (
                    <Loader2 className="animate-spin" />
                ) : saved ? (
                    <>
                        <Check size={20} /> Configurações Salvas!
                    </>
                ) : (
                    <>
                        <Save size={20} /> Salvar Configurações
                    </>
                )}
            </button>
        </div>
    );
};
