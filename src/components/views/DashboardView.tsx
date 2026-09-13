import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { NavigationTab } from '../../types';
import { PeriodFilterBar } from '../common/PeriodFilterBar';
import { 
  Coins, 
  CircleDollarSign, 
  Gift, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  UserPlus,
  Briefcase,
  BookOpen,
  HeartHandshake,
  PieChart as PieIcon,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { formatRupiah, NAMA_BULAN } from '../../utils/format';

interface DashboardViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { data, periodFilter } = useData();
  const today = new Date();

  // Sync with global periodFilter if in bulan-tahun mode
  const [selectedBulan, setSelectedBulan] = useState<number>(periodFilter.bulan || (today.getMonth() + 1));
  const [selectedTahun, setSelectedTahun] = useState<number>(periodFilter.tahun || today.getFullYear());

  useEffect(() => {
    if (periodFilter.bulan) setSelectedBulan(periodFilter.bulan);
    if (periodFilter.tahun) setSelectedTahun(periodFilter.tahun);
  }, [periodFilter.bulan, periodFilter.tahun]);

  // Available years from data or fallback
  const years = useMemo(() => {
    const ySet = new Set<number>([2025, 2026, 2027]);
    data.iuran.forEach(i => ySet.add(i.tahun));
    data.jimpitan.forEach(j => ySet.add(j.tahun));
    data.donasi.forEach(d => {
      const y = parseInt(d.tanggal.slice(0, 4), 10);
      if (!isNaN(y)) ySet.add(y);
    });
    data.bop.forEach(b => {
      const y = parseInt(b.tanggal.slice(0, 4), 10);
      if (!isNaN(y)) ySet.add(y);
    });
    return Array.from(ySet).sort((a, b) => b - a);
  }, [data]);

  // Calculations for chosen Month/Year:
  const stats = useMemo(() => {
    // Iuran for this month/year
    const monthlyIuran = data.iuran.filter(i => i.bulan === selectedBulan && i.tahun === selectedTahun);
    const totalIuranMonth = monthlyIuran.reduce((acc, curr) => acc + (curr.total || 0), 0);

    // Jimpitan for this month/year
    const monthlyJimpitan = data.jimpitan.filter(j => j.bulan === selectedBulan && j.tahun === selectedTahun);
    const totalJimpitanMonth = monthlyJimpitan.reduce((acc, curr) => acc + (curr.total || 0), 0);

    // Donasi for this month/year
    const monthlyDonasi = data.donasi.filter(d => {
      const parts = d.tanggal.split('-');
      return parseInt(parts[0], 10) === selectedTahun && parseInt(parts[1], 10) === selectedBulan;
    });
    const totalDonasiMonth = monthlyDonasi.reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // BOP for this month/year
    const monthlyBop = data.bop.filter(b => {
      const parts = b.tanggal.split('-');
      return parseInt(parts[0], 10) === selectedTahun && parseInt(parts[1], 10) === selectedBulan;
    });
    const totalBopPemasukanMonth = monthlyBop
      .filter(b => b.jenis === 'Pemasukan')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    const totalBopPengeluaranMonth = monthlyBop
      .filter(b => b.jenis === 'Pengeluaran')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    // Total Overall (All time for global cash balance)
    const allIuran = data.iuran.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const allJimpitan = data.jimpitan.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const allDonasi = data.donasi.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    const allBopPemasukan = data.bop
      .filter(b => b.jenis === 'Pemasukan')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    const allBopPengeluaran = data.bop
      .filter(b => b.jenis === 'Pengeluaran')
      .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

    const totalPemasukanMonth = totalIuranMonth + totalJimpitanMonth + totalDonasiMonth + totalBopPemasukanMonth;
    const saldoKasMonth = totalPemasukanMonth - totalBopPengeluaranMonth;

    const totalPemasukanAll = allIuran + allJimpitan + allDonasi + allBopPemasukan;
    const saldoKasAll = totalPemasukanAll - allBopPengeluaran;

    // Warga payment status for chosen month
    const totalWarga = data.warga.length;
    const activeWarga = data.warga.filter(w => w.status === 'Aktif');
    
    let wargaLunas = 0;
    let wargaSebagian = 0;
    let wargaBelum = 0;

    activeWarga.forEach(w => {
      const rec = monthlyIuran.find(i => i.wargaId === w.id);
      if (!rec || rec.status === 'Belum Bayar') {
        wargaBelum++;
      } else if (rec.status === 'Lunas') {
        wargaLunas++;
      } else {
        wargaSebagian++;
      }
    });

    // Jimpitan current week count
    const day = today.getDate();
    const currentWeekNum = Math.min(5, Math.ceil(day / 7));
    const currentWeekKey = `minggu${currentWeekNum}` as 'minggu1' | 'minggu2' | 'minggu3' | 'minggu4' | 'minggu5';
    
    const jimpitanThisWeekPaidCount = monthlyJimpitan.filter(j => j[currentWeekKey] === true).length;

    // Sources breakdown for month
    const sources = [
      { name: 'Iuran Warga', amount: totalIuranMonth, color: 'bg-[#1E5AA8]', hex: '#1E5AA8' },
      { name: 'Jimpitan', amount: totalJimpitanMonth, color: 'bg-[#0EA5E9]', hex: '#0EA5E9' },
      { name: 'Donasi Sukarela', amount: totalDonasiMonth, color: 'bg-[#D4AF37]', hex: '#D4AF37' },
      { name: 'Pemasukan BOP', amount: totalBopPemasukanMonth, color: 'bg-[#198754]', hex: '#198754' },
    ];

    // Dana Talangan calculations
    const talanganFunds = data.danaTalanganFunds || [];
    const allTalangan = data.danaTalangan || [];
    const activeTalanganList = allTalangan.filter(t => t.statusAktif === 'Aktif');
    
    const totalDanaTalanganDisediakan = talanganFunds.reduce((sum, f) => sum + (Number(f.jumlah) || 0), 0);
    const totalTalanganDipinjam = activeTalanganList.reduce((sum, t) => sum + (Number(t.jumlahTalangan) || 0), 0);
    const totalTalanganDilunasi = activeTalanganList.reduce((sum, t) => sum + (Number(t.totalPelunasan) || 0), 0);
    const totalTalanganBelumDilunasi = Math.max(0, totalTalanganDipinjam - totalTalanganDilunasi);
    const danaTalanganTersedia = Math.max(0, totalDanaTalanganDisediakan - totalTalanganBelumDilunasi);
    const talanganBelumLunasCount = activeTalanganList.filter(t => t.status === 'Belum Lunas').length;
    const talanganSebagianCount = activeTalanganList.filter(t => t.status === 'Sebagian').length;
    const talanganLunasCount = activeTalanganList.filter(t => t.status === 'Lunas').length;

    return {
      totalIuranMonth,
      totalJimpitanMonth,
      totalDonasiMonth,
      totalBopPemasukanMonth,
      totalBopPengeluaranMonth,
      totalPemasukanMonth,
      saldoKasMonth,
      totalPemasukanAll,
      saldoKasAll,
      totalWarga,
      activeWargaCount: activeWarga.length,
      wargaLunas,
      wargaSebagian,
      wargaBelum,
      currentWeekNum,
      jimpitanThisWeekPaidCount,
      sources,
      monthlyBop,
      totalDanaTalanganDisediakan,
      totalTalanganDipinjam,
      totalTalanganDilunasi,
      totalTalanganBelumDilunasi,
      danaTalanganTersedia,
      talanganBelumLunasCount,
      talanganSebagianCount,
      talanganLunasCount,
      activeTalanganCount: activeTalanganList.length,
    };
  }, [data, selectedBulan, selectedTahun, today]);

  // Annual monthly comparison trend (12 months of selectedTahun)
  const monthlyTrends = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const mIuran = data.iuran
        .filter(i => i.bulan === m && i.tahun === selectedTahun)
        .reduce((sum, c) => sum + (c.total || 0), 0);
      const mJimpitan = data.jimpitan
        .filter(j => j.bulan === m && j.tahun === selectedTahun)
        .reduce((sum, c) => sum + (c.total || 0), 0);
      const mDonasi = data.donasi
        .filter(d => {
          const parts = d.tanggal.split('-');
          return parseInt(parts[0], 10) === selectedTahun && parseInt(parts[1], 10) === m;
        })
        .reduce((sum, c) => sum + (c.nominal || 0), 0);
      const mBopIn = data.bop
        .filter(b => {
          const parts = b.tanggal.split('-');
          return parseInt(parts[0], 10) === selectedTahun && parseInt(parts[1], 10) === m && b.jenis === 'Pemasukan';
        })
        .reduce((sum, c) => sum + (c.nominal || 0), 0);
      const mBopOut = data.bop
        .filter(b => {
          const parts = b.tanggal.split('-');
          return parseInt(parts[0], 10) === selectedTahun && parseInt(parts[1], 10) === m && b.jenis === 'Pengeluaran';
        })
        .reduce((sum, c) => sum + (c.nominal || 0), 0);

      const pemasukan = mIuran + mJimpitan + mDonasi + mBopIn;
      return {
        monthIndex: m,
        monthName: NAMA_BULAN[idx].slice(0, 3),
        pemasukan,
        pengeluaran: mBopOut,
      };
    });
  }, [data, selectedTahun]);

  const maxTrendValue = Math.max(
    ...monthlyTrends.map(t => Math.max(t.pemasukan, t.pengeluaran)),
    100000
  );

  const formattedToday = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div id="view-dashboard" className="space-y-6 animate-in fade-in duration-200">
      
      {/* 6. Header Dashboard: Selamat Datang Keuangan RT 09 RW 08 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E5AA8]">
              Dashboard Administrasi
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs text-[#6B7280] font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#1E5AA8]" />
              {formattedToday}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] tracking-tight mt-1">
            Selamat Datang di Keuangan RT 09 RW 08
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Kelurahan Bangetayu Wetan, Kecamatan Genuk, Kota Semarang
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-[#E5E7EB] text-xs">
            <span className="text-[#6B7280] text-[11px] font-medium">Bulan:</span>
            <select
              id="filter-dashboard-bulan"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(Number(e.target.value))}
              className="bg-transparent text-[#1F2937] font-semibold focus:outline-none cursor-pointer"
            >
              {NAMA_BULAN.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-[#E5E7EB] text-xs">
            <span className="text-[#6B7280] text-[11px] font-medium">Tahun:</span>
            <select
              id="filter-dashboard-tahun"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="bg-transparent text-[#1F2937] font-semibold focus:outline-none cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 9. AKSI CEPAT */}
      {onNavigate && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
              AKSI CEPAT
            </span>
            <span className="text-[11px] text-[#6B7280]">Pintasan entri data transaksi</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            
            {/* Primary Blue Button */}
            <button
              id="btn-quick-catat-iuran"
              type="button"
              onClick={() => onNavigate('iuran')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#1E5AA8] hover:bg-[#164A87] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Coins className="w-4 h-4 shrink-0" />
              <span>+ Catat Iuran</span>
            </button>

            {/* Secondary White Buttons with borders */}
            <button
              id="btn-quick-add-warga"
              type="button"
              onClick={() => onNavigate('warga')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1F2937] border border-[#E5E7EB] text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-4 h-4 text-[#1E5AA8] shrink-0" />
              <span>+ Tambah Warga</span>
            </button>

            <button
              id="btn-quick-catat-jimpitan"
              type="button"
              onClick={() => onNavigate('jimpitan')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1F2937] border border-[#E5E7EB] text-xs font-semibold transition-colors"
            >
              <CircleDollarSign className="w-4 h-4 text-[#0EA5E9] shrink-0" />
              <span>+ Catat Jimpitan</span>
            </button>

            <button
              id="btn-quick-catat-donasi"
              type="button"
              onClick={() => onNavigate('donasi')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1F2937] border border-[#E5E7EB] text-xs font-semibold transition-colors"
            >
              <Gift className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>+ Catat Donasi</span>
            </button>

            <button
              id="btn-quick-catat-bop"
              type="button"
              onClick={() => onNavigate('bop')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1F2937] border border-[#E5E7EB] text-xs font-semibold transition-colors"
            >
              <Briefcase className="w-4 h-4 text-[#198754] shrink-0" />
              <span>+ Catat BOP</span>
            </button>

            <button
              id="btn-quick-catat-talangan"
              type="button"
              onClick={() => onNavigate('dana-talangan')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1F2937] border border-[#E5E7EB] text-xs font-semibold transition-colors"
            >
              <HeartHandshake className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>+ Catat Talangan</span>
            </button>

            <button
              id="btn-quick-buku-kas"
              type="button"
              onClick={() => onNavigate('buku-kas')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white hover:bg-slate-50 text-[#1F2937] border border-[#E5E7EB] text-xs font-semibold transition-colors col-span-2 sm:col-span-1"
            >
              <BookOpen className="w-4 h-4 text-[#1E5AA8] shrink-0" />
              <span>Buku Kas</span>
            </button>

          </div>
        </div>
      )}

      {/* 7 & 8. KARTU STATISTIK (White card, thin border, soft shadow, elegant accent line) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: TOTAL PEMASUKAN (Accent: biru/hijau) */}
        <div 
          id="card-stat-pemasukan" 
          className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#198754]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              TOTAL PEMASUKAN
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#198754] border border-emerald-100">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-[#198754] tracking-tight">
              {formatRupiah(stats.totalPemasukanMonth)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1 flex items-center justify-between">
              <span>Bulan {NAMA_BULAN[selectedBulan - 1]}</span>
              <span className="text-[#198754] font-medium">Akumulasi: {formatRupiah(stats.totalPemasukanAll)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: TOTAL PENGELUARAN (Accent: merah lembut) */}
        <div 
          id="card-stat-pengeluaran" 
          className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#DC3545]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              TOTAL PENGELUARAN
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-[#DC3545] border border-rose-100">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-[#DC3545] tracking-tight">
              {formatRupiah(stats.totalBopPengeluaranMonth)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1 flex items-center justify-between">
              <span>BOP Operasional</span>
              <span className="text-[#DC3545] font-medium">{stats.monthlyBop.filter(b => b.jenis === 'Pengeluaran').length} transaksi</span>
            </div>
          </div>
        </div>

        {/* Card 3: SALDO KAS (Accent: biru) */}
        <div 
          id="card-stat-saldo" 
          className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#1E5AA8]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              SALDO KAS
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#1E5AA8] border border-blue-100">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono tracking-tight ${stats.saldoKasMonth >= 0 ? 'text-[#1E5AA8]' : 'text-[#DC3545]'}`}>
              {formatRupiah(stats.saldoKasMonth)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1 flex items-center justify-between">
              <span>Kas Bersih Bulan Ini</span>
              <span className="text-[#1E5AA8] font-medium">Total: {formatRupiah(stats.saldoKasAll)}</span>
            </div>
          </div>
        </div>

        {/* Card 4: DANA TALANGAN BELUM LUNAS (Accent: emas) */}
        <div 
          id="card-stat-talangan-unpaid" 
          className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm relative overflow-hidden transition-all hover:shadow-md"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4AF37]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              TALANGAN BELUM LUNAS
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-[#D4AF37] border border-amber-100">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-[#D4AF37] tracking-tight">
              {formatRupiah(stats.totalTalanganBelumDilunasi)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1 flex items-center justify-between">
              <span>Piutang Kas Kematian</span>
              <span className="text-amber-800 font-medium">{stats.talanganBelumLunasCount} belum • {stats.talanganSebagianCount} sebagian</span>
            </div>
          </div>
        </div>

      </div>

      {/* Deficit Alert if any */}
      {stats.saldoKasMonth < 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-[#DC3545] flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC3545] flex-shrink-0" />
          <div className="text-xs">
            <strong className="font-semibold">Peringatan Defisit:</strong> Pengeluaran operasional bulan {NAMA_BULAN[selectedBulan - 1]} melebihi total penerimaan bulan ini.
          </div>
        </div>
      )}

      {/* 12. DANA TALANGAN KEMATIAN CARD (Aksen Emas Elegan) */}
      <div 
        id="section-dashboard-dana-talangan" 
        className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-[#D4AF37] flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#1F2937]">
                  DANA TALANGAN KEMATIAN
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Kas Tanggap Darurat Warga
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Pinjaman siaga musibah duka cita & transparansi pelunasan kas RT 09
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              id="btn-lihat-semua-talangan"
              type="button"
              onClick={() => onNavigate('dana-talangan')}
              className="text-xs font-semibold text-[#1E5AA8] hover:text-[#164A87] flex items-center gap-1.5 self-start sm:self-center transition-colors"
            >
              <span>Kelola Selengkapnya</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 4 Cards: Dana Tersedia, Total Dipinjam, Belum Lunas, Sudah Dilunasi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4">
          
          {/* Dana Tersedia */}
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-[#6B7280]">Dana Tersedia</span>
            <div className="text-lg font-bold font-mono text-[#198754] mt-1">
              {formatRupiah(stats.danaTalanganTersedia)}
            </div>
            <span className="text-[10px] text-[#6B7280] mt-0.5 block">Siap disalurkan</span>
          </div>

          {/* Total Dipinjam */}
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-[#6B7280]">Total Dipinjam</span>
            <div className="text-lg font-bold font-mono text-[#1F2937] mt-1">
              {formatRupiah(stats.totalTalanganDipinjam)}
            </div>
            <span className="text-[10px] text-[#6B7280] mt-0.5 block">{stats.activeTalanganCount} penerima manfaat</span>
          </div>

          {/* Belum Lunas */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-800">Belum Lunas</span>
            <div className="text-lg font-bold font-mono text-[#D4AF37] mt-1">
              {formatRupiah(stats.totalTalanganBelumDilunasi)}
            </div>
            <span className="text-[10px] text-amber-700 mt-0.5 block">
              {stats.talanganBelumLunasCount} belum &bull; {stats.talanganSebagianCount} sebagian
            </span>
          </div>

          {/* Sudah Dilunasi */}
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB]">
            <span className="text-[11px] font-medium text-[#6B7280]">Sudah Dilunasi</span>
            <div className="text-lg font-bold font-mono text-[#1E5AA8] mt-1">
              {formatRupiah(stats.totalTalanganDilunasi)}
            </div>
            <span className="text-[10px] text-[#6B7280] mt-0.5 block">{stats.talanganLunasCount} telah tuntas</span>
          </div>

        </div>
      </div>

      {/* 10. DASHBOARD ARUS KAS (Grafik Sederhana Mudah Dibaca) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1E5AA8]" />
              <h3 className="text-sm sm:text-base font-bold text-[#1F2937]">
                ARUS KAS
              </h3>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Grafik perbandingan penerimaan kas vs pengeluaran operasional (Tahun {selectedTahun})
            </p>
          </div>

          {/* Clean Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#198754]" />
              <span className="text-[#1F2937] font-medium">Pemasukan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#DC3545]" />
              <span className="text-[#1F2937] font-medium">Pengeluaran</span>
            </div>
          </div>
        </div>

        {/* 2D Bar Chart Display */}
        <div className="mt-6">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 h-48 items-end pb-2 pt-4">
            {monthlyTrends.map(t => {
              const inHeightPct = maxTrendValue > 0 ? (t.pemasukan / maxTrendValue) * 100 : 0;
              const outHeightPct = maxTrendValue > 0 ? (t.pengeluaran / maxTrendValue) * 100 : 0;
              const isSelected = t.monthIndex === selectedBulan;

              return (
                <div 
                  key={t.monthIndex} 
                  className={`flex flex-col items-center justify-end h-full group relative cursor-pointer ${
                    isSelected ? 'p-1 rounded-xl bg-blue-50/70 border border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedBulan(t.monthIndex)}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-white border border-[#E5E7EB] text-[10px] text-[#1F2937] py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                    <span className="font-bold">{NAMA_BULAN[t.monthIndex - 1]}</span>
                    <span className="text-[#198754] font-mono">+{formatRupiah(t.pemasukan)}</span>
                    <span className="text-[#DC3545] font-mono">-{formatRupiah(t.pengeluaran)}</span>
                  </div>

                  <div className="flex items-end gap-1 w-full justify-center h-32">
                    {/* Bar Pemasukan */}
                    <div 
                      className="w-2.5 sm:w-3.5 bg-[#198754] rounded-t-sm transition-all duration-300"
                      style={{ height: `${Math.max(4, inHeightPct)}%` }}
                    />
                    {/* Bar Pengeluaran */}
                    <div 
                      className="w-2.5 sm:w-3.5 bg-[#DC3545] rounded-t-sm transition-all duration-300"
                      style={{ height: `${Math.max(4, outHeightPct)}%` }}
                    />
                  </div>

                  <span className={`text-[11px] mt-2 font-medium ${isSelected ? 'text-[#1E5AA8] font-bold' : 'text-[#6B7280]'}`}>
                    {t.monthName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 11. KOMPOSISI PEMASUKAN & DETAIL WARGA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 11. SUMBER PEMASUKAN */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#1E5AA8]" />
                <h3 className="text-sm font-bold text-[#1F2937]">
                  SUMBER PEMASUKAN
                </h3>
              </div>
              <span className="text-xs text-[#6B7280]">{NAMA_BULAN[selectedBulan - 1]}</span>
            </div>

            <div className="space-y-3.5 mt-4">
              {stats.sources.map(src => {
                const pct = stats.totalPemasukanMonth > 0 
                  ? Math.round((src.amount / stats.totalPemasukanMonth) * 100) 
                  : 0;

                return (
                  <div key={src.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#1F2937] font-medium flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${src.color}`} />
                        {src.name}
                      </span>
                      <span className="font-mono font-semibold text-[#1F2937]">
                        {formatRupiah(src.amount)} <span className="text-[#6B7280] font-normal text-[11px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full ${src.color} rounded-full transition-all duration-300`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
            <span className="text-[#6B7280] font-medium">Total Pemasukan Bulan Ini:</span>
            <span className="text-sm font-bold font-mono text-[#198754]">
              {formatRupiah(stats.totalPemasukanMonth)}
            </span>
          </div>
        </div>

        {/* Status Iuran Warga */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1E5AA8]" />
                <h3 className="text-sm font-bold text-[#1F2937]">
                  STATUS IURAN WARGA
                </h3>
              </div>
              <span className="text-xs text-[#6B7280]">{stats.activeWargaCount} Warga Aktif</span>
            </div>

            <div className="space-y-4 mt-4">
              {/* Lunas */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#198754] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Membayar (Lunas)
                  </span>
                  <span className="text-[#1F2937] font-mono font-bold">
                    {stats.wargaLunas} / {stats.activeWargaCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-[#198754] rounded-full transition-all duration-500" 
                    style={{ width: `${stats.activeWargaCount > 0 ? (stats.wargaLunas / stats.activeWargaCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Sebagian */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#F59E0B] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Membayar Sebagian
                  </span>
                  <span className="text-[#1F2937] font-mono font-bold">
                    {stats.wargaSebagian} / {stats.activeWargaCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-[#F59E0B] rounded-full transition-all duration-500" 
                    style={{ width: `${stats.activeWargaCount > 0 ? (stats.wargaSebagian / stats.activeWargaCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Belum Bayar */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#DC3545] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Belum Membayar
                  </span>
                  <span className="text-[#1F2937] font-mono font-bold">
                    {stats.wargaBelum} / {stats.activeWargaCount}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-[#DC3545] rounded-full transition-all duration-500" 
                    style={{ width: `${stats.activeWargaCount > 0 ? (stats.wargaBelum / stats.activeWargaCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
            <span>Tingkat Kepatuhan:</span>
            <span className="font-bold text-[#198754] font-mono">
              {stats.activeWargaCount > 0 ? Math.round(((stats.wargaLunas + (stats.wargaSebagian * 0.5)) / stats.activeWargaCount) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Jimpitan Week Overview */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-[#0EA5E9]" />
                <h3 className="text-sm font-bold text-[#1F2937]">
                  REKAP JIMPITAN MINGGUAN
                </h3>
              </div>
              <span className="text-xs text-[#6B7280]">5 Pekan</span>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-4 text-center">
              {[1, 2, 3, 4, 5].map(wNum => {
                const key = `minggu${wNum}` as 'minggu1' | 'minggu2' | 'minggu3' | 'minggu4' | 'minggu5';
                const mJimp = data.jimpitan.filter(j => j.bulan === selectedBulan && j.tahun === selectedTahun);
                const count = mJimp.filter(j => j[key] === true).length;
                const isCurrent = wNum === stats.currentWeekNum;

                return (
                  <div 
                    key={wNum} 
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                      isCurrent 
                        ? 'bg-blue-50 border-[#1E5AA8]/30' 
                        : 'bg-[#F7F9FC] border-[#E5E7EB]'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-[#6B7280]">M-{wNum}</span>
                    <span className="text-sm font-bold text-[#1F2937] font-mono">{count}</span>
                    <span className="text-[9px] text-[#1E5AA8] font-medium">warga</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1.5 text-xs text-[#1F2937]">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Pekan Berjalan:</span>
                <span className="font-semibold text-[#1E5AA8]">Minggu {stats.currentWeekNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Terkumpul Pekan Ini:</span>
                <span className="font-semibold text-[#1F2937]">{stats.jimpitanThisWeekPaidCount} warga</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Nominal Tarif:</span>
                <span className="font-semibold font-mono text-[#1E5AA8]">{formatRupiah(data.settings.nominalJimpitan)} / pekan</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Total Jimpitan Bulan Ini:</span>
            <span className="text-sm font-bold font-mono text-[#0EA5E9]">{formatRupiah(stats.totalJimpitanMonth)}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
