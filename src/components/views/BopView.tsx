import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BopRecord, BopJenis } from '../../types';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Download, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle,
  AlertCircle,
  Wallet,
  Filter
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatRupiah, formatTanggalIndonesia, downloadCSV } from '../../utils/format';

const KATEGORI_PEMASUKAN = ['Bantuan', 'Sumbangan', 'Pengembalian', 'Lainnya'];
const KATEGORI_PENGELUARAN = [
  'ATK',
  'Kebersihan',
  'Listrik',
  'Air',
  'Perawatan',
  'Kegiatan RT',
  'Konsumsi',
  'Administrasi',
  'Lainnya',
];

export const BopView: React.FC = () => {
  const { data, addBop, updateBop, deleteBop } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [jenisFilter, setJenisFilter] = useState<'All' | BopJenis>('All');
  const [kategoriFilter, setKategoriFilter] = useState<string>('All');

  // Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BopRecord | null>(null);

  // Form fields
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formJenis, setFormJenis] = useState<BopJenis>('Pengeluaran');
  const [formKategori, setFormKategori] = useState('ATK');
  const [formUraian, setFormUraian] = useState('');
  const [formNominal, setFormNominal] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<BopRecord | null>(null);

  // Filtered list
  const filteredBop = useMemo(() => {
    return data.bop.filter(b => {
      if (jenisFilter !== 'All' && b.jenis !== jenisFilter) return false;
      if (kategoriFilter !== 'All' && b.kategori !== kategoriFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchUraian = b.uraian.toLowerCase().includes(q);
        const matchKat = b.kategori.toLowerCase().includes(q);
        const matchKet = (b.keterangan || '').toLowerCase().includes(q);
        if (!matchUraian && !matchKat && !matchKet) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [data.bop, jenisFilter, kategoriFilter, searchTerm]);

  // BOP Calculations (All filtered or total)
  const stats = useMemo(() => {
    const totalPemasukan = data.bop
      .filter(b => b.jenis === 'Pemasukan')
      .reduce((sum, b) => sum + (b.nominal || 0), 0);

    const totalPengeluaran = data.bop
      .filter(b => b.jenis === 'Pengeluaran')
      .reduce((sum, b) => sum + (b.nominal || 0), 0);

    const saldoBop = totalPemasukan - totalPengeluaran;

    return {
      totalPemasukan,
      totalPengeluaran,
      saldoBop,
      isDefisit: saldoBop < 0,
    };
  }, [data.bop]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormTanggal(new Date().toISOString().slice(0, 10));
    setFormJenis('Pengeluaran');
    setFormKategori('ATK');
    setFormUraian('');
    setFormNominal('');
    setFormKeterangan('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rec: BopRecord) => {
    setEditingRecord(rec);
    setFormTanggal(rec.tanggal);
    setFormJenis(rec.jenis);
    setFormKategori(rec.kategori);
    setFormUraian(rec.uraian);
    setFormNominal(String(rec.nominal));
    setFormKeterangan(rec.keterangan || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleJenisChange = (newJenis: BopJenis) => {
    setFormJenis(newJenis);
    if (newJenis === 'Pemasukan') {
      setFormKategori(KATEGORI_PEMASUKAN[0]);
    } else {
      setFormKategori(KATEGORI_PENGELUARAN[0]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUraian = formUraian.trim();
    const parsedNominal = Number(formNominal);

    if (!formTanggal) {
      setFormError('Tanggal transaksi wajib diisi!');
      return;
    }
    if (!cleanUraian) {
      setFormError('Uraian transaksi wajib diisi!');
      return;
    }
    if (!formNominal || isNaN(parsedNominal) || parsedNominal <= 0) {
      setFormError('Nominal transaksi harus lebih besar dari 0!');
      return;
    }

    if (editingRecord) {
      updateBop(editingRecord.id, {
        tanggal: formTanggal,
        jenis: formJenis,
        kategori: formKategori,
        uraian: cleanUraian,
        nominal: parsedNominal,
        keterangan: formKeterangan.trim(),
      });
    } else {
      addBop({
        tanggal: formTanggal,
        jenis: formJenis,
        kategori: formKategori,
        uraian: cleanUraian,
        nominal: parsedNominal,
        keterangan: formKeterangan.trim(),
      });
    }

    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteBop(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Tanggal', 'Jenis', 'Kategori', 'Uraian', 'Nominal', 'Keterangan'];
    const rows = filteredBop.map((b, idx) => [
      idx + 1,
      formatTanggalIndonesia(b.tanggal, 'short'),
      b.jenis,
      b.kategori,
      b.uraian,
      formatRupiah(b.nominal),
      b.keterangan || '-'
    ]);

    rows.push(['', '', 'TOTAL PEMASUKAN BOP', '', '', formatRupiah(stats.totalPemasukan), '']);
    rows.push(['', '', 'TOTAL PENGELUARAN BOP', '', '', formatRupiah(stats.totalPengeluaran), '']);
    rows.push(['', '', 'SALDO BOP', '', '', formatRupiah(stats.saldoBop), '']);

    downloadCSV(`Laporan_BOP_RT09_RW08_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div id="view-bop" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              BIAYA OPERASIONAL PENGURUS (BOP)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan arus kas operasional, belanja RT, dan bantuan dinas RT 09 RW 08
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-bop-csv"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>
          <button
            id="btn-tambah-bop"
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Section 15: PERHITUNGAN BOP (3 Cards + Defisit Warning) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Pemasukan BOP */}
        <div id="card-bop-pemasukan" className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pemasukan BOP</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-400">
            {formatRupiah(stats.totalPemasukan)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bantuan & sumbangan luar</div>
        </div>

        {/* Total Pengeluaran BOP */}
        <div id="card-bop-pengeluaran" className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pengeluaran BOP</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-400">
            {formatRupiah(stats.totalPengeluaran)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Belanja ATK, kebersihan, listrik, dll</div>
        </div>

        {/* Saldo BOP */}
        <div id="card-bop-saldo" className={`p-4 rounded-2xl border ${
          stats.isDefisit 
            ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20' 
            : 'bg-slate-900/70 border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Saldo BOP</span>
            <div className={`p-2 rounded-xl ${stats.isDefisit ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-extrabold font-mono ${stats.isDefisit ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatRupiah(stats.saldoBop)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.isDefisit ? 'Kekurangan dana' : 'Surplus dana operasional'}
          </div>
        </div>

      </div>

      {/* Warning Defisit per requirement 15 */}
      {stats.isDefisit && (
        <div id="alert-saldo-bop-defisit" className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 text-rose-200 flex items-center gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Saldo BOP Defisit</h4>
            <p className="text-xs text-rose-200/90 mt-0.5">
              Total pengeluaran operasional melebihi total pemasukan BOP sebesar {formatRupiah(Math.abs(stats.saldoBop))}. Diperlukan subsidi dari kas utama RT.
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-search-bop"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari uraian transaksi, kategori, atau nota..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
          <Filter className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-slate-400 text-[11px]">Jenis:</span>
          <select
            id="filter-jenis-bop"
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value as any)}
            className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">Semua Jenis</option>
            <option value="Pemasukan" className="bg-slate-900">Pemasukan</option>
            <option value="Pengeluaran" className="bg-slate-900">Pengeluaran</option>
          </select>
        </div>

        <div className="sm:col-span-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
          <span className="text-slate-400 text-[11px]">Kategori:</span>
          <select
            id="filter-kategori-bop"
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">Semua Kategori</option>
            {[...KATEGORI_PEMASUKAN, ...KATEGORI_PENGELUARAN].map(k => (
              <option key={k} value={k} className="bg-slate-900">{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table id="table-bop" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 w-28">Tanggal</th>
                <th className="py-3.5 px-4 w-28 text-center">Jenis</th>
                <th className="py-3.5 px-4 w-32">Kategori</th>
                <th className="py-3.5 px-4">Uraian</th>
                <th className="py-3.5 px-4 w-32 text-right">Nominal</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredBop.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Briefcase className="w-8 h-8 text-slate-600" />
                      <span className="font-medium text-slate-300">Belum ada transaksi BOP</span>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                      >
                        + Tambah Transaksi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBop.map((item, idx) => {
                  const isMasuk = item.jenis === 'Pemasukan';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {formatTanggalIndonesia(item.tanggal, 'short')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isMasuk 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                        }`}>
                          {isMasuk ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {item.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-medium text-[11px] border border-slate-700/60">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {item.uraian}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${
                          isMasuk ? 'text-indigo-400' : 'text-rose-400'
                        }`}>
                          {isMasuk ? '+' : '-'}{formatRupiah(item.nominal)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {item.keterangan || <span className="text-slate-600 italic">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-edit-bop-${item.id}`}
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Edit transaksi"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-bop-${item.id}`}
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Hapus transaksi"
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
          id="modal-bop-overlay" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                {editingRecord ? 'Edit Transaksi BOP' : 'Tambah Transaksi BOP'}
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tanggal */}
                <div>
                  <label htmlFor="input-tanggal-bop" className="block text-slate-300 font-semibold mb-1">
                    Tanggal <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-tanggal-bop"
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Jenis Transaksi */}
                <div>
                  <label htmlFor="select-jenis-bop" className="block text-slate-300 font-semibold mb-1">
                    Jenis Transaksi <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="select-jenis-bop"
                    value={formJenis}
                    onChange={(e) => handleJenisChange(e.target.value as BopJenis)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Pengeluaran">Pengeluaran (Biaya Operasional)</option>
                    <option value="Pemasukan">Pemasukan (Bantuan / Subsidi)</option>
                  </select>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label htmlFor="select-kategori-bop" className="block text-slate-300 font-semibold mb-1">
                  Kategori <span className="text-rose-400">*</span>
                </label>
                <select
                  id="select-kategori-bop"
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {(formJenis === 'Pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Uraian */}
              <div>
                <label htmlFor="input-uraian-bop" className="block text-slate-300 font-semibold mb-1">
                  Uraian Transaksi <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-uraian-bop"
                  type="text"
                  value={formUraian}
                  onChange={(e) => setFormUraian(e.target.value)}
                  placeholder="Contoh: Pembelian lampu penerangan jalan gang 2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Nominal */}
              <div>
                <label htmlFor="input-nominal-bop" className="block text-slate-300 font-semibold mb-1">
                  Nominal (Rupiah) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-nominal-bop"
                  type="number"
                  min="1"
                  step="1000"
                  value={formNominal}
                  onChange={(e) => setFormNominal(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
                {formNominal && !isNaN(Number(formNominal)) && Number(formNominal) > 0 && (
                  <div className="mt-1 text-[11px] text-indigo-400 font-mono">
                    = {formatRupiah(Number(formNominal))}
                  </div>
                )}
              </div>

              {/* Keterangan */}
              <div>
                <label htmlFor="input-keterangan-bop" className="block text-slate-300 font-semibold mb-1">
                  Keterangan / Nomor Nota
                </label>
                <textarea
                  id="input-keterangan-bop"
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Toko Listrik Terang Abadi, No. Nota: 4819"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
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
                  id="btn-submit-bop"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md transition-colors"
                >
                  {editingRecord ? 'Simpan Perubahan' : 'Catat Transaksi'}
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
          title="Hapus Transaksi BOP"
          message={`Apakah Anda yakin ingin menghapus transaksi "${deleteTarget.uraian}" (${formatRupiah(deleteTarget.nominal)})?`}
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
