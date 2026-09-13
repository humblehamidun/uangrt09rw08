import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { SettingsConfig } from '../../types';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RefreshCcw, 
  Trash2, 
  Building2, 
  Coins, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  FileJson
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatRupiah } from '../../utils/format';

export const PengaturanView: React.FC = () => {
  const { 
    data, 
    updateSettings, 
    backupData, 
    restoreData, 
    resetToDefaultSample, 
    clearAllData 
  } = useData();

  // Local settings state
  const [formSettings, setFormSettings] = useState<SettingsConfig>({ ...data.settings });
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Modals state
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // File input ref for restore JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        restoreData(content);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  return (
    <div id="view-pengaturan" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            PENGATURAN SISTEM & MASTER DATA
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Konfigurasi nominal standar iuran, identitas kepengurusan RT, dan manajemen pencadangan data
          </p>
        </div>

        {isSavedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            Pengaturan tersimpan!
          </div>
        )}
      </div>

      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        
        {/* Section 1: Informasi Kepengurusan RT */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Identitas Wilayah & Kepengurusan RT
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="input-nama-rt" className="block text-slate-400 font-medium mb-1">Nama RT</label>
              <input
                id="input-nama-rt"
                type="text"
                value={formSettings.namaRT}
                onChange={(e) => setFormSettings({ ...formSettings, namaRT: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label htmlFor="input-nama-rw" className="block text-slate-400 font-medium mb-1">Nama RW</label>
              <input
                id="input-nama-rw"
                type="text"
                value={formSettings.rw}
                onChange={(e) => setFormSettings({ ...formSettings, rw: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label htmlFor="input-kelurahan" className="block text-slate-400 font-medium mb-1">Kelurahan</label>
              <input
                id="input-kelurahan"
                type="text"
                value={formSettings.kelurahan}
                onChange={(e) => setFormSettings({ ...formSettings, kelurahan: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label htmlFor="input-ketua-rt" className="block text-slate-400 font-medium mb-1">Nama Ketua RT</label>
              <input
                id="input-ketua-rt"
                type="text"
                value={formSettings.ketuaRT}
                onChange={(e) => setFormSettings({ ...formSettings, ketuaRT: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="input-bendahara-rt" className="block text-slate-400 font-medium mb-1">Nama Bendahara RT</label>
              <input
                id="input-bendahara-rt"
                type="text"
                value={formSettings.bendahara}
                onChange={(e) => setFormSettings({ ...formSettings, bendahara: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="input-kontak-rt" className="block text-slate-400 font-medium mb-1">No. Kontak / WA Pengurus</label>
              <input
                id="input-kontak-rt"
                type="text"
                value={formSettings.kontakWa || ''}
                onChange={(e) => setFormSettings({ ...formSettings, kontakWa: e.target.value })}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Nominal Pos Iuran & Jimpitan */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Nominal Tarif Pos Iuran & Jimpitan
              </h3>
            </div>
            <div className="text-xs text-emerald-400 font-mono font-bold">
              Total Iuran Penuh: {formatRupiah(
                formSettings.nominalKas + 
                formSettings.nominalUangMeja + 
                formSettings.nominalUangSampah + 
                formSettings.nominalDanaAcaraTahunan + 
                formSettings.nominalUangSosial
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Kas */}
            <div>
              <label htmlFor="input-nominal-kas" className="block text-slate-400 font-medium mb-1">
                1. Kas RT (Standar: Rp 5.000)
              </label>
              <input
                id="input-nominal-kas"
                type="number"
                min="0"
                step="500"
                value={formSettings.nominalKas}
                onChange={(e) => setFormSettings({ ...formSettings, nominalKas: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Uang Meja */}
            <div>
              <label htmlFor="input-nominal-meja" className="block text-slate-400 font-medium mb-1">
                2. Uang Meja (Standar: Rp 10.000)
              </label>
              <input
                id="input-nominal-meja"
                type="number"
                min="0"
                step="500"
                value={formSettings.nominalUangMeja}
                onChange={(e) => setFormSettings({ ...formSettings, nominalUangMeja: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Uang Sampah */}
            <div>
              <label htmlFor="input-nominal-sampah" className="block text-slate-400 font-medium mb-1">
                3. Uang Sampah (Standar: Rp 12.000)
              </label>
              <input
                id="input-nominal-sampah"
                type="number"
                min="0"
                step="500"
                value={formSettings.nominalUangSampah}
                onChange={(e) => setFormSettings({ ...formSettings, nominalUangSampah: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Dana Acara Tahunan */}
            <div>
              <label htmlFor="input-nominal-acara" className="block text-slate-400 font-medium mb-1">
                4. Dana Acara Tahunan (Standar: Rp 3.000)
              </label>
              <input
                id="input-nominal-acara"
                type="number"
                min="0"
                step="500"
                value={formSettings.nominalDanaAcaraTahunan}
                onChange={(e) => setFormSettings({ ...formSettings, nominalDanaAcaraTahunan: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Uang Sosial */}
            <div>
              <label htmlFor="input-nominal-sosial" className="block text-slate-400 font-medium mb-1">
                5. Uang Sosial (Standar: Rp 5.000)
              </label>
              <input
                id="input-nominal-sosial"
                type="number"
                min="0"
                step="500"
                value={formSettings.nominalUangSosial}
                onChange={(e) => setFormSettings({ ...formSettings, nominalUangSosial: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Jimpitan */}
            <div>
              <label htmlFor="input-nominal-jimpitan" className="block text-slate-400 font-medium mb-1">
                6. Jimpitan / Pekan (Standar: Rp 3.000)
              </label>
              <input
                id="input-nominal-jimpitan"
                type="number"
                min="0"
                step="500"
                value={formSettings.nominalJimpitan}
                onChange={(e) => setFormSettings({ ...formSettings, nominalJimpitan: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              id="btn-save-settings"
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition-colors"
            >
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </button>
          </div>
        </div>

      </form>

      {/* Section 3: Backup & Restore Data */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <FileJson className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Backup & Restore Data Keuangan
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Semua data tersimpan otomatis di penyimpanan lokal peramban (localStorage). Anda dapat mencadangkan data ke file JSON atau memulihkan data dari file cadangan kapan saja.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Backup Button */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-400" />
                Download Cadangan (Backup JSON)
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Simpan seluruh data warga, transaksi iuran, jimpitan, donasi, dan BOP ke dalam file komputer Anda.
              </p>
            </div>
            <button
              id="btn-backup-data-json"
              type="button"
              onClick={backupData}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download File Backup JSON
            </button>
          </div>

          {/* Restore Button */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-cyan-400" />
                Pulihkan Data (Restore JSON)
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Unggah file JSON backup yang pernah Anda unduh sebelumnya untuk mengembalikan data pembukuan.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleRestoreFileChange}
                className="hidden"
              />
              <button
                id="btn-restore-data-json"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-semibold text-xs border border-cyan-700/50 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Pilih File JSON untuk Dipulihkan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Zona Bahaya (Reset / Clear) */}
      <div className="p-6 rounded-2xl bg-rose-950/10 border border-rose-900/30 space-y-4 shadow-md">
        <div className="flex items-center gap-2 pb-3 border-b border-rose-900/30">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
            Zona Bahaya & Pengaturan Awal
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-white">Reset ke Data Contoh (Demonstrasi)</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mengisi ulang database aplikasi dengan data contoh warga RT 09, pembukuan iuran, jimpitan, donasi, dan transaksi BOP lengkap untuk pengujian.
            </p>
          </div>
          <button
            id="btn-reset-sample-data"
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 whitespace-nowrap transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Data Contoh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-rose-950/60">
          <div>
            <h4 className="text-xs font-bold text-rose-300">Kosongkan Seluruh Data (Hapus Total)</h4>
            <p className="text-[11px] text-rose-200/70 mt-0.5">
              Menghapus permanen seluruh data warga, transaksi iuran, jimpitan, donasi, dan BOP. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <button
            id="btn-clear-all-data"
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs whitespace-nowrap transition-colors shadow-lg shadow-rose-950/50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Bersihkan Seluruh Data
          </button>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {confirmResetOpen && (
        <ConfirmModal
          isOpen={confirmResetOpen}
          title="Reset ke Data Contoh?"
          message="Apakah Anda yakin ingin memuat ulang contoh data warga dan transaksi RT 09? Data saat ini akan diganti dengan data demonstrasi lengkap."
          confirmText="Ya, Reset Data"
          cancelText="Batal"
          isDestructive={false}
          onConfirm={() => {
            resetToDefaultSample();
            setConfirmResetOpen(false);
          }}
          onCancel={() => setConfirmResetOpen(false)}
        />
      )}

      {/* Confirm Clear Modal */}
      {confirmClearOpen && (
        <ConfirmModal
          isOpen={confirmClearOpen}
          title="PERINGATAN: Kosongkan Seluruh Data?"
          message="Tindakan ini akan MENGHAPUS PERMANEN seluruh data warga, catatan iuran, jimpitan, donasi, dan riwayat BOP dari penyimpanan peramban. Apakah Anda benar-benar yakin?"
          confirmText="Ya, Hapus Semua"
          cancelText="Batal"
          isDestructive={true}
          onConfirm={() => {
            clearAllData();
            setConfirmClearOpen(false);
          }}
          onCancel={() => setConfirmClearOpen(false)}
        />
      )}

    </div>
  );
};
