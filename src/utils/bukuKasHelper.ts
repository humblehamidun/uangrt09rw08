import { 
  BukuKasRecord, 
  BukuKasSourceType, 
  AppStateData, 
  Warga, 
  IuranRecord, 
  JimpitanRecord, 
  DonasiRecord, 
  BopRecord,
  SaldoAwalRecord,
  AppUser
} from '../types';
import { generateId, formatRupiah } from './format';

/**
 * Generate standardized, sequential, unique proof number:
 * Format: IUR-YYYYMMDD-XXXX, JMP-YYYYMMDD-XXXX, DON-YYYYMMDD-XXXX, BOP-YYYYMMDD-XXXX, SA-YYYYMMDD-XXXX
 */
export function generateNoBukti(
  prefix: 'IUR' | 'JMP' | 'DON' | 'BOP' | 'SA' | 'TAL' | 'PEL',
  dateStr: string,
  existingList: BukuKasRecord[]
): string {
  // Normalize date to YYYYMMDD
  const cleanDate = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '').slice(0, 8);
  const patternPrefix = `${prefix}-${cleanDate}-`;
  
  // Find all existing numbers with this prefix and date
  let maxSeq = 0;
  for (const item of existingList) {
    if (item.noBukti && item.noBukti.startsWith(patternPrefix)) {
      const parts = item.noBukti.split('-');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `${patternPrefix}${nextSeq}`;
}

/**
 * Sorts records by transaction date ASC, then createdAt ASC.
 * Computes running balance for all active records.
 * Cancelled transactions have their balance maintained from previous active without modifying running balance.
 */
export function computeBukuKasRunningBalances(
  records: BukuKasRecord[],
  baseInitialBalance: number = 0
): BukuKasRecord[] {
  // Sort chronologically
  const sorted = [...records].sort((a, b) => {
    const dateComp = (a.tanggal || '').localeCompare(b.tanggal || '');
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.createdAt || '').localeCompare(b.createdAt || '');
    if (timeComp !== 0) return timeComp;
    return (a.id || '').localeCompare(b.id || '');
  });

  let currentRunning = baseInitialBalance;

  return sorted.map(item => {
    if (item.status === 'Aktif') {
      currentRunning += (item.pemasukan || 0) - (item.pengeluaran || 0);
      return {
        ...item,
        saldo: currentRunning,
      };
    } else {
      // Dibatalkan items do not alter running balance
      return {
        ...item,
        saldo: currentRunning,
      };
    }
  });
}

/**
 * Helper to build a date string YYYY-MM-DD from month and year (defaults to 1st of month)
 */
