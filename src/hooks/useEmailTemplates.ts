import { useState, useEffect } from 'react';

export interface EmailTemplate {
    id: string;
    name: string;
    description: string;
    html: string;
    color: string;
    isCustom?: boolean;
}

export const defaultTemplates: EmailTemplate[] = [
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

export function useEmailTemplates() {
    const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);

    useEffect(() => {
        const stored = localStorage.getItem('vox_custom_email_templates');
        if (stored) {
            try {
                const customTemplates: EmailTemplate[] = JSON.parse(stored);
                setTemplates([...defaultTemplates, ...customTemplates]);
            } catch (e) {
                console.error('Error parsing custom templates', e);
            }
        }
    }, []);

    const saveTemplate = (template: EmailTemplate) => {
        const stored = localStorage.getItem('vox_custom_email_templates');
        let customTemplates: EmailTemplate[] = [];
        
        if (stored) {
            try {
                customTemplates = JSON.parse(stored);
            } catch (e) {}
        }

        const existingIndex = customTemplates.findIndex(t => t.id === template.id);
        
        if (existingIndex >= 0) {
            customTemplates[existingIndex] = { ...template, isCustom: true };
        } else {
            customTemplates.push({ ...template, isCustom: true });
        }

        localStorage.setItem('vox_custom_email_templates', JSON.stringify(customTemplates));
        setTemplates([...defaultTemplates, ...customTemplates]);
    };

    const deleteTemplate = (id: string) => {
        const stored = localStorage.getItem('vox_custom_email_templates');
        if (stored) {
            try {
                let customTemplates: EmailTemplate[] = JSON.parse(stored);
                customTemplates = customTemplates.filter(t => t.id !== id);
                localStorage.setItem('vox_custom_email_templates', JSON.stringify(customTemplates));
                setTemplates([...defaultTemplates, ...customTemplates]);
            } catch (e) {}
        }
    };

    return { templates, saveTemplate, deleteTemplate };
}
