const OPERATION_LABELS_TO_HIDE = [
  'Gerar Ingresso',
  'Enviar Ingressos',
  'Gerar Certificado',
  'Enviar Certificados',
  'Certificados em Massa',
  'Email Personalizado',
  'Email Marketing',
  'Automação WhatsApp',
  'Automação',
  'Pedidos de Certificado',
  'Assinaturas',
];

type OperationItem = {
  title: string;
  target: string;
  fallback?: string;
  badge: string;
};

type OperationGroup = {
  group: string;
  description: string;
  items: OperationItem[];
};

const OPERATION_ACTIONS: OperationGroup[] = [
  {
    group: 'Ingressos',
    description: 'Geração, envio e histórico de ingressos dos alunos.',
    items: [
      { title: 'Gerar Ingresso', target: 'Gerar Ingresso', badge: 'Individual' },
      { title: 'Enviar Ingressos', target: 'Enviar Ingressos', badge: 'Turma / aluno' },
      { title: 'Histórico de Ingressos', target: 'Histórico de Ingressos', badge: 'Logs' },
    ],
  },
  {
    group: 'Certificados',
    description: 'Configure assinatura, gere individualmente, gere em massa e acompanhe envios.',
    items: [
      { title: 'Configurações', target: 'Assinaturas', badge: 'Assinatura padrão' },
      { title: 'Individual', target: 'Gerar Certificado', badge: '1 aluno' },
      { title: 'Em Massa', target: 'Certificados em Massa', fallback: 'Enviar Certificados', badge: 'Turma inteira' },
      { title: 'Histórico', target: 'Pedidos de Certificado', badge: 'Solicitações' },
    ],
  },
  {
    group: 'Comunicação',
    description: 'Envios manuais, campanhas e automações de relacionamento.',
    items: [
      { title: 'E-mail Personalizado', target: 'Email Personalizado', badge: 'Manual' },
      { title: 'E-mail Marketing', target: 'Email Marketing', badge: 'Campanha' },
      { title: 'Automação', target: 'Automação', fallback: 'Automação WhatsApp', badge: 'E-mail / WhatsApp' },
    ],
  },
  {
    group: 'Validação',
    description: 'Operação presencial e conferência de alunos.',
    items: [
      { title: 'Escanear QR Code', target: 'Escanear QR Code', badge: 'Check-in' },
      { title: 'Check-in', target: 'Check-in', badge: 'Presença' },
    ],
  },
];

const css = `
  [data-vox-hidden-operation="true"] { display: none !important; }
  .vox-ops-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(59,130,246,.24);
    background: linear-gradient(135deg, rgba(37,99,235,.22), rgba(124,58,237,.18));
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .04em;
    transition: all .2s ease;
  }
  .vox-ops-trigger:hover { transform: translateY(-1px); background: linear-gradient(135deg, #2563eb, #7c3aed); }
  .vox-ops-trigger.active { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 16px 30px rgba(37,99,235,.22); }
  .vox-ops-floating {
    position: fixed;
    right: 22px;
    top: 92px;
    z-index: 999998;
    border: 0;
    border-radius: 18px;
    padding: 15px 18px;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: #fff;
    box-shadow: 0 18px 38px rgba(37,99,235,.28);
    font-size: 12px;
    font-weight: 950;
    letter-spacing: .06em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
  }
  .vox-ops-floating:hover { transform: translateY(-1px); }
  body.vox-ops-hub-active main .max-w-7xl > :not(#vox-operations-hub) { display: none !important; }
  #vox-operations-hub { display: none; }
  body.vox-ops-hub-active #vox-operations-hub { display: block !important; }
  .vox-ops-hero {
    border-radius: 32px;
    padding: 28px;
    background: radial-gradient(circle at top left, rgba(6,182,212,.22), transparent 34%), linear-gradient(135deg,#0f172a,#1e1b4b 58%,#581c87);
    color: #fff;
    box-shadow: 0 24px 60px rgba(15,23,42,.18);
    margin-bottom: 24px;
  }
  .vox-ops-kicker { font-size: 11px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #67e8f9; margin-bottom: 10px; }
  .vox-ops-title { font-size: clamp(28px, 4vw, 44px); line-height: 1; font-weight: 950; letter-spacing: -.04em; margin: 0; }
  .vox-ops-subtitle { margin-top: 12px; color: rgba(255,255,255,.72); font-weight: 700; max-width: 760px; line-height: 1.5; }
  .vox-ops-flow { display:flex; flex-wrap:wrap; gap:10px; margin-top:22px; }
  .vox-ops-flow span { background: rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.14); padding:10px 13px; border-radius:999px; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; color:#fff; }
  .vox-ops-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:18px; }
  .vox-ops-card { background:#fff; border:1px solid #e5e7eb; border-radius:28px; padding:22px; box-shadow:0 18px 45px rgba(15,23,42,.06); }
  .vox-ops-card h3 { margin:0; font-size:18px; font-weight:950; color:#111827; letter-spacing:-.02em; }
  .vox-ops-card p { margin:8px 0 16px; color:#64748b; font-size:13px; line-height:1.5; font-weight:700; }
  .vox-ops-actions { display:grid; gap:10px; }
  .vox-ops-action { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid #e5e7eb; background:#f8fafc; border-radius:18px; padding:14px 15px; color:#111827; font-weight:900; text-align:left; transition:all .18s ease; }
  .vox-ops-action:hover { background:#2563eb; color:#fff; border-color:#2563eb; transform:translateY(-1px); }
  .vox-ops-badge { font-size:10px; font-weight:950; text-transform:uppercase; letter-spacing:.08em; color:#2563eb; background:#dbeafe; border-radius:999px; padding:6px 9px; white-space:nowrap; }
  .vox-ops-action:hover .vox-ops-badge { background:rgba(255,255,255,.2); color:#fff; }
  .vox-ops-close { margin-top: 18px; border: 0; border-radius: 16px; padding: 13px 18px; background: #111827; color: #fff; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
  @media (max-width: 900px) {
    .vox-ops-grid { grid-template-columns: 1fr; }
    .vox-ops-hero { border-radius:24px; padding:22px; }
    .vox-ops-floating { top: auto; right: 12px; bottom: 18px; padding: 14px 16px; }
  }
`;

