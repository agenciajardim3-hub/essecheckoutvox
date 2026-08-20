import { DEFAULT_SUPABASE_KEY, DEFAULT_SUPABASE_URL } from '../hooks/useSupabase';

const SUPABASE_URL =
  localStorage.getItem('supabase_url') ||
  DEFAULT_SUPABASE_URL;

const SUPABASE_KEY =
  localStorage.getItem('supabase_key') ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  DEFAULT_SUPABASE_KEY;

const EMAIL_SELECTOR_ID = 'vox-automation-email-template-selector';
const TURMA_SELECT_ID = 'vox-automation-turma-select';
let cachedTurmas: string[] = [];
let loadingPromise: Promise<string[]> | null = null;

const clean = (value: unknown) => String(value || '').trim();

const extractTurmaName = (row: any) =>
  clean(
    row?.turma ||
    row?.product_name ||
    row?.productName ||
    row?.name ||
    row?.title ||
    row?.slug
  );

const loadTurmas = async (): Promise<string[]> => {
  if (cachedTurmas.length > 0) return cachedTurmas;
  if (loadingPromise) return loadingPromise;
  if (!SUPABASE_KEY) return [];

  loadingPromise = fetch(`${SUPABASE_URL}/rest/v1/checkouts?select=turma,product_name,slug&order=created_at.desc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
    .then(async response => {
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    })
    .then((rows: any[]) => {
      cachedTurmas = Array.from(new Set((rows || []).map(extractTurmaName).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      return cachedTurmas;
    })
    .catch(error => {
      console.warn('Não foi possível carregar as turmas para a automação:', error);
      return [];
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
};

const setReactValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const enhanceTurmaInput = async () => {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(item => item.textContent?.trim().toLowerCase() === 'turma que receberá');
  if (!label) return;

  const container = label.parentElement;
  const input = container?.querySelector('input') as HTMLInputElement | null;
  if (!input) return;

  let select = container?.querySelector(`#${TURMA_SELECT_ID}`) as HTMLSelectElement | null;
  if (!select) {
    select = document.createElement('select');
    select.id = TURMA_SELECT_ID;
    select.className = 'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm bg-white mb-3';

    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Carregando turmas cadastradas...';
    select.appendChild(loadingOption);

    container?.insertBefore(select, input);

    select.addEventListener('change', () => {
      if (!select?.value) return;
      setReactValue(input, select.value);
    });
  }

  input.placeholder = 'Ou digite uma turma manualmente';
  input.autocomplete = 'off';

  const turmas = await loadTurmas();
  select.replaceChildren();

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = turmas.length > 0
    ? 'Selecione uma turma cadastrada'
    : 'Nenhuma turma encontrada — digite abaixo';
  select.appendChild(emptyOption);

  turmas.forEach(turma => {
    const option = document.createElement('option');
    option.value = turma;
    option.textContent = turma;
    select?.appendChild(option);
  });

  if (input.value && turmas.includes(input.value)) {
    select.value = input.value;
  }

  if (!container?.querySelector('[data-vox-turma-help]')) {
    const help = document.createElement('p');
    help.dataset.voxTurmaHelp = 'true';
    help.className = 'text-xs text-blue-600 font-bold mt-2';
    help.textContent = 'Selecione uma das turmas cadastradas nos checkouts. O campo abaixo fica disponível apenas para digitação manual.';
    container?.appendChild(help);
  }
};

const findField = (labelText: string) => {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(item => item.textContent?.trim().toLowerCase() === labelText.toLowerCase());
  return label?.parentElement?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
};

const loadLocalEmailTemplates = () => {
  const defaults = [
    {
      id: 'payment',
      name: 'Pagamento confirmado',
      subject: 'Pagamento confirmado',
      html: 'Olá {nome}!\n\nSeu pagamento para {produto} foi confirmado.\n\nValor: R$ {valor}\n\nSua vaga está garantida.'
    },
    {
      id: 'welcome',
      name: 'Boas-vindas',
      subject: 'Bem-vindo(a) à Vox Marketing Academy',
      html: 'Olá {nome}!\n\nSeja bem-vindo(a) à Vox Marketing Academy. Sua inscrição para {produto} foi confirmada.'
    },
    {
      id: 'whatsapp',
      name: 'Link do grupo VIP',
      subject: 'Entre no grupo do WhatsApp',
      html: 'Olá {nome}!\n\nEntre no grupo oficial para receber avisos, materiais e informações do treinamento.\n\n[COLE AQUI O LINK DO GRUPO]'
    }
  ];

  try {
    const saved = JSON.parse(localStorage.getItem('vox_custom_email_templates') || '[]');
    return [...defaults, ...(Array.isArray(saved) ? saved : [])];
  } catch {
    return defaults;
  }
};

const enhanceEmailTemplateSelector = () => {
  const subjectField = findField('Assunto do email');
  const messageField = findField('Mensagem');
  if (!subjectField || !messageField) return;
  if (document.getElementById(EMAIL_SELECTOR_ID)) return;

  const subjectContainer = subjectField.parentElement;
  if (!subjectContainer?.parentElement) return;

  const wrapper = document.createElement('div');
  wrapper.id = EMAIL_SELECTOR_ID;
  wrapper.className = 'bg-blue-50 border border-blue-100 rounded-2xl p-4';

  const label = document.createElement('label');
  label.className = 'block text-xs font-bold text-blue-700 uppercase mb-2 tracking-widest';
  label.textContent = 'Modelo de e-mail (opcional)';

  const select = document.createElement('select');
  select.className = 'w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm bg-white';

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'Escrever manualmente / não usar modelo';
  select.appendChild(emptyOption);

  loadLocalEmailTemplates().forEach((template: any) => {
    const option = document.createElement('option');
    option.value = clean(template.id || template.name || template.nome);
    option.textContent = clean(template.name || template.nome || template.titulo || 'Modelo sem nome');
    option.dataset.subject = clean(template.subject || template.assunto || template.name || template.nome);
    option.dataset.html = clean(template.html || template.codigo_html || template.conteudo || template.body);
    select.appendChild(option);
  });

  const help = document.createElement('p');
  help.className = 'text-xs text-blue-600 font-bold mt-2';
  help.textContent = 'Escolha um modelo para preencher assunto e mensagem. Depois você ainda pode editar.';

  select.addEventListener('change', () => {
    const option = select.selectedOptions[0];
    if (!option?.value) return;
    setReactValue(subjectField as HTMLInputElement, option.dataset.subject || option.textContent || '');
    setReactValue(messageField as HTMLTextAreaElement, option.dataset.html || '');
  });

  wrapper.append(label, select, help);
  subjectContainer.parentElement.insertBefore(wrapper, subjectContainer);
};

const enhanceAutomationScreen = () => {
  void enhanceTurmaInput();
  enhanceEmailTemplateSelector();
};

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(enhanceAutomationScreen);
});

const start = () => {
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceAutomationScreen();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
