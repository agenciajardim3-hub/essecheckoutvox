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
  description: string;
  icon: string;
  primary?: boolean;
};

type OperationGroup = {
  id: string;
  group: string;
  icon: string;
  description: string;
  summary: string;
  items: OperationItem[];
};

const OPERATION_ACTIONS: OperationGroup[] = [
  {
    id: 'ingressos',
    group: 'Ingressos',
    icon: '🎫',
    summary: 'Entrada, envio e conferência',
    description: 'Geração, envio e histórico de ingressos dos alunos.',
    items: [
      { title: 'Gerar individual', target: 'Gerar Ingresso', badge: 'Individual', description: 'Crie o ingresso de uma pessoa específica.', icon: '🎟️' },
      { title: 'Enviar para turma', target: 'Enviar Ingressos', badge: 'Turma / aluno', description: 'Envie ingressos em lote ou para alunos selecionados.', icon: '📨', primary: true },
      { title: 'Histórico', target: 'Histórico de Ingressos', badge: 'Logs', description: 'Acompanhe ingressos enviados e reenvios.', icon: '📋' },
    ],
  },
  {
    id: 'certificados',
    group: 'Certificados',
    icon: '🏅',
    summary: 'Assinatura, geração e envio',
    description: 'Configure assinatura, gere individualmente, gere em massa e acompanhe envios.',
    items: [
      { title: 'Configurações', target: 'Assinaturas', badge: 'Assinatura padrão', description: 'Defina assinatura, instrutor, carga horária e modelo base.', icon: '⚙️', primary: true },
      { title: 'Individual', target: 'Gerar Certificado', badge: '1 aluno', description: 'Gere, visualize, baixe e envie um certificado específico.', icon: '👤' },
      { title: 'Em massa', target: 'Certificados em Massa', fallback: 'Enviar Certificados', badge: 'Turma inteira', description: 'Selecione uma turma, gere todos, revise e envie.', icon: '👥', primary: true },
      { title: 'Histórico', target: 'Pedidos de Certificado', badge: 'Solicitações', description: 'Veja pendências, falhas e reenvios de certificados.', icon: '📚' },
    ],
  },
  {
    id: 'comunicacao',
    group: 'Comunicação',
    icon: '💬',
    summary: 'E-mail, WhatsApp e automações',
    description: 'Envios manuais, campanhas e automações de relacionamento.',
    items: [
      { title: 'E-mail individual', target: 'Email Personalizado', badge: 'Manual', description: 'Envie um e-mail personalizado para uma pessoa.', icon: '✉️' },
      { title: 'E-mail em massa', target: 'Email Marketing', badge: 'Campanha', description: 'Dispare campanhas filtradas por turma ou alunos.', icon: '📣', primary: true },
      { title: 'Automações', target: 'Automação', fallback: 'Automação WhatsApp', badge: 'E-mail / WhatsApp', description: 'Configure mensagens ao pagar, agradecer, lembrar e pós-evento.', icon: '🤖', primary: true },
    ],
  },
  {
    id: 'validacao',
    group: 'Validação',
    icon: '✅',
    summary: 'Check-in e presença',
    description: 'Operação presencial e conferência de alunos.',
    items: [
      { title: 'Escanear QR Code', target: 'Escanear QR Code', badge: 'Check-in', description: 'Valide ingressos rapidamente no dia do evento.', icon: '📷', primary: true },
      { title: 'Check-in', target: 'Check-in', badge: 'Presença', description: 'Veja lista de presença e status dos participantes.', icon: '🧾' },
    ],
  },
];

