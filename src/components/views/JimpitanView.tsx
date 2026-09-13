import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  CircleDollarSign, 
  Calendar, 
  Search, 
  Check, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { formatRupiah, NAMA_BULAN, downloadCSV, getWeeksInMonth } from '../../utils/format';

export const JimpitanView: React.FC = () => {
  const { data, toggleJimpitanMinggu, getJimpitanForWarga } = useData();

  const today = new Date();
  const [selectedBulan, setSelectedBulan] = useState<number>(today.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState<number>(today.getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Lengkap' | 'Sebagian' | 'Kosong'>('All');

  const years = useMemo(() => {
    const ySet = new Set<number>([2025, 2026, 2027]);
    data.jimpitan.forEach(j => ySet.add(j.tahun));
    return Array.from(ySet).sort((a, b) => b - a);
  }, [data.jimpitan]);

  const weeksInfo = useMemo(() => {
    return getWeeksInMonth(selectedTahun, selectedBulan);
  }, [selectedTahun, selectedBulan]);

  // Sort citizens by house number
  const sortedWarga = useMemo(() => {
    return [...data.warga].sort((a, b) => 
      a.nomorRumah.localeCompare(b.nomorRumah, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data.warga]);

  // Combine rows with Jimpitan records
  const wargaJimpitanRows = useMemo(() => {
    return sortedWarga.map((warga, idx) => {
      const record = getJimpitanForWarga(warga.id, selectedBulan, selectedTahun);
      const m1 = record ? record.minggu1 : false;
      const m2 = record ? record.minggu2 : false;
      const m3 = record ? record.minggu3 : false;
      const m4 = record ? record.minggu4 : false;
      const m5 = record ? record.minggu5 : false;

      const checkedCount = (m1 ? 1 : 0) + (m2 ? 1 : 0) + (m3 ? 1 : 0) + (m4 ? 1 : 0) + (m5 ? 1 : 0);
      const total = checkedCount * data.settings.nominalJimpitan;

      let status = 'Kosong';
      if (checkedCount === 5) status = 'Lengkap';
      else if (checkedCount > 0) status = 'Sebagian';

      return {
        index: idx + 1,
        warga,
        m1,
        m2,
        m3,
        m4,
        m5,
        checkedCount,
        total,
        status,
      };
    });
  }, [sortedWarga, getJimpitanForWarga, selectedBulan, selectedTahun, data.settings.nominalJimpitan]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return wargaJimpitanRows.filter(row => {
      if (statusFilter !== 'All' && row.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNama = row.warga.nama.toLowerCase().includes(query);
        const matchRumah = row.warga.nomorRumah.toLowerCase().includes(query);
        if (!matchNama && !matchRumah) return false;
      }

      return true;
    });
  }, [wargaJimpitanRows, statusFilter, searchTerm]);

  // Rekap calculations
  const rekap = useMemo(() => {
    let totalM1 = 0;
    let totalM2 = 0;
    let totalM3 = 0;
    let totalM4 = 0;
    let totalM5 = 0;

    let countM1 = 0;
    let countM2 = 0;
    let countM3 = 0;
    let countM4 = 0;
    let countM5 = 0;

    let wargaMembayar = 0;
    let wargaBelum = 0;

    const nominal = data.settings.nominalJimpitan;

    wargaJimpitanRows.forEach(r => {
      if (r.m1) { totalM1 += nominal; countM1++; }
      if (r.m2) { totalM2 += nominal; countM2++; }
      if (r.m3) { totalM3 += nominal; countM3++; }
      if (r.m4) { totalM4 += nominal; countM4++; }
      if (r.m5) { totalM5 += nominal; countM5++; }

      if (r.checkedCount > 0) {
        wargaMembayar++;
      } else {
        wargaBelum++;
      }
    });

    const totalJimpitanBulan = totalM1 + totalM2 + totalM3 + totalM4 + totalM5;
    const totalWarga = wargaJimpitanRows.length;
    const persentase = totalWarga > 0 ? Math.round((wargaMembayar / totalWarga) * 100) : 0;

    return {
      totalM1,
      totalM2,
      totalM3,
      totalM4,
      totalM5,
      countM1,
      countM2,
      countM3,
      countM4,
      countM5,
      totalJimpitanBulan,
      totalWarga,
      wargaMembayar,
      wargaBelum,
      persentase,
    };
  }, [wargaJimpitanRows, data.settings.nominalJimpitan]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nomor Rumah',
      'Nama Warga',
      `Minggu 1 (${weeksInfo[0].range})`,
      `Minggu 2 (${weeksInfo[1].range})`,
      `Minggu 3 (${weeksInfo[2].range})`,
      `Minggu 4 (${weeksInfo[3].range})`,
      `Minggu 5 (${weeksInfo[4].range})`,
      'Total Jimpitan',
      'Status'
    ];

    const rows = filteredRows.map(r => [
      r.index,
      r.warga.nomorRumah,
      r.warga.nama,
      r.m1 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
      r.m2 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
      r.m3 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
      r.m4 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
      r.m5 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
      formatRupiah(r.total),
      r.status === 'Lengkap' ? '5 Minggu' : `${r.checkedCount} Minggu`
    ]);

    // Footer summary row
    rows.push([
      '',
      '',
      'TOTAL REKAP',
      formatRupiah(rekap.totalM1),
      formatRupiah(rekap.totalM2),
      formatRupiah(rekap.totalM3),
      formatRupiah(rekap.totalM4),
      formatRupiah(rekap.totalM5),
      formatRupiah(rekap.totalJimpitanBulan),
      `${rekap.wargaMembayar} Warga Membayar`
    ]);

    downloadCSV(
      `Laporan_Jimpitan_RT09_RW08_${NAMA_BULAN[selectedBulan - 1]}_${selectedTahun}`,
      headers,
      rows
    );
  };

  return (
    <div id="view-jimpitan-warga" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-cyan-400" />
              JIMPITAN RONDA & KEBERSIHAN RT
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {formatRupiah(data.settings.nominalJimpitan)} / minggu / warga
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pencatatan jimpitan kaleng koin mingguan periode {NAMA_BULAN[selectedBulan - 1]} {selectedTahun}
          </p>
        </div>

        {/* Filter & Export */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            id="btn-export-jimpitan-csv"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span> CSV
          </button>

          {/* Month selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <select
              id="select-jimpitan-bulan"
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

          {/* Year selector */}
          <div className="flex items-center px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <select
              id="select-jimpitan-tahun"
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
            id="input-search-jimpitan"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari warga atau nomor rumah..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs">
          <span className="text-slate-400 text-[11px]">Filter Status:</span>
          <select
            id="filter-status-jimpitan"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-slate-900">Semua Warga</option>
            <option value="Lengkap" className="bg-slate-900">Lengkap (5 Minggu)</option>
            <option value="Sebagian" className="bg-slate-900">Sebagian (1 - 4 Minggu)</option>
            <option value="Kosong" className="bg-slate-900">Belum Bayar (0 Minggu)</option>
          </select>
        </div>

      </div>

      {/* Jimpitan Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table id="table-jimpitan" className="w-full text-left border-collapse text-xs whitespace-nowrap sm:whitespace-normal">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-300 font-semibold tracking-wide">
                <th className="py-3.5 px-3 w-12 text-center">No</th>
                <th className="py-3.5 px-3 w-24 text-center">Nomor Rumah</th>
                <th className="py-3.5 px-4 min-w-[140px]">Nama Warga</th>
                
                {/* 5 Weeks headers with date ranges */}
                {weeksInfo.map(w => (
                  <th key={w.id} className="py-3.5 px-2 text-center w-24">
                    <div className="flex flex-col items-center">
                      <span className="text-cyan-400 font-bold">{w.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{w.range}</span>
                    </div>
                  </th>
                ))}

                <th className="py-3.5 px-4 text-right w-28">
                  <span className="text-white font-bold">Total Jimpitan</span>
                </th>

                <th className="py-3.5 px-4 text-center w-28">
                  <span className="text-slate-300 font-bold">Status</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <span className="font-medium text-slate-300">Tidak ada data jimpitan warga</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isLengkap = row.checkedCount === 5;
                  const isSebagian = row.checkedCount > 0 && row.checkedCount < 5;

                  return (
                    <tr 
                      key={row.warga.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLengkap ? 'bg-cyan-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{row.index}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-800 font-mono font-bold text-cyan-300 text-xs border border-slate-700/60">
                          {row.warga.nomorRumah}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {row.warga.nama}
                      </td>

                      {/* Minggu 1 */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-jimp-m1-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-jimp-m1-${row.warga.id}`}
                            type="checkbox"
                            checked={row.m1}
                            onChange={(e) => toggleJimpitanMinggu(row.warga.id, selectedBulan, selectedTahun, 'minggu1', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.m1 
                              ? 'bg-cyan-500 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.m1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Minggu 2 */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-jimp-m2-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-jimp-m2-${row.warga.id}`}
                            type="checkbox"
                            checked={row.m2}
                            onChange={(e) => toggleJimpitanMinggu(row.warga.id, selectedBulan, selectedTahun, 'minggu2', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.m2 
                              ? 'bg-cyan-500 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.m2 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Minggu 3 */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-jimp-m3-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-jimp-m3-${row.warga.id}`}
                            type="checkbox"
                            checked={row.m3}
                            onChange={(e) => toggleJimpitanMinggu(row.warga.id, selectedBulan, selectedTahun, 'minggu3', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.m3 
                              ? 'bg-cyan-500 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.m3 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Minggu 4 */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-jimp-m4-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-jimp-m4-${row.warga.id}`}
                            type="checkbox"
                            checked={row.m4}
                            onChange={(e) => toggleJimpitanMinggu(row.warga.id, selectedBulan, selectedTahun, 'minggu4', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.m4 
                              ? 'bg-cyan-500 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.m4 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Minggu 5 */}
                      <td className="py-3 px-2 text-center">
                        <label 
                          htmlFor={`cb-jimp-m5-${row.warga.id}`}
                          className="inline-flex items-center justify-center p-1.5 cursor-pointer group"
                        >
                          <input
                            id={`cb-jimp-m5-${row.warga.id}`}
                            type="checkbox"
                            checked={row.m5}
                            onChange={(e) => toggleJimpitanMinggu(row.warga.id, selectedBulan, selectedTahun, 'minggu5', e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 border ${
                            row.m5 
                              ? 'bg-cyan-500 border-cyan-400 text-white shadow-md shadow-cyan-950/50 scale-105' 
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-transparent group-hover:scale-105'
                          }`}>
                            <Check className={`w-4 h-4 stroke-[3] transition-transform ${row.m5 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                          </div>
                        </label>
                      </td>

                      {/* Total Jimpitan */}
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${
                          row.total > 0 ? 'text-cyan-400' : 'text-slate-500'
                        }`}>
                          {formatRupiah(row.total)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isLengkap 
                            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' 
                            : isSebagian 
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {isLengkap ? <CheckCircle2 className="w-3 h-3" /> : isSebagian ? <Clock className="w-3 h-3" /> : null}
                          {row.checkedCount} / 5 Pekan
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 12: REKAP JIMPITAN */}
      <div id="rekap-jimpitan-section" className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-cyan-400" />
              REKAP JIMPITAN BULAN {NAMA_BULAN[selectedBulan - 1].toUpperCase()} {selectedTahun}
            </h3>
            <p className="text-xs text-slate-400">
              Total hasil pengumpulan jimpitan per pekan untuk kas operasional lingkungan
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">TOTAL JIMPITAN BULAN INI:</span>
            <div className="text-2xl font-extrabold font-mono text-cyan-400">
              {formatRupiah(rekap.totalJimpitanBulan)}
            </div>
          </div>
        </div>

        {/* 5 Weekly Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL MINGGU 1
            </div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-1">
              {formatRupiah(rekap.totalM1)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{rekap.countM1} warga membayar</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL MINGGU 2
            </div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-1">
              {formatRupiah(rekap.totalM2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{rekap.countM2} warga membayar</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL MINGGU 3
            </div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-1">
              {formatRupiah(rekap.totalM3)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{rekap.countM3} warga membayar</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL MINGGU 4
            </div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-1">
              {formatRupiah(rekap.totalM4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{rekap.countM4} warga membayar</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              TOTAL MINGGU 5
            </div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-1">
              {formatRupiah(rekap.totalM5)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{rekap.countM5} warga membayar</div>
          </div>

        </div>

        {/* Summary Stats */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Warga Terdaftar:</span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{rekap.totalWarga} warga</div>
            </div>
            <div>
              <span className="text-slate-400">Warga Membayar:</span>
              <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{rekap.wargaMembayar} warga</div>
            </div>
            <div>
              <span className="text-slate-400">Warga Belum Membayar:</span>
              <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">{rekap.wargaBelum} warga</div>
            </div>
            <div>
              <span className="text-slate-400">Persentase Partisipasi:</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{rekap.persentase}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-medium">
              <span>Partisipasi Warga dalam Jimpitan Bulan Ini</span>
              <span className="text-cyan-400 font-mono">{rekap.wargaMembayar} dari {rekap.totalWarga} warga aktif berpartisipasi</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-sm"
                style={{ width: `${rekap.persentase}%` }}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
