const SUPABASE_URL =
  localStorage.getItem('supabase_url') ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://emdsgvuqrhpjdgrgaslo.supabase.co';

const SUPABASE_KEY =
  localStorage.getItem('supabase_key') ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndnVxcmhwamRncmdhc2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcyMTIsImV4cCI6MjA4MzU0MzIxMn0.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0';

const DATALIST_ID = 'vox-automation-turmas';
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

  loadingPromise = fetch(`${SUPABASE_URL}/rest/v1/checkouts?select=*`, {
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

const ensureDatalist = async () => {
  let datalist = document.getElementById(DATALIST_ID) as HTMLDataListElement | null;
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = DATALIST_ID;
    document.body.appendChild(datalist);
  }

  const turmas = await loadTurmas();
  datalist.replaceChildren(
    ...turmas.map(turma => {
      const option = document.createElement('option');
      option.value = turma;
      return option;
    })
  );
};

const enhanceTurmaInput = async () => {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(item => item.textContent?.trim().toLowerCase() === 'turma que receberá');
  if (!label) return;

  const container = label.parentElement;
  const input = container?.querySelector('input') as HTMLInputElement | null;
  if (!input || input.dataset.voxTurmaSelector === 'true') return;

  input.dataset.voxTurmaSelector = 'true';
  input.setAttribute('list', DATALIST_ID);
  input.placeholder = 'Selecione ou digite uma turma';
  input.autocomplete = 'off';

  await ensureDatalist();

  if (!container?.querySelector('[data-vox-turma-help]')) {
    const help = document.createElement('p');
    help.dataset.voxTurmaHelp = 'true';
    help.className = 'text-xs text-blue-600 font-bold mt-2';
    help.textContent = 'Escolha uma turma cadastrada. A automação será aplicada somente aos pagamentos dessa turma.';
    container?.appendChild(help);
  }
};

const observer = new MutationObserver(() => {
  void enhanceTurmaInput();
});

const start = () => {
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void enhanceTurmaInput();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
