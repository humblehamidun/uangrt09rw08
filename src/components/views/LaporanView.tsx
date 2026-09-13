import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  DollarSign, 
  Coins, 
  CircleDollarSign, 
  Gift, 
  Briefcase, 
  Building2,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatRupiah, NAMA_BULAN, formatTanggalIndonesia, downloadCSV } from '../../utils/format';

type LaporanTab = 'kas_rt' | 'iuran' | 'jimpitan' | 'donasi' | 'bop';

export const LaporanView: React.FC = () => {
  const { data, getIuranForWarga, getJimpitanForWarga, periodFilter } = useData();

  const today = new Date();
  const [activeTab, setActiveTab] = useState<LaporanTab>('kas_rt');
  const [selectedBulan, setSelectedBulan] = useState<number>(periodFilter.bulan || (today.getMonth() + 1));
  const [selectedTahun, setSelectedTahun] = useState<number>(periodFilter.tahun || today.getFullYear());
  const [useSemuaBulan, setUseSemuaBulan] = useState<boolean>(periodFilter.mode === 'semua');

  useEffect(() => {
    if (periodFilter.bulan) setSelectedBulan(periodFilter.bulan);
    if (periodFilter.tahun) setSelectedTahun(periodFilter.tahun);
    if (periodFilter.mode === 'semua') setUseSemuaBulan(true);
    else if (periodFilter.mode === 'bulan-tahun') setUseSemuaBulan(false);
  }, [periodFilter.bulan, periodFilter.tahun, periodFilter.mode]);

  const years = useMemo(() => {
    const ySet = new Set<number>([2025, 2026, 2027]);
    data.iuran.forEach(i => ySet.add(i.tahun));
    data.jimpitan.forEach(j => ySet.add(j.tahun));
    return Array.from(ySet).sort((a, b) => b - a);
  }, [data.iuran, data.jimpitan]);

  // Calculations for Iuran in selected period
  const iuranReportData = useMemo(() => {
    const filtered = data.iuran.filter(i => {
      if (i.tahun !== selectedTahun) return false;
      if (!useSemuaBulan && i.bulan !== selectedBulan) return false;
      return true;
    });

    let totalKas = 0;
    let totalMeja = 0;
    let totalSampah = 0;
    let totalAcara = 0;
    let totalSosial = 0;
    let totalAll = 0;

    filtered.forEach(i => {
      if (i.kas) totalKas += data.settings.nominalKas;
      if (i.uangMeja) totalMeja += data.settings.nominalUangMeja;
      if (i.uangSampah) totalSampah += data.settings.nominalUangSampah;
      if (i.danaAcaraTahunan) totalAcara += data.settings.nominalDanaAcaraTahunan;
      if (i.uangSosial) totalSosial += data.settings.nominalUangSosial;
      totalAll += i.total;
    });

    return {
      records: filtered,
      totalKas,
      totalMeja,
      totalSampah,
      totalAcara,
      totalSosial,
      totalAll,
      wargaCount: filtered.length,
    };
  }, [data.iuran, data.settings, selectedBulan, selectedTahun, useSemuaBulan]);

  // Calculations for Jimpitan in selected period
  const jimpitanReportData = useMemo(() => {
    const filtered = data.jimpitan.filter(j => {
      if (j.tahun !== selectedTahun) return false;
      if (!useSemuaBulan && j.bulan !== selectedBulan) return false;
      return true;
    });

    let totalM1 = 0, totalM2 = 0, totalM3 = 0, totalM4 = 0, totalM5 = 0;
    const nominal = data.settings.nominalJimpitan;

    filtered.forEach(j => {
      if (j.minggu1) totalM1 += nominal;
      if (j.minggu2) totalM2 += nominal;
      if (j.minggu3) totalM3 += nominal;
      if (j.minggu4) totalM4 += nominal;
      if (j.minggu5) totalM5 += nominal;
    });

    const totalJimpitan = totalM1 + totalM2 + totalM3 + totalM4 + totalM5;

    return {
      records: filtered,
      totalM1,
      totalM2,
      totalM3,
      totalM4,
      totalM5,
      totalJimpitan,
    };
  }, [data.jimpitan, data.settings, selectedBulan, selectedTahun, useSemuaBulan]);

  // Donations in selected period
  const donasiReportData = useMemo(() => {
    const filtered = data.donasi.filter(d => {
      const date = new Date(d.tanggal);
      if (date.getFullYear() !== selectedTahun) return false;
      if (!useSemuaBulan && date.getMonth() + 1 !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const total = filtered.reduce((s, d) => s + (d.nominal || 0), 0);
    return {
      records: filtered,
      total,
    };
  }, [data.donasi, selectedBulan, selectedTahun, useSemuaBulan]);

  // BOP in selected period
  const bopReportData = useMemo(() => {
    const filtered = data.bop.filter(b => {
      const date = new Date(b.tanggal);
      if (date.getFullYear() !== selectedTahun) return false;
      if (!useSemuaBulan && date.getMonth() + 1 !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const masuk = filtered.filter(b => b.jenis === 'Pemasukan').reduce((s, b) => s + (b.nominal || 0), 0);
    const keluar = filtered.filter(b => b.jenis === 'Pengeluaran').reduce((s, b) => s + (b.nominal || 0), 0);

    return {
      records: filtered,
      masuk,
      keluar,
      saldo: masuk - keluar,
    };
  }, [data.bop, selectedBulan, selectedTahun, useSemuaBulan]);

  // Overall Kas RT Financial Statement (Laporan Keuangan Keseluruhan)
  const kasRtStatement = useMemo(() => {
    const totalPemasukan = iuranReportData.totalAll + jimpitanReportData.totalJimpitan + donasiReportData.total + bopReportData.masuk;
    const totalPengeluaran = bopReportData.keluar;
    const saldoAkhir = totalPemasukan - totalPengeluaran;

    return {
      totalPemasukan,
      totalPengeluaran,
      saldoAkhir,
      isDefisit: saldoAkhir < 0,
    };
  }, [iuranReportData, jimpitanReportData, donasiReportData, bopReportData]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export for active tab
  const handleExportActiveTab = () => {
    const periodStr = useSemuaBulan ? `Tahun_${selectedTahun}` : `${NAMA_BULAN[selectedBulan - 1]}_${selectedTahun}`;

    if (activeTab === 'kas_rt') {
      const headers = ['Kategori', 'Keterangan / Pos Anggaran', 'Nominal'];
      const rows = [
        ['PEMASUKAN', 'Total Iuran Warga (5 Pos)', formatRupiah(iuranReportData.totalAll)],
        ['PEMASUKAN', 'Total Jimpitan Mingguan', formatRupiah(jimpitanReportData.totalJimpitan)],
        ['PEMASUKAN', 'Total Donasi Sukarela', formatRupiah(donasiReportData.total)],
        ['PEMASUKAN', 'Total Pemasukan BOP (Bantuan/Subsidi)', formatRupiah(bopReportData.masuk)],
        ['TOTAL PEMASUKAN', 'Semua Penerimaan Kas RT', formatRupiah(kasRtStatement.totalPemasukan)],
        ['PENGELUARAN', 'Total Pengeluaran BOP (Biaya Operasional)', formatRupiah(bopReportData.keluar)],
        ['TOTAL PENGELUARAN', 'Semua Pengeluaran Kas RT', formatRupiah(kasRtStatement.totalPengeluaran)],
        ['SALDO AKHIR RT', 'Total Pemasukan - Total Pengeluaran', formatRupiah(kasRtStatement.saldoAkhir)],
      ];
      downloadCSV(`Laporan_Kas_RT09_RW08_${periodStr}`, headers, rows);
    } else if (activeTab === 'iuran') {
      const headers = ['No', 'Nomor Rumah', 'Nama Warga', 'Kas', 'Uang Meja', 'Uang Sampah', 'Dana Acara', 'Uang Sosial', 'Total', 'Status'];
      const rows = iuranReportData.records.map((r, idx) => [
        idx + 1,
        r.wargaNomorRumah,
        r.wargaNama,
        r.kas ? formatRupiah(data.settings.nominalKas) : 'Rp 0',
        r.uangMeja ? formatRupiah(data.settings.nominalUangMeja) : 'Rp 0',
        r.uangSampah ? formatRupiah(data.settings.nominalUangSampah) : 'Rp 0',
        r.danaAcaraTahunan ? formatRupiah(data.settings.nominalDanaAcaraTahunan) : 'Rp 0',
        r.uangSosial ? formatRupiah(data.settings.nominalUangSosial) : 'Rp 0',
        formatRupiah(r.total),
        r.status,
      ]);
      downloadCSV(`Laporan_Iuran_${periodStr}`, headers, rows);
    } else if (activeTab === 'jimpitan') {
      const headers = ['No', 'Nomor Rumah', 'Nama Warga', 'M1', 'M2', 'M3', 'M4', 'M5', 'Total'];
      const rows = jimpitanReportData.records.map((r, idx) => [
        idx + 1,
        r.wargaNomorRumah,
        r.wargaNama,
        r.minggu1 ? 'Rp 3.000' : 'Rp 0',
        r.minggu2 ? 'Rp 3.000' : 'Rp 0',
        r.minggu3 ? 'Rp 3.000' : 'Rp 0',
        r.minggu4 ? 'Rp 3.000' : 'Rp 0',
        r.minggu5 ? 'Rp 3.000' : 'Rp 0',
        formatRupiah(r.total),
      ]);
      downloadCSV(`Laporan_Jimpitan_${periodStr}`, headers, rows);
    } else if (activeTab === 'donasi') {
      const headers = ['No', 'Tanggal', 'Nama Donatur', 'Nomor Rumah', 'Nominal', 'Keterangan'];
      const rows = donasiReportData.records.map((d, idx) => [
        idx + 1,
        d.tanggal,
        d.namaDonatur,
        d.nomorRumah || '-',
        formatRupiah(d.nominal),
        d.keterangan || '-',
      ]);
      downloadCSV(`Laporan_Donasi_${periodStr}`, headers, rows);
    } else if (activeTab === 'bop') {
      const headers = ['No', 'Tanggal', 'Jenis', 'Kategori', 'Uraian', 'Nominal', 'Keterangan'];
      const rows = bopReportData.records.map((b, idx) => [
        idx + 1,
        b.tanggal,
        b.jenis,
        b.kategori,
        b.uraian,
        formatRupiah(b.nominal),
        b.keterangan || '-',
      ]);
      downloadCSV(`Laporan_BOP_${periodStr}`, headers, rows);
    }
  };

  const periodLabel = useSemuaBulan 
    ? `Semua Periode Tahun ${selectedTahun}` 
    : `Bulan ${NAMA_BULAN[selectedBulan - 1]} ${selectedTahun}`;

  return (
    <div id="view-laporan" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner (hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              LAPORAN KEUANGAN RT 09 RW 08
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {periodLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cetak dan ekspor laporan keuangan kas RT, iuran, jimpitan, donasi, dan BOP
          </p>
        </div>

        {/* Action buttons & Period Select */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            id="btn-print-laporan"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Cetak / PDF
          </button>

          <button
            id="btn-export-laporan-csv"
            type="button"
            onClick={handleExportActiveTab}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>

          {/* All Months Toggle */}
          <button
            type="button"
            onClick={() => setUseSemuaBulan(!useSemuaBulan)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              useSemuaBulan 
                ? 'bg-emerald-600 border-emerald-500 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {useSemuaBulan ? 'Semua Bulan (Aktif)' : 'Pilih Per Bulan'}
          </button>

          {/* Month selector */}
          {!useSemuaBulan && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <select
                id="select-laporan-bulan"
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(Number(e.target.value))}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {NAMA_BULAN.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year selector */}
          <div className="flex items-center px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <select
              id="select-laporan-tahun"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Tabs navigation (hidden on print) */}
      <div className="print:hidden flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          id="tab-laporan-kas-rt"
          type="button"
          onClick={() => setActiveTab('kas_rt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'kas_rt'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          5. Laporan Kas RT (Keseluruhan)
        </button>

        <button
          id="tab-laporan-iuran"
          type="button"
          onClick={() => setActiveTab('iuran')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'iuran'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          1. Laporan Iuran Bulanan
        </button>

        <button
          id="tab-laporan-jimpitan"
          type="button"
          onClick={() => setActiveTab('jimpitan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'jimpitan'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CircleDollarSign className="w-4 h-4" />
          2. Laporan Jimpitan
        </button>

        <button
          id="tab-laporan-donasi"
          type="button"
          onClick={() => setActiveTab('donasi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'donasi'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Gift className="w-4 h-4" />
          3. Laporan Donasi
        </button>

        <button
          id="tab-laporan-bop"
          type="button"
          onClick={() => setActiveTab('bop')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'bop'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          4. Laporan BOP
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div 
        id="printable-report-card" 
        className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl print:bg-white print:text-black print:border-none print:p-2 print:shadow-none"
      >
        {/* Printable Header / Kop Surat */}
        <div className="pb-6 mb-6 border-b border-slate-800 print:border-black/30 text-center">
          <div className="text-[11px] uppercase tracking-widest text-emerald-400 print:text-black/70 font-bold mb-1">
            RUKUN TETANGGA 09 RUKUN WARGA 08
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white print:text-black uppercase tracking-tight">
            LAPORAN KEUANGAN KAS RT 09 RW 08
          </h1>
          <div className="text-xs text-slate-300 print:text-black/80 font-medium mt-1">
            Kelurahan Bangetayu Wetan, Kecamatan Genuk, Kota Semarang
          </div>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-800 print:bg-gray-100 text-xs font-semibold text-slate-200 print:text-black border border-slate-700 print:border-gray-300">
            Periode: {periodLabel}
          </div>
        </div>

        {/* TAB 1: LAPORAN KAS RT KESELURUHAN */}
        {activeTab === 'kas_rt' && (
          <div className="space-y-8">
            
            {/* 1. PEMASUKAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500/40">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 print:text-black">
                  A. RINCIAN PEMASUKAN
                </h3>
                <span className="text-xs text-slate-400 print:text-black font-semibold">Subtotal</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* 5 Pos Iuran */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-200">
                  <div>
                    <span className="font-semibold text-white print:text-black">1. Total Iuran Warga (5 Pos)</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Kas: {formatRupiah(iuranReportData.totalKas)} | Uang Meja: {formatRupiah(iuranReportData.totalMeja)} | Uang Sampah: {formatRupiah(iuranReportData.totalSampah)} | Acara: {formatRupiah(iuranReportData.totalAcara)} | Sosial: {formatRupiah(iuranReportData.totalSosial)}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(iuranReportData.totalAll)}
                  </span>
                </div>

                {/* Jimpitan */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-200">
                  <div>
                    <span className="font-semibold text-white print:text-black">2. Total Jimpitan Mingguan</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Pengumpulan kaleng koin @ Rp 3.000 / pekan
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(jimpitanReportData.totalJimpitan)}
                  </span>
                </div>

                {/* Donasi */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-200">
                  <div>
                    <span className="font-semibold text-white print:text-black">3. Total Donasi Sukarela</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Sumbangan dari {donasiReportData.records.length} donatur / dermawan
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(donasiReportData.total)}
                  </span>
                </div>

                {/* Pemasukan BOP */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-200">
                  <div>
                    <span className="font-semibold text-white print:text-black">4. Total Pemasukan BOP</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Bantuan dinas / kelurahan / subsidi pihak luar
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(bopReportData.masuk)}
                  </span>
                </div>
              </div>

              {/* Total Pemasukan Row */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/15 print:bg-emerald-100 border border-emerald-500/30 font-bold text-xs sm:text-sm">
                <span className="text-emerald-300 print:text-emerald-950">TOTAL PEMASUKAN KAS RT</span>
                <span className="font-mono text-emerald-400 print:text-emerald-950 text-base">
                  {formatRupiah(kasRtStatement.totalPemasukan)}
                </span>
              </div>
            </div>

            {/* 2. PENGELUARAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500/40">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-400 print:text-black">
                  B. RINCIAN PENGELUARAN (BOP & OPERASIONAL)
                </h3>
                <span className="text-xs text-slate-400 print:text-black font-semibold">Subtotal</span>
              </div>

              {bopReportData.records.filter(b => b.jenis === 'Pengeluaran').length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs italic">
                  Tidak ada pengeluaran pada periode ini.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {bopReportData.records.filter(b => b.jenis === 'Pengeluaran').map((b, idx) => (
                    <div key={b.id} className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-200">
                      <div>
                        <span className="font-semibold text-white print:text-black">{idx + 1}. {b.uraian}</span>
                        <div className="text-[11px] text-slate-400 print:text-gray-600">
                          {formatTanggalIndonesia(b.tanggal, 'short')} | Kategori: {b.kategori} {b.keterangan ? `(${b.keterangan})` : ''}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-rose-400 print:text-black self-center">
                        {formatRupiah(b.nominal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Pengeluaran Row */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/15 print:bg-rose-100 border border-rose-500/30 font-bold text-xs sm:text-sm">
                <span className="text-rose-300 print:text-rose-950">TOTAL PENGELUARAN KAS RT</span>
                <span className="font-mono text-rose-400 print:text-rose-950 text-base">
                  {formatRupiah(kasRtStatement.totalPengeluaran)}
                </span>
              </div>
            </div>

            {/* 3. SALDO AKHIR RT */}
            <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              kasRtStatement.isDefisit 
                ? 'bg-rose-950/30 border-rose-500 text-rose-300' 
                : 'bg-emerald-950/30 border-emerald-500 text-emerald-300'
            }`}>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  C. SALDO AKHIR KAS RT 09 RW 08
                </div>
                <div className="text-xs text-slate-400 print:text-gray-700 mt-0.5">
                  Rumus: Total Pemasukan ({formatRupiah(kasRtStatement.totalPemasukan)}) - Total Pengeluaran ({formatRupiah(kasRtStatement.totalPengeluaran)})
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono">
                {formatRupiah(kasRtStatement.saldoAkhir)}
              </div>
            </div>

            {/* Signatures for Print Document */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-400 print:text-black">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold text-slate-300 print:text-black mt-1">Ketua RT 09 RW 08</p>
                <div className="h-16" />
                <p className="font-bold underline text-white print:text-black">( Bpk. Ketua RT )</p>
                <p className="text-[10px]">Kelurahan Bangetayu Wetan</p>
              </div>

              <div>
                <p>Semarang, {formatTanggalIndonesia(new Date().toISOString(), 'full')}</p>
                <p className="font-bold text-slate-300 print:text-black mt-1">Bendahara RT 09 RW 08</p>
                <div className="h-16" />
                <p className="font-bold underline text-white print:text-black">( Bendahara RT )</p>
                <p className="text-[10px]">Kelurahan Bangetayu Wetan</p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: LAPORAN IURAN */}
        {activeTab === 'iuran' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white print:text-black">Tabel Detail Penerimaan Iuran Warga</span>
              <span className="font-mono text-emerald-400 font-bold">Total: {formatRupiah(iuranReportData.totalAll)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-100 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">No. Rumah</th>
                    <th className="py-2.5 px-3">Nama Warga</th>
                    <th className="py-2.5 px-2 text-center">Kas</th>
                    <th className="py-2.5 px-2 text-center">Meja</th>
                    <th className="py-2.5 px-2 text-center">Sampah</th>
                    <th className="py-2.5 px-2 text-center">Acara</th>
                    <th className="py-2.5 px-2 text-center">Sosial</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {iuranReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tidak ada data iuran pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    iuranReportData.records.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold">{r.wargaNomorRumah}</td>
                        <td className="py-2 px-3 font-semibold text-white print:text-black">{r.wargaNama}</td>
                        <td className="py-2 px-2 text-center">{r.kas ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.uangMeja ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.uangSampah ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.danaAcaraTahunan ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.uangSosial ? '✓' : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                          {formatRupiah(r.total)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'Lunas' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LAPORAN JIMPITAN */}
        {activeTab === 'jimpitan' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white print:text-black">Tabel Detail Penerimaan Jimpitan Mingguan</span>
              <span className="font-mono text-cyan-400 font-bold">Total: {formatRupiah(jimpitanReportData.totalJimpitan)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-100 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">No. Rumah</th>
                    <th className="py-2.5 px-3">Nama Warga</th>
                    <th className="py-2.5 px-2 text-center">Minggu 1</th>
                    <th className="py-2.5 px-2 text-center">Minggu 2</th>
                    <th className="py-2.5 px-2 text-center">Minggu 3</th>
                    <th className="py-2.5 px-2 text-center">Minggu 4</th>
                    <th className="py-2.5 px-2 text-center">Minggu 5</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {jimpitanReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tidak ada data jimpitan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    jimpitanReportData.records.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold">{r.wargaNomorRumah}</td>
                        <td className="py-2 px-3 font-semibold text-white print:text-black">{r.wargaNama}</td>
                        <td className="py-2 px-2 text-center">{r.minggu1 ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.minggu2 ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.minggu3 ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.minggu4 ? '✓' : '-'}</td>
                        <td className="py-2 px-2 text-center">{r.minggu5 ? '✓' : '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-cyan-400 print:text-black">
                          {formatRupiah(r.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LAPORAN DONASI */}
        {activeTab === 'donasi' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white print:text-black">Tabel Donasi Sukarela Masuk</span>
              <span className="font-mono text-amber-400 font-bold">Total: {formatRupiah(donasiReportData.total)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-100 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Nama Donatur</th>
                    <th className="py-2.5 px-3 text-center">No. Rumah</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {donasiReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada catatan donasi pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    donasiReportData.records.map((d, idx) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">{formatTanggalIndonesia(d.tanggal, 'short')}</td>
                        <td className="py-2 px-3 font-semibold text-white print:text-black">{d.namaDonatur}</td>
                        <td className="py-2 px-3 text-center">{d.nomorRumah || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-400 print:text-black">
                          {formatRupiah(d.nominal)}
                        </td>
                        <td className="py-2 px-3 text-slate-400 print:text-black">{d.keterangan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: LAPORAN BOP */}
        {activeTab === 'bop' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white print:text-black">Tabel Transaksi Biaya Operasional Pengurus (BOP)</span>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-indigo-400">Masuk: {formatRupiah(bopReportData.masuk)}</span>
                <span className="text-rose-400">Keluar: {formatRupiah(bopReportData.keluar)}</span>
                <span className="text-emerald-400 font-bold">Saldo: {formatRupiah(bopReportData.saldo)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-100 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Uraian</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {bopReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada transaksi BOP pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    bopReportData.records.map((b, idx) => (
                      <tr key={b.id}>
                        <td className="py-2 px-3 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">{formatTanggalIndonesia(b.tanggal, 'short')}</td>
                        <td className="py-2 px-3 font-semibold">{b.jenis}</td>
                        <td className="py-2 px-3">{b.kategori}</td>
                        <td className="py-2 px-3 font-medium text-white print:text-black">{b.uraian}</td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${
                          b.jenis === 'Pemasukan' ? 'text-indigo-400' : 'text-rose-400'
                        } print:text-black`}>
                          {b.jenis === 'Pemasukan' ? '+' : '-'}{formatRupiah(b.nominal)}
                        </td>
                        <td className="py-2 px-3 text-slate-400 print:text-black">{b.keterangan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
