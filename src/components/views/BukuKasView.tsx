import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { BukuKasRecord, NavigationTab, SaldoAwalRecord, UserRole } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  ExternalLink, 
  Filter, 
  Calendar, 
  Info, 
  X, 
  FileText,
  ShieldCheck,
  Ban,
  Trash2,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { formatRupiah, formatTanggalIndonesia, downloadCSV } from '../../utils/format';
import { reconcileBukuKas } from '../../utils/bukuKasHelper';

interface BukuKasViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const BukuKasView: React.FC<BukuKasViewProps> = ({ onNavigate }) => {
  const { 
    data, 
    currentUser, 
    addSaldoAwal, 
    updateSaldoAwal, 
    deleteSaldoAwal, 
    recalculateBukuKasBalances, 
    repairAndRebuildBukuKas, 
    resolveDuplicates, 
    cancelBukuKasItem 
  } = useData();

  const userRole: UserRole = currentUser?.role || 'Admin';
  const canManage = userRole === 'Admin' || userRole === 'Bendahara';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'saldo_awal' | 'iuran' | 'jimpitan' | 'donasi' | 'bop'>('All');
  const [jenisFilter, setJenisFilter] = useState<'All' | 'pemasukan' | 'pengeluaran'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Aktif' | 'Dibatalkan'>('All');
  const [selectedTahun, setSelectedTahun] = useState<string>('All');
  const [selectedBulan, setSelectedBulan] = useState<string>('All');

  // Modals
  const [isSaldoAwalModalOpen, setIsSaldoAwalModalOpen] = useState(false);
  const [editingSaldoAwal, setEditingSaldoAwal] = useState<SaldoAwalRecord | null>(null);
  const [saldoNominal, setSaldoNominal] = useState('');
  const [saldoTanggal, setSaldoTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [saldoKeterangan, setSaldoKeterangan] = useState('Saldo Awal Kas RT');
  const [saldoError, setSaldoError] = useState('');

  const [detailItem, setDetailItem] = useState<BukuKasRecord | null>(null);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [cancellingItem, setCancellingItem] = useState<BukuKasRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Extract available years from records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    data.bukuKas.forEach(b => {
      if (b.tanggal) {
        yearsSet.add(b.tanggal.slice(0, 4));
      }
    });
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [data.bukuKas]);

  // Filtered Buku Kas records
  const filteredRecords = useMemo(() => {
    return data.bukuKas.filter(record => {
      // Source filter
      if (sourceFilter !== 'All' && record.sourceType !== sourceFilter) return false;

      // Type filter (pemasukan vs pengeluaran)
      if (jenisFilter === 'pemasukan' && record.pemasukan <= 0) return false;
      if (jenisFilter === 'pengeluaran' && record.pengeluaran <= 0) return false;

      // Status filter
      if (statusFilter !== 'All' && record.status !== statusFilter) return false;

      // Date year / month filter
      if (record.tanggal) {
        const [recYear, recMonth] = record.tanggal.split('-');
        if (selectedTahun !== 'All' && recYear !== selectedTahun) return false;
        if (selectedBulan !== 'All' && String(parseInt(recMonth, 10)) !== selectedBulan) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchBukti = record.noBukti.toLowerCase().includes(q);
        const matchUraian = record.uraian.toLowerCase().includes(q);
        const matchKat = record.kategori.toLowerCase().includes(q);
        const matchPetugas = (record.petugas || '').toLowerCase().includes(q);
        const matchKet = (record.keterangan || '').toLowerCase().includes(q);
        if (!matchBukti && !matchUraian && !matchKat && !matchPetugas && !matchKet) return false;
      }

      return true;
    });
  }, [data.bukuKas, sourceFilter, jenisFilter, statusFilter, selectedTahun, selectedBulan, searchTerm]);

  // Overall Reconciliation & KPI Calculations
  const reconReport = useMemo(() => {
    return reconcileBukuKas(data);
  }, [data]);

  // Check if any negative balance occurs in active records
  const hasNegativeBalance = useMemo(() => {
    return data.bukuKas.some(b => b.status === 'Aktif' && b.saldo < 0);
  }, [data.bukuKas]);

