import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="confirm-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
    >
      <div 
        id="confirm-modal-box"
        className="w-full max-w-md rounded-2xl bg-white border border-[#E5E7EB] p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${isDestructive ? 'bg-rose-50 text-[#DC3545] border border-rose-100' : 'bg-amber-50 text-[#F59E0B] border border-amber-100'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[#1F2937] tracking-tight">{title}</h3>
            <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-2 pt-4 border-t border-[#E5E7EB]">
          <button
            id="btn-confirm-cancel"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#1F2937] hover:bg-slate-100 bg-white border border-[#E5E7EB] rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            id="btn-confirm-proceed"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm ${
              isDestructive 
                ? 'bg-[#DC3545] hover:bg-rose-700' 
                : 'bg-[#1E5AA8] hover:bg-[#164A87]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
