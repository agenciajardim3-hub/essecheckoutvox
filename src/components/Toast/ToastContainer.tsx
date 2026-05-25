import React, { useContext } from 'react';
import { ToastContext } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);

  if (!context) return null;

  const { toasts, removeToast } = context;

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          icon: <CheckCircle2 size={20} className="text-emerald-600" />,
          text: 'text-emerald-800',
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertCircle size={20} className="text-red-600" />,
          text: 'text-red-800',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          icon: <AlertTriangle size={20} className="text-amber-600" />,
          text: 'text-amber-800',
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <Info size={20} className="text-blue-600" />,
          text: 'text-blue-800',
        };
    }
  };

  return (
    <div className="fixed bottom-6 right-6 space-y-3 z-50 pointer-events-none">
      {toasts.map((toast) => {
        const styles = getStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`${styles.bg} border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 max-w-sm animate-in fade-in slide-in-from-right-5 duration-300 pointer-events-auto`}
          >
            {styles.icon}
            <p className={`${styles.text} font-medium text-sm flex-1`}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
              aria-label="Fechar notificação"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