function ensureStyle() {
  if (document.getElementById('vox-operations-ux-style')) return;
  const style = document.createElement('style');
  style.id = 'vox-operations-ux-style';
  style.textContent = css;
  document.head.appendChild(style);
}

function buttonText(button: Element) {
  return (button.textContent || '').replace(/\s+/g, ' ').trim();
}

function closeOperationsHub() {
  document.body.classList.remove('vox-ops-hub-active');
  document.querySelectorAll('.vox-ops-trigger').forEach((button) => button.classList.remove('active'));
}

function findButton(label: string) {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find((button) => buttonText(button).includes(label)) as HTMLButtonElement | undefined;
}

function clickTarget(primary: string, fallback?: string) {
  const button = findButton(primary) || (fallback ? findButton(fallback) : undefined);
  if (!button) return;
  closeOperationsHub();
  button.removeAttribute('data-vox-hidden-operation');
  button.click();
  setTimeout(() => {
    organizeOperationsMenu();
    injectOperationsBreadcrumb();
  }, 160);
}

function hideScatteredOperationButtons() {
  const buttons = Array.from(document.querySelectorAll('button'));
  buttons.forEach((button) => {
    const text = buttonText(button);
    const shouldHide = OPERATION_LABELS_TO_HIDE.some((label) => text.includes(label));
    const isTrigger = button.classList.contains('vox-ops-trigger') || button.classList.contains('vox-ops-floating') || button.classList.contains('vox-ops-action');
    if (shouldHide && !isTrigger) button.setAttribute('data-vox-hidden-operation', 'true');
  });
}

