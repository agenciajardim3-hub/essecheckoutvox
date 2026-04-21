import React, { useState, useEffect } from 'react';
import { Copy, Check, Loader2, Sparkles, Settings, Send, Trash2, Save, RefreshCw, MessageCircle, Zap, Brain, Package, ChevronDown } from 'lucide-react';
import { AppConfig } from '../../shared';

interface RemarketingMessage {
    day: number;
    dayLabel: string;
    option: number;
    message: string;
}

interface AIProvider {
    id: string;
    name: string;
    icon: string;
    color: string;
    apiKeyLabel: string;
    endpoint: string;
}

const AI_PROVIDERS: AIProvider[] = [
    { 
        id: 'openai', 
        name: 'ChatGPT', 
        icon: '🤖', 
        color: 'bg-green-500',
        apiKeyLabel: 'OpenAI API Key',
        endpoint: 'https://api.openai.com/v1/chat/completions'
    },
    { 
        id: 'gemini', 
        name: 'Google Gemini', 
        icon: '🔮', 
        color: 'bg-blue-500',
        apiKeyLabel: 'Google AI API Key',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    },
    { 
        id: 'deepseek', 
        name: 'DeepSeek', 
        icon: '🧠', 
        color: 'bg-purple-500',
        apiKeyLabel: 'DeepSeek API Key',
        endpoint: 'https://api.deepseek.com/v1/chat/completions'
    }
];

const DAY_LABELS: Record<number, string> = {
    1: 'Conexão - "Vi que você se interessou"',
    2: 'Autoridade - Prova Social',
    3: 'Quebra de Objeções - Preço/Tempo',
    4: 'Social Proof - Depoimentos',
    5: 'Desejo/Bônus - O que ganha agora',
    6: 'Urgência - Vagas limitadas',
    7: 'Última Chamada - FOMO'
};

const STORAGE_KEY = 'vox_remarketing_config';

interface RemarketingForm {
    turmaName: string;
    startDate: string;
    price: string;
    differential: string;
    link: string;
    provider: string;
    apiKey: string;
}

interface RemarketingDashboardProps {
    checkouts?: AppConfig[];
}