export function makeMonthDate(year: number, month: number, day: number = 1): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${p(month)}-${p(day)}`;
}

/**
 * Comprehensive synchronization engine:
 * Maps every active source transaction (Iuran categories, Jimpitan weeks, Donasi, BOP, Saldo Awal)
 * into a single unified BukuKas registry without duplications.
 */
export function syncAllSourcesToBukuKas(
  data: Pick<AppStateData, 'warga' | 'iuran' | 'jimpitan' | 'donasi' | 'bop' | 'saldoAwal' | 'settings'> & {
    danaTalangan?: AppStateData['danaTalangan'];
    pelunasanTalangan?: AppStateData['pelunasanTalangan'];
  },
  existingBukuKas: BukuKasRecord[] = [],
  currentUser?: AppUser | null
): BukuKasRecord[] {
  const wargaMap = new Map<string, Warga>();
  for (const w of data.warga) {
    wargaMap.set(w.id, w);
  }

  // Index existing bukuKas by unique source key: `${sourceType}:${sourceId}`
  const existingMap = new Map<string, BukuKasRecord>();
  for (const item of existingBukuKas) {
    if (item.sourceType && item.sourceId) {
      existingMap.set(`${item.sourceType}:${item.sourceId}`, item);
    }
  }

  const resultList: BukuKasRecord[] = [];
  const nowIso = new Date().toISOString();
  const defaultOfficer = currentUser?.nama || 'Bendahara';

  // 1. Saldo Awal Records
  if (Array.isArray(data.saldoAwal)) {
    for (const sa of data.saldoAwal) {
      const sourceKey = `saldo_awal:${sa.id}`;
      const existing = existingMap.get(sourceKey);
      const noBukti = existing?.noBukti || generateNoBukti('SA', sa.tanggal, [...existingBukuKas, ...resultList]);

      resultList.push({
        id: existing?.id || `bk-sa-${sa.id}`,
        tanggal: sa.tanggal,
        noBukti,
        sourceType: 'saldo_awal',
        sourceId: sa.id,
        kategori: 'Saldo Awal',
        uraian: sa.keterangan || 'Saldo Awal Kas RT',
        pemasukan: sa.nominal || 0,
        pengeluaran: 0,
        saldo: 0,
        status: 'Aktif',
        petugas: sa.createdBy || defaultOfficer,
        createdBy: existing?.createdBy || sa.createdBy || defaultOfficer,
        createdAt: existing?.createdAt || sa.createdAt || nowIso,
        updatedBy: sa.updatedBy || defaultOfficer,
        updatedAt: sa.updatedAt || nowIso,
        keterangan: 'Pencatatan Saldo Awal Periode',
      });
    }
  }

  // 2. Iuran Records (Breakdown per category!)
  if (Array.isArray(data.iuran)) {
    const iuranCategories: Array<{
      key: 'kas' | 'uangMeja' | 'uangSampah' | 'danaAcaraTahunan' | 'uangSosial';
      label: string;
      nominalKey: keyof typeof data.settings;
      code: string;
    }> = [
      { key: 'kas', label: 'Kas', nominalKey: 'nominalKas', code: 'kas' },
      { key: 'uangMeja', label: 'Uang Meja', nominalKey: 'nominalUangMeja', code: 'meja' },
      { key: 'uangSampah', label: 'Uang Sampah', nominalKey: 'nominalUangSampah', code: 'sampah' },
      { key: 'danaAcaraTahunan', label: 'Dana Acara Tahunan', nominalKey: 'nominalDanaAcaraTahunan', code: 'acara' },
      { key: 'uangSosial', label: 'Uang Sosial', nominalKey: 'nominalUangSosial', code: 'sosial' },
    ];

    for (const record of data.iuran) {
      const warga = wargaMap.get(record.wargaId);
      const rumahStr = warga ? `Rumah ${warga.nomorRumah}` : 'Rumah -';
      const namaStr = warga ? warga.nama : 'Warga';
      
      // Determine date for the iuran transaction (uses record.createdAt or 1st of month/year)
      const recordDate = record.createdAt 
        ? record.createdAt.split('T')[0] 
        : makeMonthDate(record.tahun, record.bulan, 5);

      for (const cat of iuranCategories) {
        const isChecked = Boolean(record[cat.key]);
        const subId = `${record.id}_${cat.key}`;
        const sourceKey = `iuran:${subId}`;
        const existing = existingMap.get(sourceKey);

        if (isChecked) {
          const nominal = Number(data.settings[cat.nominalKey]) || 0;
          const noBukti = existing?.noBukti || generateNoBukti('IUR', recordDate, [...existingBukuKas, ...resultList]);

          resultList.push({
            id: existing?.id || `bk-iur-${subId}`,
            tanggal: existing?.tanggal || recordDate,
            noBukti,
            sourceType: 'iuran',
            sourceId: subId,
            subSource: cat.key,
            kategori: `Iuran - ${cat.label}`,
            uraian: `Pembayaran Iuran ${cat.label} - ${rumahStr} - ${namaStr}`,
            pemasukan: nominal,
            pengeluaran: 0,
            saldo: 0,
            status: 'Aktif',
            petugas: record.updatedBy || record.createdBy || defaultOfficer,
            createdBy: existing?.createdBy || record.createdBy || defaultOfficer,
            createdAt: existing?.createdAt || record.createdAt || nowIso,
            updatedBy: record.updatedBy || defaultOfficer,
            updatedAt: record.updatedAt || nowIso,
            keterangan: record.keterangan ? `Catatan: ${record.keterangan}` : `Periode Bulan ${record.bulan}/${record.tahun}`,
          });
        } else if (existing && existing.status === 'Aktif') {
          // If was active in bukuKas but now unchecked, mark as Dibatalkan to preserve audit trail
          resultList.push({
            ...existing,
            status: 'Dibatalkan',
            cancelledAt: nowIso,
            cancelledBy: defaultOfficer,
            cancelReason: 'Pembayaran Iuran dibatalkan oleh pengguna',
            updatedAt: nowIso,
            updatedBy: defaultOfficer,
          });
        }
      }
    }
  }

  // 3. Jimpitan Records (Breakdown per week!)
  if (Array.isArray(data.jimpitan)) {
    const weeks: Array<{ key: 'minggu1' | 'minggu2' | 'minggu3' | 'minggu4' | 'minggu5'; label: string; day: number }> = [
      { key: 'minggu1', label: 'Minggu 1', day: 7 },
      { key: 'minggu2', label: 'Minggu 2', day: 14 },
      { key: 'minggu3', label: 'Minggu 3', day: 21 },
      { key: 'minggu4', label: 'Minggu 4', day: 28 },
      { key: 'minggu5', label: 'Minggu 5', day: 30 },
    ];

    for (const record of data.jimpitan) {
      const warga = wargaMap.get(record.wargaId);
      const rumahStr = warga ? `Rumah ${warga.nomorRumah}` : 'Rumah -';
      const namaStr = warga ? warga.nama : 'Warga';

      for (const w of weeks) {
        const isChecked = Boolean(record[w.key]);
        const subId = `${record.id}_${w.key}`;
        const sourceKey = `jimpitan:${subId}`;
        const existing = existingMap.get(sourceKey);

        const recordDate = record.tanggal 
          ? record.tanggal 
          : record.createdAt 
            ? record.createdAt.split('T')[0] 
            : makeMonthDate(record.tahun, record.bulan, w.day);

        if (isChecked) {
          const nominal = Number(data.settings.nominalJimpitan) || 3000;
          const noBukti = existing?.noBukti || generateNoBukti('JMP', recordDate, [...existingBukuKas, ...resultList]);

          resultList.push({
            id: existing?.id || `bk-jmp-${subId}`,
            tanggal: existing?.tanggal || recordDate,
            noBukti,
            sourceType: 'jimpitan',
            sourceId: subId,
            subSource: w.key,
            kategori: 'Jimpitan',
            uraian: `Jimpitan ${w.label} - ${rumahStr} - ${namaStr}`,
            pemasukan: nominal,
            pengeluaran: 0,
            saldo: 0,
            status: 'Aktif',
            petugas: record.updatedBy || record.createdBy || defaultOfficer,
            createdBy: existing?.createdBy || record.createdBy || defaultOfficer,
            createdAt: existing?.createdAt || record.createdAt || nowIso,
            updatedBy: record.updatedBy || defaultOfficer,
            updatedAt: record.updatedAt || nowIso,
            keterangan: `Periode Bulan ${record.bulan}/${record.tahun}`,
          });
        } else if (existing && existing.status === 'Aktif') {
          resultList.push({
            ...existing,
            status: 'Dibatalkan',
            cancelledAt: nowIso,
            cancelledBy: defaultOfficer,
            cancelReason: 'Pembayaran Jimpitan dibatalkan oleh pengguna',
            updatedAt: nowIso,
            updatedBy: defaultOfficer,
          });
        }
      }
    }
  }

  // 4. Donasi Records
  if (Array.isArray(data.donasi)) {
    for (const record of data.donasi) {
      const sourceKey = `donasi:${record.id}`;
      const existing = existingMap.get(sourceKey);
      const noBukti = existing?.noBukti || generateNoBukti('DON', record.tanggal, [...existingBukuKas, ...resultList]);

      resultList.push({
        id: existing?.id || `bk-don-${record.id}`,
        tanggal: record.tanggal,
        noBukti,
        sourceType: 'donasi',
        sourceId: record.id,
        kategori: 'Donasi',
        uraian: `Donasi dari ${record.namaDonatur}${record.nomorRumah ? ` (Rumah ${record.nomorRumah})` : ''}`,
        pemasukan: record.nominal || 0,
        pengeluaran: 0,
        saldo: 0,
        status: 'Aktif',
        petugas: record.updatedBy || record.createdBy || defaultOfficer,
        createdBy: existing?.createdBy || record.createdBy || defaultOfficer,
        createdAt: existing?.createdAt || record.createdAt || nowIso,
        updatedBy: record.updatedBy || defaultOfficer,
        updatedAt: record.updatedAt || nowIso,
        keterangan: record.keterangan || 'Donasi kegiatan / kas RT',
      });
    }
  }

  // 5. BOP Records
  if (Array.isArray(data.bop)) {
    for (const record of data.bop) {
      const sourceKey = `bop:${record.id}`;
      const existing = existingMap.get(sourceKey);
      const noBukti = existing?.noBukti || generateNoBukti('BOP', record.tanggal, [...existingBukuKas, ...resultList]);
      const isPemasukan = record.jenis === 'Pemasukan';

      resultList.push({
        id: existing?.id || `bk-bop-${record.id}`,
        tanggal: record.tanggal,
        noBukti,
        sourceType: 'bop',
        sourceId: record.id,
        kategori: `BOP - ${record.kategori}`,
        uraian: record.uraian || `Operasional ${record.kategori}`,
        pemasukan: isPemasukan ? (record.nominal || 0) : 0,
        pengeluaran: !isPemasukan ? (record.nominal || 0) : 0,
        saldo: 0,
        status: 'Aktif',
        petugas: record.updatedBy || record.createdBy || defaultOfficer,
        createdBy: existing?.createdBy || record.createdBy || defaultOfficer,
        createdAt: existing?.createdAt || record.createdAt || nowIso,
        updatedBy: record.updatedBy || defaultOfficer,
        updatedAt: record.updatedAt || nowIso,
        keterangan: record.keterangan || (isPemasukan ? 'Pemasukan operasional RT' : 'Pengeluaran operasional RT'),
      });
    }
  }

  // 6. Dana Talangan Records (Pemberian Talangan - Kas Berkurang / Pengeluaran)
  if (Array.isArray(data.danaTalangan)) {
    for (const record of data.danaTalangan) {
      const sourceKey = `dana_talangan:${record.id}`;
      const existing = existingMap.get(sourceKey);
      const noBukti = existing?.noBukti || generateNoBukti('TAL', record.tanggal, [...existingBukuKas, ...resultList]);
      const isActive = record.statusAktif === 'Aktif';

      if (isActive) {
        resultList.push({
          id: existing?.id || `bk-tal-${record.id}`,
          tanggal: record.tanggal,
          noBukti,
          sourceType: 'dana_talangan',
          sourceId: record.id,
          kategori: 'Talangan Kematian',
          uraian: `Dana talangan kematian - ${record.namaPeminjam} (Rumah ${record.nomorRumah})`,
          pemasukan: 0,
          pengeluaran: record.jumlahTalangan || 0,
          saldo: 0,
          status: 'Aktif',
          petugas: record.createdBy || defaultOfficer,
          createdBy: existing?.createdBy || record.createdBy || defaultOfficer,
          createdAt: existing?.createdAt || record.createdAt || nowIso,
          updatedBy: record.updatedBy || defaultOfficer,
          updatedAt: record.updatedAt || nowIso,
          keterangan: record.keterangan ? `${record.alasan}: ${record.keterangan}` : `Alasan: ${record.alasan}`,
        });
      } else if (existing && existing.status === 'Aktif') {
        resultList.push({
          ...existing,
          status: 'Dibatalkan',
          cancelledAt: record.cancelledAt || nowIso,
          cancelledBy: record.cancelledBy || defaultOfficer,
          cancelReason: record.cancelReason || 'Dana talangan dibatalkan oleh pengguna',
          updatedAt: nowIso,
          updatedBy: defaultOfficer,
        });
      } else if (existing && existing.status === 'Dibatalkan') {
        resultList.push(existing);
      }
    }
  }

  // 7. Pelunasan Talangan Records (Kas Bertambah / Pemasukan)
  if (Array.isArray(data.pelunasanTalangan)) {
    const talanganMap = new Map<string, typeof data.danaTalangan extends (infer T)[] ? T : never>();
    if (Array.isArray(data.danaTalangan)) {
      for (const t of data.danaTalangan) {
        talanganMap.set(t.id, t);
      }
    }

    for (const record of data.pelunasanTalangan) {
      const sourceKey = `pelunasan_talangan:${record.id}`;
      const existing = existingMap.get(sourceKey);
      const noBukti = existing?.noBukti || generateNoBukti('PEL', record.tanggal, [...existingBukuKas, ...resultList]);
      const parentTalangan = talanganMap.get(record.talanganId);
      const peminjamName = parentTalangan ? parentTalangan.namaPeminjam : 'Warga';
      const rumahStr = parentTalangan?.nomorRumah ? ` (Rumah ${parentTalangan.nomorRumah})` : '';
      const isActive = record.status === 'Aktif';

      if (isActive) {
        resultList.push({
          id: existing?.id || `bk-pel-${record.id}`,
          tanggal: record.tanggal,
          noBukti,
          sourceType: 'pelunasan_talangan',
          sourceId: record.id,
          kategori: 'Pelunasan Talangan',
          uraian: `Pelunasan talangan - ${peminjamName}${rumahStr}`,
          pemasukan: record.jumlah || 0,
          pengeluaran: 0,
          saldo: 0,
          status: 'Aktif',
          petugas: record.createdBy || defaultOfficer,
          createdBy: existing?.createdBy || record.createdBy || defaultOfficer,
          createdAt: existing?.createdAt || record.createdAt || nowIso,
          updatedBy: record.updatedBy || defaultOfficer,
          updatedAt: record.updatedAt || nowIso,
          keterangan: record.keterangan || `Pelunasan dana talangan kematian (${peminjamName})`,
        });
      } else if (existing && existing.status === 'Aktif') {
        resultList.push({
          ...existing,
          status: 'Dibatalkan',
          cancelledAt: record.cancelledAt || nowIso,
          cancelledBy: record.cancelledBy || defaultOfficer,
          cancelReason: record.cancelReason || 'Pelunasan talangan dibatalkan oleh pengguna',
          updatedAt: nowIso,
          updatedBy: defaultOfficer,
        });
      } else if (existing && existing.status === 'Dibatalkan') {
        resultList.push(existing);
      }
    }
  }

  // 8. Handle any existing records in existingBukuKas whose source has been completely deleted
  // We keep cancelled ones or mark orphaned ones as Dibatalkan to preserve accounting integrity
  const sourceKeysInCurrent = new Set(resultList.map(r => `${r.sourceType}:${r.sourceId}`));
  for (const oldItem of existingBukuKas) {
    const oldKey = `${oldItem.sourceType}:${oldItem.sourceId}`;
    if (!sourceKeysInCurrent.has(oldKey) && oldItem.status === 'Aktif') {
      resultList.push({
        ...oldItem,
        status: 'Dibatalkan',
        cancelledAt: nowIso,
        cancelledBy: defaultOfficer,
        cancelReason: 'Transaksi sumber telah dihapus dari sistem',
      });
    } else if (!sourceKeysInCurrent.has(oldKey) && oldItem.status === 'Dibatalkan') {
      resultList.push(oldItem);
    }
  }

  // Finally compute running balances
  return computeBukuKasRunningBalances(resultList);
}

/**
 * Reconciliation check structure
 */
export interface ReconciliationReport {
  isMatched: boolean;
  totalDifference: number;
  sources: {
    name: string;
    sourceTotal: number;
    bukuKasTotal: number;
    difference: number;
    status: 'SESUAI' | 'SELISIH';
  }[];
  activeCount: number;
  cancelledCount: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
}

export function reconcileBukuKas(data: AppStateData): ReconciliationReport {
  const activeBukuKas = (data.bukuKas || []).filter(b => b.status === 'Aktif');

  // 1. Iuran
  const totalIuranSource = (data.iuran || []).reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalIuranBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'iuran')
    .reduce((acc, curr) => acc + curr.pemasukan, 0);

  // 2. Jimpitan
  const totalJimpitanSource = (data.jimpitan || []).reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalJimpitanBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'jimpitan')
    .reduce((acc, curr) => acc + curr.pemasukan, 0);

  // 3. Donasi
  const totalDonasiSource = (data.donasi || []).reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalDonasiBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'donasi')
    .reduce((acc, curr) => acc + curr.pemasukan, 0);

  // 4. BOP Pemasukan
  const totalBopMasukSource = (data.bop || [])
    .filter(b => b.jenis === 'Pemasukan')
    .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalBopMasukBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'bop' && b.pemasukan > 0)
    .reduce((acc, curr) => acc + curr.pemasukan, 0);

  // 5. BOP Pengeluaran
  const totalBopKeluarSource = (data.bop || [])
    .filter(b => b.jenis === 'Pengeluaran')
    .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalBopKeluarBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'bop' && b.pengeluaran > 0)
    .reduce((acc, curr) => acc + curr.pengeluaran, 0);

  // 6. Dana Talangan (Pengeluaran Kas RT)
  const totalTalanganSource = (data.danaTalangan || [])
    .filter(t => t.statusAktif === 'Aktif')
    .reduce((acc, curr) => acc + (curr.jumlahTalangan || 0), 0);
  const totalTalanganBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'dana_talangan')
    .reduce((acc, curr) => acc + curr.pengeluaran, 0);

  // 7. Pelunasan Talangan (Pemasukan Kas RT)
  const totalPelunasanSource = (data.pelunasanTalangan || [])
    .filter(p => p.status === 'Aktif')
    .reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
  const totalPelunasanBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'pelunasan_talangan')
    .reduce((acc, curr) => acc + curr.pemasukan, 0);

  // 8. Saldo Awal Kas RT
  const totalSaldoAwalSource = (data.saldoAwal || []).reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalSaldoAwalBukuKas = activeBukuKas
    .filter(b => b.sourceType === 'saldo_awal')
    .reduce((acc, curr) => acc + curr.pemasukan, 0);

  const sources = [
    {
      name: 'Saldo Awal Kas RT',
      sourceTotal: totalSaldoAwalSource,
      bukuKasTotal: totalSaldoAwalBukuKas,
      difference: totalSaldoAwalSource - totalSaldoAwalBukuKas,
      status: (totalSaldoAwalSource === totalSaldoAwalBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'Iuran Warga',
      sourceTotal: totalIuranSource,
      bukuKasTotal: totalIuranBukuKas,
      difference: totalIuranSource - totalIuranBukuKas,
      status: (totalIuranSource === totalIuranBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'Jimpitan Ronda',
      sourceTotal: totalJimpitanSource,
      bukuKasTotal: totalJimpitanBukuKas,
      difference: totalJimpitanSource - totalJimpitanBukuKas,
      status: (totalJimpitanSource === totalJimpitanBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'Donasi',
      sourceTotal: totalDonasiSource,
      bukuKasTotal: totalDonasiBukuKas,
      difference: totalDonasiSource - totalDonasiBukuKas,
      status: (totalDonasiSource === totalDonasiBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'BOP Pemasukan',
      sourceTotal: totalBopMasukSource,
      bukuKasTotal: totalBopMasukBukuKas,
      difference: totalBopMasukSource - totalBopMasukBukuKas,
      status: (totalBopMasukSource === totalBopMasukBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'BOP Pengeluaran',
      sourceTotal: totalBopKeluarSource,
      bukuKasTotal: totalBopKeluarBukuKas,
      difference: totalBopKeluarSource - totalBopKeluarBukuKas,
      status: (totalBopKeluarSource === totalBopKeluarBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'Pemberian Talangan Kematian',
      sourceTotal: totalTalanganSource,
      bukuKasTotal: totalTalanganBukuKas,
      difference: totalTalanganSource - totalTalanganBukuKas,
      status: (totalTalanganSource === totalTalanganBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
    {
      name: 'Pelunasan Talangan Kematian',
      sourceTotal: totalPelunasanSource,
      bukuKasTotal: totalPelunasanBukuKas,
      difference: totalPelunasanSource - totalPelunasanBukuKas,
      status: (totalPelunasanSource === totalPelunasanBukuKas ? 'SESUAI' : 'SELISIH') as 'SESUAI' | 'SELISIH',
    },
  ];

  const totalDifference = sources.reduce((sum, s) => sum + Math.abs(s.difference), 0);
  const isMatched = totalDifference === 0;

  const totalPemasukan = activeBukuKas.reduce((acc, curr) => acc + curr.pemasukan, 0);
  const totalPengeluaran = activeBukuKas.reduce((acc, curr) => acc + curr.pengeluaran, 0);
  const saldoAkhir = totalPemasukan - totalPengeluaran;

  return {
    isMatched,
    totalDifference,
    sources,
    activeCount: activeBukuKas.length,
    cancelledCount: (data.bukuKas || []).length - activeBukuKas.length,
    totalPemasukan,
    totalPengeluaran,
    saldoAkhir,
  };
}

/**
 * Check for duplicate transactions in Buku Kas
 */
export interface DuplicateGroup {
  key: string;
  count: number;
  records: BukuKasRecord[];
}

export function detectBukuKasDuplicates(records: BukuKasRecord[]): DuplicateGroup[] {
  const groups = new Map<string, BukuKasRecord[]>();

  for (const item of records) {
    if (item.status === 'Dibatalkan') continue;

    // Check key by sourceType + sourceId
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) {
      duplicates.push({
        key,
        count: list.length,
        records: list,
      });
    }
  }

  return duplicates;
}

/**
 * Export records to CSV
 */
export function exportBukuKasToCsv(
  records: BukuKasRecord[],
  title: string = 'Buku_Kas_RT09_RW08'
): void {
  const headers = [
    'No',
    'Tanggal',
    'No. Bukti',
    'Sumber',
    'Kategori',
    'Uraian',
    'Pemasukan (Rp)',
    'Pengeluaran (Rp)',
    'Saldo (Rp)',
    'Status',
    'Petugas',
    'Keterangan'
  ];

  const rows = records.map((item, idx) => [
    (idx + 1).toString(),
    `"${item.tanggal}"`,
    `"${item.noBukti}"`,
    `"${item.sourceType}"`,
    `"${item.kategori}"`,
    `"${(item.uraian || '').replace(/"/g, '""')}"`,
    item.pemasukan.toString(),
    item.pengeluaran.toString(),
    item.saldo.toString(),
    `"${item.status}"`,
    `"${item.petugas || ''}"`,
    `"${(item.keterangan || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
