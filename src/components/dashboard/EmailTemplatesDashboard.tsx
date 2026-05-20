import React, { useState } from 'react';
import { Mail, Copy, Check, Eye, Plus, Edit2, Trash2 } from 'lucide-react';
import { useEmailTemplates, EmailTemplate } from '../../hooks/useEmailTemplates';

export const EmailTemplatesDashboard: React.FC = () => {
    const { templates, saveTemplate, deleteTemplate } = useEmailTemplates();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);

    const handleCopy = (id: string, html: string) => {
        navigator.clipboard.writeText(html);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleOpenCreate = () => {
        setEditingTemplate({
            name: '',
            description: '',
            color: 'from-blue-500 to-blue-600',
            html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">\n  <div style="background: #3b82f6; padding: 30px 20px; text-align: center; color: white;">\n    <h1 style="margin: 0; font-size: 24px;">Meu Título</h1>\n  </div>\n  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">\n    <p>Olá <b>{name}</b>,</p>\n    <p>Escreva sua mensagem aqui.</p>\n  </div>\n</div>'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (template: EmailTemplate) => {
        setEditingTemplate({ ...template });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!editingTemplate?.name || !editingTemplate?.html) {
            alert('Nome e HTML são obrigatórios!');
            return;
        }

        const templateToSave: EmailTemplate = {
            id: editingTemplate.id || `custom_${Date.now()}`,
            name: editingTemplate.name,
            description: editingTemplate.description || 'Modelo personalizado criado por você.',
            color: editingTemplate.color || 'from-gray-500 to-gray-600',
            html: editingTemplate.html
        };

        saveTemplate(templateToSave);
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <Mail size={24} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Modelos de Email</h2>
                        <p className="text-gray-500 font-medium">Crie, edite e copie os códigos HTML para seus disparos.</p>
                    </div>
                </div>
                
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    Criar Novo Modelo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div key={template.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group relative">
                        {template.isCustom && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button 
                                    onClick={() => handleOpenEdit(template)}
                                    className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-md hover:bg-blue-50"
                                    title="Editar Modelo"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button 
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
                                            deleteTemplate(template.id);
                                        }
                                    }}
                                    className="w-8 h-8 bg-white text-red-600 rounded-full flex items-center justify-center shadow-md hover:bg-red-50"
                                    title="Excluir Modelo"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                        
                        <div className={`h-24 bg-gradient-to-r ${template.color} flex items-center justify-center p-6 relative`}>
                            {template.isCustom && (
                                <span className="absolute top-4 left-4 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                    Custom
                                </span>
                            )}
                            <h3 className={`text-lg font-black text-center ${template.id === 'payment' ? 'text-gray-800' : 'text-white'}`}>
                                {template.name}
                            </h3>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <p className="text-sm text-gray-600 mb-6 flex-1">
                                {template.description}
                            </p>
                            
                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => setPreviewHtml(template.html)}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Eye size={16} />
                                    Visualizar
                                </button>
                                <button
                                    onClick={() => handleCopy(template.id, template.html)}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                                        copiedId === template.id
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    {copiedId === template.id ? (
                                        <>
                                            <Check size={16} />
                                            Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={16} />
                                            Copiar HTML
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Preview */}
            {previewHtml && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setPreviewHtml(null)}>
                    <div 
                        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-black text-gray-900">Visualização do Email</h3>
                            <button 
                                onClick={() => setPreviewHtml(null)}
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-500 hover:text-gray-900 shadow-sm"
                            >
                                x
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                            <div 
                                className="bg-white mx-auto shadow-sm" 
                                style={{ maxWidth: '600px', minHeight: '400px' }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição/Criação */}
            {isModalOpen && editingTemplate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900">
                                {editingTemplate.id ? 'Editar Modelo' : 'Criar Novo Modelo'}
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingTemplate(null);
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-500 hover:text-gray-900 shadow-sm"
                            >
                                x
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Modelo</label>
                                    <input 
                                        type="text" 
                                        value={editingTemplate.name || ''}
                                        onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                                        placeholder="Ex: Confirmação de Assinatura"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Cor de Fundo (Card)</label>
                                    <select 
                                        value={editingTemplate.color || ''}
                                        onChange={e => setEditingTemplate({...editingTemplate, color: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                    >
                                        <option value="from-blue-500 to-blue-600">Azul</option>
                                        <option value="from-emerald-500 to-emerald-600">Verde</option>
                                        <option value="from-purple-500 to-purple-600">Roxo</option>
                                        <option value="from-orange-500 to-orange-600">Laranja</option>
                                        <option value="from-rose-500 to-rose-600">Rosa</option>
                                        <option value="from-gray-800 to-gray-900">Escuro</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Curta</label>
                                <input 
                                    type="text" 
                                    value={editingTemplate.description || ''}
                                    onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                                    placeholder="Ex: Usado para enviar acesso à comunidade."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-sm font-bold text-gray-700">Código HTML</label>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">Dica: Use {'{name}'} para o nome do aluno</span>
                                </div>
                                <textarea 
                                    value={editingTemplate.html || ''}
                                    onChange={e => setEditingTemplate({...editingTemplate, html: e.target.value})}
                                    rows={12}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-700"
                                    placeholder="Cole aqui o seu código HTML..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingTemplate(null);
                                }}
                                className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Salvar Modelo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
