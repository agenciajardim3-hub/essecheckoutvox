
import React, { useMemo } from 'react';
import { Tag, Wand2, ImageIcon as ImageIconLucide, Loader2, Upload, ImageIcon, PieChart, BarChart3, ListChecks, Plus, Trash2, CheckCircle, PartyPopper, Webhook, Layers, Link as LinkIcon, Megaphone, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Input } from '../ui/Input';
import { AppConfig, ProductVariation, Lead } from '../../types';

interface ProductConfigProps {
    config: AppConfig;
    setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
    isUploading: string | null;
    uploadService: (file: File) => Promise<string | null>;
    onSave: (asNew?: boolean) => void;
    isSubmitting: boolean;
    onCancel: () => void;
    allCheckouts: AppConfig[];
    leads?: Lead[];
}

export const ProductConfig: React.FC<ProductConfigProps> = ({
    config,
    setConfig,
    isUploading,
    uploadService,
    onSave,
    isSubmitting,
    onCancel,
    allCheckouts,
    leads = []
}) => {
    // Calculate product statistics
    const productStats = useMemo(() => {
        const productLeads = leads.filter(l => l.product_id === config.id);
        const paidLeads = productLeads.filter(l => l.status === 'Pago' || l.status === 'Aprovado');
        const totalRevenue = paidLeads.reduce((sum, l) => sum + (l.paid_amount || 0), 0);

        return {
            total: productLeads.length,
            paid: paidLeads.length,
            pending: productLeads.filter(l => l.status !== 'Pago' && l.status !== 'Aprovado').length,
            revenue: totalRevenue,
            conversionRate: productLeads.length > 0 ? ((paidLeads.length / productLeads.length) * 100).toFixed(1) : '0'
        };
    }, [config.id, leads]);

    const generateAutoSlug = () => {
        const base = config.productName || 'checkout';
        const turma = config.turma ? `-${config.turma}` : '';
        const clean = (base + turma)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        setConfig({ ...config, slug: clean });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = await uploadService(file);
        if (url) {
            if (type === 'product') {
                setConfig(prev => ({ ...prev, productImage: url }));
            } else {
                setConfig(prev => ({ ...prev, bannerImage: url }));
            }
        }
    };

    const [activeTab, setActiveTab] = React.useState<'geral' | 'conteudo' | 'evento' | 'marketing' | 'poscompra' | 'integracoes' | 'variacoes'>('geral');

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-72 bg-gray-50/50 border-r border-gray-100 p-8 flex flex-col gap-2 overflow-y-auto">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-gray-900 leading-tight">
                            {allCheckouts.some(p => p.id === config.id) ? config.productName : 'Novo Produto'}
                        </h2>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter mt-1">Configuração do Checkout</p>
                    </div>

                    {/* Product Statistics */}
                    {allCheckouts.some(p => p.id === config.id) && productStats.total > 0 && (
                        <div className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 space-y-3">
                            <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Estatísticas</p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1"><Users size={12} /> Cadastros</span>
                                    <span className="font-black text-sm text-blue-600">{productStats.total}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1"><CheckCircle size={12} /> Pagos</span>
                                    <span className="font-black text-sm text-emerald-600">{productStats.paid}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1"><DollarSign size={12} /> Recebido</span>
                                    <span className="font-black text-sm text-gray-900">R$ {productStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1"><TrendingUp size={12} /> Taxa</span>
                                    <span className="font-black text-sm text-gray-900">{productStats.conversionRate}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setActiveTab('geral')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'geral' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <Tag size={18} /> Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('variacoes')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'variacoes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <Layers size={18} /> Variações
                    </button>
                    <button
                        onClick={() => setActiveTab('conteudo')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'conteudo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <ImageIcon size={18} /> Conteúdo
                    </button>
                    <button
                        onClick={() => setActiveTab('evento')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'evento' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <Wand2 size={18} /> Evento
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'marketing' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <Megaphone size={18} /> Marketing
                    </button>
                    <button
                        onClick={() => setActiveTab('integracoes')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'integracoes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <Webhook size={18} /> Integrações
                    </button>
                    <button
                        onClick={() => setActiveTab('poscompra')}
                        className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'poscompra' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                    >
                        <PartyPopper size={18} /> Pós-Compra
                    </button>

                    <div className="mt-auto pt-8 border-t border-gray-100">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100">
                            <input type="checkbox" id="isActive" checked={config.isActive} onChange={(e) => setConfig({ ...config, isActive: e.target.checked })} className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500" />
                            <label htmlFor="isActive" className="text-[10px] font-black uppercase text-gray-500 cursor-pointer">Checkout Ativo</label>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-8 md:p-12 overflow-y-auto">

                    {activeTab === 'geral' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Informações Gerais</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Defina o nome, link e preço do seu produto.</p>
                            </div>

                            <div className="space-y-6">
                                <Input label="Nome do Produto *" type="text" placeholder="Ex: Masterclass de Tráfego" value={config.productName} onChange={v => setConfig({ ...config, productName: v })} />

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Link Curto (Apelido do Produto) *</label>
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs tracking-widest">/P=</span>
                                            <input
                                                type="text"
                                                value={config.slug || ''}
                                                onChange={e => setConfig({ ...config, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                                                placeholder="ex-turma-rj"
                                                className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-gray-50/50"
                                            />
                                        </div>
                                        <button onClick={generateAutoSlug} className="bg-amber-100 text-amber-600 px-5 rounded-2xl flex items-center justify-center hover:bg-amber-200 transition-all shadow-sm" title="Sugerir link baseado no nome">
                                            <Wand2 size={24} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 ml-1">Esse será o final da URL que você enviará para seus clientes.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Input label="Preço de Venda (R$)" type="text" placeholder="197,00" value={config.productPrice} onChange={v => setConfig({ ...config, productPrice: v })} />
                                    <Input label="Limite de Vagas" type="number" placeholder="0 = Sem Limite" value={config.maxVagas?.toString() || ''} onChange={v => setConfig({ ...config, maxVagas: v === '' ? undefined : parseInt(v) })} />
                                    <Input label="Link Externo (Mercado Pago) *" type="url" placeholder="https://mercadopago.com/..." value={config.mercadoPagoLink} onChange={v => setConfig({ ...config, mercadoPagoLink: v })} />
                                </div>

                                {/* Checkbox para usar API do MP */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={config.useMpApi || false}
                                            onChange={e => setConfig({ ...config, useMpApi: e.target.checked })}
                                            className="w-6 h-6 rounded-lg border-2 border-green-300 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                                        />
                                        <div className="flex-1">
                                            <span className="text-sm font-black text-green-900 uppercase tracking-wide">Usar API do Mercado Pago</span>
                                            <p className="text-xs text-green-600 font-bold mt-1">Gera links de pagamento automaticamente via API. Se desativado, usa o link manual acima.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'conteudo' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Conteúdo Visual</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Personalize as imagens e benefícios que aparecem no checkout.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Foto do Produto</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={config.productImage}
                                                onChange={e => setConfig({ ...config, productImage: e.target.value })}
                                                placeholder="Link da Imagem"
                                                className="flex-1 px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                                            />
                                            <label className={`cursor-pointer ${isUploading === 'product' ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'} w-14 h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0`}>
                                                {isUploading === 'product' ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'product')} disabled={isUploading !== null} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Banner Superior</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={config.bannerImage}
                                                onChange={e => setConfig({ ...config, bannerImage: e.target.value })}
                                                placeholder="Link do Banner"
                                                className="flex-1 px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                                            />
                                            <label className={`cursor-pointer ${isUploading === 'banner' ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'} w-14 h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0`}>
                                                {isUploading === 'banner' ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'banner')} disabled={isUploading !== null} />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-2">
                                        {config.productImage ? (
                                            <img src={config.productImage} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                                        ) : (
                                            <ImageIcon size={32} className="text-gray-300" />
                                        )}
                                        <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Preview Foto</p>
                                    </div>
                                    <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-2">
                                        {config.bannerImage ? (
                                            <img src={config.bannerImage} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                                        ) : (
                                            <ImageIcon size={32} className="text-gray-300" />
                                        )}
                                        <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Preview Banner</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Benefícios Inclusos</h4>
                                    <button onClick={() => setConfig({ ...config, benefits: [...(config.benefits || []), ''] })} className="text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 flex items-center gap-2 transition-all">
                                        <Plus size={14} /> Adicionar Benefício
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(config.benefits || []).map((benefit, idx) => (
                                        <div key={idx} className="flex items-center gap-2 group">
                                            <div className="flex-1 relative">
                                                <input type="text" value={benefit} onChange={(e) => {
                                                    const newBenefits = [...(config.benefits || [])];
                                                    newBenefits[idx] = e.target.value;
                                                    setConfig({ ...config, benefits: newBenefits });
                                                }} placeholder="Ex: Acesso Vitalício" className="w-full px-5 py-3 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none text-xs font-bold bg-gray-50/50" />
                                            </div>
                                            <button onClick={() => setConfig({ ...config, benefits: (config.benefits || []).filter((_, i) => i !== idx) })} className="p-2 text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'evento' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Detalhes do Evento</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Configure as informações que aparecerão no ticket e checkout.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <Input label="Identificador da Turma" type="text" placeholder="Ex: Turma 05" value={config.turma || ''} onChange={v => setConfig({ ...config, turma: v })} />
                                    <Input label="Pasta / Categoria" type="text" placeholder="Ex: Cursos, Webinars, etc" value={config.folder || ''} onChange={v => setConfig({ ...config, folder: v })} />
                                    <Input label="Data do Evento" type="text" placeholder="Ex: 25/12/2024" value={config.eventDate || ''} onChange={v => setConfig({ ...config, eventDate: v })} />
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Horário Início" type="text" placeholder="09:00" value={config.eventStartTime || ''} onChange={v => setConfig({ ...config, eventStartTime: v })} />
                                        <Input label="Horário Término" type="text" placeholder="18:00" value={config.eventEndTime || ''} onChange={v => setConfig({ ...config, eventEndTime: v })} />
                                    </div>
                                    <Input label="Local do Evento" type="text" placeholder="Auditório Vox, Edifício Capital" value={config.eventLocation || ''} onChange={v => setConfig({ ...config, eventLocation: v })} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Rastreamento e Conversão</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Insira os IDs de rastreamento para medir suas vendas.</p>
                            </div>

                            <div className="max-w-md space-y-6">
                                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm"><BarChart3 className="text-blue-600" size={24} /></div>
                                        <div>
                                            <h4 className="font-black text-sm text-blue-900">Configuração de Tags</h4>
                                            <p className="text-[10px] font-bold text-blue-700/60 uppercase">Scripts carregados automaticamente</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Input label="Google Analytics (GA4 ID)" type="text" placeholder="G-XXXXXXXXXX" value={config.ga4Id || ''} onChange={v => setConfig({ ...config, ga4Id: v })} />
                                        <Input label="Meta Pixel ID" type="text" placeholder="123456789012345" value={config.metaPixelId || ''} onChange={v => setConfig({ ...config, metaPixelId: v })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Integrações Tab */}
                    {activeTab === 'integracoes' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Integrações (Webhooks)</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Conecte seu checkout a ferramentas externas como Make, Zapier ou n8n.</p>
                            </div>

                            <div className="max-w-2xl space-y-6">
                                <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm"><Webhook className="text-indigo-600" size={24} /></div>
                                        <div>
                                            <h4 className="font-black text-sm text-indigo-900">Webhook de Vendas</h4>
                                            <p className="text-[10px] font-bold text-indigo-700/60 uppercase">Disparado quando um NOVO LEAD é criado ou PAGO</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            label="URL do Webhook (Make/Zapier)"
                                            type="url"
                                            placeholder="https://hook.us1.make.com/..."
                                            value={config.webhookUrl || ''}
                                            onChange={v => setConfig({ ...config, webhookUrl: v })}
                                        />
                                        <div className="bg-white/50 p-4 rounded-xl text-xs text-indigo-800 leading-relaxed border border-indigo-100/50">
                                            <strong>Dados enviados:</strong> Nome, Email, Telefone, Status, Valor Pago, Produto, ID do Lead, Data.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pós-Compra Tab */}
                    {activeTab === 'poscompra' && (
                        <div className="p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Página de Sucesso</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Configure a página que aparece após a compra ser confirmada.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm"><CheckCircle className="text-emerald-600" size={24} /></div>
                                        <div>
                                            <h4 className="font-black text-sm text-emerald-900">Mensagem de Parabéns</h4>
                                            <p className="text-[10px] font-bold text-emerald-700/60 uppercase">Personalize o que o cliente vê após pagar</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            label="Título Principal"
                                            type="text"
                                            placeholder="🎉 Parabéns! Sua compra foi confirmada!"
                                            value={config.thankYouTitle || ''}
                                            onChange={v => setConfig({ ...config, thankYouTitle: v })}
                                        />
                                        <Input
                                            label="Subtítulo"
                                            type="text"
                                            placeholder={`Você está inscrito(a) no ${config.productName || 'curso'}`}
                                            value={config.thankYouSubtitle || ''}
                                            onChange={v => setConfig({ ...config, thankYouSubtitle: v })}
                                        />
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Mensagem</label>
                                            <textarea
                                                placeholder="Em breve você receberá um e-mail com todas as informações. Fique atento ao seu WhatsApp!"
                                                value={config.thankYouMessage || ''}
                                                onChange={e => setConfig({ ...config, thankYouMessage: e.target.value })}
                                                rows={3}
                                                className="w-full px-5 py-3 rounded-xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm bg-white resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm"><Megaphone className="text-blue-600" size={24} /></div>
                                        <div>
                                            <h4 className="font-black text-sm text-blue-900">Botão de Ação (CTA)</h4>
                                            <p className="text-[10px] font-bold text-blue-700/60 uppercase">Ex: Link do WhatsApp, Grupo, Área de Membros</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            label="Texto do Botão"
                                            type="text"
                                            placeholder="Entrar no Grupo do WhatsApp"
                                            value={config.thankYouButtonText || ''}
                                            onChange={v => setConfig({ ...config, thankYouButtonText: v })}
                                        />
                                        <Input
                                            label="Link do Botão"
                                            type="text"
                                            placeholder="https://chat.whatsapp.com/..."
                                            value={config.thankYouButtonUrl || ''}
                                            onChange={v => setConfig({ ...config, thankYouButtonUrl: v })}
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm"><ImageIcon className="text-gray-600" size={24} /></div>
                                        <div>
                                            <h4 className="font-black text-sm text-gray-900">Imagem (Opcional)</h4>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Uma imagem para exibir na página de sucesso</p>
                                        </div>
                                    </div>

                                    <Input
                                        label="URL da Imagem"
                                        type="text"
                                        placeholder="https://..."
                                        value={config.thankYouImageUrl || ''}
                                        onChange={v => setConfig({ ...config, thankYouImageUrl: v })}
                                    />
                                </div>

                                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                    <p className="text-xs text-amber-800 font-bold">
                                        💡 <strong>Dica:</strong> Se você configurou data/horário/local na aba Evento, eles aparecerão automaticamente na página de sucesso.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'variacoes' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Variações do Produto</h3>
                                <p className="text-sm text-gray-400 font-bold mt-1">Crie links com preços ou condições especiais (Ex: Lote Promocional, 2 Ingressos).</p>
                            </div>

                            <div className="space-y-6">
                                {(config.variations || []).map((variation, idx) => (
                                    <div key={variation.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-6 relative group">
                                        <button
                                            onClick={() => setConfig({ ...config, variations: (config.variations || []).filter(v => v.id !== variation.id) })}
                                            className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Remover Variação"
                                        >
                                            <Trash2 size={20} />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Input
                                                label="Nome da Variação"
                                                type="text"
                                                placeholder="Ex: Combo 2 Amigos"
                                                value={variation.name}
                                                onChange={v => {
                                                    const newVars = [...(config.variations || [])];
                                                    newVars[idx] = { ...variation, name: v };
                                                    setConfig({ ...config, variations: newVars });
                                                }}
                                            />
                                            <Input
                                                label="Preço da Variação (R$)"
                                                type="text"
                                                placeholder="Ex: 150,00"
                                                value={variation.price}
                                                onChange={v => {
                                                    const newVars = [...(config.variations || [])];
                                                    newVars[idx] = { ...variation, price: v };
                                                    setConfig({ ...config, variations: newVars });
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Link / Slug da Variação</label>
                                            <div className="flex gap-3">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs tracking-widest">/P=</span>
                                                    <input
                                                        type="text"
                                                        value={variation.slug}
                                                        onChange={e => {
                                                            const newVars = [...(config.variations || [])];
                                                            newVars[idx] = { ...variation, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') };
                                                            setConfig({ ...config, variations: newVars });
                                                        }}
                                                        className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-gray-50/50"
                                                    />
                                                </div>

                                                <div className="w-24">
                                                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1 mb-1 block">Qtd. Ingressos</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={variation.ticketAmount || 1}
                                                        onChange={e => {
                                                            const newVars = [...(config.variations || [])];
                                                            newVars[idx] = { ...variation, ticketAmount: parseInt(e.target.value) || 1 };
                                                            setConfig({ ...config, variations: newVars });
                                                        }}
                                                        className="w-full px-4 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-gray-50/50 text-center"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <LinkIcon size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Link Externo (Opcional)</span>
                                            </div>
                                            <input
                                                type="url"
                                                placeholder={variation.useMpApi ? "Link será gerado automaticamente via API" : "Link Específico do Mercado Pago (Deixar em branco para usar API ou Link Principal)"}
                                                value={variation.mercadoPagoLink || ''}
                                                onChange={e => {
                                                    const newVars = [...(config.variations || [])];
                                                    newVars[idx] = { ...variation, mercadoPagoLink: e.target.value };
                                                    setConfig({ ...config, variations: newVars });
                                                }}
                                                disabled={variation.useMpApi}
                                                className={`w-full bg-transparent border-0 border-b border-gray-200 focus:border-blue-500 outline-none py-2 text-xs font-medium text-gray-600 placeholder:text-gray-300 ${variation.useMpApi ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            />

                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                                                <input
                                                    type="checkbox"
                                                    id={`useMpApi-${idx}`}
                                                    checked={variation.useMpApi || false}
                                                    onChange={e => {
                                                        const newVars = [...(config.variations || [])];
                                                        newVars[idx] = { ...variation, useMpApi: e.target.checked };
                                                        setConfig({ ...config, variations: newVars });
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <label htmlFor={`useMpApi-${idx}`} className="text-xs text-gray-500 font-bold select-none cursor-pointer">
                                                    Gerar Link via API (Automático)
                                                </label>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-2xl space-y-2 mt-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Configuração de Pacote</span>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500">Quantos ingressos/acessos este item vale?</p>
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={variation.ticketAmount || 1}
                                                        onChange={e => {
                                                            const newVars = [...(config.variations || [])];
                                                            newVars[idx] = { ...variation, ticketAmount: parseInt(e.target.value) || 1 };
                                                            setConfig({ ...config, variations: newVars });
                                                        }}
                                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-blue-500 font-bold text-gray-700 bg-white text-center text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setConfig({
                                        ...config,
                                        variations: [
                                            ...(config.variations || []),
                                            {
                                                id: crypto.randomUUID(),
                                                name: '',
                                                price: config.productPrice,
                                                slug: `${config.slug}-var-${(config.variations || []).length + 1}`,
                                                mercadoPagoLink: '',
                                                useMpApi: false,
                                                ticketAmount: 1
                                            }
                                        ]
                                    })}
                                    className="w-full py-6 rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2"
                                >
                                    <Plus size={24} />
                                    <span className="font-black text-xs uppercase tracking-widest">Adicionar Nova Variação</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Floating bar for Actions */}
            <div className="mt-8 flex gap-4 items-center justify-end">
                <button
                    onClick={onCancel}
                    className="px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-white transition-all"
                >
                    Descartar Mudanças
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => onSave(true)}
                        disabled={isSubmitting || isUploading !== null}
                        className="px-10 py-5 bg-white border-2 border-blue-600 text-blue-600 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all disabled:opacity-50"
                    >
                        Salvar como Novo
                    </button>
                    <button
                        onClick={() => onSave(false)}
                        disabled={isSubmitting || isUploading !== null}
                        className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center gap-3"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                            <>
                                <Plus size={18} /> Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div >
    );
};
