type EmailTemplateRow = {
  id?: string;
  name?: string;
  nome?: string;
  titulo?: string;
  description?: string;
  descricao?: string;
  html?: string;
  codigo_html?: string;
  conteudo?: string;
  subject?: string;
  assunto?: string;
};

const PATCH_ID = 'vox-automation-email-template-selector';
const SUPABASE_URL = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || 'https://emdsgvuqrhpjdgrgaslo.supabase.co';
const SUPABASE_KEY =
  localStorage.getItem('supabase_key') ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';

const defaultTemplates: EmailTemplateRow[] = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    subject: 'Bem-vindo(a) à Vox Marketing Academy',
    html: 'Olá {nome}!\n\nSeja bem-vindo(a) à Vox Marketing Academy. Sua inscrição para {produto} foi confirmada.\n\nEm breve você receberá mais informações.'
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
    html: 'Olá {nome}!\n\nSeu pagamento para {produto} foi confirmado. Entre no grupo oficial para receber avisos, materiais e informações do treinamento.\n\n[COLE AQUI O LINK DO GRUPO]'
  }
];

let cachedTemplates: EmailTemplateRow[] | null = null;
let loadingPromise: Promise<EmailTemplateRow[]> | null = null;

const normalizeTemplate = (row: EmailTemplateRow): EmailTemplateRow => ({
  id: row.id || crypto.randomUUID(),
  name: row.name || row.nome || row.titulo || 'Modelo sem nome',
  subject: row.subject || row.assunto || row.name || row.nome || row.titulo || 'Mensagem Vox Marketing Academy',
  html: row.html || row.codigo_html || row.conteudo || ''
});

const loadTemplates = async (): Promise<EmailTemplateRow[]> => {
  if (cachedTemplates) return cachedTemplates;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const localTemplates = (() => {
      try {
        return JSON.parse(localStorage.getItem('vox_custom_email_templates') || '[]') as EmailTemplateRow[];
      } catch {
        return [];
      }
    })();

    const tables = ['modelos_de_email', 'email_templates'];
    let remoteTemplates: EmailTemplateRow[] = [];

    for (const table of tables) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        });
        if (response.ok) {
          remoteTemplates = await response.json();
          break;
        }
      } catch {
        // Usa modelos locais/padrão quando o Supabase estiver indisponível.
      }
    }

    const merged = [...defaultTemplates, ...localTemplates, ...remoteTemplates]
      .map(normalizeTemplate)
      .filter((template, index, array) => array.findIndex(item => item.id === template.id) === index);

    cachedTemplates = merged;
    return merged;
  })();

  return loadingPromise;
};

const setReactInputValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const findFieldByLabel = (labelText: string): HTMLInputElement | HTMLTextAreaElement | null => {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(item => item.textContent?.trim().toLowerCase().includes(labelText.toLowerCase()));
  if (!label) return null;
  const container = label.parentElement;
  return container?.querySelector('input, textarea') || null;
};

const insertSelector = async () => {
  if (document.getElementById(PATCH_ID)) return;

  const heading = Array.from(document.querySelectorAll('h2, h3')).find(item =>
    item.textContent?.trim().toLowerCase() === 'automação' ||
    item.textContent?.trim().toLowerCase() === 'configurar automação'
  );
  if (!heading) return;

  const subjectField = findFieldByLabel('Assunto do email');
  const messageField = findFieldByLabel('Mensagem');
  if (!subjectField || !messageField) return;

  const subjectContainer = subjectField.parentElement;
  if (!subjectContainer?.parentElement) return;

  const wrapper = document.createElement('div');
  wrapper.id = PATCH_ID;
  wrapper.className = 'bg-blue-50 border border-blue-100 rounded-2xl p-4';
  wrapper.innerHTML = `
    <label class="block text-xs font-bold text-blue-700 uppercase mb-2 tracking-widest">Modelo de e-mail</label>
    <select class="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm bg-white">
      <option value="">Selecionar um modelo salvo</option>
    </select>
    <p class="text-xs text-blue-600 font-bold mt-2">Ao selecionar, o assunto e a mensagem serão preenchidos. Você poderá editar depois.</p>
  `;

  subjectContainer.parentElement.insertBefore(wrapper, subjectContainer);

  const select = wrapper.querySelector('select') as HTMLSelectElement;
  select.disabled = true;
  const templates = await loadTemplates();
  select.disabled = false;

  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id || '';
    option.textContent = template.name || 'Modelo sem nome';
    option.dataset.subject = template.subject || '';
    option.dataset.html = template.html || '';
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const option = select.selectedOptions[0];
    if (!option?.value) return;

    const currentSubjectField = findFieldByLabel('Assunto do email');
    const currentMessageField = findFieldByLabel('Mensagem');
    if (currentSubjectField) setReactInputValue(currentSubjectField, option.dataset.subject || option.textContent || '');
    if (currentMessageField) setReactInputValue(currentMessageField, option.dataset.html || '');
  });
};

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(insertSelector);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    insertSelector();
  });
} else {
  observer.observe(document.body, { childList: true, subtree: true });
  insertSelector();
}