function buildHub() {
  const mainContainer = document.querySelector('main .max-w-7xl');
  if (!mainContainer) return;

  let hub = document.getElementById('vox-operations-hub');
  if (hub) hub.remove();

  hub = document.createElement('div');
  hub.id = 'vox-operations-hub';
  hub.innerHTML = `
    <section class="vox-ops-hero">
      <div class="vox-ops-kicker">Central operacional</div>
      <h1 class="vox-ops-title">Operações</h1>
      <div class="vox-ops-subtitle">Tudo que envolve preparar, gerar, conferir, enviar e acompanhar ingressos, certificados, e-mails e automações em uma única área.</div>
      <div class="vox-ops-flow">
        <span>1 Configurar</span>
        <span>2 Selecionar</span>
        <span>3 Visualizar</span>
        <span>4 Enviar</span>
        <span>5 Acompanhar</span>
      </div>
    </section>
    <section class="vox-ops-grid">
      ${OPERATION_ACTIONS.map((group) => `
        <div class="vox-ops-card">
          <h3>${group.group}</h3>
          <p>${group.description}</p>
          <div class="vox-ops-actions">
            ${group.items.map((item) => `
              <button class="vox-ops-action" type="button" data-target="${item.target}" data-fallback="${item.fallback || ''}">
                <span>${item.title}</span>
                <span class="vox-ops-badge">${item.badge}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </section>
    <button type="button" class="vox-ops-close">Fechar central</button>
  `;

  hub.querySelectorAll<HTMLButtonElement>('.vox-ops-action').forEach((button) => {
    button.addEventListener('click', () => clickTarget(button.dataset.target || '', button.dataset.fallback || undefined));
  });

  hub.querySelector<HTMLButtonElement>('.vox-ops-close')?.addEventListener('click', closeOperationsHub);

  mainContainer.prepend(hub);
}

function openOperationsHub() {
  ensureStyle();
  buildHub();
  document.body.classList.add('vox-ops-hub-active');
  document.querySelectorAll('.vox-ops-trigger').forEach((button) => button.classList.add('active'));
}

function insertOperationsTrigger() {
  const categoryLabels = Array.from(document.querySelectorAll('span')).filter((span) => buttonText(span) === 'Operações');

  categoryLabels.forEach((label) => {
    const group = label.closest('div')?.parentElement;
    if (!group || group.querySelector('.vox-ops-trigger')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vox-ops-trigger';
    button.innerHTML = '<span style="font-size:16px">⚙️</span><span>Operações</span>';
    button.addEventListener('click', openOperationsHub);

    const buttonList = Array.from(group.querySelectorAll('button')).find((candidate) => !candidate.classList.contains('vox-ops-trigger'));
    if (buttonList?.parentElement) buttonList.parentElement.prepend(button);
    else group.appendChild(button);
  });
}

function insertFloatingTrigger() {
  if (document.getElementById('vox-ops-floating')) return;
  if (!document.querySelector('main')) return;

  const button = document.createElement('button');
  button.id = 'vox-ops-floating';
  button.type = 'button';
  button.className = 'vox-ops-floating';
  button.innerHTML = '<span>⚙️</span><span>Operações</span>';
  button.addEventListener('click', openOperationsHub);
  document.body.appendChild(button);
}

function injectOperationsBreadcrumb() {
  const main = document.querySelector('main .max-w-7xl');
  if (!main || document.getElementById('vox-operations-return')) return;
  const pageText = main.textContent || '';
  const isOperationPage = ['Ingresso', 'Certificado', 'Email', 'E-mail', 'Automação', 'Assinatura', 'QR Code'].some((term) => pageText.includes(term));
  if (!isOperationPage || document.body.classList.contains('vox-ops-hub-active')) return;

  const bar = document.createElement('div');
  bar.id = 'vox-operations-return';
  bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:12px 14px;margin-bottom:18px;box-shadow:0 12px 32px rgba(15,23,42,.05);';
  bar.innerHTML = '<div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#64748b;">Operações centralizadas</div><button type="button" style="background:#111827;color:white;border:0;border-radius:14px;padding:10px 14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;">Voltar para Operações</button>';
  bar.querySelector('button')?.addEventListener('click', openOperationsHub);
  main.prepend(bar);
}

function installGlobalMenuClose() {
  if ((window as any).__voxOperationsMenuCloseInstalled) return;
  (window as any).__voxOperationsMenuCloseInstalled = true;

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button');
    if (!button) return;

    const isOperationsControl = Boolean(
      button.classList.contains('vox-ops-trigger') ||
      button.classList.contains('vox-ops-floating') ||
      button.classList.contains('vox-ops-action') ||
      button.classList.contains('vox-ops-close') ||
      button.closest('#vox-operations-hub')
    );

    if (isOperationsControl) return;

    const isNavigationButton = Boolean(button.closest('aside') || button.closest('header') || button.closest('nav'));
    if (isNavigationButton) {
      closeOperationsHub();
      document.getElementById('vox-operations-return')?.remove();
    }
  }, true);
}

function organizeOperationsMenu() {
  ensureStyle();
  insertOperationsTrigger();
  insertFloatingTrigger();
  hideScatteredOperationButtons();
  installGlobalMenuClose();
}

function boot() {
  organizeOperationsMenu();
  injectOperationsBreadcrumb();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
}

export {};
