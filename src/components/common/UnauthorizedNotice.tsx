import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface UnauthorizedNoticeProps {
  onBackToDashboard: () => void;
  message?: string;
}

export const UnauthorizedNotice: React.FC<UnauthorizedNoticeProps> = ({ 
  onBackToDashboard, 
  message = 'Anda tidak memiliki izin untuk mengakses halaman ini.' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-center animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#DC3545] mb-4 shadow-sm">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-bold text-[#1F2937] tracking-tight">Akses Dibatasi</h2>
      <p className="text-xs text-[#DC3545] font-medium mt-1.5 max-w-md">
        {message}
      </p>
      <p className="text-xs text-[#6B7280] mt-1 max-w-md">
        Menu ini dikhususkan bagi Administrator sistem. Silakan kembali ke menu operasional atau hubungi pengurus RT.
      </p>
      <button
        onClick={onBackToDashboard}
        className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E5AA8] hover:bg-[#164A87] text-white text-xs font-semibold shadow-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </button>
    </div>
  );
};