const css = `
  [data-vox-hidden-operation="true"] { display: none !important; }
  .vox-ops-trigger {
    width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px;
    border: 1px solid rgba(59,130,246,.24); background: linear-gradient(135deg, rgba(37,99,235,.22), rgba(124,58,237,.18));
    color: #fff; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; transition: all .2s ease;
  }
  .vox-ops-trigger:hover { transform: translateY(-1px); background: linear-gradient(135deg, #2563eb, #7c3aed); }
  .vox-ops-trigger.active { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 16px 30px rgba(37,99,235,.22); }
  .vox-ops-floating {
    position: fixed; right: 22px; top: 92px; z-index: 999998; border: 0; border-radius: 18px; padding: 15px 18px;
    background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; box-shadow: 0 18px 38px rgba(37,99,235,.28);
    font-size: 12px; font-weight: 950; letter-spacing: .06em; text-transform: uppercase; display: flex; align-items: center; gap: 9px; cursor: pointer;
  }
  .vox-ops-floating:hover { transform: translateY(-1px); }
  body.vox-ops-hub-active main .max-w-7xl > :not(#vox-operations-hub) { display: none !important; }
  #vox-operations-hub { display: none; }
  body.vox-ops-hub-active #vox-operations-hub { display: block !important; }
  .vox-ops-shell { display: grid; gap: 18px; }
  .vox-ops-hero {
    border-radius: 34px; padding: 30px; background: radial-gradient(circle at top left, rgba(6,182,212,.25), transparent 34%), linear-gradient(135deg,#0f172a,#1e1b4b 58%,#581c87);
    color: #fff; box-shadow: 0 24px 60px rgba(15,23,42,.18); position: relative; overflow: hidden;
  }
  .vox-ops-hero:after { content:''; position:absolute; width:240px; height:240px; border-radius:999px; right:-80px; top:-80px; background:rgba(255,255,255,.08); }
  .vox-ops-hero-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; position:relative; z-index:2; }
  .vox-ops-kicker { font-size: 11px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #67e8f9; margin-bottom: 10px; }
  .vox-ops-title { font-size: clamp(28px, 4vw, 48px); line-height: 1; font-weight: 950; letter-spacing: -.05em; margin: 0; }
  .vox-ops-subtitle { margin-top: 12px; color: rgba(255,255,255,.74); font-weight: 700; max-width: 790px; line-height: 1.5; }
  .vox-ops-hero-close { border:0; background:rgba(255,255,255,.12); color:#fff; border-radius:16px; padding:12px 14px; font-size:11px; font-weight:950; text-transform:uppercase; letter-spacing:.08em; }
  .vox-ops-flow { display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:10px; margin-top:24px; position:relative; z-index:2; }
  .vox-ops-flow-step { background: rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.14); padding:12px; border-radius:18px; }
  .vox-ops-flow-step b { display:block; font-size:18px; line-height:1; margin-bottom:6px; color:#fff; }
  .vox-ops-flow-step span { display:block; font-size:10px; font-weight:950; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.78); }
  .vox-ops-tabs { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; background:#fff; border:1px solid #e5e7eb; border-radius:26px; padding:10px; box-shadow:0 16px 42px rgba(15,23,42,.06); }
  .vox-ops-tab { border:0; border-radius:20px; background:#f8fafc; padding:16px; display:flex; align-items:center; gap:12px; text-align:left; color:#64748b; transition:all .18s ease; }
  .vox-ops-tab:hover { background:#eef2ff; color:#111827; transform:translateY(-1px); }
  .vox-ops-tab.active { background:linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow:0 16px 32px rgba(37,99,235,.22); }
  .vox-ops-tab-icon { font-size:22px; width:34px; height:34px; display:grid; place-items:center; border-radius:14px; background:rgba(255,255,255,.12); }
  .vox-ops-tab strong { display:block; font-size:13px; font-weight:950; letter-spacing:-.02em; }
  .vox-ops-tab span:last-child { display:block; font-size:10px; font-weight:800; opacity:.72; margin-top:3px; }
  .vox-ops-panel { display:none; }
  .vox-ops-panel.active { display:block; }
  .vox-ops-section-head { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; margin:18px 0 14px; }
  .vox-ops-section-title { margin:0; font-size:24px; font-weight:950; color:#111827; letter-spacing:-.04em; }
  .vox-ops-section-desc { margin:6px 0 0; color:#64748b; font-size:13px; line-height:1.5; font-weight:700; max-width:720px; }
  .vox-ops-status-card { background:#ecfeff; border:1px solid #a5f3fc; color:#155e75; border-radius:18px; padding:12px 14px; min-width:220px; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; }
  .vox-ops-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:16px; }
  .vox-ops-action { width:100%; min-height:126px; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; border:1px solid #e5e7eb; background:#fff; border-radius:26px; padding:18px; color:#111827; text-align:left; transition:all .18s ease; box-shadow:0 14px 34px rgba(15,23,42,.05); }
  .vox-ops-action:hover { background:#f8fafc; border-color:#93c5fd; transform:translateY(-2px); box-shadow:0 18px 42px rgba(37,99,235,.12); }
  .vox-ops-action.primary { border-color:#bfdbfe; background:linear-gradient(180deg,#ffffff,#eff6ff); }
  .vox-ops-action-left { display:flex; gap:14px; align-items:flex-start; }
  .vox-ops-action-icon { width:46px; height:46px; flex:0 0 auto; display:grid; place-items:center; border-radius:18px; background:#eef2ff; font-size:22px; }
  .vox-ops-action h4 { margin:0; font-size:15px; font-weight:950; letter-spacing:-.02em; }
  .vox-ops-action p { margin:7px 0 0; color:#64748b; font-size:12px; line-height:1.45; font-weight:700; }
  .vox-ops-badge { font-size:10px; font-weight:950; text-transform:uppercase; letter-spacing:.08em; color:#2563eb; background:#dbeafe; border-radius:999px; padding:7px 9px; white-space:nowrap; }
  .vox-ops-cert-layout { display:grid; grid-template-columns: 1.1fr .9fr; gap:16px; align-items:start; }
  .vox-ops-checklist { background:#fff; border:1px solid #e5e7eb; border-radius:26px; padding:20px; box-shadow:0 14px 34px rgba(15,23,42,.05); }
  .vox-ops-checklist h4 { margin:0 0 12px; font-size:14px; font-weight:950; color:#111827; }
  .vox-ops-check-item { display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid #f1f5f9; color:#475569; font-size:12px; font-weight:800; }
  .vox-ops-dot { width:22px; height:22px; border-radius:999px; display:grid; place-items:center; color:#fff; background:#10b981; font-size:12px; }
  .vox-ops-close { margin-top: 18px; border: 0; border-radius: 16px; padding: 13px 18px; background: #111827; color: #fff; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
  @media (max-width: 980px) { .vox-ops-tabs, .vox-ops-flow, .vox-ops-grid, .vox-ops-cert-layout { grid-template-columns: 1fr; } .vox-ops-section-head { flex-direction:column; } }
  @media (max-width: 900px) { .vox-ops-hero { border-radius:24px; padding:22px; } .vox-ops-floating { top: auto; right: 12px; bottom: 18px; padding: 14px 16px; } }
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
  document.getElementById('vox-operations-return')?.remove();
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
  setTimeout(organizeOperationsMenu, 160);
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

function actionButton(item: OperationItem) {
  return `
    <button class="vox-ops-action ${item.primary ? 'primary' : ''}" type="button" data-target="${item.target}" data-fallback="${item.fallback || ''}">
      <div class="vox-ops-action-left">
        <div class="vox-ops-action-icon">${item.icon}</div>
        <div>
          <h4>${item.title}</h4>
          <p>${item.description}</p>
        </div>
      </div>
      <span class="vox-ops-badge">${item.badge}</span>
    </button>
  `;
}

function buildPanel(group: OperationGroup) {
  const actions = group.items.map(actionButton).join('');

  if (group.id === 'certificados') {
    return `
      <div class="vox-ops-panel active" data-panel="${group.id}">
        <div class="vox-ops-section-head">
          <div>
            <h2 class="vox-ops-section-title">${group.icon} ${group.group}</h2>
            <p class="vox-ops-section-desc">${group.description} O fluxo recomendado é configurar assinatura, escolher individual ou em massa, revisar a prévia e só então enviar.</p>
          </div>
          <div class="vox-ops-status-card">Fluxo recomendado: configurar → gerar → revisar → enviar</div>
        </div>
        <div class="vox-ops-cert-layout">
          <div class="vox-ops-grid">${actions}</div>
          <aside class="vox-ops-checklist">
            <h4>Checklist antes de enviar</h4>
            <div class="vox-ops-check-item"><span class="vox-ops-dot">1</span> Assinatura padrão configurada</div>
            <div class="vox-ops-check-item"><span class="vox-ops-dot">2</span> Turma ou aluno selecionado</div>
            <div class="vox-ops-check-item"><span class="vox-ops-dot">3</span> Prévia conferida no layout oficial</div>
            <div class="vox-ops-check-item"><span class="vox-ops-dot">4</span> Envio acompanhado por status</div>
          </aside>
        </div>
      </div>
    `;
  }

  return `
    <div class="vox-ops-panel" data-panel="${group.id}">
      <div class="vox-ops-section-head">
        <div>
          <h2 class="vox-ops-section-title">${group.icon} ${group.group}</h2>
          <p class="vox-ops-section-desc">${group.description}</p>
        </div>
        <div class="vox-ops-status-card">${group.summary}</div>
      </div>
      <div class="vox-ops-grid">${actions}</div>
    </div>
  `;
}

function buildHub() {
  const mainContainer = document.querySelector('main .max-w-7xl');
  if (!mainContainer) return;

  let hub = document.getElementById('vox-operations-hub');
  if (hub) hub.remove();

  hub = document.createElement('div');
  hub.id = 'vox-operations-hub';
  hub.innerHTML = `
    <div class="vox-ops-shell">
      <section class="vox-ops-hero">
        <div class="vox-ops-hero-head">
          <div>
            <div class="vox-ops-kicker">Central operacional</div>
            <h1 class="vox-ops-title">Operações</h1>
            <div class="vox-ops-subtitle">Tudo que envolve preparar, gerar, conferir, enviar e acompanhar ingressos, certificados, e-mails e automações em uma única área.</div>
          </div>
          <button type="button" class="vox-ops-hero-close">Fechar</button>
        </div>
        <div class="vox-ops-flow">
          <div class="vox-ops-flow-step"><b>1</b><span>Configurar</span></div>
          <div class="vox-ops-flow-step"><b>2</b><span>Selecionar</span></div>
          <div class="vox-ops-flow-step"><b>3</b><span>Visualizar</span></div>
          <div class="vox-ops-flow-step"><b>4</b><span>Enviar</span></div>
          <div class="vox-ops-flow-step"><b>5</b><span>Acompanhar</span></div>
        </div>
      </section>

      <nav class="vox-ops-tabs">
        ${OPERATION_ACTIONS.map((group) => `
          <button type="button" class="vox-ops-tab ${group.id === 'certificados' ? 'active' : ''}" data-panel-target="${group.id}">
            <span class="vox-ops-tab-icon">${group.icon}</span>
            <span><strong>${group.group}</strong><span>${group.summary}</span></span>
          </button>
        `).join('')}
      </nav>

      <section class="vox-ops-panels">
        ${OPERATION_ACTIONS.map(buildPanel).join('')}
      </section>

      <button type="button" class="vox-ops-close">Fechar central</button>
    </div>
  `;

  hub.querySelectorAll<HTMLButtonElement>('.vox-ops-action').forEach((button) => {
    button.addEventListener('click', () => clickTarget(button.dataset.target || '', button.dataset.fallback || undefined));
  });

  hub.querySelectorAll<HTMLButtonElement>('[data-panel-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.panelTarget;
      hub?.querySelectorAll('.vox-ops-tab').forEach((tab) => tab.classList.remove('active'));
      hub?.querySelectorAll('.vox-ops-panel').forEach((panel) => panel.classList.remove('active'));
      button.classList.add('active');
      hub?.querySelector(`[data-panel="${target}"]`)?.classList.add('active');
    });
  });

  hub.querySelector<HTMLButtonElement>('.vox-ops-close')?.addEventListener('click', closeOperationsHub);
  hub.querySelector<HTMLButtonElement>('.vox-ops-hero-close')?.addEventListener('click', closeOperationsHub);

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

function removeOldReturnBar() {
  document.getElementById('vox-operations-return')?.remove();
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
      button.classList.contains('vox-ops-hero-close') ||
      button.classList.contains('vox-ops-tab') ||
      button.closest('#vox-operations-hub')
    );

    if (isOperationsControl) return;

    const isNavigationButton = Boolean(button.closest('aside') || button.closest('header') || button.closest('nav'));
    if (isNavigationButton) closeOperationsHub();
  }, true);
}

function organizeOperationsMenu() {
  ensureStyle();
  removeOldReturnBar();
  insertOperationsTrigger();
  insertFloatingTrigger();
  hideScatteredOperationButtons();
  installGlobalMenuClose();
}

function boot() {
  organizeOperationsMenu();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
}

export {};
