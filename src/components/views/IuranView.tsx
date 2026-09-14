import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Coins, 
  Calendar, 
  Search, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  FileEdit,
  Sparkles,
  ArrowUpDown,
  Printer
} from 'lucide-react';
import { formatRupiah, NAMA_BULAN, downloadCSV } from '../../utils/format';
import { PrintReportHeader, PrintReportFooter, PrintPageStyle } from '../common/PrintReportLayout';

export const IuranView: React.FC = () => {
  const { 
    data, 
    toggleIuranCategory, 
    updateIuranKeterangan, 
    getIuranForWarga 
  } = useData();

  const today = new Date();
  const [selectedBulan, setSelectedBulan] = useState<number>(today.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState<number>(today.getFullYear());

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Lunas' | 'Sebagian' | 'Belum Bayar'>('All');

  // Inline note editing state
  const [editingNoteWargaId, setEditingNoteWargaId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  const years = useMemo(() => {
    const ySet = new Set<number>([2025, 2026, 2027]);
    data.iuran.forEach(i => ySet.add(i.tahun));
    return Array.from(ySet).sort((a, b) => b - a);
  }, [data.iuran]);

  // Sort citizens by house number
  const sortedWarga = useMemo(() => {
    return [...data.warga].sort((a, b) => 
      a.nomorRumah.localeCompare(b.nomorRumah, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data.warga]);

  // Combined Rows with current Iuran state
  const wargaIuranRows = useMemo(() => {
    return sortedWarga.map((warga, index) => {
      const record = getIuranForWarga(warga.id, selectedBulan, selectedTahun);
      const kas = record ? record.kas : false;
      const uangMeja = record ? record.uangMeja : false;
      const uangSampah = record ? record.uangSampah : false;
      const danaAcaraTahunan = record ? record.danaAcaraTahunan : false;
      const uangSosial = record ? record.uangSosial : false;
      const total = record ? record.total : 0;
      const status = record ? record.status : 'Belum Bayar';
      const keterangan = record?.keterangan || '';

      return {
        index: index + 1,
        warga,
        kas,
        uangMeja,
        uangSampah,
        danaAcaraTahunan,
        uangSosial,
        total,
        status,
        keterangan,
      };
    });
  }, [sortedWarga, getIuranForWarga, selectedBulan, selectedTahun]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return wargaIuranRows.filter(row => {
      if (statusFilter !== 'All' && row.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNama = row.warga.nama.toLowerCase().includes(query);
        const matchRumah = row.warga.nomorRumah.toLowerCase().includes(query);
        const matchKet = row.keterangan.toLowerCase().includes(query);
        if (!matchNama && !matchRumah && !matchKet) return false;
      }

      return true;
    });
  }, [wargaIuranRows, statusFilter, searchTerm]);

  // Rekap Calculations for the selected Month & Year
  const rekap = useMemo(() => {
    let totalKas = 0;
    let totalUangMeja = 0;
    let totalUangSampah = 0;
    let totalDanaAcaraTahunan = 0;
    let totalUangSosial = 0;
    let totalSeluruhIuran = 0;

    let wargaLunasCount = 0;
    let wargaSebagianCount = 0;
    let wargaBelumCount = 0;

    wargaIuranRows.forEach(row => {
      if (row.kas) totalKas += data.settings.nominalKas;
      if (row.uangMeja) totalUangMeja += data.settings.nominalUangMeja;
      if (row.uangSampah) totalUangSampah += data.settings.nominalUangSampah;
      if (row.danaAcaraTahunan) totalDanaAcaraTahunan += data.settings.nominalDanaAcaraTahunan;
      if (row.uangSosial) totalUangSosial += data.settings.nominalUangSosial;
      totalSeluruhIuran += row.total;

      if (row.status === 'Lunas') wargaLunasCount++;
      else if (row.status === 'Sebagian') wargaSebagianCount++;
      else wargaBelumCount++;
    });

    const totalWargaCount = wargaIuranRows.length;
    const sudahBayarCount = wargaLunasCount + wargaSebagianCount;
    const persentaseLunas = totalWargaCount > 0 ? Math.round((wargaLunasCount / totalWargaCount) * 100) : 0;
    const persentaseTotalTertagih = (totalWargaCount * 35000) > 0 
      ? Math.min(100, Math.round((totalSeluruhIuran / (totalWargaCount * 35000)) * 100)) 
      : 0;

    return {
      totalKas,
      totalUangMeja,
      totalUangSampah,
      totalDanaAcaraTahunan,
      totalUangSosial,
      totalSeluruhIuran,
      totalWargaCount,
      sudahBayarCount,
      wargaLunasCount,
      wargaSebagianCount,
      wargaBelumCount,
      persentaseLunas,
      persentaseTotalTertagih,
    };
  }, [wargaIuranRows, data.settings]);

  // Handle Note Save
  const handleSaveNote = (wargaId: string) => {
    updateIuranKeterangan(wargaId, selectedBulan, selectedTahun, tempNote);
    setEditingNoteWargaId(null);
  };

  // Export CSV for current month
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nomor Rumah',
      'Nama Warga',
      `Kas (${formatRupiah(data.settings.nominalKas)})`,
      `Uang Meja (${formatRupiah(data.settings.nominalUangMeja)})`,
      `Uang Sampah (${formatRupiah(data.settings.nominalUangSampah)})`,
      `Dana Acara Tahunan (${formatRupiah(data.settings.nominalDanaAcaraTahunan)})`,
      `Uang Sosial (${formatRupiah(data.settings.nominalUangSosial)})`,
      'Total Iuran',
      'Status',
      'Keterangan'
    ];

    const rows = filteredRows.map(r => [
      r.index,
      r.warga.nomorRumah,
      r.warga.namaWarga || r.warga.nama,
      r.kas ? formatRupiah(data.settings.nominalKas) : 'Rp 0',
      r.uangMeja ? formatRupiah(data.settings.nominalUangMeja) : 'Rp 0',
      r.uangSampah ? formatRupiah(data.settings.nominalUangSampah) : 'Rp 0',
      r.danaAcaraTahunan ? formatRupiah(data.settings.nominalDanaAcaraTahunan) : 'Rp 0',
      r.uangSosial ? formatRupiah(data.settings.nominalUangSosial) : 'Rp 0',
      formatRupiah(r.total),
      r.status,
      r.keterangan || '-'
    ]);

    // Append summary footer row
    rows.push([
      '',
      '',
      'TOTAL REKAP',
      formatRupiah(rekap.totalKas),
      formatRupiah(rekap.totalUangMeja),
      formatRupiah(rekap.totalUangSampah),
      formatRupiah(rekap.totalDanaAcaraTahunan),
      formatRupiah(rekap.totalUangSosial),
      formatRupiah(rekap.totalSeluruhIuran),
      `${rekap.wargaLunasCount} Lunas`,
      ''
    ]);

    downloadCSV(
      `Laporan_Iuran_RT09_RW08_${NAMA_BULAN[selectedBulan - 1]}_${selectedTahun}`,
      headers,
      rows
    );
  };

  return (
    <div id="view-iuran-warga" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              IURAN WARGA
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Maks. Rp 35.000 / orang
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola pembayaran 5 pos iuran warga RT 09 RW 08 per periode bulan dan tahun
          </p>
        </div>

        {/* Action button & Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            id="btn-print-iuran"
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span> Laporan / PDF
          </button>

          <button
            id="btn-export-iuran-csv"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>

          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <select
              id="select-iuran-bulan"
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

          {/* Year Dropdown */}
          <div className="flex items-center px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <select
              id="select-iuran-tahun"
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

      {/* Filter and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
        
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-search-iuran"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari warga berdasarkan nomor rumah, nama, atau keterangan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
          <span className="text-slate-400 text-[11px]">Status:</span>
          <select
            id="filter-status-iuran"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">Semua Status</option>
            <option value="Lunas" className="bg-slate-900">Lunas</option>
            <option value="Sebagian" className="bg-slate-900">Sebagian</option>
            <option value="Belum Bayar" className="bg-slate-900">Belum Bayar</option>
          </select>
        </div>

      </div>

      {/* Print Page Styles */}
      <PrintPageStyle landscape={true} />

      {/* Big Interactive Table / Printable Container */}
      <div id="printable-report-card" className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl print:border-none print:bg-white print:p-0 print:shadow-none">
        
        {/* Printable Formal Header */}
        <PrintReportHeader
          title="IURAN BULANAN WARGA"
          periode={`${NAMA_BULAN[selectedBulan - 1]} ${selectedTahun}`}
        />

        <div className="overflow-x-auto">
          <table id="table-iuran-warga" className="w-full text-left border-collapse text-xs whitespace-nowrap sm:whitespace-normal print:border print:border-black print:text-black print:text-[9.5pt]">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-300 font-semibold tracking-wide print:bg-gray-200 print:text-black print:border-black">
                <th className="py-3.5 px-3 w-10 text-center print:border print:border-black">No</th>
                <th className="col-nomor-rumah py-3.5 px-3 w-20 text-center print:border print:border-black">Nomor Rumah</th>
                <th className="col-nama-warga py-3.5 px-4 min-w-[140px] print:border print:border-black">Nama Warga</th>
                
                {/* 5 Categories */}
                <th className="py-3.5 px-2 text-center w-24">
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-bold">Kas</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formatRupiah(data.settings.nominalKas)}</span>
                  </div>
                </th>

                <th className="py-3.5 px-2 text-center w-24">
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-bold">Uang Meja</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formatRupiah(data.settings.nominalUangMeja)}</span>
                  </div>
                </th>

                <th className="py-3.5 px-2 text-center w-24">
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-bold">Uang Sampah</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formatRupiah(data.settings.nominalUangSampah)}</span>
                  </div>
                </th>

                <th className="py-3.5 px-2 text-center w-28">
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-bold">Dana Acara Tahunan</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formatRupiah(data.settings.nominalDanaAcaraTahunan)}</span>
                  </div>
                </th>

                <th className="py-3.5 px-2 text-center w-24">
                  <div className="flex flex-col items-center">
                    <span className="text-emerald-400 font-bold">Uang Sosial</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formatRupiah(data.settings.nominalUangSosial)}</span>
                  </div>
                </th>

                <th className="py-3.5 px-4 text-right w-28">
                  <span className="text-white font-bold">Total Iuran</span>
                </th>

                <th className="py-3.5 px-4 min-w-[160px]">
                  <span className="text-slate-300 font-bold">Status / Keterangan</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <span className="font-medium text-slate-300">Tidak ada data iuran warga</span>
                      <p className="text-[11px] text-slate-500">
                        Pastikan data warga sudah ditambahkan pada menu Data Warga.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isLunas = row.status === 'Lunas';
                  const isSebagian = row.status === 'Sebagian';

                  return (
                    <tr 
                      key={row.warga.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLunas ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 print:border print:border-black">
                        {row.index}
                      </td>

                      {/* Nomor Rumah */}
                      <td className="col-nomor-rumah py-3 px-3 text-center print:border print:border-black">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-800 font-mono font-bold text-cyan-300 text-xs border border-slate-700/60 print:bg-transparent print:text-black print:border-none">
                          {row.warga.nomorRumah}
                        </span>
                      </td>

                      {/* Nama Warga */}
                      <td className="col-nama-warga py-3 px-4 print:border print:border-black">
                        <div className="font-semibold text-white print:text-black leading-snug">
                          {row.warga.namaWarga || row.warga.nama}
                        </div>
                        {row.warga.status === 'Tidak Aktif' && (
                          <span className="text-[10px] text-rose-400 print:text-gray-600">(Warga Tidak Aktif)</span>
                        )}
                      </td>

                      {/* Checkbox: Kas */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-kas-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-kas-${row.warga.id}`}
                            type="checkbox"
                            checked={row.kas}
                            onChange={(e) => toggleIuranCategory(row.warga.id, selectedBulan, selectedTahun, 'kas', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.kas 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.kas ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Checkbox: Uang Meja */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-meja-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-meja-${row.warga.id}`}
                            type="checkbox"
                            checked={row.uangMeja}
                            onChange={(e) => toggleIuranCategory(row.warga.id, selectedBulan, selectedTahun, 'uangMeja', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.uangMeja 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.uangMeja ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Checkbox: Uang Sampah */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-sampah-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-sampah-${row.warga.id}`}
                            type="checkbox"
                            checked={row.uangSampah}
                            onChange={(e) => toggleIuranCategory(row.warga.id, selectedBulan, selectedTahun, 'uangSampah', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.uangSampah 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.uangSampah ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Checkbox: Dana Acara Tahunan */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-acara-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-acara-${row.warga.id}`}
                            type="checkbox"
                            checked={row.danaAcaraTahunan}
                            onChange={(e) => toggleIuranCategory(row.warga.id, selectedBulan, selectedTahun, 'danaAcaraTahunan', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.danaAcaraTahunan 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.danaAcaraTahunan ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Checkbox: Uang Sosial */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-sosial-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-sosial-${row.warga.id}`}
                            type="checkbox"
                            checked={row.uangSosial}
                            onChange={(e) => toggleIuranCategory(row.warga.id, selectedBulan, selectedTahun, 'uangSosial', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.uangSosial 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.uangSosial ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Total Iuran */}
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${
                          row.total === 35000 
                            ? 'text-emerald-400' 
                            : row.total > 0 
                              ? 'text-amber-300' 
                              : 'text-slate-500'
                        }`}>
                          {formatRupiah(row.total)}
                        </span>
                      </td>

                      {/* Status / Keterangan */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isLunas 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                : isSebagian 
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {isLunas && <CheckCircle2 className="w-3 h-3" />}
                              {isSebagian && <Clock className="w-3 h-3" />}
                              {row.status}
                            </span>

                            {/* Edit note button */}
                            {editingNoteWargaId !== row.warga.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteWargaId(row.warga.id);
                                  setTempNote(row.keterangan);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                                title="Edit keterangan manual"
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Inline note edit */}
                          {editingNoteWargaId === row.warga.id ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="text"
                                value={tempNote}
                                onChange={(e) => setTempNote(e.target.value)}
                                placeholder="Keterangan..."
                                className="px-2 py-1 rounded-lg bg-slate-950 border border-emerald-500 text-xs text-white focus:outline-none w-36"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveNote(row.warga.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-[10px] font-semibold text-white hover:bg-emerald-500"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNoteWargaId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] text-slate-300"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            row.keterangan && (
                              <span className="text-[11px] text-slate-400 italic truncate max-w-[180px]">
                                {row.keterangan}
                              </span>
                            )
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

        {/* Printable Formal Footer with Signatures */}
        <PrintReportFooter
          ketuaRT={data.settings.ketuaRT || 'H. Sugiyanto, S.E.'}
          bendahara={data.settings.bendahara || 'Bambang Pamungkas, S.Kom.'}
          lokasi="Semarang"
        />
      </div>

      {/* Section 8: REKAP IURAN (Exact mandatory structure) */}
      <div id="rekap-iuran-section" className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-6 print:hidden">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              REKAP IURAN BULAN {NAMA_BULAN[selectedBulan - 1].toUpperCase()} {selectedTahun}
            </h3>
            <p className="text-xs text-slate-400">
              Rangkuman penerimaan kas berdasarkan tiap pos iuran warga
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">TOTAL SELURUH IURAN:</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400">
              {formatRupiah(rekap.totalSeluruhIuran)}
            </div>
          </div>
        </div>

        {/* 5 Category Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL KAS
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {formatRupiah(rekap.totalKas)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">@ Rp 5.000 / orang</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL UANG MEJA
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {formatRupiah(rekap.totalUangMeja)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">@ Rp 10.000 / orang</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL UANG SAMPAH
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {formatRupiah(rekap.totalUangSampah)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">@ Rp 12.000 / orang</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL DANA ACARA TAHUNAN
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {formatRupiah(rekap.totalDanaAcaraTahunan)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">@ Rp 3.000 / orang</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL UANG SOSIAL
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {formatRupiah(rekap.totalUangSosial)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">@ Rp 5.000 / orang</div>
          </div>

        </div>

        {/* Resident Counts & Progress Bar */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Jumlah Warga Terdaftar:</span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{rekap.totalWargaCount} warga</div>
            </div>
            <div>
              <span className="text-slate-400">Sudah Membayar:</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{rekap.sudahBayarCount} warga ({rekap.wargaLunasCount} Lunas)</div>
            </div>
            <div>
              <span className="text-slate-400">Belum Membayar:</span>
              <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">{rekap.wargaBelumCount} warga</div>
            </div>
            <div>
              <span className="text-slate-400">Persentase Pelunasan:</span>
              <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{rekap.persentaseLunas}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
              <span>Progres Pelunasan Iuran Bulan Ini</span>
              <span className="text-emerald-400 font-mono">{rekap.wargaLunasCount} dari {rekap.totalWargaCount} warga lunas</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-sm"
                style={{ width: `${rekap.persentaseLunas}%` }}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
