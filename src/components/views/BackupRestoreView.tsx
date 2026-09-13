import React, { useState, useRef } from 'react';
import { useData, RestorePreview } from '../../context/DataContext';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileJson, 
  ShieldCheck, 
  RefreshCcw, 
  Users, 
  Receipt, 
  Coins, 
  HeartHandshake, 
  Briefcase 
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const BackupRestoreView: React.FC = () => {
  const { 
    data, 
    exportBackupJson, 
    inspectRestoreJson, 
    applyRestoredData 
  } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPreview, setPendingPreview] = useState<RestorePreview | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const preview = inspectRestoreJson(content);
        setPendingPreview(preview);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = () => {
    if (pendingPreview && pendingPreview.parsedData) {
      applyRestoredData(pendingPreview.parsedData);
      setPendingPreview(null);
      setShowConfirmRestore(false);
    }
  };

  return (
    <div id="view-backup-restore" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">BACKUP & RESTORE DATABASE</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pencadangan berkas JSON mandiri dan pemulihan data keuangan RT 09 RW 08
            </p>
          </div>
        </div>

        <button
          id="btn-backup-now"
          type="button"
          onClick={exportBackupJson}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          BACKUP SEKARANG
        </button>
      </div>

      {/* Current DB Statistics Overview */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Status Data Saat Ini dalam Sistem
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Warga Terdaftar</span>
            <span className="text-lg font-bold text-white font-mono">{data.warga.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Transaksi Iuran</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{data.iuran.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Transaksi Jimpitan</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">{data.jimpitan.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Catatan Donasi</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{data.donasi.length}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block">Transaksi BOP</span>
            <span className="text-lg font-bold text-purple-400 font-mono">{data.bop.length}</span>
          </div>
        </div>
      </div>

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Backup Data */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4 shadow-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Download className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Cadangkan Database (Backup JSON)
              </h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Ekspor seluruh data warga, iuran, jimpitan, donasi, buku kas BOP, audit log, dan pengaturan sistem ke dalam file JSON terenkripsi. File dapat disimpan di komputer/flashdisk pengurus RT secara berkala.
            </p>

            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Nama file otomatis berformat: <code className="text-emerald-400 font-mono">backup-keuangan-rt-09-YYYY-MM-DD.json</code></li>
              <li>Keamanan terjamin: Kata sandi pengguna tidak diekspos dalam teks polos.</li>
              <li>Dapat dipulihkan kapan saja di perangkat lain.</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={exportBackupJson}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Download File Backup JSON
          </button>
        </div>

        {/* Card 2: Restore Data */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4 shadow-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pulihkan Database (Restore JSON)
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pilih file backup JSON yang pernah Anda unduh sebelumnya. Sistem akan membaca dan memverifikasi isi file sebelum meminta konfirmasi pemulihan.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Perhatian: Proses restore akan menggantikan data yang sedang aktif dengan data yang ada di file backup.
              </span>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-semibold text-xs border border-cyan-700/50 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <FileJson className="w-4 h-4" />
              Pilih File Backup untuk Diperiksa
            </button>
          </div>
        </div>

      </div>

      {/* Restore Inspection Preview Card */}
      {pendingPreview && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-4 shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Hasil Pemeriksaan File Backup
              </h3>
            </div>
            {pendingPreview.valid ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Format Valid
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                Format Tidak Valid
              </span>
            )}
          </div>

          {pendingPreview.valid ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                File backup valid dan siap dipulihkan. Berikut adalah ringkasan data yang terdapat di dalam file:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Warga</span>
                    <span className="text-base font-bold text-white font-mono">{pendingPreview.wargaCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Iuran</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{pendingPreview.iuranCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <Coins className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Jimpitan</span>
                    <span className="text-base font-bold text-cyan-400 font-mono">{pendingPreview.jimpitanCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Donasi</span>
                    <span className="text-base font-bold text-amber-400 font-mono">{pendingPreview.donasiCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 col-span-2 sm:col-span-1">
                  <Briefcase className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">BOP</span>
                    <span className="text-base font-bold text-purple-400 font-mono">{pendingPreview.bopCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPendingPreview(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmRestore(true)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Lanjutkan Restore
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-rose-400 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              {pendingPreview.error || 'File yang dipilih tidak sesuai dengan format backup aplikasi ini.'}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmRestore && (
        <ConfirmModal
          isOpen={showConfirmRestore}
          title="Apakah Anda yakin ingin melakukan restore?"
          message={`Tindakan ini akan menimpa seluruh data sistem dengan data dari berkas cadangan (${pendingPreview?.wargaCount} warga, ${pendingPreview?.iuranCount} iuran, ${pendingPreview?.jimpitanCount} jimpitan, ${pendingPreview?.donasiCount} donasi, ${pendingPreview?.bopCount} BOP). Pastikan Anda telah memiliki backup terbaru.`}
          confirmText="Ya, Restore Sekarang"
          cancelText="Batal"
          isDestructive={true}
          onConfirm={handleExecuteRestore}
          onCancel={() => setShowConfirmRestore(false)}
        />
      )}

    </div>
  );
};