  // Open Saldo Awal modal
  const handleOpenAddSaldoAwal = () => {
    setEditingSaldoAwal(null);
    setSaldoNominal('');
    setSaldoTanggal(new Date().toISOString().slice(0, 10));
    setSaldoKeterangan('Saldo Awal Kas RT');
    setSaldoError('');
    setIsSaldoAwalModalOpen(true);
  };

  const handleOpenEditSaldoAwal = (s: SaldoAwalRecord) => {
    setEditingSaldoAwal(s);
    setSaldoNominal(s.nominal.toString());
    setSaldoTanggal(s.tanggal);
    setSaldoKeterangan(s.keterangan || 'Saldo Awal Kas RT');
    setSaldoError('');
    setIsSaldoAwalModalOpen(true);
  };

  const handleSubmitSaldoAwal = (e: React.FormEvent) => {
    e.preventDefault();
    const nominalNum = parseFloat(saldoNominal.replace(/[^0-9]/g, ''));
    if (isNaN(nominalNum) || nominalNum <= 0) {
      setSaldoError('Nominal saldo awal harus lebih dari 0.');
      return;
    }
    if (!saldoTanggal) {
      setSaldoError('Tanggal harus diisi.');
      return;
    }

    if (editingSaldoAwal) {
      updateSaldoAwal(editingSaldoAwal.id, {
        nominal: nominalNum,
        tanggal: saldoTanggal,
        keterangan: saldoKeterangan,
      });
    } else {
      addSaldoAwal({
        tanggal: saldoTanggal,
        nominal: nominalNum,
        keterangan: saldoKeterangan,
        tahun: parseInt(saldoTanggal.slice(0, 4), 10),
      });
    }

    setIsSaldoAwalModalOpen(false);
  };

