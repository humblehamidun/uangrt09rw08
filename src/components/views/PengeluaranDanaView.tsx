import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PengeluaranDana, PengeluaranDanaKategori, UserRole, NavigationTab } from '../../types';
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
  AlertTriangle,
  AlertCircle,
  Wallet, 
  Filter,
  CheckCircle2,
  Trash2,
  FileText,
  Building2,
  PieChart as PieIcon,
  TrendingDown,
  Info,
  Clock,
  User,
  X,
  Layers,
  ChevronRight,
  Sparkles,
  FileDown,
  FileSpreadsheet,
  PenTool,
  Check
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatRupiah, formatTanggalIndonesia, downloadCSV, terbilang, NAMA_BULAN } from '../../utils/format';

export const DAFTAR_KATEGORI_PENGELUARAN: PengeluaranDanaKategori[] = [
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

interface PengeluaranDanaViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const PengeluaranDanaView: React.FC<PengeluaranDanaViewProps> = ({ onNavigate }) => {
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
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Tab: 'daftar' | 'rekap' | 'laporan'
  const [activeMainTab, setActiveMainTab] = useState<'daftar' | 'rekap' | 'laporan'>('daftar');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Aktif' | 'Dibatalkan'>('Aktif');
  const [selectedBulan, setSelectedBulan] = useState<string>('All');
  const [selectedTahun, setSelectedTahun] = useState<string>(String(currentYear));

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PengeluaranDana | null>(null);

  // Form Fields
  const [formTanggal, setFormTanggal] = useState(today.toISOString().slice(0, 10));
  const [formKategori, setFormKategori] = useState<PengeluaranDanaKategori>('Petugas Sampah');
  const [formNominal, setFormNominal] = useState('');
  const [formPenerima, setFormPenerima] = useState('');
  const [formPeriode, setFormPeriode] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formKeteranganPenggunaan, setFormKeteranganPenggunaan] = useState('');
  const [formError, setFormError] = useState('');

  // Cancel Modal
  const [cancellingRecord, setCancellingRecord] = useState<PengeluaranDana | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Detail Modal
  const [detailRecord, setDetailRecord] = useState<PengeluaranDana | null>(null);

  // Laporan Khusus & Cetak Settings & Filters
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('All');
  const [reportBulanFilter, setReportBulanFilter] = useState<string>('All');
  const [reportTahunFilter, setReportTahunFilter] = useState<string>(String(currentYear));
  const [reportStatusFilter, setReportStatusFilter] = useState<'Aktif' | 'All'>('Aktif');
  const [signerKetua, setSignerKetua] = useState<string>(data.settings.ketuaRT || 'H. Sugiyanto, S.E.');
  const [signerBendahara, setSignerBendahara] = useState<string>(data.settings.bendahara || 'Bambang Pamungkas, S.Kom.');
  const [showSignerSettings, setShowSignerSettings] = useState(false);

  // Individual Receipt Voucher Modal
  const [receiptRecord, setReceiptRecord] = useState<PengeluaranDana | null>(null);

  // Legacy Laporan Subtab for quick tabs
  const [laporanSubTab, setLaporanSubTab] = useState<'semua' | 'sampah' | 'uang_meja' | 'lainnya'>('semua');

  // Sync settings when data changes
  React.useEffect(() => {
    if (data.settings?.ketuaRT) setSignerKetua(data.settings.ketuaRT);
    if (data.settings?.bendahara) setSignerBendahara(data.settings.bendahara);
  }, [data.settings?.ketuaRT, data.settings?.bendahara]);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>([String(currentYear), '2025', '2026', '2027']);
    (data.pengeluaranDana || []).forEach(p => {
      if (p.tanggal) yearsSet.add(p.tanggal.slice(0, 4));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [data.pengeluaranDana, currentYear]);

  // Filtered Pengeluaran Dana list
  const filteredList = useMemo(() => {
    return (data.pengeluaranDana || []).filter(item => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (kategoriFilter !== 'All' && item.kategori !== kategoriFilter) return false;

      if (item.tanggal) {
        const [y, m] = item.tanggal.split('-');
        if (selectedTahun !== 'All' && y !== selectedTahun) return false;
        if (selectedBulan !== 'All' && String(parseInt(m, 10)) !== selectedBulan) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchBukti = (item.noBukti || '').toLowerCase().includes(q);
        const matchKat = (item.kategori || '').toLowerCase().includes(q);
        const matchPenerima = (item.penerima || '').toLowerCase().includes(q);
        const matchKet = (item.keterangan || '').toLowerCase().includes(q);
        const matchUraian = (item.keteranganPenggunaanDana || '').toLowerCase().includes(q);
        const matchPetugas = (item.createdBy || '').toLowerCase().includes(q);

        if (!matchBukti && !matchKat && !matchPenerima && !matchKet && !matchUraian && !matchPetugas) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [data.pengeluaranDana, statusFilter, kategoriFilter, selectedTahun, selectedBulan, searchTerm]);

  // High-level statistics
  const stats = useMemo(() => {
    const allActive = (data.pengeluaranDana || []).filter(p => p.status === 'Aktif');

    // Total Overall Aktif
    const totalSemua = allActive.reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // Filtered by Selected Month/Year
    const filteredActive = allActive.filter(item => {
      if (!item.tanggal) return false;
      const [y, m] = item.tanggal.split('-');
      const matchYear = selectedTahun === 'All' || y === selectedTahun;
      const matchMonth = selectedBulan === 'All' ? parseInt(m, 10) === currentMonth && y === String(currentYear) : String(parseInt(m, 10)) === selectedBulan;
      return matchYear && matchMonth;
    });

    const pengeluaranBulanIni = filteredActive.reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // Kategori Petugas Sampah
    const totalPetugasSampah = allActive
      .filter(p => p.kategori === 'Petugas Sampah')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    const bulanIniPetugasSampah = filteredActive
      .filter(p => p.kategori === 'Petugas Sampah')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // Kategori Uang Meja
    const totalUangMeja = allActive
      .filter(p => p.kategori === 'Uang Meja')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    const bulanIniUangMeja = filteredActive
      .filter(p => p.kategori === 'Uang Meja')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // Kategori Lainnya
    const totalLainnya = allActive
      .filter(p => p.kategori === 'Lainnya')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    const bulanIniLainnya = filteredActive
      .filter(p => p.kategori === 'Lainnya')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // Breakdown per Kategori (Tahun ini atau Periode terpilih)
    const categoryBreakdown: { kategori: PengeluaranDanaKategori; total: number; count: number; percentage: number }[] = DAFTAR_KATEGORI_PENGELUARAN.map(kat => {
      const itemsInKat = allActive.filter(p => {
        if (p.kategori !== kat) return false;
        if (selectedTahun !== 'All') {
          const y = p.tanggal.slice(0, 4);
          if (y !== selectedTahun) return false;
        }
        return true;
      });
      const total = itemsInKat.reduce((sum, item) => sum + (item.nominal || 0), 0);
      return {
        kategori: kat,
        total,
        count: itemsInKat.length,
        percentage: 0,
      };
    });

    const sumYear = categoryBreakdown.reduce((s, c) => s + c.total, 0);
    categoryBreakdown.forEach(c => {
      c.percentage = sumYear > 0 ? Math.round((c.total / sumYear) * 100) : 0;
    });

    // Sort by largest spending
    categoryBreakdown.sort((a, b) => b.total - a.total);

    // Monthly breakdown (Jan-Dec for selectedTahun)
    const targetYearStr = selectedTahun !== 'All' ? selectedTahun : String(currentYear);
    const monthlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const monthItems = allActive.filter(p => {
        if (!p.tanggal) return false;
        const [y, mStr] = p.tanggal.split('-');
        return y === targetYearStr && parseInt(mStr, 10) === m;
      });
      const total = monthItems.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
      return {
        bulanNumber: m,
        namaBulan: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][idx],
        total,
        count: monthItems.length,
      };
    });

    return {
      totalSemua,
      pengeluaranBulanIni,
      totalPetugasSampah,
      bulanIniPetugasSampah,
      totalUangMeja,
      bulanIniUangMeja,
      totalLainnya,
      bulanIniLainnya,
      categoryBreakdown,
      monthlyBreakdown,
      sumYear,
      activeCount: allActive.length,
      cancelledCount: (data.pengeluaranDana || []).length - allActive.length,
    };
  }, [data.pengeluaranDana, selectedTahun, selectedBulan, currentMonth, currentYear]);

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormTanggal(today.toISOString().slice(0, 10));
    setFormKategori('Petugas Sampah');
    setFormNominal('');
    setFormPenerima('');
    setFormPeriode(`${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][today.getMonth()]} ${today.getFullYear()}`);
    setFormKeterangan('');
    setFormKeteranganPenggunaan('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
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

  // Submit Form (Add or Edit)
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
      // Edit existing
      const res = updatePengeluaranDana(editingRecord.id, {
        tanggal: formTanggal,
        kategori: formKategori,
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
      // Add new
      const res = addPengeluaranDana({
        tanggal: formTanggal,
        kategori: formKategori,
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

  // Confirm Cancellation
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

  // Records for Laporan Khusus & Cetak
  const reportRecords = useMemo(() => {
    return (data.pengeluaranDana || []).filter(item => {
      if (reportStatusFilter === 'Aktif' && item.status !== 'Aktif') return false;
      if (reportCategoryFilter !== 'All' && item.kategori !== reportCategoryFilter) return false;
      if (item.tanggal) {
        const [y, m] = item.tanggal.split('-');
        if (reportTahunFilter !== 'All' && y !== reportTahunFilter) return false;
        if (reportBulanFilter !== 'All' && String(parseInt(m, 10)) !== reportBulanFilter) return false;
      }
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [data.pengeluaranDana, reportStatusFilter, reportCategoryFilter, reportTahunFilter, reportBulanFilter]);

  const reportTotal = useMemo(() => {
    return reportRecords.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  }, [reportRecords]);

  // Export CSV
  const handleExportCSV = (source: 'laporan' | 'daftar' = 'laporan') => {
    const exportRecords = source === 'laporan' ? reportRecords : filteredList;
    const catLabel = reportCategoryFilter === 'All' ? 'Semua_Kategori' : reportCategoryFilter.replace(/\s+/g, '_');
    const periodLabel = reportBulanFilter === 'All' 
      ? `Tahun_${reportTahunFilter}` 
      : `Bulan_${reportBulanFilter}_${reportTahunFilter}`;
    const fileName = `Laporan_Pengeluaran_Dana_RT09_${catLabel}_${periodLabel}_${new Date().toISOString().slice(0, 10)}.csv`;

    const headers = [
      'No',
      'Nomor Bukti',
      'Tanggal',
      'Kategori',
      'Penerima',
      'Periode',
      'Keterangan Penggunaan',
      'Nominal (Rp)',
      'Petugas Pencatat',
      'Status',
      'Alasan Batal'
    ];

    const rows = exportRecords.map((r, index) => [
      index + 1,
      r.noBukti,
      r.tanggal,
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
    logAudit('Export Pengeluaran Dana', `Mengekspor data laporan pengeluaran dana ke CSV (${exportRecords.length} baris)`);
    addToast('File CSV berhasil diunduh.', 'success');
  };

  // Handle Print Report
  const handlePrintReport = () => {
    logAudit('Cetak Pengeluaran Dana', `Mencetak dokumen laporan pertanggungjawaban pengeluaran dana RT (${reportRecords.length} transaksi)`);
    addToast("Membuka dialog cetak. Pilih 'Simpan sebagai PDF' (Save as PDF) di tujuan printer jika ingin mengunduh PDF.", 'info');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Handle Print Receipt Voucher
  const handlePrintReceipt = (item: PengeluaranDana) => {
    setReceiptRecord(item);
    logAudit('Cetak Bukti Pengeluaran', `Membuka bukti kas keluar nomor ${item.noBukti}`);
  };

  return (
    <div id="pengeluaran-dana-view" className="space-y-6 pb-16">
      
      {/* 1. Header Card with Civic Brand & Quick Actions */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E5AA8] to-[#143E75] text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Receipt className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1F2937] tracking-tight">PENGELUARAN DANA KAS RT</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-[#1E5AA8] border border-blue-200">
                  RT 09 RW 08
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Pengelolaan dan pencatatan pengeluaran dana operasional, honor petugas sampah, uang meja, dan belanja kas RT
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              id="btn-cetak-pengeluaran"
              type="button"
              onClick={() => {
                if (activeMainTab !== 'laporan') {
                  setActiveMainTab('laporan');
                  addToast('Beralih ke format Laporan Khusus & Cetak Resmi.', 'info');
                } else {
                  handlePrintReport();
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#1E5AA8] bg-blue-50/70 border border-blue-200 rounded-lg hover:bg-blue-100/70 transition-colors shadow-2xs"
              title="Cetak Laporan / Simpan PDF"
            >
              <Printer className="w-4 h-4 text-[#1E5AA8]" />
              <span>Cetak Laporan / PDF</span>
            </button>

            <button
              id="btn-export-pengeluaran"
              type="button"
              onClick={() => handleExportCSV(activeMainTab === 'laporan' ? 'laporan' : 'daftar')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              title="Ekspor Data ke CSV"
            >
              <Download className="w-4 h-4 text-[#6B7280]" />
              <span>Ekspor CSV</span>
            </button>

            {canManage && (
              <button
                id="btn-tambah-pengeluaran"
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1E5AA8] hover:bg-[#164785] rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ TAMBAH PENGELUARAN</span>
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#F3F4F6]">
          <button
            id="tab-daftar-transaksi"
            type="button"
            onClick={() => setActiveMainTab('daftar')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeMainTab === 'daftar'
                ? 'bg-[#1E5AA8] text-white font-bold shadow-xs'
                : 'text-[#4B5563] hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Daftar Transaksi ({filteredList.length})</span>
          </button>

          <button
            id="tab-rekap-pengeluaran"
            type="button"
            onClick={() => setActiveMainTab('rekap')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeMainTab === 'rekap'
                ? 'bg-[#1E5AA8] text-white font-bold shadow-xs'
                : 'text-[#4B5563] hover:bg-slate-100'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Rekap & Analisis</span>
          </button>

          <button
            id="tab-laporan-cetak"
            type="button"
            onClick={() => setActiveMainTab('laporan')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeMainTab === 'laporan'
                ? 'bg-[#1E5AA8] text-white font-bold shadow-xs'
                : 'text-[#4B5563] hover:bg-slate-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Laporan Khusus & Cetak ({reportRecords.length})</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
        {/* Total Pengeluaran */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs hover:border-[#1E5AA8]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">TOTAL PENGELUARAN</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-[#1F2937] mt-2 tracking-tight">
            {formatRupiah(stats.totalSemua)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            {stats.activeCount} transaksi aktif
          </p>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs hover:border-[#1E5AA8]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">BULAN INI ({['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][currentMonth - 1]})</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E5AA8] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-[#1E5AA8] mt-2 tracking-tight">
            {formatRupiah(stats.pengeluaranBulanIni)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Periode aktif saat ini
          </p>
        </div>

        {/* Petugas Sampah */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs hover:border-[#1E5AA8]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">PETUGAS SAMPAH</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-2 tracking-tight">
            {formatRupiah(stats.totalPetugasSampah)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Bulan ini: {formatRupiah(stats.bulanIniPetugasSampah)}
          </p>
        </div>

        {/* Uang Meja */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs hover:border-[#1E5AA8]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">UANG MEJA</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-amber-700 mt-2 tracking-tight">
            {formatRupiah(stats.totalUangMeja)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Bulan ini: {formatRupiah(stats.bulanIniUangMeja)}
          </p>
        </div>

        {/* Lainnya */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs hover:border-[#1E5AA8]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">LAINNYA</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-purple-700 mt-2 tracking-tight">
            {formatRupiah(stats.totalLainnya)}
          </p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Bulan ini: {formatRupiah(stats.bulanIniLainnya)}
          </p>
        </div>
      </div>

      {/* 3. MAIN CONTENT BASED ON ACTIVE TAB */}
      
      {/* TAB 1: DAFTAR TRANSAKSI */}
      {activeMainTab === 'daftar' && (
        <div className="space-y-4 no-print">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                <input
                  id="filter-search-pengeluaran"
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cari bukti, kategori, penerima, keterangan..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8]"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#4B5563]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Kategori Filter */}
              <div>
                <select
                  id="filter-kategori-pengeluaran"
                  value={kategoriFilter}
                  onChange={e => setKategoriFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8] bg-white text-[#374151]"
                >
                  <option value="All">Semua Kategori</option>
                  {DAFTAR_KATEGORI_PENGELUARAN.map(kat => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              {/* Bulan Filter */}
              <div>
                <select
                  id="filter-bulan-pengeluaran"
                  value={selectedBulan}
                  onChange={e => setSelectedBulan(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8] bg-white text-[#374151]"
                >
                  <option value="All">Semua Bulan</option>
                  {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((nm, idx) => (
                    <option key={nm} value={String(idx + 1)}>{nm}</option>
                  ))}
                </select>
              </div>

              {/* Tahun Filter */}
              <div>
                <select
                  id="filter-tahun-pengeluaran"
                  value={selectedTahun}
                  onChange={e => setSelectedTahun(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8] bg-white text-[#374151]"
                >
                  <option value="All">Semua Tahun</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-bar: Status and Reset */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F3F4F6] text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] font-medium">Status:</span>
                {(['All', 'Aktif', 'Dibatalkan'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-[#1E5AA8] text-white'
                        : 'bg-slate-100 text-[#4B5563] hover:bg-slate-200'
                    }`}
                  >
                    {st === 'All' ? 'Semua' : st}
                  </button>
                ))}
              </div>

              {(searchTerm || kategoriFilter !== 'All' || statusFilter !== 'Aktif' || selectedBulan !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setKategoriFilter('All');
                    setStatusFilter('Aktif');
                    setSelectedBulan('All');
                    setSelectedTahun(String(currentYear));
                  }}
                  className="text-xs text-[#1E5AA8] hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#374151]">
                <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#4B5563] font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Nomor Bukti</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Penerima</th>
                    <th className="py-3 px-3">Keterangan / Penggunaan</th>
                    <th className="py-3 px-3 text-right">Nominal</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#6B7280]">
                        <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-600">Belum ada data pengeluaran dana</p>
                        <p className="text-xs text-slate-400 mt-0.5">Silakan tambahkan data melalui tombol "+ TAMBAH PENGELUARAN"</p>
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item, idx) => {
                      const isCancelled = item.status === 'Dibatalkan';
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCancelled ? 'bg-red-50/40 text-slate-400' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-medium text-[#6B7280]">{idx + 1}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-medium text-[#1F2937]">{formatTanggalIndonesia(item.tanggal)}</span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setDetailRecord(item)}
                              className="font-mono text-[11px] font-bold text-[#1E5AA8] hover:underline"
                            >
                              {item.noBukti}
                            </button>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              item.kategori === 'Petugas Sampah' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              item.kategori === 'Uang Meja' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              item.kategori === 'Lainnya' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-blue-50 text-[#1E5AA8] border border-blue-200'
                            }`}>
                              {item.kategori}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-[#1F2937]">
                            {item.penerima}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <p className="truncate font-medium text-[#374151]">
                              {item.keteranganPenggunaanDana || item.keterangan || '-'}
                            </p>
                            {item.periode && (
                              <span className="text-[10px] text-[#6B7280]">Periode: {item.periode}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <span className={`font-mono font-bold ${isCancelled ? 'line-through text-slate-400' : 'text-red-600'}`}>
                              {formatRupiah(item.nominal)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isCancelled ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                Dibatalkan
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailRecord(item)}
                                className="p-1 rounded hover:bg-slate-200 text-[#4B5563]"
                                title="Lihat Detail Transaksi"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(item)}
                                className="p-1 rounded hover:bg-blue-100 text-[#1E5AA8]"
                                title="Cetak Bukti Kas Keluar (Voucher)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {canManage && !isCancelled && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(item)}
                                    className="p-1 rounded hover:bg-blue-100 text-[#1E5AA8]"
                                    title="Edit Transaksi"
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
                                    className="p-1 rounded hover:bg-red-100 text-red-600"
                                    title="Batalkan / Void Transaksi"
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
              </table>
            </div>

            {/* Table Footer: Total */}
            {filteredList.length > 0 && (
              <div className="p-3.5 bg-slate-50 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <span className="text-[#6B7280]">
                  Menampilkan <strong>{filteredList.length}</strong> transaksi pengeluaran
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[#4B5563] font-medium">Subtotal Transaksi Aktif:</span>
                  <span className="text-sm font-bold font-mono text-red-600">
                    {formatRupiah(filteredList.filter(p => p.status === 'Aktif').reduce((acc, curr) => acc + (curr.nominal || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REKAP & ANALISIS */}
      {activeMainTab === 'rekap' && (
        <div className="space-y-6 no-print">
          {/* Category Breakdown Table and Visual Progress */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] tracking-tight">REKAP PENGELUARAN PER KATEGORI</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">Tahun {selectedTahun === 'All' ? 'Semua Tahun' : selectedTahun}</p>
              </div>
              <span className="text-xs font-bold font-mono text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                Total: {formatRupiah(stats.sumYear)}
              </span>
            </div>

            <div className="space-y-3">
              {stats.categoryBreakdown.map(item => (
                <div key={item.kategori} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#374151] flex items-center gap-2">
                      <span>{item.kategori}</span>
                      <span className="text-[10px] text-[#6B7280] font-normal">({item.count} transaksi)</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-[#1F2937]">{formatRupiah(item.total)}</span>
                      <span className="text-[11px] text-[#6B7280] w-10 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.kategori === 'Petugas Sampah' ? 'bg-emerald-500' :
                        item.kategori === 'Uang Meja' ? 'bg-amber-500' :
                        item.kategori === 'Lainnya' ? 'bg-purple-500' :
                        'bg-[#1E5AA8]'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Breakdown Grid */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-sm font-bold text-[#1F2937] tracking-tight">REKAP PER BULAN (JANUARI - DESEMBER)</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">Distribusi pengeluaran kas RT per bulan dalam tahun berjalan</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.monthlyBreakdown.map(m => (
                <div 
                  key={m.bulanNumber} 
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    m.bulanNumber === currentMonth && (selectedTahun === 'All' || selectedTahun === String(currentYear))
                      ? 'bg-blue-50/50 border-[#1E5AA8]/40 shadow-2xs'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <span className="font-semibold text-[#4B5563] block">{m.namaBulan}</span>
                  <p className="text-sm font-bold font-mono text-[#1F2937] mt-1.5">
                    {formatRupiah(m.total)}
                  </p>
                  <span className="text-[10px] text-[#6B7280] mt-0.5 block">{m.count} transaksi</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LAPORAN KHUSUS & CETAK RESMI */}
      {activeMainTab === 'laporan' && (
        <div className="space-y-6">
          {/* Controls & Filter Panel (Hidden during Print) */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-xs no-print space-y-4">
            
            {/* Top Toolbar: Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1E5AA8] flex items-center justify-center font-bold">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937]">Laporan Pertanggungjawaban Kas RT</h3>
                  <p className="text-[11px] text-[#6B7280]">Format dokumen cetak A4 resmi dengan kop surat RT 09 RW 08 dan kolom tanda tangan</p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignerSettings(!showSignerSettings)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    showSignerSettings 
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-[#4B5563] border-[#D1D5DB] hover:bg-slate-50'
                  }`}
                  title="Sesuaikan nama Ketua RT dan Bendahara pada dokumen cetak"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Atur Tanda Tangan</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCSV('laporan')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
                  title="Unduh data laporan dalam format CSV (Excel/Spreadsheet)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#1E5AA8] hover:bg-[#164785] rounded-lg shadow-xs transition-colors"
                  title="Cetak dokumen resmi atau simpan sebagai PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
              </div>
            </div>

            {/* Expandable Signatory Names Customizer */}
            {showSignerSettings && (
              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-700" />
                    Penyesuaian Nama Penandatangan Dokumen Resmi
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSignerKetua(data.settings?.ketuaRT || 'H. Sugiyanto, S.E.');
                      setSignerBendahara(data.settings?.bendahara || 'Bambang Pamungkas, S.Kom.');
                    }}
                    className="text-[11px] font-semibold text-amber-800 hover:underline"
                  >
                    Reset ke Nama Standar RT
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Ketua RT 09 (Kiri):
                    </label>
                    <input
                      type="text"
                      value={signerKetua}
                      onChange={e => setSignerKetua(e.target.value)}
                      placeholder="Nama Lengkap Ketua RT..."
                      className="w-full px-3 py-1.5 text-xs bg-white rounded-md border border-amber-300 focus:outline-none focus:ring-1 focus:ring-[#1E5AA8]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Bendahara RT 09 (Kanan):
                    </label>
                    <input
                      type="text"
                      value={signerBendahara}
                      onChange={e => setSignerBendahara(e.target.value)}
                      placeholder="Nama Lengkap Bendahara..."
                      className="w-full px-3 py-1.5 text-xs bg-white rounded-md border border-amber-300 focus:outline-none focus:ring-1 focus:ring-[#1E5AA8]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-700 italic">
                  * Perubahan nama ini langsung diterapkan pada lembar tanda tangan dokumen di bawah tanpa mengubah pengaturan global.
                </p>
              </div>
            )}

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Filter Kategori */}
              <div>
                <label className="block font-semibold text-[#4B5563] mb-1">
                  Kategori Pengeluaran:
                </label>
                <select
                  value={reportCategoryFilter}
                  onChange={e => setReportCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E5AA8]"
                >
                  <option value="All">-- Semua Kategori (Rekap Lengkap) --</option>
                  {DAFTAR_KATEGORI_PENGELUARAN.map(kat => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              {/* Filter Bulan */}
              <div>
                <label className="block font-semibold text-[#4B5563] mb-1">
                  Periode Bulan:
                </label>
                <select
                  value={reportBulanFilter}
                  onChange={e => setReportBulanFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E5AA8]"
                >
                  <option value="All">-- Semua Bulan --</option>
                  {NAMA_BULAN.map((bulan, idx) => (
                    <option key={bulan} value={String(idx + 1)}>{idx + 1}. {bulan}</option>
                  ))}
                </select>
              </div>

              {/* Filter Tahun */}
              <div>
                <label className="block font-semibold text-[#4B5563] mb-1">
                  Tahun Anggaran:
                </label>
                <select
                  value={reportTahunFilter}
                  onChange={e => setReportTahunFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E5AA8]"
                >
                  <option value="All">-- Semua Tahun --</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>Tahun {yr}</option>
                  ))}
                </select>
              </div>

              {/* Filter Status Transaksi */}
              <div>
                <label className="block font-semibold text-[#4B5563] mb-1">
                  Status Transaksi:
                </label>
                <select
                  value={reportStatusFilter}
                  onChange={e => setReportStatusFilter(e.target.value as 'Aktif' | 'All')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#D1D5DB] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E5AA8]"
                >
                  <option value="Aktif">Hanya Transaksi Sah / Aktif (Standar)</option>
                  <option value="All">Semua Termasuk Dibatalkan</option>
                </select>
              </div>
            </div>

            {/* Quick Helper Banner */}
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/60 text-[11px] text-[#1E5AA8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Petunjuk Ekspor PDF:</strong> Klik tombol <strong>Cetak / Simpan PDF</strong>. Pada dialog printer browser, pilih tujuan <strong>"Save as PDF" / "Simpan sebagai PDF"</strong>. Seluruh menu samping, header, dan tombol disembunyikan secara otomatis.
                </span>
              </div>
              <span className="font-mono font-bold whitespace-nowrap ml-2">
                {reportRecords.length} Transaksi Terpilih
              </span>
            </div>
          </div>

          {/* Printable Official Document Sheet */}
          <div 
            id="printable-report-card" 
            className="printable-document bg-white rounded-xl border border-[#E5E7EB] p-8 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none print:m-0 print:w-full"
          >
            
            {/* Civic Official Header (Kop Surat Resmi RT 09 RW 08) */}
            <div className="text-center pb-3 mb-5 border-b-4 border-double border-slate-900 space-y-1">
              <h2 className="text-sm font-bold tracking-widest uppercase text-slate-800">
                PEMERINTAH KOTA SEMARANG • KECAMATAN GENUK
              </h2>
              <h1 className="text-xl font-black tracking-wide uppercase text-slate-900">
                RUKUN TETANGGA 09 RUKUN WARGA 08
              </h1>
              <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                KELURAHAN BANGETAYU WETAN
              </h3>
              <p className="text-[11px] text-slate-600">
                Sekretariat: Balai Warga RT 09 RW 08 Bangetayu Wetan, Genuk, Kota Semarang 50115
              </p>
            </div>

            {/* Document Title & Period Metadata */}
            <div className="text-center my-4 space-y-1.5">
              <h3 className="text-base font-bold underline uppercase text-slate-900 tracking-wide">
                {reportCategoryFilter === 'All' 
                  ? 'LAPORAN PERTANGGUNGJAWABAN PENGELUARAN DANA KAS RT'
                  : `LAPORAN PENGELUARAN DANA - BIDANG ${reportCategoryFilter.toUpperCase()}`
                }
              </h3>
              <p className="text-xs font-semibold text-slate-700">
                Kategori: {reportCategoryFilter === 'All' ? 'Semua Kategori (Rekapitulasi Lengkap)' : reportCategoryFilter} 
                {' • '} 
                Periode: {reportBulanFilter === 'All' ? 'Semua Bulan' : NAMA_BULAN[parseInt(reportBulanFilter, 10) - 1]} 
                {reportTahunFilter === 'All' ? '' : ` Tahun ${reportTahunFilter}`}
              </p>
              <p className="text-[10px] text-slate-500">
                Dokumen resmi diterbitkan pada: {formatTanggalIndonesia(today.toISOString().slice(0, 10))}
              </p>
            </div>

            {/* Financial Summary KPI Box */}
            <div className="my-4 p-3.5 bg-slate-50 border border-slate-300 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
              <div>
                <span className="text-slate-600 block text-[11px]">Total Realisasi Pengeluaran:</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatRupiah(reportTotal)}
                </span>
                <span className="text-[11px] text-slate-600 italic block mt-0.5">
                  Terbilang: <strong>{terbilang(reportTotal)} rupiah</strong>
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-slate-600 block text-[11px]">Jumlah Transaksi:</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {reportRecords.length} Transaksi ({reportStatusFilter === 'Aktif' ? 'Aktif' : 'Semua Termasuk Batal'})
                </span>
              </div>
            </div>

            {/* Table of Expenditures */}
            <div className="overflow-x-auto my-4">
              <table className="w-full text-left text-xs border border-slate-400">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                  <tr>
                    <th className="p-2 border border-slate-300 text-center w-8">No</th>
                    <th className="p-2 border border-slate-300 whitespace-nowrap">Tanggal</th>
                    <th className="p-2 border border-slate-300 whitespace-nowrap">No. Bukti</th>
                    <th className="p-2 border border-slate-300">Kategori</th>
                    <th className="p-2 border border-slate-300">Penerima Dana</th>
                    <th className="p-2 border border-slate-300">Periode / Keperluan</th>
                    <th className="p-2 border border-slate-300">Keterangan Penggunaan Dana</th>
                    <th className="p-2 border border-slate-300 text-right whitespace-nowrap">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                        Tidak ada data transaksi pengeluaran dana untuk filter kategori dan periode yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    reportRecords.map((r, i) => (
                      <tr 
                        key={r.id} 
                        className={`border-b border-slate-300 ${
                          r.status === 'Dibatalkan' ? 'bg-red-50/50 text-slate-400 line-through' : ''
                        }`}
                      >
                        <td className="p-2 border border-slate-300 text-center">{i + 1}</td>
                        <td className="p-2 border border-slate-300 whitespace-nowrap">{formatTanggalIndonesia(r.tanggal)}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px] whitespace-nowrap">{r.noBukti}</td>
                        <td className="p-2 border border-slate-300 font-semibold">{r.kategori}</td>
                        <td className="p-2 border border-slate-300 font-medium">{r.penerima}</td>
                        <td className="p-2 border border-slate-300 text-[11px]">{r.periode || '-'}</td>
                        <td className="p-2 border border-slate-300">
                          <span>{r.keteranganPenggunaanDana || r.keterangan || '-'}</span>
                          {r.status === 'Dibatalkan' && (
                            <span className="block text-[10px] text-red-600 no-underline italic">
                              (Dibatalkan: {r.cancelReason})
                            </span>
                          )}
                        </td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-bold whitespace-nowrap">
                          {formatRupiah(r.nominal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <td colSpan={7} className="p-2.5 border border-slate-300 text-right uppercase tracking-wider">
                      TOTAL REALISASI PENGELUARAN:
                    </td>
                    <td className="p-2.5 border border-slate-300 text-right font-mono text-sm text-red-700 whitespace-nowrap">
                      {formatRupiah(reportTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Required Signatures Block */}
            <div className="signature-section print-avoid-break mt-12 pt-6 flex justify-between items-start text-xs text-slate-900">
              <div className="text-center w-60">
                <p>Mengetahui,</p>
                <p className="font-bold">Ketua RT 09 RW 08</p>
                <div className="h-24 flex items-center justify-center text-slate-300 italic text-[10px] print:text-transparent">
                  ( Tanda Tangan & Cap Resmi RT 09 )
                </div>
                <p className="font-bold underline uppercase tracking-wide">{signerKetua}</p>
                <p className="text-[11px] text-slate-600">Ketua RT 09</p>
              </div>

              <div className="text-center w-60">
                <p>Semarang, {formatTanggalIndonesia(today.toISOString().slice(0, 10))}</p>
                <p className="font-bold">Bendahara RT 09 RW 08</p>
                <div className="h-24 flex items-center justify-center text-slate-300 italic text-[10px] print:text-transparent">
                  ( Tanda Tangan )
                </div>
                <p className="font-bold underline uppercase tracking-wide">{signerBendahara}</p>
                <p className="text-[11px] text-slate-600">Bendahara RT 09</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. MODAL: TAMBAH / EDIT PENGELUARAN */}
      {isFormOpen && (
        <div 
          id="modal-form-pengeluaran"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto no-print"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-w-lg overflow-hidden my-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1E5AA8] flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937]">
                    {editingRecord ? 'Edit Pengeluaran Dana' : 'Tambah Pengeluaran Dana Kas RT'}
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    {editingRecord ? `No. Bukti: ${editingRecord.noBukti}` : 'Nomor bukti otomatis dihasilkan (OUT-YYYYMMDD-XXXX)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-[#9CA3AF] hover:text-[#4B5563] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Tanggal Pengeluaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={e => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Kategori Pengeluaran <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={e => setFormKategori(e.target.value as PengeluaranDanaKategori)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8] bg-white font-medium"
                  >
                    {DAFTAR_KATEGORI_PENGELUARAN.map(kat => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Penerima Dana & Periode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Penerima Dana <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPenerima}
                    onChange={e => setFormPenerima(e.target.value)}
                    placeholder="Contoh: Bapak Agus (Petugas Sampah), Toko Barokah"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Periode (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formPeriode}
                    onChange={e => setFormPeriode(e.target.value)}
                    placeholder="Contoh: September 2026"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8]"
                  />
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-mono font-bold text-[#6B7280]">Rp</span>
                  <input
                    type="text"
                    required
                    value={formNominal ? Number(formNominal.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setFormNominal(digits);
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 text-xs font-mono font-bold text-[#1F2937] rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8]"
                  />
                </div>
                {formNominal && Number(formNominal) > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                    {formatRupiah(Number(formNominal))}
                  </p>
                )}
              </div>

              {/* Keterangan Penggunaan Dana (WAJIB JIKA LAINNYA) */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Keterangan Penggunaan Dana {formKategori === 'Lainnya' ? (
                    <span className="text-red-600 font-bold">(WAJIB UNTUK KATEGORI LAINNYA *)</span>
                  ) : (
                    <span className="text-[#6B7280] font-normal">(Uraian untuk Buku Kas)</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={formKeteranganPenggunaan}
                  onChange={e => setFormKeteranganPenggunaan(e.target.value)}
                  placeholder={
                    formKategori === 'Lainnya'
                      ? 'Wajib diisi: jelaskan secara rinci tujuan pengeluaran dana ini...'
                      : 'Uraian rincian penggunaan dana untuk dicatat ke Buku Kas...'
                  }
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 ${
                    formKategori === 'Lainnya' && !formKeteranganPenggunaan.trim()
                      ? 'border-amber-300 bg-amber-50/20 focus:ring-amber-500 focus:border-amber-500'
                      : 'border-[#D1D5DB] focus:ring-[#1E5AA8] focus:border-[#1E5AA8]'
                  }`}
                />
              </div>

              {/* Catatan / Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={e => setFormKeterangan(e.target.value)}
                  placeholder="Catatan tambahan bila ada..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#1E5AA8] focus:border-[#1E5AA8]"
                />
              </div>

              {/* Info Integration */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-start gap-2 text-[11px] text-[#1E5AA8]">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#1E5AA8]" />
                <div>
                  <span className="font-bold">Otomatis Terintegrasi ke Buku Kas:</span>
                  <p className="text-slate-600 mt-0.5">
                    Transaksi ini akan otomatis masuk ke Buku Kas RT sebagai Pengeluaran dengan sumber <code className="text-[#1E5AA8] font-bold">pengeluaran_dana</code>.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#4B5563] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E5AA8] hover:bg-[#164785] rounded-lg transition-colors shadow-sm"
                >
                  {editingRecord ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: PEMBATALAN / VOID TRANSAKSI */}
      {cancellingRecord && (
        <div 
          id="modal-batal-pengeluaran"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-w-md overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">Batalkan Pengeluaran Dana</h3>
                <p className="text-xs text-red-700">No. Bukti: {cancellingRecord.noBukti}</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-[#4B5563]">
                Anda akan membatalkan transaksi pengeluaran <strong>{cancellingRecord.kategori}</strong> sejumlah{' '}
                <strong className="text-red-600">{formatRupiah(cancellingRecord.nominal)}</strong> untuk{' '}
                <strong>{cancellingRecord.penerima}</strong>.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-[11px]">
                <p className="font-semibold text-slate-800">Penting untuk Akuntansi Kas RT:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Data tidak akan dihapus permanen guna menjaga riwayat audit.</li>
                  <li>Nominal akan dinolkan dari saldo Buku Kas RT.</li>
                  <li>Alasan dan petugas pembatalan akan dicatat ke log sistem.</li>
                </ul>
              </div>

              {cancelError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  {cancelError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Alasan Pembatalan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Contoh: Salah memasukkan nominal / transaksi dibatalkan bendahara..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingRecord(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#4B5563] bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                >
                  Ya, Batalkan Transaksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: DETAIL TRANSAKSI */}
      {detailRecord && (
        <div 
          id="modal-detail-pengeluaran"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print"
        >
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1E5AA8] flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937]">Detail Pengeluaran Dana</h3>
                  <p className="font-mono text-xs font-bold text-[#1E5AA8]">{detailRecord.noBukti}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailRecord(null)}
                className="text-[#9CA3AF] hover:text-[#4B5563] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-[#6B7280]">Nominal Transaksi:</span>
                <span className={`text-base font-mono font-bold ${
                  detailRecord.status === 'Dibatalkan' ? 'line-through text-slate-400' : 'text-red-600'
                }`}>
                  {formatRupiah(detailRecord.nominal)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Tanggal:</span>
                  <span className="font-semibold text-[#1F2937]">{formatTanggalIndonesia(detailRecord.tanggal)}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Kategori:</span>
                  <span className="font-semibold text-[#1F2937]">{detailRecord.kategori}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Penerima:</span>
                  <span className="font-semibold text-[#1F2937]">{detailRecord.penerima}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Periode:</span>
                  <span className="font-semibold text-[#1F2937]">{detailRecord.periode || '-'}</span>
                </div>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[11px]">Keterangan Penggunaan Dana:</span>
                <p className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-[#374151] mt-1">
                  {detailRecord.keteranganPenggunaanDana || detailRecord.keterangan || '-'}
                </p>
              </div>

              {detailRecord.keterangan && detailRecord.keteranganPenggunaanDana && detailRecord.keterangan !== detailRecord.keteranganPenggunaanDana && (
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Keterangan Tambahan:</span>
                  <p className="text-slate-600 mt-0.5">{detailRecord.keterangan}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-[11px] text-[#6B7280] space-y-1">
                <div className="flex justify-between">
                  <span>Petugas Pencatat:</span>
                  <span className="font-medium text-[#374151]">{detailRecord.createdBy || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu Dibuat:</span>
                  <span>{new Date(detailRecord.createdAt).toLocaleString('id-ID')}</span>
                </div>
                {detailRecord.status === 'Dibatalkan' && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 mt-2 space-y-0.5">
                    <span className="font-bold block">Dibatalkan oleh: {detailRecord.cancelledBy}</span>
                    <span>Waktu: {detailRecord.cancelledAt ? new Date(detailRecord.cancelledAt).toLocaleString('id-ID') : '-'}</span>
                    <p className="italic">Alasan: "{detailRecord.cancelReason}"</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    const item = detailRecord;
                    setDetailRecord(null);
                    handlePrintReceipt(item);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E5AA8] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Bukti Kas Keluar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#4B5563] bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: CETAK BUKTI KAS KELUAR / KUITANSI SATUAN (VOUCHER) */}
      {receiptRecord && (
        <div 
          id="modal-receipt-voucher"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-[#E5E7EB] w-full max-w-2xl overflow-hidden my-6 print:m-0 print:border-none print:shadow-none print:w-full">
            {/* Modal Actions Bar (Hidden during print) */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-[#E5E7EB] no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#1E5AA8]" />
                <span className="text-xs font-bold text-slate-800">Pratinjau Bukti Kas Keluar (Voucher Kuitansi RT)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#1E5AA8] hover:bg-[#164785] rounded-lg shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptRecord(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#4B5563] bg-white border border-[#D1D5DB] rounded-lg hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable Voucher Paper */}
            <div className="printable-document p-8 sm:p-10 text-slate-900 print:p-0">
              {/* Civic Kop Surat */}
              <div className="text-center pb-3 mb-4 border-b-2 border-slate-900 space-y-0.5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">
                  RUKUN TETANGGA 09 RUKUN WARGA 08
                </h2>
                <h1 className="text-sm font-black uppercase tracking-wide text-slate-900">
                  KELURAHAN BANGETAYU WETAN • KECAMATAN GENUK SEMARANG
                </h1>
                <p className="text-[10px] text-slate-600">
                  Sekretariat: Balai Warga RT 09 RW 08 Bangetayu Wetan, Genuk, Kota Semarang 50115
                </p>
              </div>

              {/* Title & Metadata */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm underline uppercase tracking-wide">
                    BUKTI PENGELUARAN KAS KELUAR
                  </h3>
                  <span className="text-[10px] text-slate-500">Formulir Pertanggungjawaban Kas RT</span>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-xs">No: {receiptRecord.noBukti}</p>
                  <p className="text-[11px] text-slate-600">Tanggal: {formatTanggalIndonesia(receiptRecord.tanggal)}</p>
                </div>
              </div>

              {/* Voucher Content Table */}
              <div className="space-y-3 text-xs leading-relaxed border border-slate-300 rounded-lg p-4 bg-slate-50/50 print:bg-transparent">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-semibold text-slate-700">Sudah Terima Dari:</span>
                  <span className="col-span-3 font-bold text-slate-900">Bendahara RT 09 RW 08 Bangetayu Wetan</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <span className="font-semibold text-slate-700">Dibayarkan Kepada:</span>
                  <span className="col-span-3 font-bold text-slate-900">{receiptRecord.penerima}</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <span className="font-semibold text-slate-700">Kategori Biaya:</span>
                  <span className="col-span-3 font-bold text-slate-900">{receiptRecord.kategori}</span>
                </div>

                {receiptRecord.periode && (
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-semibold text-slate-700">Periode Kegiatan:</span>
                    <span className="col-span-3 font-medium text-slate-800">{receiptRecord.periode}</span>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <span className="font-semibold text-slate-700">Uraian / Keperluan:</span>
                  <span className="col-span-3 text-slate-900 font-medium">
                    {receiptRecord.keteranganPenggunaanDana || receiptRecord.keterangan || '-'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Uang Sejumlah:</span>
                  <div className="col-span-3">
                    <span className="text-base font-bold font-mono text-slate-900 block">
                      {formatRupiah(receiptRecord.nominal)}
                    </span>
                    <span className="text-[11px] italic text-slate-700 block mt-0.5">
                      ( Terbilang: <strong>{terbilang(receiptRecord.nominal)} rupiah</strong> )
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Signatures: Penerima, Ketua RT 09, Bendahara RT 09 */}
              <div className="signature-section print-avoid-break mt-10 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="text-slate-600">Penerima Uang,</p>
                  <div className="h-20 flex items-center justify-center text-[10px] text-slate-300 print:text-transparent italic">
                    ( Tanda Tangan )
                  </div>
                  <p className="font-bold underline uppercase tracking-wide">{receiptRecord.penerima}</p>
                  <p className="text-[10px] text-slate-500">Penerima Dana</p>
                </div>

                <div>
                  <p className="text-slate-600">Menyetujui,</p>
                  <div className="h-20 flex items-center justify-center text-[10px] text-slate-300 print:text-transparent italic">
                    ( Cap & Tanda Tangan )
                  </div>
                  <p className="font-bold underline uppercase tracking-wide">{signerKetua}</p>
                  <p className="text-[10px] text-slate-500">Ketua RT 09 RW 08</p>
                </div>

                <div>
                  <p className="text-slate-600">Semarang, {formatTanggalIndonesia(receiptRecord.tanggal)}</p>
                  <div className="h-20 flex items-center justify-center text-[10px] text-slate-300 print:text-transparent italic">
                    ( Tanda Tangan )
                  </div>
                  <p className="font-bold underline uppercase tracking-wide">{signerBendahara}</p>
                  <p className="text-[10px] text-slate-500">Bendahara RT 09 RW 08</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
