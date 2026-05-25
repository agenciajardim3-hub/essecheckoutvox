import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return {
    success: (message: string) => context.addToast(message, 'success'),
    error: (message: string) => context.addToast(message, 'error'),
    info: (message: string) => context.addToast(message, 'info'),
    warning: (message: string) => context.addToast(message, 'warning'),
    custom: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) =>
      context.addToast(message, type, duration),
  };
};
