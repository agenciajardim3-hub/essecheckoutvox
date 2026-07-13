const STOP_LABELS = ['parar', 'parar envio', 'interromper', 'cancelar envio'];

const normalize = (value: string) => value.trim().toLowerCase();

const isStopButton = (element: Element | null): element is HTMLButtonElement => {
  if (!(element instanceof HTMLButtonElement)) return false;
  const label = normalize(element.textContent || '');
  return STOP_LABELS.some(item => label === item || label.includes(item));
};

const haltSending = (event: Event) => {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  if (!isStopButton(target)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  sessionStorage.setItem('vox_email_send_stopped', 'true');
  window.location.reload();
};

document.addEventListener('click', haltSending, true);
