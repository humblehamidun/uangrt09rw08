import React from 'react';
import { useData } from '../../context/DataContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useData();

  if (toasts.length === 0) return null;

  return (
    <div 
      id="toast-container" 
      className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
    >
      {toasts.map(toast => {
        let borderClass = 'border-[#E5E7EB]';
        let Icon = Info;
        let iconColor = 'text-[#0EA5E9]';

        if (toast.type === 'success') {
          borderClass = 'border-emerald-200';
          Icon = CheckCircle2;
          iconColor = 'text-[#198754]';
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-200';
          Icon = AlertCircle;
          iconColor = 'text-[#F59E0B]';
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-200';
          Icon = XCircle;
          iconColor = 'text-[#DC3545]';
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl bg-white border ${borderClass} shadow-md transition-all duration-200 animate-in fade-in slide-in-from-top-2`}
          >
            <div className="flex items-center gap-3 pr-2">
              <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
              <span className="text-xs font-medium text-[#1F2937] leading-snug">{toast.message}</span>
            </div>
            <button
              id={`btn-close-toast-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md hover:bg-slate-100 text-[#6B7280] hover:text-[#1F2937] transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