export const RemarketingDashboard: React.FC<RemarketingDashboardProps> = ({ checkouts = [] }) => {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<RemarketingMessage[]>([]);
    const [rawResponse, setRawResponse] = useState<string>('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [savedConfig, setSavedConfig] = useState<Partial<RemarketingForm>>({});
    const [selectedCheckoutId, setSelectedCheckoutId] = useState<string>('');
    const [form, setForm] = useState<RemarketingForm>({
        turmaName: '',
        startDate: '',
        price: '',
        differential: '',
        link: '',
        provider: 'openai',
        apiKey: ''
    });

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSavedConfig(parsed);
                setForm(prev => ({ ...prev, ...parsed }));
            } catch {}
        }
    }, []);

    const handleSaveConfig = () => {
        const configToSave = {
            provider: form.provider,
            apiKey: form.apiKey,
            turmaName: form.turmaName,
            startDate: form.startDate,
            price: form.price,
            differential: form.differential,
            link: form.link
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
        setSavedConfig(configToSave);
        setShowConfig(false);
    };

    const generatePrompt = (): string => {
        return `Crie uma sequência de 7 DIAS de remarketing para WhatsApp. Para cada dia, crie exatamente 5 OPÇÕES de mensagem DIFERENTES e ÚNICAS.

**DIAS:**
- Dia 1: Conexão - "Vi que você se interessou mas não finalizou"
- Dia 2: Autoridade - Prova social e resultados de alunos
- Dia 3: Objeções - Preço, tempo, suporte
- Dia 4: Prova Social - Depoimentos e transformações
- Dia 5: Bônus - O que ganha ao entrar AGORA
- Dia 6: Urgência - Vagas limitadas
- Dia 7: FOMO - Última chamada

**REGRAS:**
1. Use *negrito* para destacar palavras no WhatsApp
2. Cada opção deve ser COMPLETAMENTE DIFERENTE das outras
3. Use emojis moderados
4. Tom: Mentor experiente, direto, motivador
5. **OBRIGATÓRIO: Todas as mensagens devem terminar com:** \n\n👉 *Inscrição:* ${form.link}

**DADOS:**
*Curso:* ${form.turmaName}
*Início:* ${form.startDate || 'Em breve'}
*Preço:* ${form.price}
*Bônus:* ${form.differential || 'Mentoria individual + suporte VIP'}

**FORMATO (use exatamente este formato):**
DIA 1 - OPÇÃO 1
[mensagem com link no final]

DIA 1 - OPÇÃO 2
[mensagem com link no final]

... e assim por diante até DIA 7 - OPÇÃO 5

GERE TODAS AS 35 MENSAGENS AGORA!`;
    };

    const parseMessages = (response: string): RemarketingMessage[] => {
        const result: RemarketingMessage[] = [];
        
        // More robust: split by each "DIA X - OPÇÃO Y" header
        const regex = /DIA\s*(\d+)\s*-\s*OPÇÃO\s*(\d+)([\s\S]*?)(?=(?:\s*DIA\s*\d+\s*-\s*OPÇÃO\s*\d+)|$)/gi;
        let match;
        
        while ((match = regex.exec(response)) !== null) {
            const day = parseInt(match[1]);
            const option = parseInt(match[2]);
            let message = match[3].trim();
            
            // Clean up the message - remove any remaining headers
            message = message.replace(/^[\s\n]*/, '').replace(/\n*$/, '');
            
            // Skip if too short (probably not a real message)
            if (message.length < 20) continue;
            
            // Also skip if it looks like it contains multiple options (has "OPÇÃO 1" or "OPÇÃO 2" inside)
            if (message.includes('OPÇÃO 1') || message.includes('OPÇÃO 2') || message.includes('OPÇÃO 3')) {
                // Try to split this section further
                const subParts = message.split(/OPÇÃO\s*\d+/);
                subParts.forEach((part, idx) => {
                    if (idx === 0) return; // Skip first part (header)
                    const cleanedPart = part.trim();
                    if (cleanedPart.length > 20) {
                        result.push({
                            day: day,
                            dayLabel: DAY_LABELS[day] || `Dia ${day}`,
                            option: idx,
                            message: cleanedPart
                        });
                    }
                });
            } else {
                result.push({
                    day: day,
                    dayLabel: DAY_LABELS[day] || `Dia ${day}`,
                    option: option,
                    message: message
                });
            }
        }
        
        // If still no messages, try simpler approach - split by each "DIA X"
        if (result.length === 0) {
            const byDay = response.split(/(?=DIA\s*\d+\s*-\s*OPÇÃO)/i);
            byDay.forEach(section => {
                const dayMatch = section.match(/DIA\s*(\d+)/i);
                if (!dayMatch) return;
                const day = parseInt(dayMatch[1]);
                
                // Split by "OPÇÃO"
                const options = section.split(/(?=OPÇÃO\s*\d+)/i);
                options.forEach((opt, idx) => {
                    if (idx === 0) return;
                    const optNum = opt.match(/OPÇÃO\s*(\d+)/i);
                    if (!optNum) return;
                    const option = parseInt(optNum[1]);
                    let msg = opt.replace(/OPÇÃO\s*\d+/i, '').trim();
                    if (msg.length > 20) {
                        result.push({
                            day: day,
                            dayLabel: DAY_LABELS[day] || `Dia ${day}`,
                            option: option,
                            message: msg
                        });
                    }
                });
            });
        }
        
        // Sort by day then option
        return result.sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.option - b.option;
        });
    };

    const handleGenerate = async () => {
        if (!form.turmaName || !form.price || !form.link) {
            alert('Preencha: Nome da Turma, Preço e Link!');
            return;
        }

        if (!form.apiKey) {
            alert('Configure sua API Key nas configurações!');
            return;
        }

        setLoading(true);
        setMessages([]);

        try {
            const provider = AI_PROVIDERS.find(p => p.id === form.provider) || AI_PROVIDERS[0];
            const prompt = generatePrompt();
            let response: string;

            if (provider.id === 'openai' || provider.id === 'deepseek') {
                const res = await fetch(provider.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${form.apiKey}`
                    },
                    body: JSON.stringify({
                        model: provider.id === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.9
                    })
                });
                const data = await res.json();
                response = data.choices?.[0]?.message?.content || 'Erro ao gerar';
            } else if (provider.id === 'gemini') {
                const res = await fetch(`${provider.endpoint}?key=${form.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                const data = await res.json();
                response = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Erro ao gerar';
            }

            const parsed = parseMessages(response);
            console.log('Parsed messages:', parsed);
            console.log('Raw response:', response);
            setRawResponse(response);
            setMessages(parsed);
        } catch (err) {
            console.error('Error generating:', err);
            alert('Erro ao gerar mensagens. Verifique sua API Key e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (msg: RemarketingMessage) => {
        const text = `*${msg.day} - Opção ${msg.option}*\n\n${msg.message}`;
        navigator.clipboard.writeText(text);
        setCopiedId(`${msg.day}-${msg.option}`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyAll = () => {
        const allText = messages.map(msg => 
            `*${msg.day} - Opção ${msg.option}*\n\n${msg.message}\n\n---\n`
        ).join('\n');
        navigator.clipboard.writeText(allText);
        setCopiedId('all');
        setTimeout(() => setCopiedId(null), 3000);
    };

    const currentProvider = AI_PROVIDERS.find(p => p.id === form.provider) || AI_PROVIDERS[0];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                        <MessageCircle className="text-purple-600" /> Remarketing com IA
                    </h3>
                    <p className="text-gray-500 text-xs font-medium">Gere sequências de mensagens automáticas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-gray-200 transition-all"
                    >
                        <Settings size={16} /> Configurar IA
                    </button>
                </div>
            </div>

            {showConfig && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-100 p-6 rounded-2xl animate-in slide-in-from-top-2">
                    <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                        <Brain size={18} className="text-purple-600" /> Configurações da IA
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-sm font-black text-gray-700 block mb-2">Provider de IA</label>
                            <div className="flex gap-2">
                                {AI_PROVIDERS.map(provider => (
                                    <button
                                        key={provider.id}
                                        onClick={() => setForm({ ...form, provider: provider.id })}
                                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                            form.provider === provider.id 
                                                ? `${provider.color} text-white` 
                                                : 'bg-white text-gray-600 border border-gray-200'
                                        }`}
                                    >
                                        {provider.icon} {provider.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-black text-gray-700 block mb-2">{currentProvider.apiKeyLabel}</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                                placeholder="Cole sua API key aqui..."
                                value={form.apiKey}
                                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSaveConfig}
                        className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-purple-700 transition-all"
                    >
                        <Save size={16} /> Salvar Configurações
                    </button>
                </div>
            )}

            {checkouts.length > 0 && (
                <div className="bg-purple-50 border-2 border-purple-100 p-4 rounded-2xl">
                    <label className="text-sm font-black text-purple-700 block mb-2 flex items-center gap-2">
                        <Package size={16} /> Selecionar do Banco de Dados
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={selectedCheckoutId}
                            onChange={(e) => {
                                const checkout = checkouts.find(c => c.id === e.target.value);
                                setSelectedCheckoutId(e.target.value);
                                if (checkout) {
                                    setForm({
                                        ...form,
                                        turmaName: checkout.productName || checkout.turma || '',
                                        price: checkout.productPrice || '',
                                        link: `${window.location.origin}/?p=${checkout.slug || checkout.id}`
                                    });
                                }
                            }}
                            className="flex-1 px-4 py-3 rounded-xl border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        >
                            <option value="">Selecione uma turma...</option>
                            {checkouts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.productName || c.turma || c.id} {c.isActive ? '✓' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="text-[10px] text-purple-600 mt-2">
                        Selecione uma turma para自动 preencher os dados do curso
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="text-sm font-black text-gray-700 block mb-2">Nome da Turma *</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        placeholder="Ex: Tráfego Pago Expert"
                        value={form.turmaName}
                        onChange={(e) => setForm({ ...form, turmaName: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-black text-gray-700 block mb-2">Data de Início</label>
                    <input
                        type="date"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-black text-gray-700 block mb-2">Preço/Condição *</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        placeholder="Ex: R$ 497 ou 12x R$ 49,70"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                </div>
                <div>
                    <label className="text-sm font-black text-gray-700 block mb-2">Diferencial</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        placeholder="Ex: Mentoria individual + Bônus de R$ 500"
                        value={form.differential}
                        onChange={(e) => setForm({ ...form, differential: e.target.value })}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-sm font-black text-gray-700 block mb-2">Link de Inscrição *</label>
                    <input
                        type="url"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        placeholder="https://..."
                        value={form.link}
                        onChange={(e) => setForm({ ...form, link: e.target.value })}
                    />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-3 hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={20} /> Gerando mensagens com IA...
                    </>
                ) : (
                    <>
                        <Sparkles size={20} /> Gerar Sequência de Remarketing
                    </>
                )}
            </button>

            {messages.length > 0 && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-black text-gray-900">{messages.length} mensagens geradas</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRaw(!showRaw)}
                                className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-1 hover:bg-gray-200"
                            >
                                {showRaw ? 'Ocultar' : 'Ver Texto Completo'}
                            </button>
                                    <button
                                        onClick={handleCopyAll}
                                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-emerald-700 transition-all"
                                    >
                                        {copiedId === 'all' ? <Check size={16} /> : <Copy size={16} />} Copiar Todas
                                    </button>
                                </div>
                            </div>

                            {showRaw && rawResponse && (
                                <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 whitespace-pre-wrap">
                                    {rawResponse}
                                </div>
                            )}

                    {!showRaw && [1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                        const dayMessages = messages.filter(m => m.day === dayNum);
                        if (dayMessages.length === 0) return null;
                        
                        const dayLabels: Record<number, string> = {
                            1: 'Conexão - "Vi que você se interessou"',
                            2: 'Autoridade - Prova Social',
                            3: 'Quebra de Objeções - Preço/Tempo',
                            4: 'Social Proof - Depoimentos',
                            5: 'Desejo/Bônus - O que ganha agora',
                            6: 'Urgência - Vagas limitadas',
                            7: 'Última Chamada - FOMO'
                        };

                        const colorNames: Record<number, string> = {
                            1: 'blue',
                            2: 'purple', 
                            3: 'orange',
                            4: 'indigo',
                            5: 'pink',
                            6: 'amber',
                            7: 'red'
                        };
                        
                        const color = colorNames[dayNum];
                        
                        return (
                            <div key={dayNum} className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: dayNum === 1 ? '#bfdbfe' : dayNum === 2 ? '#e9d5ff' : dayNum === 3 ? '#fed7aa' : dayNum === 4 ? '#c7d2fe' : dayNum === 5 ? '#fbcfe8' : dayNum === 6 ? '#fef3c7' : '#fecaca', backgroundColor: dayNum === 1 ? '#eff6ff' : dayNum === 2 ? '#faf5ff' : dayNum === 3 ? '#fff7ed' : dayNum === 4 ? '#eef2ff' : dayNum === 5 ? '#fdf2f8' : dayNum === 6 ? '#fffbeb' : '#fef2f2' }}>
                                <div className="px-6 py-3 text-white font-black text-sm uppercase" style={{ backgroundColor: dayNum === 1 ? '#3b82f6' : dayNum === 2 ? '#a855f7' : dayNum === 3 ? '#f97316' : dayNum === 4 ? '#6366f1' : dayNum === 5 ? '#ec4899' : dayNum === 6 ? '#f59e0b' : '#ef4444' }}>
                                    Dia {dayNum} - {dayLabels[dayNum]}
                                </div>
                                <div className="p-4 space-y-3">
                                    {dayMessages.map((msg, idx) => (
                                        <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-gray-400">OPÇÃO {idx + 1}</span>
                                                <button
                                                    onClick={() => handleCopy(msg)}
                                                    className="text-white px-4 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 transition-all"
                                                    style={{ backgroundColor: dayNum === 1 ? '#3b82f6' : dayNum === 2 ? '#a855f7' : dayNum === 3 ? '#f97316' : dayNum === 4 ? '#6366f1' : dayNum === 5 ? '#ec4899' : dayNum === 6 ? '#f59e0b' : '#ef4444' }}
                                                >
                                                    {copiedId === `${msg.day}-${msg.option}` ? (
                                                        <><Check size={14} /> Copiado!</>
                                                    ) : (
                                                        <><Copy size={14} /> Copiar</>
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-line">{msg.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && messages.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Zap size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-xs font-bold uppercase">Preencha os dados e clique em gerar</p>
                    <p className="text-[10px] mt-1">A IA criará 35 mensagens (7 dias x 5 opções)</p>
                </div>
            )}
        </div>
    );
};
