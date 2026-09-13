import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Warga, WargaStatus } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Home, 
  Download,
  AlertCircle
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { downloadCSV, formatTanggalIndonesia } from '../../utils/format';

export const DataWargaView: React.FC = () => {
  const { data, addWarga, updateWarga, deleteWarga } = useData();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | WargaStatus>('All');
  const [houseFilter, setHouseFilter] = useState<string>('All');

  // Modal form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarga, setEditingWarga] = useState<Warga | null>(null);
  
  // Form input fields
  const [formNomorRumah, setFormNomorRumah] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formStatus, setFormStatus] = useState<WargaStatus>('Aktif');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState('');

  // Duplicate prompt modal state
  const [dupPromptOpen, setDupPromptOpen] = useState(false);
  const [pendingWargaData, setPendingWargaData] = useState<Omit<Warga, 'id' | 'createdAt' | 'updatedAt'> | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Warga | null>(null);

  // House numbers list for filter
  const houseNumbers = useMemo(() => {
    const list = Array.from<string>(new Set(data.warga.map(w => w.nomorRumah.trim()))).filter(Boolean);
    return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [data.warga]);

  // Filtered & Searched Warga
  const filteredWarga = useMemo(() => {
    return data.warga.filter(w => {
      // Status filter
      if (statusFilter !== 'All' && w.status !== statusFilter) return false;

      // House filter
      if (houseFilter !== 'All' && w.nomorRumah.trim() !== houseFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNama = w.nama.toLowerCase().includes(query);
        const matchRumah = w.nomorRumah.toLowerCase().includes(query);
        const matchKet = (w.keterangan || '').toLowerCase().includes(query);
        if (!matchNama && !matchRumah && !matchKet) return false;
      }

      return true;
    });
  }, [data.warga, statusFilter, houseFilter, searchTerm]);

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingWarga(null);
    setFormNomorRumah('');
    setFormNama('');
    setFormStatus('Aktif');
    setFormKeterangan('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (warga: Warga) => {
    setEditingWarga(warga);
    setFormNomorRumah(warga.nomorRumah);
    setFormNama(warga.nama);
    setFormStatus(warga.status);
    setFormKeterangan(warga.keterangan || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Submit form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanNomor = formNomorRumah.trim();
    const cleanNama = formNama.trim();

    // Validation
    if (!cleanNomor) {
      setFormError('Nomor rumah wajib diisi!');
      return;
    }
    if (!cleanNama) {
      setFormError('Nama warga wajib diisi!');
      return;
    }

    if (editingWarga) {
      // Updating
      updateWarga(editingWarga.id, {
        nomorRumah: cleanNomor,
        nama: cleanNama,
        status: formStatus,
        keterangan: formKeterangan.trim(),
      });
      setIsFormOpen(false);
    } else {
      // Adding new: check duplicate
      const newPayload = {
        nomorRumah: cleanNomor,
        nama: cleanNama,
        status: formStatus,
        keterangan: formKeterangan.trim(),
      };

      const res = addWarga(newPayload, false);
      if (!res.success && res.isDuplicate) {
        // Trigger duplicate confirm modal
        setPendingWargaData(newPayload);
        setDupPromptOpen(true);
      } else {
        setIsFormOpen(false);
      }
    }
  };

  const handleForceAddDuplicate = () => {
    if (pendingWargaData) {
      addWarga(pendingWargaData, true);
      setPendingWargaData(null);
      setDupPromptOpen(false);
      setIsFormOpen(false);
    }
  };

  // Delete execution
  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteWarga(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Nomor Rumah', 'Nama Warga', 'Status', 'Keterangan', 'Tanggal Ditambahkan'];
    const rows = filteredWarga.map((w, index) => [
      index + 1,
      w.nomorRumah,
      w.nama,
      w.status,
      w.keterangan || '-',
      formatTanggalIndonesia(w.createdAt, 'short'),
    ]);
    downloadCSV(`Data_Warga_RT09_RW08_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div id="view-data-warga" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            DATA WARGA RT 09 RW 08
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total terdaftar: <span className="text-white font-semibold">{data.warga.length} warga</span> ({data.warga.filter(w => w.status === 'Aktif').length} aktif)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-warga-csv"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button
            id="btn-tambah-warga"
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Warga
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
        
        {/* Realtime Search Input */}
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-search-warga"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama warga, nomor rumah, keterangan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Status */}
        <div className="sm:col-span-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
          <Filter className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-slate-400 text-[11px]">Status:</span>
          <select
            id="filter-status-warga"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | WargaStatus)}
            className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">Semua Status</option>
            <option value="Aktif" className="bg-slate-900">Aktif</option>
            <option value="Tidak Aktif" className="bg-slate-900">Tidak Aktif</option>
          </select>
        </div>

        {/* Filter Nomor Rumah */}
        <div className="sm:col-span-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
          <Home className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="text-slate-400 text-[11px]">No. Rumah:</span>
          <select
            id="filter-rumah-warga"
            value={houseFilter}
            onChange={(e) => setHouseFilter(e.target.value)}
            className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">Semua No. Rumah</option>
            {houseNumbers.map(no => (
              <option key={no} value={no} className="bg-slate-900">
                No. {no}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table id="table-data-warga" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 w-28">Nomor Rumah</th>
                <th className="py-3.5 px-4">Nama Warga</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredWarga.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <span className="font-medium text-slate-300">Belum ada data warga</span>
                      <p className="text-[11px] text-slate-500">
                        {data.warga.length === 0 
                          ? 'Mulai masukkan data warga baru RT 09 dengan tombol di bawah.'
                          : 'Tidak ada data yang cocok dengan kriteria pencarian/filter.'}
                      </p>
                      {data.warga.length === 0 && (
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                        >
                          + Tambah Data
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWarga.map((warga, index) => {
                  const isAktif = warga.status === 'Aktif';
                  return (
                    <tr 
                      key={warga.id} 
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 font-mono font-bold text-cyan-300 border border-slate-700/60">
                          {warga.nomorRumah}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {warga.nama}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isAktif 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                        }`}>
                          {isAktif ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {warga.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {warga.keterangan ? warga.keterangan : <span className="text-slate-600 italic">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-edit-warga-${warga.id}`}
                            type="button"
                            onClick={() => handleOpenEdit(warga)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                            title="Edit data warga"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-warga-${warga.id}`}
                            type="button"
                            onClick={() => setDeleteTarget(warga)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Hapus data warga"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div 
          id="modal-form-warga-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {editingWarga ? 'Edit Data Warga' : 'Tambah Warga Baru'}
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

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nomor Rumah */}
                <div>
                  <label htmlFor="input-nomor-rumah" className="block text-slate-300 font-semibold mb-1">
                    Nomor Rumah <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-nomor-rumah"
                    type="text"
                    value={formNomorRumah}
                    onChange={(e) => setFormNomorRumah(e.target.value)}
                    placeholder="Contoh: 01, 02A, 15"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="select-status-warga" className="block text-slate-300 font-semibold mb-1">
                    Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="select-status-warga"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as WargaStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              {/* Nama Warga */}
              <div>
                <label htmlFor="input-nama-warga" className="block text-slate-300 font-semibold mb-1">
                  Nama Warga <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-nama-warga"
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Keterangan */}
              <div>
                <label htmlFor="input-keterangan-warga" className="block text-slate-300 font-semibold mb-1">
                  Keterangan (Opsional)
                </label>
                <textarea
                  id="input-keterangan-warga"
                  rows={3}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Kepala Keluarga, tinggal bersama istri dan 2 anak"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-warga"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md transition-colors"
                >
                  {editingWarga ? 'Simpan Perubahan' : 'Tambah Warga'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Duplicate Confirmation Modal */}
      {dupPromptOpen && pendingWargaData && (
        <ConfirmModal
          isOpen={dupPromptOpen}
          title="Data Warga Duplikat Terdeteksi"
          message={`Warga dengan Nomor Rumah "${pendingWargaData.nomorRumah}" dan Nama "${pendingWargaData.nama}" sudah terdaftar di sistem. Apakah Anda yakin ingin tetap menambahkannya?`}
          confirmText="Ya, Tetap Tambahkan"
          cancelText="Batal"
          isDestructive={false}
          onConfirm={handleForceAddDuplicate}
          onCancel={() => {
            setDupPromptOpen(false);
            setPendingWargaData(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Hapus Data Warga"
          message={`Apakah Anda yakin ingin menghapus "${deleteTarget.nama}" (Rumah No. ${deleteTarget.nomorRumah})? Catatan: Seluruh riwayat transaksi masa lalu tetap tersimpan di pembukuan.`}
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
