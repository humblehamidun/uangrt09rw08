import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PengeluaranDana, PengeluaranDanaKategori, SumberDanaPengeluaran, UserRole } from '../../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  Edit3, 
  Ban, 
  Download, 
  Printer, 
  Calendar, 
  ArrowDownRight, 
  AlertCircle, 
  Filter, 
  CheckCircle2, 
  X, 
  TrendingDown, 
  Coins, 
  CircleDollarSign, 
  Gift, 
  Building2,
  Wallet
} from 'lucide-react';
import { formatRupiah, formatTanggalIndonesia, downloadCSV, NAMA_BULAN } from '../../utils/format';
import { PrintReportHeader, PrintReportFooter, PrintJimpitanFooter, PrintPageStyle } from './PrintReportLayout';

export const DAFTAR_KATEGORI_UMUM: PengeluaranDanaKategori[] = [
  'Petugas Sampah',
  'Uang Meja',
  'Kegiatan RT',
  'Kebersihan',
  'Perawatan',
  'Administrasi',
  'Listrik',
  'Air',
  'Keamanan',
  'Sosial',
  'Lainnya',
];

interface FundExpenseSectionProps {
  fundType: 'iuran' | 'jimpitan' | 'donasi';
  title: string;
  selectedBulan: number;
  selectedTahun: number;
  totalUangMasuk: number;
}

