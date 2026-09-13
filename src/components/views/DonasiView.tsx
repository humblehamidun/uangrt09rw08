import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { DonasiRecord } from '../../types';
import { 
  Gift, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Download, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Heart
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatRupiah, formatTanggalIndonesia, downloadCSV } from '../../utils/format';

export const DonasiView: React.FC = () => {
  const { data, addDonasi, updateDonasi, deleteDonasi } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDonasi, setEditingDonasi] = useState<DonasiRecord | null>(null);

  // Form states
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formNamaDonatur, setFormNamaDonatur] = useState('');
  const [formNomorRumah, setFormNomorRumah] = useState('');
  const [formNominal, setFormNominal] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState('');

  // Delete target state
  const [deleteTarget, setDeleteTarget] = useState<DonasiRecord | null>(null);

  // Filtered donations
  const filteredDonasi = useMemo(() => {
    return data.donasi.filter(d => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNama = d.namaDonatur.toLowerCase().includes(query);
        const matchRumah = (d.nomorRumah || '').toLowerCase().includes(query);
        const matchKet = (d.keterangan || '').toLowerCase().includes(query);
        if (!matchNama && !matchRumah && !matchKet) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [data.donasi, searchTerm]);

  // Overall total donation
  const totalDonasi = useMemo(() => {
    return data.donasi.reduce((sum, d) => sum + (d.nominal || 0), 0);
  }, [data.donasi]);

  const handleOpenAdd = () => {
    setEditingDonasi(null);
    setFormTanggal(new Date().toISOString().slice(0, 10));
    setFormNamaDonatur('');
    setFormNomorRumah('');
    setFormNominal('');
    setFormKeterangan('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: DonasiRecord) => {
    setEditingDonasi(record);
    setFormTanggal(record.tanggal);
    setFormNamaDonatur(record.namaDonatur);
    setFormNomorRumah(record.nomorRumah || '');
    setFormNominal(String(record.nominal));
    setFormKeterangan(record.keterangan || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNama = formNamaDonatur.trim();
    const parsedNominal = Number(formNominal);

    if (!cleanNama) {
      setFormError('Nama donatur wajib diisi!');
      return;
    }
    if (!formNominal || isNaN(parsedNominal) || parsedNominal <= 0) {
      setFormError('Nominal donasi harus lebih besar dari 0!');
      return;
    }
    if (!formTanggal) {
      setFormError('Tanggal donasi wajib diisi!');
      return;
    }

    if (editingDonasi) {
      updateDonasi(editingDonasi.id, {
        tanggal: formTanggal,
        namaDonatur: cleanNama,
        nomorRumah: formNomorRumah.trim(),
        nominal: parsedNominal,
        keterangan: formKeterangan.trim(),
      });
    } else {
      addDonasi({
        tanggal: formTanggal,
        namaDonatur: cleanNama,
        nomorRumah: formNomorRumah.trim(),
        nominal: parsedNominal,
        keterangan: formKeterangan.trim(),
      });
    }

    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteDonasi(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Tanggal', 'Nama Donatur', 'Nomor Rumah', 'Nominal', 'Keterangan'];
    const rows = filteredDonasi.map((d, idx) => [
      idx + 1,
      formatTanggalIndonesia(d.tanggal, 'full'),
      d.namaDonatur,
      d.nomorRumah || '-',
      formatRupiah(d.nominal),
      d.keterangan || '-'
    ]);

    rows.push(['', '', 'TOTAL DONASI', '', formatRupiah(totalDonasi), '']);

    downloadCSV(`Laporan_Donasi_RT09_RW08_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div id="view-donasi" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              DONASI & SUMBANGAN SUKARELA
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Fleksibel
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan donasi sukarela warga, donatur, atau dermawan untuk kas RT 09 RW 08
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-donasi-csv"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button
            id="btn-tambah-donasi"
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Donasi
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Donasi Terkumpul</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {formatRupiah(totalDonasi)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Heart className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Jumlah Transaksi Donasi</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {data.donasi.length} kali
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Rata-rata per Donasi</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {data.donasi.length > 0 ? formatRupiah(Math.round(totalDonasi / data.donasi.length)) : 'Rp 0'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Gift className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-search-donasi"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari donatur berdasarkan nama, nomor rumah, atau keterangan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table id="table-donasi" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 w-32">Tanggal</th>
                <th className="py-3.5 px-4">Nama Donatur</th>
                <th className="py-3.5 px-4 w-28 text-center">Nomor Rumah</th>
                <th className="py-3.5 px-4 w-36 text-right">Nominal</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDonasi.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Gift className="w-8 h-8 text-slate-600" />
                      <span className="font-medium text-slate-300">Belum ada data donasi</span>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors"
                      >
                        + Tambah Donasi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDonasi.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {formatTanggalIndonesia(item.tanggal, 'short')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {item.namaDonatur}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.nomorRumah ? (
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-800 font-mono font-bold text-cyan-300 text-xs border border-slate-700/60">
                          {item.nomorRumah}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-amber-400">
                        {formatRupiah(item.nominal)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.keterangan || <span className="text-slate-600 italic">-</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-edit-donasi-${item.id}`}
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Edit donasi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-donasi-${item.id}`}
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Hapus donasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isFormOpen && (
        <div 
          id="modal-donasi-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                {editingDonasi ? 'Edit Donasi' : 'Tambah Donasi Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              
              <div>
                <label htmlFor="input-tanggal-donasi" className="block text-slate-300 font-semibold mb-1">
                  Tanggal <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="input-tanggal-donasi"
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-nama-donatur" className="block text-slate-300 font-semibold mb-1">
                  Nama Donatur <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-nama-donatur"
                  type="text"
                  value={formNamaDonatur}
                  onChange={(e) => setFormNamaDonatur(e.target.value)}
                  placeholder="Contoh: Haji Supardi / Hamba Allah"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-rumah-donatur" className="block text-slate-300 font-semibold mb-1">
                  Nomor Rumah (Opsional)
                </label>
                <input
                  id="input-rumah-donatur"
                  type="text"
                  value={formNomorRumah}
                  onChange={(e) => setFormNomorRumah(e.target.value)}
                  placeholder="Contoh: 02"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="input-nominal-donasi" className="block text-slate-300 font-semibold mb-1">
                  Nominal (Rupiah) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-nominal-donasi"
                  type="number"
                  min="1"
                  step="1000"
                  value={formNominal}
                  onChange={(e) => setFormNominal(e.target.value)}
                  placeholder="Contoh: 250000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  required
                />
                {formNominal && !isNaN(Number(formNominal)) && Number(formNominal) > 0 && (
                  <div className="mt-1 text-[11px] text-amber-400 font-mono">
                    = {formatRupiah(Number(formNominal))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="input-keterangan-donasi" className="block text-slate-300 font-semibold mb-1">
                  Keterangan
                </label>
                <textarea
                  id="input-keterangan-donasi"
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Sedekah untuk perbaikan lampu gapura RT"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-donasi"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md transition-colors"
                >
                  {editingDonasi ? 'Simpan Perubahan' : 'Catat Donasi'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Hapus Data Donasi"
          message={`Apakah Anda yakin ingin menghapus donasi dari "${deleteTarget.namaDonatur}" sejumlah ${formatRupiah(deleteTarget.nominal)}?`}
          confirmText="Hapus"
          cancelText="Batal"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  );
};
