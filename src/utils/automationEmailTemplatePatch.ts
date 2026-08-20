type EmailTemplate = {
  id: string;
  name: string;
  subject?: string;
  html: string;
};

const PATCH_ID = 'vox-automation-email-template-selector';

const builtInTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    subject: 'Bem-vindo(a) à Vox Marketing Academy',
    html: 'Olá {nome}!\n\nSeja bem-vindo(a) à Vox Marketing Academy. Sua inscrição para {produto} foi confirmada.'
  },
  {
    id: 'payment',
    name: 'Pagamento confirmado',
    subject: 'Pagamento confirmado',
    html: 'Olá {nome}!\n\nSeu pagamento para {produto} foi confirmado.\n\nValor: R$ {valor}\n\nSua vaga está garantida.'
  },
  {
    id: 'whatsapp',
    name: 'Link do grupo VIP',
    subject: 'Entre no grupo do WhatsApp',
    html: 'Olá {nome}!\n\nEntre no grupo oficial para receber avisos, materiais e informações do treinamento.\n\n[COLE AQUI O LINK DO GRUPO]'
  }
];

const getTemplates = (): EmailTemplate[] => {
  let customTemplates: EmailTemplate[] = [];
  try {
    customTemplates = JSON.parse(localStorage.getItem('vox_custom_email_templates') || '[]');
  } catch {
    customTemplates = [];
  }

  return [...builtInTemplates, ...customTemplates].filter(
    (template, index, array) => array.findIndex(item => item.id === template.id) === index
  );
};

const findField = (labelText: string): HTMLInputElement | HTMLTextAreaElement | null => {
  const label = Array.from(document.querySelectorAll('label')).find(item =>
    item.textContent?.trim().toLowerCase().includes(labelText.toLowerCase())
  );
  return (label?.parentElement?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null) || null;
};

const setReactValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const insertSelector = () => {
  const existing = document.getElementById(PATCH_ID);
  const subjectField = findField('Assunto do email');
  const messageField = findField('Mensagem');

  if (!subjectField || !messageField) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const subjectContainer = subjectField.parentElement;
  const parent = subjectContainer?.parentElement;
  if (!subjectContainer || !parent) return;

  const wrapper = document.createElement('div');
  wrapper.id = PATCH_ID;
  wrapper.className = 'bg-blue-50 border border-blue-100 rounded-2xl p-4';

  const label = document.createElement('label');
  label.className = 'block text-xs font-bold text-blue-700 uppercase mb-2 tracking-widest';
  label.textContent = 'Modelo de e-mail (opcional)';

  const select = document.createElement('select');
  select.className = 'w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm bg-white';
  select.innerHTML = '<option value="">Não usar modelo / escrever manualmente</option>';

  getTemplates().forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    option.dataset.subject = template.subject || template.name;
    option.dataset.html = template.html;
    select.appendChild(option);
  });

  const help = document.createElement('p');
  help.className = 'text-xs text-blue-600 font-bold mt-2';
  help.textContent = 'Ao escolher um modelo, o assunto e a mensagem serão preenchidos. Você poderá editar depois.';

  wrapper.append(label, select, help);
  parent.insertBefore(wrapper, subjectContainer);

  select.addEventListener('change', () => {
    const option = select.selectedOptions[0];
    if (!option?.value) return;

    const currentSubject = findField('Assunto do email');
    const currentMessage = findField('Mensagem');
    if (currentSubject) setReactValue(currentSubject, option.dataset.subject || option.textContent || '');
    if (currentMessage) setReactValue(currentMessage, option.dataset.html || '');
  });
};

const observer = new MutationObserver(() => window.requestAnimationFrame(insertSelector));

const start = () => {
  observer.observe(document.documentElement, { childList: true, subtree: true });
  insertSelector();
  window.setInterval(insertSelector, 1000);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