  // Submit manual cancellation
  const handleConfirmCancelItem = () => {
    if (!cancellingItem) return;
    cancelBukuKasItem(cancellingItem.id, cancelReason || 'Dibatalkan oleh pengurus RT');
    setCancellingItem(null);
    setCancelReason('');
    if (detailItem?.id === cancellingItem.id) {
      setDetailItem(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No Bukti',
      'Tanggal',
      'Sumber',
      'Kategori',
      'Uraian',
      'Pemasukan (Rp)',
      'Pengeluaran (Rp)',
      'Saldo Berjalan (Rp)',
      'Status',
      'Petugas',
      'Keterangan',
    ];

    const rows = filteredRecords.map(r => [
      r.noBukti,
      r.tanggal,
      r.sourceType.toUpperCase(),
      r.kategori,
      r.uraian,
      r.pemasukan,
      r.pengeluaran,
      r.saldo,
      r.status,
      r.petugas || '',
      r.keterangan || '',
    ]);

    downloadCSV(`buku-kas-rt09-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Print ledger
  const handlePrint = () => {
    window.print();
  };

  // Quick navigation to source module
  const navigateToSource = (sourceType: BukuKasRecord['sourceType']) => {
    if (!onNavigate) return;
    switch (sourceType) {
      case 'iuran':
        onNavigate('iuran');
        break;
      case 'jimpitan':
        onNavigate('jimpitan');
        break;
      case 'donasi':
        onNavigate('donasi');
        break;
      case 'bop':
        onNavigate('bop');
        break;
      default:
        break;
    }
  };

  const getSourceBadge = (sourceType: BukuKasRecord['sourceType']) => {
    switch (sourceType) {
      case 'iuran':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Iuran Warga</span>;
      case 'jimpitan':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">Jimpitan</span>;
      case 'donasi':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Donasi</span>;
      case 'bop':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">BOP Operasional</span>;
      case 'saldo_awal':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Saldo Awal</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-300">Lainnya</span>;
    }
  };

  return (
    <div id="buku-kas-container" className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📒</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Buku Kas Otomatis RT 09 RW 08</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Buku besar pusat pencatatan seluruh arus kas terintegrasi dari Iuran, Jimpitan, Donasi, BOP, dan Saldo Awal.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              id="btn-add-saldo-awal"
              type="button"
              onClick={handleOpenAddSaldoAwal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Input Saldo Awal</span>
            </button>
          )}

          <button
            id="btn-open-reconcile-modal"
            type="button"
            onClick={() => setIsReconcileModalOpen(true)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors flex items-center gap-2 ${
              reconReport.isMatched
                ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Rekonsiliasi Kas {reconReport.isMatched ? '✓' : '⚠️'}</span>
          </button>

          <button
            id="btn-recalculate-balances"
            type="button"
            onClick={recalculateBukuKasBalances}
            title="Hitung ulang seluruh saldo berjalan Buku Kas dari urutan kronologis"
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Hitung Saldo</span>
          </button>

          <button
            id="btn-print-buku-kas"
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          <button
            id="btn-export-csv-buku-kas"
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium rounded-lg border border-slate-700/80 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4 text-black">
        <h2 className="text-xl font-bold uppercase tracking-wider">BUKU KAS UMUM RT 09 RW 08</h2>
        <p className="text-sm">Kelurahan Bangetayu Wetan, Kecamatan Genuk, Kota Semarang</p>
        <p className="text-xs text-gray-600 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
      </div>

      {/* Negative Balance Alert */}
      {hasNegativeBalance && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex items-start gap-3 no-print">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold text-rose-300">Peringatan: Saldo Berjalan Defisit / Negatif</h4>
            <p className="text-rose-200/80 text-xs mt-0.5">
              Terdapat titik transaksi di mana pengeluaran melebihi total kas yang tersedia saat itu. Periksa tanggal pencatatan pengeluaran atau pastikan Saldo Awal kas telah dimasukkan dengan benar.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Total Pemasukan */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pemasukan Kas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">
              {formatRupiah(reconReport.totalPemasukan)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dari Iuran, Jimpitan, Donasi, BOP Masuk & Saldo Awal
            </p>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pengeluaran Kas</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-rose-400">
              {formatRupiah(reconReport.totalPengeluaran)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Seluruh belanja dan pengeluaran operasional RT
            </p>
          </div>
        </div>

        {/* Saldo Akhir */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saldo Akhir Kas RT</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xl sm:text-2xl font-bold ${reconReport.saldoAkhir >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {formatRupiah(reconReport.saldoAkhir)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Kas Riil = Pemasukan - Pengeluaran
            </p>
          </div>
        </div>

        {/* Integritas Rekonsiliasi */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Status Rekonsiliasi</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reconReport.isMatched ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${reconReport.isMatched ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={`text-base font-bold ${reconReport.isMatched ? 'text-emerald-400' : 'text-amber-400'}`}>
                {reconReport.isMatched ? 'Sinkron 100% Sesuai' : 'Perlu Sinkronisasi'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {reconReport.activeCount} transaksi aktif • {reconReport.cancelledCount} dibatalkan
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 space-y-3 no-print">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-buku-kas"
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari No Bukti, Uraian, Petugas, Catatan..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Clear Filters */}
          {(sourceFilter !== 'All' || jenisFilter !== 'All' || statusFilter !== 'All' || selectedTahun !== 'All' || selectedBulan !== 'All' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSourceFilter('All');
                setJenisFilter('All');
                setStatusFilter('All');
                setSelectedTahun('All');
                setSelectedBulan('All');
                setSearchTerm('');
              }}
              className="text-xs text-emerald-400 hover:underline px-2 py-1 flex items-center gap-1 shrink-0"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Sumber Modul */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sumber Data</label>
            <select
              id="filter-buku-kas-sumber"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Semua Sumber</option>
              <option value="saldo_awal">Saldo Awal</option>
              <option value="iuran">Iuran Warga</option>
              <option value="jimpitan">Jimpitan</option>
              <option value="donasi">Donasi</option>
              <option value="bop">BOP Operasional</option>
            </select>
          </div>

          {/* Jenis Transaksi */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Jenis Kas</label>
            <select
              id="filter-buku-kas-jenis"
              value={jenisFilter}
              onChange={e => setJenisFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Pemasukan & Pengeluaran</option>
              <option value="pemasukan">Hanya Pemasukan (+)</option>
              <option value="pengeluaran">Hanya Pengeluaran (-)</option>
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tahun</label>
            <select
              id="filter-buku-kas-tahun"
              value={selectedTahun}
              onChange={e => setSelectedTahun(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Semua Tahun</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>

          {/* Bulan */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Bulan</label>
            <select
              id="filter-buku-kas-bulan"
              value={selectedBulan}
              onChange={e => setSelectedBulan(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Semua Bulan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          {/* Status Transaksi */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status Data</label>
            <select
              id="filter-buku-kas-status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">Semua Status</option>
              <option value="Aktif">Aktif Saja</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Saldo Awal List (if any exist) */}
      {data.saldoAwal && data.saldoAwal.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Catatan Saldo Awal Kas</h3>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddSaldoAwal}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Saldo Awal
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.saldoAwal.map(sa => (
              <div key={sa.id} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">{formatTanggalIndonesia(sa.tanggal)}</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatRupiah(sa.nominal)}</div>
                  <div className="text-xs text-slate-400 truncate max-w-[180px]">{sa.keterangan || 'Saldo Awal'}</div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSaldoAwal(sa)}
                      title="Edit Saldo Awal"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 rounded transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Hapus pencatatan saldo awal ini?')) {
                          deleteSaldoAwal(sa.id);
                        }
                      }}
                      title="Hapus Saldo Awal"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Cash Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">
              Daftar Arus Transaksi Buku Kas
            </h3>
            <span className="text-xs text-slate-400">
              ({filteredRecords.length} transaksi ditampilkan)
            </span>
          </div>

          <div className="text-xs text-slate-400 italic">
            * Klik baris transaksi untuk melihat rincian lengkap
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-28">Tanggal</th>
                <th className="py-3 px-3 w-36">No. Bukti</th>
                <th className="py-3 px-3 w-32">Sumber Data</th>
                <th className="py-3 px-3 min-w-[200px]">Uraian Transaksi</th>
                <th className="py-3 px-3 text-right text-emerald-400 w-32">Pemasukan</th>
                <th className="py-3 px-3 text-right text-rose-400 w-32">Pengeluaran</th>
                <th className="py-3 px-3 text-right text-cyan-400 w-36">Saldo Berjalan</th>
                <th className="py-3 px-3 text-center w-24">Status</th>
                <th className="py-3 px-3 text-center w-16 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="font-medium text-slate-400">Tidak ada transaksi yang cocok dengan kriteria filter.</p>
                      <p className="text-xs text-slate-500 mt-1">Gunakan tombol reset filter untuk melihat seluruh transaksi.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const isCancelled = record.status === 'Dibatalkan';
                  return (
                    <tr
                      key={record.id}
                      onClick={() => setDetailItem(record)}
                      className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isCancelled ? 'bg-rose-950/10 opacity-60 text-slate-500' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Tanggal */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-300 font-medium">
                        {record.tanggal ? formatTanggalIndonesia(record.tanggal) : '-'}
                      </td>

                      {/* No Bukti */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {record.noBukti}
                        </span>
                      </td>

                      {/* Sumber */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getSourceBadge(record.sourceType)}
                      </td>

                      {/* Uraian */}
                      <td className="py-3 px-3">
                        <div className={`font-medium text-slate-200 ${isCancelled ? 'line-through' : ''}`}>
                          {record.uraian}
                        </div>
                        {record.keterangan && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
                            {record.keterangan}
                          </div>
                        )}
                        {isCancelled && record.cancelReason && (
                          <div className="text-[11px] text-rose-400 mt-0.5 italic">
                            Batal: {record.cancelReason}
                          </div>
                        )}
                      </td>

                      {/* Pemasukan */}
                      <td className="py-3 px-3 text-right font-medium text-emerald-400 whitespace-nowrap">
                        {record.pemasukan > 0 ? formatRupiah(record.pemasukan) : '-'}
                      </td>

                      {/* Pengeluaran */}
                      <td className="py-3 px-3 text-right font-medium text-rose-400 whitespace-nowrap">
                        {record.pengeluaran > 0 ? formatRupiah(record.pengeluaran) : '-'}
                      </td>

                      {/* Saldo Berjalan */}
                      <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                        <span className={record.saldo < 0 ? 'text-rose-400' : 'text-cyan-400'}>
                          {formatRupiah(record.saldo)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-center no-print whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailItem(record)}
                            title="Rincian Transaksi"
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          >
                            <Info className="w-4 h-4" />
                          </button>

                          {record.sourceType !== 'saldo_awal' && onNavigate && (
                            <button
                              type="button"
                              onClick={() => navigateToSource(record.sourceType)}
                              title={`Buka modul ${record.sourceType}`}
                              className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="bg-slate-950/90 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Menampilkan <strong className="text-white">{filteredRecords.length}</strong> dari <strong className="text-white">{data.bukuKas.length}</strong> total baris kas.
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Pemasukan: <strong className="text-emerald-400">{formatRupiah(filteredRecords.reduce((s, r) => s + (r.status === 'Aktif' ? r.pemasukan : 0), 0))}</strong></span>
            <span>Pengeluaran: <strong className="text-rose-400">{formatRupiah(filteredRecords.reduce((s, r) => s + (r.status === 'Aktif' ? r.pengeluaran : 0), 0))}</strong></span>
          </div>
        </div>
      </div>

      {/* Print Signature Section (only visible when printing) */}
      <div className="hidden print:grid grid-cols-2 gap-8 mt-12 text-center text-black">
        <div>
          <p className="text-xs">Mengetahui,</p>
          <p className="text-sm font-bold mt-1">Ketua RT 09 RW 08</p>
          <div className="h-20" />
          <p className="text-sm font-semibold underline">{data.settings.namaKetuaRt || 'Ketua RT 09'}</p>
        </div>
        <div>
          <p className="text-xs">Kelurahan Bangetayu Wetan, {formatTanggalIndonesia(new Date().toISOString().slice(0, 10))}</p>
          <p className="text-sm font-bold mt-1">Bendahara RT 09 RW 08</p>
          <div className="h-20" />
          <p className="text-sm font-semibold underline">{data.settings.namaBendahara || 'Bendahara RT 09'}</p>
        </div>
      </div>

      {/* MODAL 1: Detail Transaksi */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Rincian Transaksi Buku Kas</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Nomor Bukti</span>
                  <span className="font-mono font-bold text-emerald-400">{detailItem.noBukti}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Tanggal Transaksi</span>
                  <span className="font-semibold text-slate-200">{formatTanggalIndonesia(detailItem.tanggal)}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Uraian Transaksi</span>
                <p className="font-semibold text-white text-base mt-0.5">{detailItem.uraian}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Sumber</span>
                  <span className="mt-1 block">{getSourceBadge(detailItem.sourceType)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Kategori</span>
                  <span className="text-xs font-semibold text-slate-200 block truncate mt-1">{detailItem.kategori}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className={`text-xs font-bold block mt-1 ${detailItem.status === 'Aktif' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {detailItem.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Pemasukan</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {detailItem.pemasukan > 0 ? formatRupiah(detailItem.pemasukan) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Pengeluaran</span>
                  <span className="font-bold text-rose-400 text-sm">
                    {detailItem.pengeluaran > 0 ? formatRupiah(detailItem.pengeluaran) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Saldo Berjalan</span>
                  <span className={`font-bold text-sm ${detailItem.saldo < 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                    {formatRupiah(detailItem.saldo)}
                  </span>
                </div>
              </div>

              {detailItem.keterangan && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Keterangan Tambahan</span>
                  <p className="text-slate-300 mt-0.5">{detailItem.keterangan}</p>
                </div>
              )}

              {/* Audit Trail info */}
              <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
                <div>Dicatat oleh: <strong className="text-slate-300">{detailItem.petugas || detailItem.createdBy || 'Sistem'}</strong></div>
                {detailItem.createdAt && (
                  <div>Waktu input: {new Date(detailItem.createdAt).toLocaleString('id-ID')}</div>
                )}
                {detailItem.status === 'Dibatalkan' && (
                  <div className="text-rose-400 pt-1">
                    Dibatalkan pada: {detailItem.cancelledAt ? new Date(detailItem.cancelledAt).toLocaleString('id-ID') : '-'} oleh {detailItem.cancelledBy || '-'}
                    <br />
                    Alasan: {detailItem.cancelReason || 'Tidak ada alasan'}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
              <div>
                {detailItem.status === 'Aktif' && canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingItem(detailItem);
                    }}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Batalkan Transaksi
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {detailItem.sourceType !== 'saldo_awal' && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      navigateToSource(detailItem.sourceType);
                      setDetailItem(null);
                    }}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka di Modul {detailItem.sourceType.toUpperCase()}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Input / Edit Saldo Awal */}
      {isSaldoAwalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  {editingSaldoAwal ? 'Edit Saldo Awal' : 'Input Saldo Awal Kas RT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaldoAwalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSaldoAwal} className="p-5 space-y-4">
              {saldoError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-lg">
                  {saldoError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tanggal Saldo Awal</label>
                <input
                  type="date"
                  value={saldoTanggal}
                  onChange={e => setSaldoTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={saldoNominal}
                  onChange={e => setSaldoNominal(e.target.value)}
                  placeholder="Contoh: 2500000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                {saldoNominal && (
                  <p className="text-xs text-emerald-400 mt-1">
                    {formatRupiah(parseFloat(saldoNominal) || 0)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Keterangan / Uraian</label>
                <input
                  type="text"
                  value={saldoKeterangan}
                  onChange={e => setSaldoKeterangan(e.target.value)}
                  placeholder="Contoh: Saldo serah terima periode kepengurusan lalu"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSaldoAwalModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan Saldo Awal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Rekonsiliasi Kas & Anti-Duplikasi */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Laporan Rekonsiliasi & Integritas Kas</h3>
                  <p className="text-[11px] text-slate-400">Verifikasi satu transaksi = satu sumber data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Summary Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                reconReport.isMatched
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}>
                {reconReport.isMatched ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {reconReport.isMatched
                      ? 'Seluruh Data Kas Tersinkronisasi Sempurna'
                      : `Ditemukan Selisih Kas Sebesar ${formatRupiah(reconReport.totalDifference)}`}
                  </h4>
                  <p className="text-xs opacity-90 mt-1">
                    {reconReport.isMatched
                      ? 'Total di modul Iuran, Jimpitan, Donasi, BOP, dan Saldo Awal persis sama dengan pencatatan Buku Kas. Tidak ada duplikasi atau data hilang.'
                      : 'Terdapat perbedaan nominal antara modul sumber dengan pencatatan Buku Kas. Klik tombol "Perbaiki & Sinkronkan" di bawah untuk memperbaiki otomatis.'}
                  </p>
                </div>
              </div>

              {/* Source Comparison Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Sumber Modul</th>
                      <th className="py-2.5 px-3 text-right">Total Modul</th>
                      <th className="py-2.5 px-3 text-right">Total Buku Kas</th>
                      <th className="py-2.5 px-3 text-right">Selisih</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reconReport.sources.map(src => (
                      <tr key={src.name} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {src.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                          {formatRupiah(src.expected)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                          {formatRupiah(src.actual)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${src.diff === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {src.diff === 0 ? 'Rp 0' : formatRupiah(src.diff)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {src.matched ? (
                            <span className="text-emerald-400 font-bold">✓ Sesuai</span>
                          ) : (
                            <span className="text-amber-400 font-bold">⚠️ Selisih</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Sinkronisasi ulang akan memindai seluruh transaksi sumber dan memperbarui Buku Kas tanpa membuat duplikasi.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    repairAndRebuildBukuKas();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shrink-0 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Perbaiki & Sinkronkan Otomatis</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Pembatalan Manual Transaksi */}
      {cancellingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Batalkan Transaksi Buku Kas</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="text-slate-400">Transaksi yang akan dibatalkan:</div>
                <div className="font-bold text-white mt-1">{cancellingItem.noBukti}</div>
                <div className="text-slate-300 mt-0.5">{cancellingItem.uraian}</div>
                <div className="text-emerald-400 font-semibold mt-1">
                  Nominal: {formatRupiah(cancellingItem.pemasukan || cancellingItem.pengeluaran)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alasan Pembatalan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Misal: Salah input data, koreksi pembukuan, atau pengembalian dana"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancellingItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelItem}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Ya, Batalkan Transaksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