export const FundExpenseSection: React.FC<FundExpenseSectionProps> = ({
  fundType,
  title,
  selectedBulan,
  selectedTahun,
  totalUangMasuk,
}) => {
  const { 
    data, 
    currentUser, 
    addPengeluaranDana, 
    updatePengeluaranDana, 
    cancelPengeluaranDana,
    logAudit,
    addToast
  } = useData();

  const userRole: UserRole = currentUser?.role || 'Admin';
  const canManage = userRole === 'Admin' || userRole === 'Bendahara';

  const today = new Date();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Aktif' | 'Dibatalkan'>('Aktif');
  const [kategoriFilter, setKategoriFilter] = useState<string>('All');
  const [periodeFilterMode, setPeriodeFilterMode] = useState<'bulan_ini' | 'tahun_ini' | 'semua'>('bulan_ini');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PengeluaranDana | null>(null);

  // Form fields
  const [formTanggal, setFormTanggal] = useState(today.toISOString().slice(0, 10));
  const [formKategori, setFormKategori] = useState<PengeluaranDanaKategori>(
    fundType === 'jimpitan' ? 'Kebersihan' : fundType === 'donasi' ? 'Sosial' : 'Petugas Sampah'
  );
  const [formNominal, setFormNominal] = useState('');
  const [formPenerima, setFormPenerima] = useState('');
  const [formPeriode, setFormPeriode] = useState(`${NAMA_BULAN[selectedBulan - 1]} ${selectedTahun}`);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formKeteranganPenggunaan, setFormKeteranganPenggunaan] = useState('');
  const [formError, setFormError] = useState('');

  // Cancel Modal
  const [cancellingRecord, setCancellingRecord] = useState<PengeluaranDana | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // All expenses belonging to this fund
  const allFundExpenses = useMemo(() => {
    return (data.pengeluaranDana || []).filter(p => {
      const src = p.sumberDana || 'iuran';
      return src === fundType;
    });
  }, [data.pengeluaranDana, fundType]);

  // Expenses for the selected month
  const expensesThisMonth = useMemo(() => {
    return allFundExpenses.filter(p => {
      if (p.status !== 'Aktif') return false;
      if (!p.tanggal) return false;
      const [y, m] = p.tanggal.split('-');
      return parseInt(y, 10) === selectedTahun && parseInt(m, 10) === selectedBulan;
    });
  }, [allFundExpenses, selectedTahun, selectedBulan]);

  // Total expenses calculations
  const totalKeluarBulanIni = useMemo(() => {
    return expensesThisMonth.reduce((sum, p) => sum + (p.nominal || 0), 0);
  }, [expensesThisMonth]);

  const totalKeluarTahunIni = useMemo(() => {
    return allFundExpenses
      .filter(p => p.status === 'Aktif' && p.tanggal && parseInt(p.tanggal.slice(0, 4), 10) === selectedTahun)
      .reduce((sum, p) => sum + (p.nominal || 0), 0);
  }, [allFundExpenses, selectedTahun]);

  const totalKeluarSemua = useMemo(() => {
    return allFundExpenses
      .filter(p => p.status === 'Aktif')
      .reduce((sum, p) => sum + (p.nominal || 0), 0);
  }, [allFundExpenses]);

  // Net Balance (Uang Masuk - Pengeluaran)
  const saldoBersihBulan = totalUangMasuk - totalKeluarBulanIni;

  // Filtered list for display
  const filteredExpenses = useMemo(() => {
    return allFundExpenses.filter(item => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (kategoriFilter !== 'All' && item.kategori !== kategoriFilter) return false;

      if (item.tanggal) {
        const [y, m] = item.tanggal.split('-');
        if (periodeFilterMode === 'bulan_ini') {
          if (parseInt(y, 10) !== selectedTahun || parseInt(m, 10) !== selectedBulan) return false;
        } else if (periodeFilterMode === 'tahun_ini') {
          if (parseInt(y, 10) !== selectedTahun) return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchBukti = (item.noBukti || '').toLowerCase().includes(q);
        const matchKat = (item.kategori || '').toLowerCase().includes(q);
        const matchPenerima = (item.penerima || '').toLowerCase().includes(q);
        const matchKet = (item.keterangan || '').toLowerCase().includes(q);
        const matchUraian = (item.keteranganPenggunaanDana || '').toLowerCase().includes(q);
        if (!matchBukti && !matchKat && !matchPenerima && !matchKet && !matchUraian) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [allFundExpenses, statusFilter, kategoriFilter, periodeFilterMode, selectedTahun, selectedBulan, searchTerm]);

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormTanggal(today.toISOString().slice(0, 10));
    setFormKategori(fundType === 'jimpitan' ? 'Kebersihan' : fundType === 'donasi' ? 'Sosial' : 'Petugas Sampah');
    setFormNominal('');
    setFormPenerima('');
    setFormPeriode(`${NAMA_BULAN[selectedBulan - 1]} ${selectedTahun}`);
    setFormKeterangan('');
    setFormKeteranganPenggunaan('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (rec: PengeluaranDana) => {
    setEditingRecord(rec);
    setFormTanggal(rec.tanggal);
    setFormKategori(rec.kategori as PengeluaranDanaKategori);
    setFormNominal(String(rec.nominal));
    setFormPenerima(rec.penerima);
    setFormPeriode(rec.periode || '');
    setFormKeterangan(rec.keterangan || '');
    setFormKeteranganPenggunaan(rec.keteranganPenggunaanDana || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle submit Add/Edit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedNominal = Number(formNominal.replace(/\D/g, ''));

    if (!formTanggal) {
      setFormError('Tanggal pengeluaran wajib diisi.');
      return;
    }
    if (!formKategori) {
      setFormError('Kategori pengeluaran wajib dipilih.');
      return;
    }
    if (!formPenerima.trim()) {
      setFormError('Nama penerima dana wajib diisi.');
      return;
    }
    if (!parsedNominal || parsedNominal <= 0) {
      setFormError('Nominal pengeluaran harus lebih besar dari Rp 0.');
      return;
    }
    if (formKategori === 'Lainnya' && !formKeteranganPenggunaan.trim()) {
      setFormError('Keterangan penggunaan dana wajib diisi untuk kategori Lainnya.');
      return;
    }

    if (editingRecord) {
      const res = updatePengeluaranDana(editingRecord.id, {
        tanggal: formTanggal,
        kategori: formKategori,
        sumberDana: fundType,
        nominal: parsedNominal,
        penerima: formPenerima.trim(),
        periode: formPeriode.trim() || undefined,
        keterangan: formKeterangan.trim() || undefined,
        keteranganPenggunaanDana: formKeteranganPenggunaan.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.message || 'Gagal memperbarui transaksi.');
        return;
      }
    } else {
      const res = addPengeluaranDana({
        tanggal: formTanggal,
        kategori: formKategori,
        sumberDana: fundType,
        nominal: parsedNominal,
        penerima: formPenerima.trim(),
        periode: formPeriode.trim() || undefined,
        keterangan: formKeterangan.trim() || undefined,
        keteranganPenggunaanDana: formKeteranganPenggunaan.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.message || 'Gagal menyimpan transaksi.');
        return;
      }
    }

    setIsFormOpen(false);
  };

  // Handle Cancel/Void
  const handleConfirmCancel = () => {
    if (!cancellingRecord) return;
    if (!cancelReason.trim()) {
      setCancelError('Alasan pembatalan wajib diisi.');
      return;
    }

    const res = cancelPengeluaranDana(cancellingRecord.id, cancelReason.trim());
    if (res.success) {
      setCancellingRecord(null);
      setCancelReason('');
      setCancelError('');
    } else {
      setCancelError(res.message || 'Gagal membatalkan transaksi.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const fileName = `Laporan_Pengeluaran_${title.replace(/\s+/g, '_')}_${NAMA_BULAN[selectedBulan - 1]}_${selectedTahun}.csv`;
    const headers = [
      'No',
      'Nomor Bukti',
      'Tanggal',
      'Sumber Dana',
      'Kategori',
      'Penerima',
      'Periode',
      'Keterangan Penggunaan',
      'Nominal (Rp)',
      'Petugas Pencatat',
      'Status',
      'Alasan Batal'
    ];

    const rows = filteredExpenses.map((r, index) => [
      index + 1,
      r.noBukti,
      r.tanggal,
      fundType === 'jimpitan' ? 'Jimpitan RT' : fundType === 'donasi' ? 'Donasi' : 'Iuran Warga',
      r.kategori,
      r.penerima,
      r.periode || '-',
      r.keteranganPenggunaanDana || r.keterangan || '-',
      r.nominal,
      r.createdBy || '-',
      r.status,
      r.cancelReason || '-'
    ]);

    downloadCSV(fileName, headers, rows);
    logAudit(`Export Pengeluaran ${title}`, `Mengekspor data pengeluaran ${title} ke CSV (${filteredExpenses.length} baris)`);
    addToast('File CSV pengeluaran berhasil diunduh.', 'success');
  };

  // Fund metadata
  const fundTheme = fundType === 'jimpitan' 
    ? {
        accentText: 'text-cyan-400',
        accentBg: 'bg-cyan-500/10',
        accentBorder: 'border-cyan-500/20',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        buttonBg: 'bg-cyan-600 hover:bg-cyan-500 text-white',
        icon: <CircleDollarSign className="w-5 h-5 text-cyan-400" />
      }
    : fundType === 'donasi'
    ? {
        accentText: 'text-amber-400',
        accentBg: 'bg-amber-500/10',
        accentBorder: 'border-amber-500/20',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white',
        icon: <Gift className="w-5 h-5 text-amber-400" />
      }
    : {
        accentText: 'text-emerald-400',
        accentBg: 'bg-emerald-500/10',
        accentBorder: 'border-emerald-500/20',
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        icon: <Coins className="w-5 h-5 text-emerald-400" />
      };

  return (
    <div className="space-y-6">
      <PrintPageStyle landscape={false} />

      {/* Printable Header */}
      <PrintReportHeader
        title={`PENGELUARAN DANA ${title.toUpperCase()}`}
        periode={`${NAMA_BULAN[selectedBulan - 1]} ${selectedTahun}`}
        subtitle={`Pengeluaran resmi yang dibiayai dari penerimaan ${title} RT 09 RW 08`}
      />

      {/* 1. TOP CARDS: UANG MASUK vs PENGELUARAN vs SISA SALDO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        {/* Card 1: Uang Masuk */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              UANG MASUK ({NAMA_BULAN[selectedBulan - 1].toUpperCase()})
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {formatRupiah(totalUangMasuk)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total penerimaan {title.toLowerCase()} warga bulan {NAMA_BULAN[selectedBulan - 1]}
          </p>
        </div>

        {/* Card 2: Total Pengeluaran */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              TOTAL PENGELUARAN
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-400">
            {formatRupiah(totalKeluarBulanIni)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Bulan ini: {expensesThisMonth.length} transaksi ({formatRupiah(totalKeluarBulanIni)})
          </p>
        </div>

        {/* Card 3: Sisa Saldo Bersih */}
        <div className={`p-4 rounded-2xl border shadow-sm relative overflow-hidden ${
          saldoBersihBulan >= 0 
            ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/30' 
            : 'bg-gradient-to-br from-rose-950/20 to-slate-950 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              SISA SALDO BERSIH
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              saldoBersihBulan >= 0 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {saldoBersihBulan >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${saldoBersihBulan >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
            {formatRupiah(saldoBersihBulan)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            = Uang Masuk dikurangi Pengeluaran ({title})
          </p>
        </div>
      </div>

      {/* 2. ACTION & FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 no-print">
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${fundTheme.buttonBg} font-semibold text-xs shadow-md transition-all cursor-pointer`}
            >
              <Plus className="w-4 h-4" />
              Catat Pengeluaran {title}
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            Cetak Laporan / PDF
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Periode Mode Filter */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPeriodeFilterMode('bulan_ini')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              periodeFilterMode === 'bulan_ini' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Bulan {NAMA_BULAN[selectedBulan - 1]}
          </button>
          <button
            type="button"
            onClick={() => setPeriodeFilterMode('tahun_ini')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              periodeFilterMode === 'tahun_ini' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tahun {selectedTahun}
          </button>
          <button
            type="button"
            onClick={() => setPeriodeFilterMode('semua')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              periodeFilterMode === 'semua' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* 3. TABLE OF EXPENSES */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
        {/* Search & Sub Filters */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={`Cari bukti, penerima, keterangan pengeluaran ${title}...`}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status:</span>
            {(['All', 'Aktif', 'Dibatalkan'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  statusFilter === st ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {st === 'All' ? 'Semua' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table Element */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 print:text-black">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">No. Bukti</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Penerima</th>
                <th className="py-3 px-3">Uraian / Penggunaan</th>
                <th className="py-3 px-3 text-right">Nominal</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center w-24 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-black">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-slate-400">Belum ada catatan pengeluaran dari {title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Klik tombol "Catat Pengeluaran {title}" untuk menambah transaksi pengeluaran.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item, idx) => {
                  const isCancelled = item.status === 'Dibatalkan';
                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isCancelled ? 'bg-rose-950/10 text-slate-500 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400 print:text-black">{idx + 1}</td>
                      <td className="py-3 px-3 whitespace-nowrap text-white font-medium print:text-black">
                        {formatTanggalIndonesia(item.tanggal)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-cyan-400 print:text-black">
                        {item.noBukti}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 print:bg-transparent print:border-none print:text-black">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200 print:text-black">
                        {item.penerima}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-300 print:text-black">
                        {item.keteranganPenggunaanDana || item.keterangan || '-'}
                        {item.periode && (
                          <span className="text-[10px] text-slate-500 block">Periode: {item.periode}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400 whitespace-nowrap print:text-black">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Batal
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center gap-1">
                          {canManage && !isCancelled && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                                title="Edit Pengeluaran"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingRecord(item);
                                  setCancelReason('');
                                  setCancelError('');
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400"
                                title="Batalkan Transaksi"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-950 font-bold border-t border-slate-800 text-slate-200 print:text-black print:border-t-2 print:border-black">
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider">
                    Total Pengeluaran Aktif:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-400 print:text-black font-extrabold">
                    {formatRupiah(filteredExpenses.filter(p => p.status === 'Aktif').reduce((sum, p) => sum + p.nominal, 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Printable Footer */}
        {fundType === 'jimpitan' ? (
          <PrintJimpitanFooter
            koordinatorNama={data.settings.koordinatorJimpitanNama || 'Budi Santoso'}
            koordinatorJabatan={data.settings.koordinatorJimpitanJabatan || 'KOORDINATOR JIMPITAN'}
            lokasi="Semarang"
          />
        ) : (
          <PrintReportFooter
            ketuaRT={data.settings.ketuaRT || 'H. Sugiyanto, S.E.'}
            bendahara={data.settings.bendahara || 'Bambang Pamungkas, S.Kom.'}
            lokasi="Semarang"
          />
        )}
      </div>

      {/* 4. MODAL CATAT / EDIT PENGELUARAN */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingRecord ? `Edit Pengeluaran ${title}` : `Catat Pengeluaran dari ${title}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Informative fund banner */}
              <div className={`p-3 rounded-xl ${fundTheme.accentBg} border ${fundTheme.accentBorder} flex items-center gap-2`}>
                <div className="shrink-0">{fundTheme.icon}</div>
                <div className="text-[11px] text-slate-300">
                  Pengeluaran ini akan memotong <strong>Uang Masuk {title}</strong> dan otomatis tercatat di <strong>Menu Pengeluaran Dana & Buku Kas RT</strong>.
                </div>
              </div>

              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Tanggal Pengeluaran <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={e => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Kategori Pengeluaran <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={e => setFormKategori(e.target.value as PengeluaranDanaKategori)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {DAFTAR_KATEGORI_UMUM.map(kat => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Penerima Dana & Periode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Penerima Dana <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPenerima}
                    onChange={e => setFormPenerima(e.target.value)}
                    placeholder="Contoh: Petugas Ronda / Toko Listrik"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Periode (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formPeriode}
                    onChange={e => setFormPeriode(e.target.value)}
                    placeholder="Contoh: September 2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nominal Pengeluaran (Rp) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    required
                    value={formNominal ? Number(formNominal.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setFormNominal(digits);
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                {formNominal && Number(formNominal) > 0 && (
                  <p className="text-[11px] text-cyan-400 mt-1 font-mono">
                    {formatRupiah(Number(formNominal))}
                  </p>
                )}
              </div>

              {/* Keterangan Penggunaan Dana */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Keterangan Penggunaan Dana {formKategori === 'Lainnya' ? (
                    <span className="text-rose-400 font-bold">(Wajib jika Lainnya *)</span>
                  ) : (
                    <span className="text-slate-500">(Uraian pencatatan buku kas)</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={formKeteranganPenggunaan}
                  onChange={e => setFormKeteranganPenggunaan(e.target.value)}
                  placeholder="Contoh: Pembelian kantong plastik dan snack ronda jimpitan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl ${fundTheme.buttonBg} font-semibold text-xs shadow-md`}
                >
                  {editingRecord ? 'Simpan Perubahan' : 'Catat Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL CANCEL / VOID */}
      {cancellingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Batalkan Transaksi Pengeluaran
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              Anda akan membatalkan pengeluaran <strong>{cancellingRecord.noBukti}</strong> ({cancellingRecord.kategori}) sebesar <strong>{formatRupiah(cancellingRecord.nominal)}</strong>.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">
                Alasan Pembatalan <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Contoh: Salah input nominal / transaksi dibatalkan"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancellingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Konfirmasi Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
