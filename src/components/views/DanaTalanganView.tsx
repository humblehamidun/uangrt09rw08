import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  FileText, 
  Calendar, 
  Home, 
  User, 
  Info,
  DollarSign,
  TrendingDown,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DanaTalangan, PelunasanTalangan, DanaTalanganFund, DanaTalanganStatus } from '../../types';
import { formatRupiah, terbilang } from '../../utils/format';

export const DanaTalanganView: React.FC = () => {
  const { 
    data, 
    currentUser, 
    addDanaTalangan, 
    updateDanaTalangan, 
    cancelDanaTalangan, 
    addPelunasanTalangan, 
    cancelPelunasanTalangan,
    addDanaTalanganFund,
    deleteDanaTalanganFund
  } = useData();

  // Active Subtab: 'talangan' | 'pelunasan' | 'dana-rt'
  const [activeSubTab, setActiveSubTab] = useState<'talangan' | 'pelunasan' | 'dana-rt'>('talangan');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | DanaTalanganStatus | 'Dibatalkan'>('Semua');

  // Modals
  const [isAddTalanganOpen, setIsAddTalanganOpen] = useState(false);
  const [isPelunasanOpen, setIsPelunasanOpen] = useState(false);
  const [selectedTalanganForPelunasan, setSelectedTalanganForPelunasan] = useState<DanaTalangan | null>(null);
  const [detailTalangan, setDetailTalangan] = useState<DanaTalangan | null>(null);
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocument, setPrintDocument] = useState<{ type: 'talangan' | 'pelunasan'; data: any } | null>(null);

  // Form states - Add Talangan
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    tanggal: todayStr,
    nomorRumah: '',
    namaPeminjam: '',
    namaPenerima: '', // Nama Almarhum / Keluarga
    jumlahTalangan: 1000000,
    alasan: 'Biaya Pemakaman & Pengurusan Jenazah',
    tanggalJatuhTempo: '',
    keterangan: '',
  });

  // Form states - Pelunasan
  const [pelunasanForm, setPelunasanForm] = useState({
    tanggal: todayStr,
    jumlah: 0,
    keterangan: 'Pelunasan tunai dari pihak keluarga',
  });

  // Form states - Alokasi Dana RT
  const [fundForm, setFundForm] = useState({
    tanggal: todayStr,
    jenis: 'Penambahan Dana' as 'Saldo Awal' | 'Penambahan Dana',
    jumlah: 1000000,
    sumberDana: 'Kas Operasional RT 09',
    keterangan: 'Alokasi tambahan dana talangan kematian',
  });

  // Reason presets
  const ALASAN_PRESETS = [
    'Biaya Pemakaman & Pengurusan Jenazah',
    'Ambulans & Transportasi Jenazah',
    'Kain Kafan & Perlengkapan Pemakaman',
    'Tenda, Kursi & Sound System Duka',
    'Konsumsi Pengajian / Doa Bersama',
    'Administrasi Pemakaman / Surat Kematian',
    'Kebutuhan Darurat Keluarga Musibah Lainnya'
  ];

  // Quick amounts
  const NOMINAL_CHIPS = [500000, 1000000, 1500000, 2000000, 2500000];

  // ================= CALCULATIONS & METRICS =================
  const talanganList = data.danaTalangan || [];
  const pelunasanList = data.pelunasanTalangan || [];
  const fundsList = data.danaTalanganFunds || [];

  // Total initial and added funds
  const totalDanaDisediakan = useMemo(() => {
    return fundsList.reduce((sum, f) => sum + (Number(f.jumlah) || 0), 0);
  }, [fundsList]);

  // Active loans (excluding Dibatalkan)
  const activeTalangan = useMemo(() => {
    return talanganList.filter(t => t.statusAktif === 'Aktif');
  }, [talanganList]);

  // Total Dipinjam (Principal loaned out)
  const totalDipinjam = useMemo(() => {
    return activeTalangan.reduce((sum, t) => sum + (Number(t.jumlahTalangan) || 0), 0);
  }, [activeTalangan]);

  // Total Dilunasi
  const totalDilunasi = useMemo(() => {
    return activeTalangan.reduce((sum, t) => sum + (Number(t.totalPelunasan) || 0), 0);
  }, [activeTalangan]);

  // Belum Dilunasi (Piutang yang masih aktif)
  const totalBelumDilunasi = useMemo(() => {
    return Math.max(0, totalDipinjam - totalDilunasi);
  }, [totalDipinjam, totalDilunasi]);

  // Dana Tersedia = Total Dana Disediakan - Total Belum Dilunasi
  const danaTersedia = useMemo(() => {
    return Math.max(0, totalDanaDisediakan - totalBelumDilunasi);
  }, [totalDanaDisediakan, totalBelumDilunasi]);

  // Counts by status
  const countBelumLunas = activeTalangan.filter(t => t.status === 'Belum Lunas').length;
  const countSebagian = activeTalangan.filter(t => t.status === 'Sebagian').length;
  const countLunas = activeTalangan.filter(t => t.status === 'Lunas').length;

  // Filtered Talangan
  const filteredTalangan = useMemo(() => {
    return talanganList.filter(item => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        item.namaPeminjam.toLowerCase().includes(q) || 
        item.namaPenerima.toLowerCase().includes(q) || 
        item.nomorRumah.toLowerCase().includes(q) ||
        (item.alasan && item.alasan.toLowerCase().includes(q));

      // Status filter
      if (statusFilter === 'Semua') return matchQuery;
      if (statusFilter === 'Dibatalkan') return matchQuery && item.statusAktif === 'Dibatalkan';
      return matchQuery && item.statusAktif === 'Aktif' && item.status === statusFilter;
    });
  }, [talanganList, searchQuery, statusFilter]);

  // Filtered Pelunasan
  const filteredPelunasan = useMemo(() => {
    return pelunasanList.filter(p => {
      const parent = talanganList.find(t => t.id === p.talanganId);
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.keterangan && p.keterangan.toLowerCase().includes(q)) ||
        (parent && parent.namaPeminjam.toLowerCase().includes(q)) ||
        (parent && parent.nomorRumah.toLowerCase().includes(q))
      );
    });
  }, [pelunasanList, talanganList, searchQuery]);

  // Handle Select Warga from Autocomplete / Dropdown
  const handleSelectWarga = (wargaId: string) => {
    const w = data.warga.find(item => item.id === wargaId);
    if (w) {
      setFormData(prev => ({
        ...prev,
        nomorRumah: w.nomorRumah,
        namaPeminjam: w.nama,
      }));
    }
  };

  // Submit Add Talangan
  const handleCreateTalangan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPeminjam.trim()) return;
    if (formData.jumlahTalangan <= 0) return;

    const res = addDanaTalangan({
      tanggal: formData.tanggal,
      nomorRumah: formData.nomorRumah,
      namaPeminjam: formData.namaPeminjam.trim(),
      namaPenerima: formData.namaPenerima.trim() || formData.namaPeminjam.trim(),
      jumlahTalangan: Number(formData.jumlahTalangan),
      alasan: formData.alasan,
      tanggalJatuhTempo: formData.tanggalJatuhTempo || undefined,
      keterangan: formData.keterangan,
    });

    if (res.success) {
      setIsAddTalanganOpen(false);
      // Reset form
      setFormData({
        tanggal: todayStr,
        nomorRumah: '',
        namaPeminjam: '',
        namaPenerima: '',
        jumlahTalangan: 1000000,
        alasan: 'Biaya Pemakaman & Pengurusan Jenazah',
        tanggalJatuhTempo: '',
        keterangan: '',
      });
    }
  };

  // Open Pelunasan Modal
  const openPelunasanModal = (t: DanaTalangan) => {
    setSelectedTalanganForPelunasan(t);
    setPelunasanForm({
      tanggal: todayStr,
      jumlah: t.sisaTalangan,
      keterangan: `Pelunasan dana talangan keluarga ${t.namaPeminjam}`,
    });
    setIsPelunasanOpen(true);
  };

  // Submit Pelunasan
  const handleSubmitPelunasan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTalanganForPelunasan) return;
    if (pelunasanForm.jumlah <= 0) return;

    const res = addPelunasanTalangan(selectedTalanganForPelunasan.id, {
      tanggal: pelunasanForm.tanggal,
      jumlah: Number(pelunasanForm.jumlah),
      keterangan: pelunasanForm.keterangan,
    });

    if (res.success) {
      setIsPelunasanOpen(false);
      setSelectedTalanganForPelunasan(null);
    }
  };

  // Submit Add Fund
  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (fundForm.jumlah <= 0) return;

    addDanaTalanganFund({
      tanggal: fundForm.tanggal,
      jenis: fundForm.jenis,
      jumlah: Number(fundForm.jumlah),
      sumberDana: fundForm.sumberDana,
      keterangan: fundForm.keterangan,
    });

    setIsAddFundOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal Peminjaman',
      'Nomor Rumah',
      'Nama Peminjam',
      'Untuk Almarhum/ah',
      'Alasan',
      'Jumlah Talangan (Rp)',
      'Total Pelunasan (Rp)',
      'Sisa Piutang (Rp)',
      'Status Pelunasan',
      'Status Transaksi',
      'Jatuh Tempo',
      'Keterangan'
    ];

    const rows = talanganList.map((t, idx) => [
      idx + 1,
      t.tanggal,
      `"${t.nomorRumah}"`,
      `"${t.namaPeminjam}"`,
      `"${t.namaPenerima}"`,
      `"${t.alasan}"`,
      t.jumlahTalangan,
      t.totalPelunasan,
      t.sisaTalangan,
      t.status,
      t.statusAktif,
      t.tanggalJatuhTempo || '-',
      `"${t.keterangan || '-'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dana-talangan-kematian-rt09-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open Printable Document
  const handlePrintBukti = (type: 'talangan' | 'pelunasan', item: any) => {
    setPrintDocument({ type, data: item });
    setIsPrintModalOpen(true);
  };

  return (
    <div id="view-dana-talangan" className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* 1. Header Banner & Sensitive Privacy Alert */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <HeartHandshake className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Dana Talangan Kematian
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    RT 09 RW 08
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Pencatatan dana talangan / piutang musibah kematian warga Kelurahan Bangetayu Wetan
                </p>
              </div>
            </div>
            
            {/* Privacy notice banner */}
            <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-lg mt-2 max-w-3xl">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Perhatian Privasi:</strong> Informasi musibah kematian bersifat sensitif & amanah RT. Data talangan otomatis terhubung dengan Buku Kas tanpa dicatat sebagai laba operasional.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
            <button
              id="btn-alokasi-dana-rt"
              onClick={() => setIsAddFundOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Wallet className="w-4 h-4 text-indigo-400" />
              Alokasi Dana RT
            </button>
            <button
              id="btn-export-talangan-csv"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Data
            </button>
            <button
              id="btn-tambah-dana-talangan"
              onClick={() => setIsAddTalanganOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Beri Talangan Baru
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards (5 Key Financial Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Dana Disediakan */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Dana Disediakan</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-white tracking-tight">
            {formatRupiah(totalDanaDisediakan)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Alokasi Kas RT ({fundsList.length} transaksi)</span>
          </div>
        </div>

        {/* Total Disalurkan (Dipinjam) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Dipinjam</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-rose-300 tracking-tight">
            {formatRupiah(totalDipinjam)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {activeTalangan.length} talangan disalurkan
          </div>
        </div>

        {/* Total Dilunasi */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Dilunasi</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-emerald-300 tracking-tight">
            {formatRupiah(totalDilunasi)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Kembali ke Kas RT
          </div>
        </div>

        {/* Belum Dilunasi (Piutang) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Belum Dilunasi (Piutang)</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-amber-300 tracking-tight">
            {formatRupiah(totalBelumDilunasi)}
          </div>
          <div className="mt-1 text-[11px] text-amber-400/90 font-medium flex items-center gap-1.5">
            <span>{countBelumLunas} belum lunas</span>
            <span>•</span>
            <span>{countSebagian} sebagian</span>
          </div>
        </div>

        {/* Dana Tersedia */}
        <div className="bg-slate-900/90 border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Dana Siap Tersedia</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-emerald-200 tracking-tight">
            {formatRupiah(danaTersedia)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Siap untuk musibah berikutnya
          </div>
        </div>

      </div>

      {/* 3. Sub Navigation Tabs & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            id="tab-sub-daftar-talangan"
            onClick={() => setActiveSubTab('talangan')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'talangan'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Daftar Talangan Warga
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeSubTab === 'talangan' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
            }`}>
              {activeTalangan.length}
            </span>
          </button>

          <button
            id="tab-sub-riwayat-pelunasan"
            onClick={() => setActiveSubTab('pelunasan')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'pelunasan'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Riwayat Pelunasan
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeSubTab === 'pelunasan' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
            }`}>
              {pelunasanList.filter(p => p.status === 'Aktif').length}
            </span>
          </button>

          <button
            id="tab-sub-alokasi-dana"
            onClick={() => setActiveSubTab('dana-rt')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'dana-rt'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Alokasi Dana RT
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeSubTab === 'dana-rt' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
            }`}>
              {fundsList.length}
            </span>
          </button>
        </div>

        {/* Search & Status Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-talangan"
              type="text"
              placeholder="Cari peminjam, rumah, alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {activeSubTab === 'talangan' && (
            <select
              id="select-filter-status-talangan"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="Semua">Semua Status ({talanganList.length})</option>
              <option value="Belum Lunas">Belum Lunas ({countBelumLunas})</option>
              <option value="Sebagian">Sebagian ({countSebagian})</option>
              <option value="Lunas">Lunas ({countLunas})</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          )}
        </div>

      </div>

      {/* 4. MAIN CONTENT TABS */}

      {/* SUBTAB 1: DAFTAR TALANGAN WARGA */}
      {activeSubTab === 'talangan' && (
        <div className="space-y-4">
          {filteredTalangan.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
              <HeartHandshake className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">Belum Ada Data Talangan Kematian</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'Semua' 
                  ? 'Tidak ada data talangan yang sesuai dengan filter pencarian.'
                  : 'Klik tombol "+ Beri Talangan Baru" untuk mencatat dana talangan musibah kematian kepada warga yang membutuhkan.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTalangan.map((item) => {
                const percentLunas = Math.min(100, Math.round(((item.totalPelunasan || 0) / (item.jumlahTalangan || 1)) * 100));
                const isCancelled = item.statusAktif === 'Dibatalkan';

                return (
                  <div 
                    key={item.id}
                    id={`card-talangan-${item.id}`}
                    className={`rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                      isCancelled 
                        ? 'bg-slate-950/60 border-rose-950/40 opacity-70' 
                        : item.status === 'Lunas'
                        ? 'bg-slate-900/80 border-emerald-800/40 hover:border-emerald-700/60'
                        : item.status === 'Sebagian'
                        ? 'bg-slate-900/90 border-amber-700/40 hover:border-amber-600/60'
                        : 'bg-slate-900/90 border-slate-700/70 hover:border-indigo-600/50'
                    } shadow-md`}
                  >
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            Rumah {item.nomorRumah}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {item.tanggal}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isCancelled ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Dibatalkan
                          </span>
                        ) : item.status === 'Lunas' ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Lunas
                          </span>
                        ) : item.status === 'Sebagian' ? (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Sebagian ({percentLunas}%)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Belum Lunas
                          </span>
                        )}
                      </div>

                      {/* Main Borrower Name */}
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {item.namaPeminjam}
                      </h3>
                      
                      {/* Recipient / Deceased Info */}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Keluarga Almarhum/ah: <span className="text-slate-200 font-medium">{item.namaPenerima}</span>
                      </p>

                      {/* Alasan */}
                      <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                        <span className="text-slate-400 text-[11px] block">Keperluan:</span>
                        <p className="font-medium text-slate-200 line-clamp-2">{item.alasan}</p>
                      </div>

                      {/* Financial Progress Bar */}
                      <div className="mt-3.5 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">Besar Pinjaman:</span>
                          <span className="text-slate-200 font-bold">{formatRupiah(item.jumlahTalangan)}</span>
                        </div>

                        {/* Progress track */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              isCancelled 
                                ? 'bg-slate-600' 
                                : item.status === 'Lunas' 
                                ? 'bg-emerald-500' 
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${percentLunas}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>Dilunasi: <strong className="text-emerald-400">{formatRupiah(item.totalPelunasan)}</strong></span>
                          <span>Sisa: <strong className={item.sisaTalangan > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>{formatRupiah(item.sisaTalangan)}</strong></span>
                        </div>
                      </div>

                      {/* Due date if available */}
                      {item.tanggalJatuhTempo && (
                        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Target Pelunasan: {item.tanggalJatuhTempo}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-detail-talangan-${item.id}`}
                          onClick={() => setDetailTalangan(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-medium flex items-center gap-1"
                          title="Lihat Rincian & Riwayat"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                        
                        <button
                          id={`btn-print-talangan-${item.id}`}
                          onClick={() => handlePrintBukti('talangan', item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-medium flex items-center gap-1"
                          title="Cetak Kwitansi / Tanda Terima"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Kwitansi</span>
                        </button>
                      </div>

                      {!isCancelled && item.status !== 'Lunas' && (
                        <button
                          id={`btn-bayar-talangan-${item.id}`}
                          onClick={() => openPelunasanModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Catat Pelunasan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: RIWAYAT PELUNASAN */}
      {activeSubTab === 'pelunasan' && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Daftar Seluruh Penerimaan Pelunasan
              </h2>
              <p className="text-xs text-slate-400">
                Penerimaan pelunasan otomatis dikembalikan ke Buku Kas sebagai penambah kas
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {filteredPelunasan.length} Transaksi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Warga / Rumah</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">Jumlah Dilunasi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPelunasan.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      Belum ada transaksi pelunasan yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredPelunasan.map((pel) => {
                    const parent = talanganList.find(t => t.id === pel.talanganId);
                    const isCancelled = pel.status === 'Dibatalkan';

                    return (
                      <tr 
                        key={pel.id}
                        id={`row-pelunasan-${pel.id}`}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isCancelled ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {pel.tanggal}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">
                            {parent?.namaPeminjam || 'Warga'}
                          </div>
                          <div className="text-xs text-slate-400">
                            Rumah {parent?.nomorRumah || '-'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                          {pel.keterangan || `Pelunasan talangan ${parent?.namaPeminjam}`}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono whitespace-nowrap">
                          {formatRupiah(pel.jumlah)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isCancelled ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Diterima
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-print-pelunasan-${pel.id}`}
                              onClick={() => handlePrintBukti('pelunasan', { ...pel, parent })}
                              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors"
                              title="Cetak Bukti Pelunasan"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {!isCancelled && (
                              <button
                                id={`btn-batal-pelunasan-${pel.id}`}
                                onClick={() => {
                                  const reason = prompt('Masukkan alasan pembatalan pelunasan ini:');
                                  if (reason) cancelPelunasanTalangan(pel.id, reason);
                                }}
                                className="p-1 rounded-md bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
                                title="Batalkan Pelunasan"
                              >
                                <XCircle className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* SUBTAB 3: ALOKASI DANA RT */}
      {activeSubTab === 'dana-rt' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Pos Dana Talangan Kematian RT 09</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dana khusus yang disisihkan RT dari Kas Operasional untuk pertolongan pertama musibah kematian warga
              </p>
            </div>
            <button
              id="btn-tambah-alokasi-dana-baru"
              onClick={() => setIsAddFundOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              Tambah Alokasi Dana
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fundsList.map((fund, idx) => (
              <div 
                key={fund.id}
                id={`card-fund-${fund.id}`}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    fund.jenis === 'Saldo Awal' 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {fund.jenis}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{fund.tanggal}</span>
                </div>

                <div>
                  <div className="text-xl font-bold text-white font-mono">
                    {formatRupiah(fund.jumlah)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Sumber Dana: <strong className="text-slate-300">{fund.sumberDana || 'Kas RT'}</strong>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Keterangan: {fund.keterangan || '-'}
                  </div>
                </div>

                {fundsList.length > 1 && (
                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <button
                      id={`btn-hapus-fund-${fund.id}`}
                      onClick={() => {
                        if (confirm(`Hapus catatan alokasi dana ${formatRupiah(fund.jumlah)}?`)) {
                          deleteDanaTalanganFund(fund.id);
                        }
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Modal Beri Talangan Baru */}
      {isAddTalanganOpen && (
        <div 
          id="modal-tambah-talangan"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Form Pemberian Dana Talangan Kematian</h3>
                  <p className="text-xs text-slate-400">Pemberian pinjaman darurat untuk musibah warga RT 09</p>
                </div>
              </div>
              <button
                id="btn-close-modal-tambah-talangan"
                onClick={() => setIsAddTalanganOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTalangan} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              
              {/* Quick Select Warga from Existing Database */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Pilih Data Warga RT (Opsional - Otomatis Isi Nama & Rumah)
                </label>
                <select
                  id="select-warga-talangan"
                  onChange={(e) => handleSelectWarga(e.target.value)}
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 transition-all text-xs"
                >
                  <option value="">-- Pilih dari database warga RT 09 --</option>
                  {data.warga.map(w => (
                    <option key={w.id} value={w.id}>
                      Rumah {w.nomorRumah} - {w.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Nomor Rumah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Tanggal Penyerahan Dana <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-tanggal-talangan"
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Nomor Rumah Warga <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-nomor-rumah-talangan"
                    type="text"
                    required
                    placeholder="Contoh: 14 atau Blok B-05"
                    value={formData.nomorRumah}
                    onChange={(e) => setFormData({ ...formData, nomorRumah: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Nama Peminjam & Nama Almarhum/ah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Nama Peminjam / Penanggung Jawab <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-nama-peminjam-talangan"
                    type="text"
                    required
                    placeholder="Contoh: Bpk. Bambang Supardi"
                    value={formData.namaPeminjam}
                    onChange={(e) => setFormData({ ...formData, namaPeminjam: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Untuk Musibah Kematian (Almarhum/ah) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-nama-penerima-talangan"
                    type="text"
                    required
                    placeholder="Contoh: Alm. Ibu Siti Aminah"
                    value={formData.namaPenerima}
                    onChange={(e) => setFormData({ ...formData, namaPenerima: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Jumlah Talangan with Quick Chips */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Jumlah Dana Talangan (Rp) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">Rp</span>
                  <input
                    id="input-jumlah-talangan"
                    type="number"
                    min="50000"
                    step="10000"
                    required
                    value={formData.jumlahTalangan}
                    onChange={(e) => setFormData({ ...formData, jumlahTalangan: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-bold font-mono focus:outline-none focus:border-emerald-500 text-base"
                  />
                </div>

                {/* Terbilang note */}
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  Terbilang: {terbilang(formData.jumlahTalangan)} rupiah
                </p>

                {/* Quick nominal chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NOMINAL_CHIPS.map(nom => (
                    <button
                      key={nom}
                      type="button"
                      onClick={() => setFormData({ ...formData, jumlahTalangan: nom })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                        formData.jumlahTalangan === nom 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {formatRupiah(nom)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keperluan / Alasan with Presets */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Alasan / Keperluan Penyaluran <span className="text-rose-400">*</span>
                </label>
                <select
                  id="select-alasan-talangan"
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 mb-2"
                >
                  {ALASAN_PRESETS.map(alasan => (
                    <option key={alasan} value={alasan}>{alasan}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Keterangan tambahan jika perlu..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Tanggal Jatuh Tempo */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Target / Perkiraan Pelunasan (Opsional)
                </label>
                <input
                  id="input-jatuh-tempo-talangan"
                  type="date"
                  value={formData.tanggalJatuhTempo}
                  onChange={(e) => setFormData({ ...formData, tanggalJatuhTempo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dapat disesuaikan sesuai kesepakatan kekeluargaan dengan pihak yang berduka.
                </p>
              </div>

              {/* Notification on Buku Kas */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Otomatisasi Buku Kas:</strong> Transaksi ini akan otomatis dicatat sebagai <strong>Pengeluaran</strong> pada Buku Kas dengan nomor bukti berkode <code className="text-emerald-300 font-mono">TAL-YYYYMM-XXX</code> tanpa mempengaruhi laba operasional.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddTalanganOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-tambah-talangan"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/30 transition-all"
                >
                  Simpan & Salurkan Dana
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Catat Pelunasan */}
      {isPelunasanOpen && selectedTalanganForPelunasan && (
        <div 
          id="modal-catat-pelunasan"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Catat Pelunasan Talangan</h3>
                  <p className="text-xs text-slate-400">Pengembalian dana ke Kas RT 09</p>
                </div>
              </div>
              <button
                id="btn-close-modal-pelunasan"
                onClick={() => setIsPelunasanOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPelunasan} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              
              {/* Target Talangan Info Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Peminjam:</span>
                  <strong className="text-white">{selectedTalanganForPelunasan.namaPeminjam} (Rumah {selectedTalanganForPelunasan.nomorRumah})</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Pinjaman:</span>
                  <span className="text-slate-200 font-mono font-bold">{formatRupiah(selectedTalanganForPelunasan.jumlahTalangan)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Sudah Dilunasi:</span>
                  <span className="text-emerald-400 font-mono font-bold">{formatRupiah(selectedTalanganForPelunasan.totalPelunasan)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                  <span className="text-amber-400 font-semibold">Sisa yang harus dilunasi:</span>
                  <span className="text-amber-300 font-mono font-bold text-sm">{formatRupiah(selectedTalanganForPelunasan.sisaTalangan)}</span>
                </div>
              </div>

              {/* Tanggal Pelunasan */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Tanggal Pelunasan <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-tanggal-pelunasan"
                  type="date"
                  required
                  value={pelunasanForm.tanggal}
                  onChange={(e) => setPelunasanForm({ ...pelunasanForm, tanggal: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Jumlah Pelunasan */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-medium text-slate-300">
                    Jumlah Pelunasan (Rp) <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPelunasanForm({ ...pelunasanForm, jumlah: selectedTalanganForPelunasan.sisaTalangan })}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline"
                  >
                    Lunasi Penuh ({formatRupiah(selectedTalanganForPelunasan.sisaTalangan)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">Rp</span>
                  <input
                    id="input-jumlah-pelunasan"
                    type="number"
                    min="1000"
                    max={selectedTalanganForPelunasan.sisaTalangan}
                    required
                    value={pelunasanForm.jumlah}
                    onChange={(e) => setPelunasanForm({ ...pelunasanForm, jumlah: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-bold font-mono focus:outline-none focus:border-emerald-500 text-base"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  Terbilang: {terbilang(pelunasanForm.jumlah)} rupiah
                </p>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Keterangan Pelunasan
                </label>
                <input
                  id="input-keterangan-pelunasan"
                  type="text"
                  value={pelunasanForm.keterangan}
                  onChange={(e) => setPelunasanForm({ ...pelunasanForm, keterangan: e.target.value })}
                  placeholder="Contoh: Pelunasan tunai / transfer dari perwakilan keluarga"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Pelunasan ini akan otomatis dicatat sebagai <strong>Pemasukan</strong> di Buku Kas dengan kode <code className="font-mono text-white">PEL-YYYYMM-XXX</code>.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPelunasanOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-pelunasan"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/30 transition-all"
                >
                  Simpan Pelunasan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Detail Talangan & Riwayat */}
      {detailTalangan && (
        <div 
          id="modal-detail-talangan"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-indigo-400" />
                Rincian Dana Talangan Kematian
              </h3>
              <button
                id="btn-close-modal-detail"
                onClick={() => setDetailTalangan(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-xs">Peminjam:</span>
                  <strong className="text-white text-sm">{detailTalangan.namaPeminjam}</strong>
                  <span className="text-xs text-slate-400 block">Rumah {detailTalangan.nomorRumah}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Untuk Musibah:</span>
                  <strong className="text-emerald-300 text-sm">{detailTalangan.namaPenerima}</strong>
                  <span className="text-xs text-slate-400 block">Tanggal: {detailTalangan.tanggal}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 text-xs">Keperluan / Alasan:</span>
                <p className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-medium">
                  {detailTalangan.alasan}
                  {detailTalangan.keterangan && <span className="block text-slate-400 text-xs mt-1">({detailTalangan.keterangan})</span>}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono">
                <div>
                  <span className="text-[11px] text-slate-400 font-sans block">Pinjaman</span>
                  <strong className="text-white text-sm">{formatRupiah(detailTalangan.jumlahTalangan)}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-sans block">Dilunasi</span>
                  <strong className="text-emerald-400 text-sm">{formatRupiah(detailTalangan.totalPelunasan)}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-sans block">Sisa</span>
                  <strong className="text-amber-400 text-sm">{formatRupiah(detailTalangan.sisaTalangan)}</strong>
                </div>
              </div>

              {/* Riwayat Pembayaran untuk Talangan ini */}
              <div>
                <h4 className="font-semibold text-white mb-2 flex items-center justify-between text-xs">
                  <span>Riwayat Pembayaran Pelunasan</span>
                  <span className="text-slate-400 font-normal">
                    {pelunasanList.filter(p => p.talanganId === detailTalangan.id).length} Pembayaran
                  </span>
                </h4>
                
                {pelunasanList.filter(p => p.talanganId === detailTalangan.id).length === 0 ? (
                  <p className="text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-lg">
                    Belum ada pembayaran pelunasan untuk talangan ini.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {pelunasanList
                      .filter(p => p.talanganId === detailTalangan.id)
                      .map(p => (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-mono text-slate-400">{p.tanggal}</span>
                            <p className="text-slate-300">{p.keterangan || 'Pelunasan'}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-emerald-400">{formatRupiah(p.jumlah)}</span>
                            <span className={`block text-[10px] ${p.status === 'Aktif' ? 'text-emerald-500' : 'text-rose-400'}`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Cancel Loan button */}
              {detailTalangan.statusAktif === 'Aktif' && (
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <button
                    id="btn-batalkan-talangan-modal"
                    onClick={() => {
                      const reason = prompt('Masukkan alasan pembatalan dana talangan ini:');
                      if (reason) {
                        cancelDanaTalangan(detailTalangan.id, reason);
                        setDetailTalangan(null);
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Batalkan Transaksi Ini
                  </button>

                  <button
                    id="btn-print-from-detail"
                    onClick={() => {
                      handlePrintBukti('talangan', detailTalangan);
                      setDetailTalangan(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                    Cetak Dokumen
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Alokasi Dana RT */}
      {isAddFundOpen && (
        <div 
          id="modal-tambah-fund"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Alokasi Dana Talangan RT</h3>
              </div>
              <button
                id="btn-close-modal-fund"
                onClick={() => setIsAddFundOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFund} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Jenis Alokasi <span className="text-rose-400">*</span>
                </label>
                <select
                  id="select-jenis-fund"
                  value={fundForm.jenis}
                  onChange={(e) => setFundForm({ ...fundForm, jenis: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Saldo Awal">Saldo Awal Pos Talangan</option>
                  <option value="Penambahan Dana">Penambahan Dana dari Kas RT</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Tanggal Alokasi <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-tanggal-fund"
                  type="date"
                  required
                  value={fundForm.tanggal}
                  onChange={(e) => setFundForm({ ...fundForm, tanggal: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Jumlah Dana (Rp) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">Rp</span>
                  <input
                    id="input-jumlah-fund"
                    type="number"
                    min="100000"
                    step="50000"
                    required
                    value={fundForm.jumlah}
                    onChange={(e) => setFundForm({ ...fundForm, jumlah: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 font-bold font-mono focus:outline-none focus:border-emerald-500 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Sumber Dana
                </label>
                <input
                  id="input-sumber-dana-fund"
                  type="text"
                  value={fundForm.sumberDana}
                  onChange={(e) => setFundForm({ ...fundForm, sumberDana: e.target.value })}
                  placeholder="Contoh: Kas Umum RT 09, Donatur, Kas Jimpitan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  id="input-keterangan-fund"
                  type="text"
                  value={fundForm.keterangan}
                  onChange={(e) => setFundForm({ ...fundForm, keterangan: e.target.value })}
                  placeholder="Contoh: Disetujui dalam rapat warga bulan Januari"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddFundOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-fund"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-900/30"
                >
                  Simpan Alokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Cetak Surat & Kwitansi Formal */}
      {isPrintModalOpen && printDocument && (
        <div 
          id="modal-print-talangan"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {printDocument.type === 'talangan' ? 'Tanda Terima Dana Talangan' : 'Bukti Pelunasan Talangan'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-trigger-browser-print"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Sekarang
                </button>
                <button
                  id="btn-close-print-modal"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Preview */}
            <div className="p-6 overflow-y-auto bg-slate-200 text-slate-900 font-serif printable-paper">
              
              {/* Kop RT */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h2 className="text-sm font-bold tracking-wider uppercase">PENGURUS RUKUN TETANGGA 09 RUKUN WARGA 08</h2>
                <h1 className="text-lg font-extrabold uppercase">KELURAHAN BANGETAYU WETAN KECAMATAN GENUK</h1>
                <p className="text-xs font-sans text-slate-700">KOTA SEMARANG - JAWA TENGAH</p>
                <div className="text-[11px] font-sans text-slate-600 mt-0.5">Sekretariat: Jl. Bangetayu Wetan RT 09 RW 08</div>
              </div>

              {printDocument.type === 'talangan' ? (
                // SURAT PENERIMAAN PINJAMAN TALANGAN
                <div className="space-y-3.5 text-xs sm:text-sm font-sans">
                  <div className="text-center">
                    <h3 className="font-bold underline text-sm uppercase">SURAT TANDA TERIMA DANA TALANGAN KEMATIAN</h3>
                    <p className="text-xs text-slate-600 font-mono">Kode Bukti: TAL-{printDocument.data.tanggal.replace(/-/g, '').slice(0, 6)}-{printDocument.data.id.slice(-3)}</p>
                  </div>

                  <p className="text-justify leading-relaxed">
                    Telah diserahkan dana talangan darurat musibah kematian dari Rukun Tetangga (RT) 09 RW 08 Kelurahan Bangetayu Wetan kepada:
                  </p>

                  <div className="grid grid-cols-3 gap-1 bg-white p-3 border border-slate-300 rounded">
                    <span className="text-slate-600">Nama Peminjam</span>
                    <span className="col-span-2 font-bold">: {printDocument.data.namaPeminjam}</span>

                    <span className="text-slate-600">Nomor Rumah</span>
                    <span className="col-span-2 font-bold">: {printDocument.data.nomorRumah}</span>

                    <span className="text-slate-600">Untuk Musibah</span>
                    <span className="col-span-2 font-bold">: {printDocument.data.namaPenerima}</span>

                    <span className="text-slate-600">Jumlah Dana</span>
                    <span className="col-span-2 font-bold text-emerald-800 text-base font-mono">
                      : {formatRupiah(printDocument.data.jumlahTalangan)}
                    </span>

                    <span className="text-slate-600">Terbilang</span>
                    <span className="col-span-2 italic">: {terbilang(printDocument.data.jumlahTalangan)} rupiah</span>

                    <span className="text-slate-600">Keperluan</span>
                    <span className="col-span-2">: {printDocument.data.alasan}</span>

                    {printDocument.data.tanggalJatuhTempo && (
                      <>
                        <span className="text-slate-600">Rencana Pelunasan</span>
                        <span className="col-span-2 font-bold">: {printDocument.data.tanggalJatuhTempo}</span>
                      </>
                    )}
                  </div>

                  <p className="text-justify leading-relaxed text-xs text-slate-700">
                    Dana talangan ini diberikan semata-mata sebagai pinjaman pertolongan kemanusiaan atas musibah yang dialami warga, dan bersedia dilunasi kembali demi keberlanjutan kas pertolongan RT 09.
                  </p>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 pt-6 text-center text-xs">
                    <div>
                      <p>Penerima / Peminjam,</p>
                      <div className="h-14" />
                      <p className="font-bold underline">({printDocument.data.namaPeminjam})</p>
                      <p className="text-[10px] text-slate-600">Warga RT 09 RW 08</p>
                    </div>
                    <div>
                      <p>Semarang, {printDocument.data.tanggal}</p>
                      <p>Pengurus / Bendahara RT 09,</p>
                      <div className="h-14" />
                      <p className="font-bold underline">({currentUser?.nama || 'Bendahara RT 09'})</p>
                      <p className="text-[10px] text-slate-600">Ketua / Bendahara RT 09</p>
                    </div>
                  </div>
                </div>
              ) : (
                // KWITANSI PELUNASAN
                <div className="space-y-3.5 text-xs sm:text-sm font-sans">
                  <div className="text-center">
                    <h3 className="font-bold underline text-sm uppercase">BUKTI KWITANSI PELUNASAN DANA TALANGAN</h3>
                    <p className="text-xs text-slate-600 font-mono">Kode Bukti: PEL-{printDocument.data.tanggal.replace(/-/g, '').slice(0, 6)}-{printDocument.data.id.slice(-3)}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-white p-3 border border-slate-300 rounded">
                    <span className="text-slate-600">Sudah Terima Dari</span>
                    <span className="col-span-2 font-bold">: {printDocument.data.parent?.namaPeminjam || 'Pihak Keluarga'}</span>

                    <span className="text-slate-600">Alamat / Rumah</span>
                    <span className="col-span-2 font-bold">: Rumah {printDocument.data.parent?.nomorRumah || '-'}</span>

                    <span className="text-slate-600">Jumlah Uang</span>
                    <span className="col-span-2 font-bold text-emerald-800 text-base font-mono">
                      : {formatRupiah(printDocument.data.jumlah)}
                    </span>

                    <span className="text-slate-600">Terbilang</span>
                    <span className="col-span-2 italic">: {terbilang(printDocument.data.jumlah)} rupiah</span>

                    <span className="text-slate-600">Untuk Pembayaran</span>
                    <span className="col-span-2">: {printDocument.data.keterangan || 'Pelunasan Dana Talangan Kematian'}</span>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 pt-6 text-center text-xs">
                    <div>
                      <p>Yang Membayar,</p>
                      <div className="h-14" />
                      <p className="font-bold underline">({printDocument.data.parent?.namaPeminjam || 'Keluarga'})</p>
                    </div>
                    <div>
                      <p>Semarang, {printDocument.data.tanggal}</p>
                      <p>Yang Menerima (Bendahara RT 09),</p>
                      <div className="h-14" />
                      <p className="font-bold underline">({currentUser?.nama || 'Bendahara RT 09'})</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
