import React from 'react';
import { useData } from '../../context/DataContext';
import { NAMA_BULAN } from '../../utils/format';
import { Filter, RotateCcw } from 'lucide-react';

interface PeriodFilterBarProps {
  title?: string;
  showDateRangeToggle?: boolean;
}

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({ 
  title = 'Filter Periode Data',
  showDateRangeToggle = true
}) => {
  const { periodFilter, setPeriodFilter } = useData();

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleResetToCurrent = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, '0');
    setPeriodFilter({
      mode: 'bulan-tahun',
      bulan: curMonth,
      tahun: curYear,
      tanggalMulai: `${curYear}-${pad(curMonth)}-01`,
      tanggalSelesai: `${curYear}-${pad(curMonth)}-${new Date(curYear, curMonth, 0).getDate()}`
    });
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Title and Mode Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-[#1E5AA8] border border-blue-100">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider flex items-center gap-2">
              {title}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#1E5AA8] border border-slate-200">
                {periodFilter.mode === 'bulan-tahun' 
                  ? `${NAMA_BULAN[periodFilter.bulan - 1]} ${periodFilter.tahun}` 
                  : periodFilter.mode === 'rentang-tanggal'
                  ? `${periodFilter.tanggalMulai} s.d ${periodFilter.tanggalSelesai}`
                  : 'Semua Periode'}
              </span>
            </h3>
            <p className="text-[11px] text-[#6B7280]">
              Sinkronisasi data otomatis untuk grafik, tabel transaksi, dan laporan
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {showDateRangeToggle && (
            <div className="flex rounded-lg bg-slate-100 p-1 border border-[#E5E7EB] text-[#6B7280]">
              <button
                type="button"
                onClick={() => setPeriodFilter(prev => ({ ...prev, mode: 'bulan-tahun' }))}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  periodFilter.mode === 'bulan-tahun' 
                    ? 'bg-white text-[#1E5AA8] font-semibold shadow-xs' 
                    : 'hover:text-[#1F2937]'
                }`}
              >
                Bulan & Tahun
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter(prev => ({ ...prev, mode: 'rentang-tanggal' }))}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  periodFilter.mode === 'rentang-tanggal' 
                    ? 'bg-white text-[#1E5AA8] font-semibold shadow-xs' 
                    : 'hover:text-[#1F2937]'
                }`}
              >
                Rentang Tanggal
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter(prev => ({ ...prev, mode: 'semua' }))}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  periodFilter.mode === 'semua' 
                    ? 'bg-white text-[#1E5AA8] font-semibold shadow-xs' 
                    : 'hover:text-[#1F2937]'
                }`}
              >
                Semua
              </button>
            </div>
          )}

          {/* Bulan & Tahun Selectors */}
          {periodFilter.mode === 'bulan-tahun' && (
            <>
              <div className="flex items-center gap-1.5">
                <label htmlFor="filter-bulan" className="text-[#6B7280] text-[11px] font-medium">Bulan:</label>
                <select
                  id="filter-bulan"
                  value={periodFilter.bulan}
                  onChange={(e) => setPeriodFilter(prev => ({ ...prev, bulan: Number(e.target.value) }))}
                  className="px-3 py-1.5 h-[38px] rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937] focus:outline-none focus:border-[#1E5AA8] focus:ring-1 focus:ring-[#1E5AA8]/20 font-medium"
                >
                  {NAMA_BULAN.map((nama, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="filter-tahun" className="text-[#6B7280] text-[11px] font-medium">Tahun:</label>
                <select
                  id="filter-tahun"
                  value={periodFilter.tahun}
                  onChange={(e) => setPeriodFilter(prev => ({ ...prev, tahun: Number(e.target.value) }))}
                  className="px-3 py-1.5 h-[38px] rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937] focus:outline-none focus:border-[#1E5AA8] focus:ring-1 focus:ring-[#1E5AA8]/20 font-medium"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Date Range Inputs */}
          {periodFilter.mode === 'rentang-tanggal' && (
            <>
              <div className="flex items-center gap-1.5">
                <label htmlFor="filter-tgl-mulai" className="text-[#6B7280] text-[11px] font-medium">Mulai:</label>
                <input
                  id="filter-tgl-mulai"
                  type="date"
                  value={periodFilter.tanggalMulai}
                  onChange={(e) => setPeriodFilter(prev => ({ ...prev, tanggalMulai: e.target.value }))}
                  className="px-2.5 py-1.5 h-[38px] rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937] focus:outline-none focus:border-[#1E5AA8] focus:ring-1 focus:ring-[#1E5AA8]/20 font-medium text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="filter-tgl-selesai" className="text-[#6B7280] text-[11px] font-medium">Selesai:</label>
                <input
                  id="filter-tgl-selesai"
                  type="date"
                  value={periodFilter.tanggalSelesai}
                  onChange={(e) => setPeriodFilter(prev => ({ ...prev, tanggalSelesai: e.target.value }))}
                  className="px-2.5 py-1.5 h-[38px] rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937] focus:outline-none focus:border-[#1E5AA8] focus:ring-1 focus:ring-[#1E5AA8]/20 font-medium text-xs"
                />
              </div>
            </>
          )}

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetToCurrent}
            title="Reset ke bulan berjalan"
            className="p-2 h-[38px] w-[38px] flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-[#6B7280] hover:text-[#1F2937] border border-[#E5E7EB] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>

      </div>
    </div>
  );
};
