import React, { useState } from 'react';
import { Mail, Copy, Check, Eye } from 'lucide-react';

interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    html: string;
    color: string;
}

export const emailTemplates: EmailTemplate[] = [
    {
        id: 'welcome',
        name: 'Boas Vindas (Azul/Roxo)',
        description: 'Ideal para dar as boas-vindas para novos alunos logo após a compra.',
        color: 'from-indigo-500 to-purple-600',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Bem-vindo(a) à Vox! 🚀</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>{name}</b>,</p>
    <p>É um prazer ter você conosco! Sua jornada de aprendizado acaba de começar.</p>
    <p>Prepare-se para ter acesso aos melhores conteúdos e um suporte de primeira linha.</p>
    <br/>
    <p>Qualquer dúvida, estamos à disposição!</p>
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
    &copy; ${new Date().getFullYear()} Vox Marketing Academy. Todos os direitos reservados.
  </div>
</div>`
    },
    {
        id: 'promo',
        name: 'Oferta Exclusiva (Escuro/Dourado)',
        description: 'Perfeito para vender upsells, mentorias ou novos treinamentos.',
        color: 'from-gray-900 to-gray-800',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: #111827; padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px; color: #f59e0b;">Oferta Exclusiva Liberada! ⚡</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6; text-align: center;">
    <p>Olá <b>{name}</b>,</p>
    <p>Liberamos uma oportunidade única para você dar o próximo passo.</p>
    <p>Garanta sua vaga no nosso novo treinamento com <b>condições especiais</b> apenas para quem já é aluno!</p>
    <div style="margin: 30px 0;">
      <a href="SEU_LINK_AQUI" style="background: #f59e0b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">GARANTIR MINHA VAGA</a>
    </div>
    <p style="font-size: 12px; color: #9ca3af;">Atenção: Oferta válida por tempo limitadíssimo.</p>
  </div>
</div>`
    },
    {
        id: 'notice',
        name: 'Aviso Urgente (Vermelho)',
        description: 'Usado para comunicados sérios, atualizações de sistema ou mudanças.',
        color: 'from-red-500 to-red-600',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-left: 4px solid #ef4444; background: #fef2f2; border-radius: 8px; overflow: hidden;">
  <div style="padding: 30px 20px; color: #7f1d1d; line-height: 1.6;">
    <h2 style="margin-top: 0; color: #991b1b;">⚠️ Aviso Importante</h2>
    <p>Olá <b>{name}</b>,</p>
    <p>Gostaríamos de informar sobre uma atualização importante no seu acesso ao sistema.</p>
    <p>[Descreva sua atualização aqui]</p>
    <br/>
    <p>Atenciosamente,<br/><b>Equipe Vox</b></p>
  </div>
</div>`
    },
    {
        id: 'reminder',
        name: 'Tá Chegando a Hora (Verde)',
        description: 'Lembrete de véspera para eventos, imersões ou mentorias.',
        color: 'from-emerald-500 to-emerald-600',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Falta Pouco! ⏳</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>{name}</b>,</p>
    <p>O grande dia está chegando! Faltam poucos dias para o nosso encontro.</p>
    <p>Recomendamos que você se prepare, separe seu material e chegue com antecedência para aproveitar tudo ao máximo.</p>
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <b>📅 Data:</b> [Data do Evento]<br/>
      <b>📍 Local:</b> [Local / Link do Zoom]
    </div>
    <p>Estamos muito animados para te ver lá!</p>
  </div>
</div>`
    },
    {
        id: 'payment',
        name: 'Pagamento Confirmado (Clean)',
        description: 'Recibo moderno de confirmação de pagamento para passar confiança.',
        color: 'from-slate-100 to-slate-200',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #f3f4f6;">
    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
    <h1 style="margin: 0; font-size: 24px; color: #111827;">Pagamento Confirmado!</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6;">
    <p>Olá <b>{name}</b>,</p>
    <p>Recebemos o seu pagamento com sucesso. Sua vaga já está 100% garantida.</p>
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">Resumo da Compra</p>
      <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #0f172a;">[Nome do Curso / Treinamento]</p>
    </div>
    <p>Em breve você receberá mais instruções sobre os próximos passos. Se precisar de ajuda, basta responder este email.</p>
    <p>Bem-vindo(a) ao time!</p>
  </div>
</div>`
    },
    {
        id: 'whatsapp',
        name: 'Link do Grupo VIP (Verde Zap)',
        description: 'O melhor template para garantir que as pessoas entrem no grupo do WhatsApp.',
        color: 'from-green-400 to-green-500',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="background: #25D366; padding: 30px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">Entre no Grupo VIP 💬</h1>
  </div>
  <div style="padding: 30px 20px; color: #374151; line-height: 1.6; text-align: center;">
    <p>Olá <b>{name}</b>,</p>
    <p>Toda a nossa comunicação oficial, links de aulas, materiais e avisos importantes serão enviados <b>exclusivamente</b> através do nosso Grupo VIP no WhatsApp.</p>
    <p>Não fique de fora! Clique no botão abaixo para entrar agora mesmo:</p>
    <div style="margin: 30px 0;">
      <a href="SEU_LINK_DO_GRUPO_AQUI" style="background: #128C7E; color: white; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">ENTRAR NO GRUPO VIP</a>
    </div>
    <p style="font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 15px; border-radius: 8px;">
      <b>Regra importante:</b> O grupo é silenciado e apenas os administradores enviam mensagens. Fique tranquilo, você não será incomodado!
    </p>
  </div>
</div>`
    }
];

export const EmailTemplatesDashboard: React.FC = () => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);

    const handleCopy = (id: string, html: string) => {
        navigator.clipboard.writeText(html);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Mail size={24} className="text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Modelos de Email</h2>
                    <p className="text-gray-500 font-medium">Copie o código HTML dos modelos para usar nos seus disparos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {emailTemplates.map((template) => (
                    <div key={template.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                        <div className={\`h-24 bg-gradient-to-r \${template.color} flex items-center justify-center p-6\`}>
                            <h3 className={\`text-lg font-black text-center \${template.id === 'payment' ? 'text-gray-800' : 'text-white'}\`}>
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
                                    className={\`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 \${
                                        copiedId === template.id
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }\`}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setPreviewHtml(null)}>
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
        </div>
    );
};
