import './src/utils/preserveCertificateEmailLayout';
import './src/utils/operationsUxPatch';
import './src/utils/emailStopPatch';
import './src/utils/automationTurmaSelector';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const CHUNK_RELOAD_KEY = 'vox_chunk_reload_attempted';

const isChunkLoadError = (message: string) =>
  message.includes('Failed to fetch dynamically imported module') ||
  message.includes('Importing a module script failed') ||
  message.includes('Loading chunk') ||
  message.includes('dynamically imported module');

const recoverFromChunkError = (message: string) => {
  if (!isChunkLoadError(message)) return;

  const alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === 'true';
  if (alreadyTried) return;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, 'true');

  if ('caches' in window) {
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .catch(() => undefined)
      .finally(() => window.location.reload());
    return;
  }

  window.location.reload();
};

window.addEventListener('error', event => {
  recoverFromChunkError(event.message || String(event.error?.message || ''));
});

window.addEventListener('unhandledrejection', event => {
  recoverFromChunkError(String(event.reason?.message || event.reason || ''));
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);