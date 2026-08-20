const mobileCss = `
  @media (max-width: 760px) {
    body.vox-ops-hub-active {
      overflow-x: hidden !important;
    }

    body.vox-ops-hub-active main {
      width: 100% !important;
      max-width: 100vw !important;
      overflow-x: hidden !important;
    }

    body.vox-ops-hub-active main .max-w-7xl {
      width: 100% !important;
      max-width: 100vw !important;
      padding-left: 10px !important;
      padding-right: 10px !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      overflow-x: hidden !important;
    }

    #vox-operations-hub,
    #vox-operations-hub * {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    .vox-ops-shell {
      gap: 12px !important;
      width: 100% !important;
      overflow-x: hidden !important;
    }

    .vox-ops-floating {
      top: auto !important;
      right: 12px !important;
      bottom: 14px !important;
      padding: 12px 14px !important;
      border-radius: 999px !important;
      font-size: 10px !important;
      box-shadow: 0 12px 28px rgba(37,99,235,.28) !important;
    }

    .vox-ops-hero {
      border-radius: 22px !important;
      padding: 18px !important;
      margin: 0 !important;
    }

    .vox-ops-hero-head {
      display: block !important;
    }

    .vox-ops-kicker {
      font-size: 9px !important;
      letter-spacing: .14em !important;
      margin-bottom: 8px !important;
    }

    .vox-ops-title {
      font-size: 30px !important;
      line-height: .95 !important;
      letter-spacing: -.04em !important;
    }

    .vox-ops-subtitle {
      font-size: 12px !important;
      line-height: 1.45 !important;
      margin-top: 10px !important;
      max-width: 100% !important;
    }

    .vox-ops-hero-close {
      position: absolute !important;
      top: 12px !important;
      right: 12px !important;
      padding: 9px 11px !important;
      border-radius: 12px !important;
      font-size: 9px !important;
    }

    .vox-ops-flow {
      display: flex !important;
      overflow-x: auto !important;
      gap: 8px !important;
      margin-top: 16px !important;
      padding-bottom: 4px !important;
      scroll-snap-type: x mandatory !important;
      -webkit-overflow-scrolling: touch !important;
    }

    .vox-ops-flow-step {
      min-width: 112px !important;
      padding: 10px !important;
      border-radius: 14px !important;
      scroll-snap-align: start !important;
    }

    .vox-ops-flow-step b {
      font-size: 16px !important;
      margin-bottom: 4px !important;
    }

    .vox-ops-flow-step span {
      font-size: 9px !important;
    }

    .vox-ops-tabs {
      display: flex !important;
      overflow-x: auto !important;
      gap: 8px !important;
      padding: 8px !important;
      border-radius: 20px !important;
      scroll-snap-type: x mandatory !important;
      -webkit-overflow-scrolling: touch !important;
    }

    .vox-ops-tab {
      min-width: 156px !important;
      flex: 0 0 156px !important;
      padding: 12px !important;
      border-radius: 16px !important;
      gap: 9px !important;
      scroll-snap-align: start !important;
    }

    .vox-ops-tab-icon {
      width: 30px !important;
      height: 30px !important;
      border-radius: 12px !important;
      font-size: 18px !important;
    }

    .vox-ops-tab strong {
      font-size: 12px !important;
    }

    .vox-ops-tab span:last-child {
      font-size: 9px !important;
      line-height: 1.25 !important;
    }

    .vox-ops-section-head {
      display: block !important;
      margin: 14px 0 10px !important;
    }

    .vox-ops-section-title {
      font-size: 22px !important;
      line-height: 1.05 !important;
    }

    .vox-ops-section-desc {
      font-size: 12px !important;
      line-height: 1.45 !important;
      margin-top: 8px !important;
    }

    .vox-ops-status-card {
      min-width: 0 !important;
      width: 100% !important;
      margin-top: 10px !important;
      padding: 10px 12px !important;
      border-radius: 14px !important;
      font-size: 9px !important;
      line-height: 1.35 !important;
    }

    .vox-ops-grid,
    .vox-ops-cert-layout {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 10px !important;
      width: 100% !important;
    }

    .vox-ops-action {
      min-height: 0 !important;
      width: 100% !important;
      border-radius: 18px !important;
      padding: 14px !important;
      gap: 10px !important;
      align-items: flex-start !important;
    }

    .vox-ops-action-left {
      gap: 10px !important;
      min-width: 0 !important;
      flex: 1 !important;
    }

    .vox-ops-action-icon {
      width: 38px !important;
      height: 38px !important;
      border-radius: 14px !important;
      font-size: 18px !important;
    }

    .vox-ops-action h4 {
      font-size: 14px !important;
      line-height: 1.15 !important;
    }

    .vox-ops-action p {
      font-size: 11px !important;
      line-height: 1.35 !important;
      margin-top: 5px !important;
    }

    .vox-ops-badge {
      align-self: flex-start !important;
      font-size: 8px !important;
      padding: 6px 7px !important;
      max-width: 92px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .vox-ops-checklist {
      border-radius: 18px !important;
      padding: 14px !important;
    }

    .vox-ops-checklist h4 {
      font-size: 13px !important;
    }

    .vox-ops-check-item {
      font-size: 11px !important;
      line-height: 1.35 !important;
      align-items: flex-start !important;
      padding: 9px 0 !important;
    }

    .vox-ops-dot {
      width: 20px !important;
      height: 20px !important;
      font-size: 10px !important;
      flex: 0 0 20px !important;
    }

    .vox-ops-close {
      width: 100% !important;
      margin-top: 10px !important;
      padding: 14px !important;
      border-radius: 16px !important;
    }
  }

  @media (max-width: 390px) {
    body.vox-ops-hub-active main .max-w-7xl {
      padding-left: 8px !important;
      padding-right: 8px !important;
    }

    .vox-ops-hero {
      padding: 16px !important;
    }

    .vox-ops-title {
      font-size: 27px !important;
    }

    .vox-ops-tab {
      min-width: 142px !important;
      flex-basis: 142px !important;
    }

    .vox-ops-action {
      padding: 12px !important;
    }
  }
`;

function ensureOperationsAndroidStyle() {
  if (document.getElementById('vox-operations-android-style')) return;
  const style = document.createElement('style');
  style.id = 'vox-operations-android-style';
  style.textContent = mobileCss;
  document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureOperationsAndroidStyle);
  } else {
    ensureOperationsAndroidStyle();
  }
}

export {};
