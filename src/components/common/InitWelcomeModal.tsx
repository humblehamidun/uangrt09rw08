import React from 'react';
import { useData } from '../../context/DataContext';
import { Building2, Sparkles, FolderPlus, CheckCircle2 } from 'lucide-react';

export const InitWelcomeModal: React.FC = () => {
  const { showInitModal, initializeWithEmpty, initializeWithSample } = useData();

  if (!showInitModal) return null;

  return (
    <div 
      id="init-welcome-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700/80 p-6 md:p-8 shadow-2xl shadow-emerald-950/20 text-slate-100 flex flex-col gap-6 animate-in zoom-in-95">
        
        {/* Header visual */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              Administrasi Keuangan
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              KEUANGAN RT 09 RW 08
            </h2>
            <p className="text-sm text-slate-400">
              Kelurahan Bangetayu Wetan
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Selamat datang di sistem pembukuan & kas RT 09 RW 08 Kelurahan Bangetayu Wetan. Silakan pilih cara memulai aplikasi:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Option 1: Sample Data */}
            <div 
              onClick={initializeWithSample}
              className="cursor-pointer group p-5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-emerald-500/30 hover:border-emerald-500 transition-all duration-200 flex flex-col justify-between gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    Muat Data Contoh
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Siap dengan 10 data warga, contoh pembayaran iuran, jimpitan mingguan, donasi & transaksi BOP untuk eksplorasi langsung.
                  </p>
                </div>
              </div>
              <button 
                id="btn-init-sample"
                type="button"
                onClick={(e) => { e.stopPropagation(); initializeWithSample(); }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md shadow-emerald-950/50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Muat Data Contoh
              </button>
            </div>

            {/* Option 2: Empty Data */}
            <div 
              onClick={initializeWithEmpty}
              className="cursor-pointer group p-5 rounded-2xl bg-slate-800/30 hover:bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition-all duration-200 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-slate-700/40 text-slate-300 border border-slate-600/50">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white group-hover:text-slate-200 transition-colors">
                    Mulai dengan Data Kosong
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Mulai dari nol dengan tabel buku kas bersih. Anda dapat memasukkan data warga RT 09 secara mandiri kapan saja.
                  </p>
                </div>
              </div>
              <button 
                id="btn-init-empty"
                type="button"
                onClick={(e) => { e.stopPropagation(); initializeWithEmpty(); }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all border border-slate-600 flex items-center justify-center gap-2"
              >
                Mulai Data Kosong
              </button>
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <span className="text-[11px] text-slate-500">
            Data tersimpan aman di peramban (localStorage) dan dapat diekspor/dicadangkan kapan saja.
          </span>
        </div>

      </div>
    </div>
  );
};
