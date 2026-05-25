import './src/utils/preserveCertificateEmailLayout';
import './src/utils/operationsUxPatch';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ToastProvider } from './src/context/ToastContext';
import { ToastContainer } from './src/components/Toast/ToastContainer';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <ToastContainer />
    </ToastProvider>
  </React.StrictMode>
);
