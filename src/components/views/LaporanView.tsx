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
  Clock,
  WalletCards,
  HeartHandshake,
  BookOpen,
  Receipt
} from 'lucide-react';
import { formatRupiah, NAMA_BULAN, formatTanggalIndonesia, downloadCSV } from '../../utils/format';
import { PrintReportHeader, PrintReportFooter, PrintPageStyle } from '../common/PrintReportLayout';

type LaporanTab = 'kas_rt' | 'iuran' | 'jimpitan' | 'donasi' | 'pengeluaran_dana' | 'dana_talangan' | 'buku_kas' | 'bop';

export const LaporanView: React.FC = () => {
  const { data, getIuranForWarga, getJimpitanForWarga, getWargaInfo, periodFilter } = useData();

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

  // Citizens sorted by house number
  const sortedWarga = useMemo(() => {
    return [...data.warga].sort((a, b) => 
      a.nomorRumah.localeCompare(b.nomorRumah, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data.warga]);

  // 1. Calculations for Iuran in selected period (Iterates through all warga!)
  const iuranReportData = useMemo(() => {
    const fullNominal = 
      (data.settings.nominalKas || 5000) + 
      (data.settings.nominalUangMeja || 10000) + 
      (data.settings.nominalUangSampah || 12000) + 
      (data.settings.nominalDanaAcaraTahunan || 3000) + 
      (data.settings.nominalUangSosial || 5000);

    const rows = sortedWarga.map((w, idx) => {
      let kas = false;
      let uangMeja = false;
      let uangSampah = false;
      let danaAcaraTahunan = false;
      let uangSosial = false;
      let totalDibayar = 0;
      let status: 'Lunas' | 'Sebagian' | 'Belum Bayar' = 'Belum Bayar';

      if (useSemuaBulan) {
        // Aggregate across all months of selectedTahun
        const wargaRecords = data.iuran.filter(i => i.wargaId === w.id && i.tahun === selectedTahun);
        wargaRecords.forEach(rec => {
          if (rec.kas) kas = true;
          if (rec.uangMeja) uangMeja = true;
          if (rec.uangSampah) uangSampah = true;
          if (rec.danaAcaraTahunan) danaAcaraTahunan = true;
          if (rec.uangSosial) uangSosial = true;
          totalDibayar += (rec.total || 0);
        });
        const annualFull = fullNominal * 12;
        status = totalDibayar >= annualFull ? 'Lunas' : totalDibayar > 0 ? 'Sebagian' : 'Belum Bayar';
      } else {
        const record = getIuranForWarga(w.id, selectedBulan, selectedTahun);
        if (record) {
          kas = record.kas;
          uangMeja = record.uangMeja;
          uangSampah = record.uangSampah;
          danaAcaraTahunan = record.danaAcaraTahunan;
          uangSosial = record.uangSosial;
          totalDibayar = record.total || 0;
          status = record.status;
        }
      }

      const targetPeriodNominal = useSemuaBulan ? (fullNominal * 12) : fullNominal;
      const tunggakan = Math.max(0, targetPeriodNominal - totalDibayar);

      return {
        no: idx + 1,
        wargaId: w.id,
        nomorRumah: w.nomorRumah,
        namaWarga: w.namaWarga || w.nama,
        kas,
        uangMeja,
        uangSampah,
        danaAcaraTahunan,
        uangSosial,
        totalDibayar,
        tunggakan,
        status,
      };
    });

    const totalKas = rows.reduce((s, r) => s + (r.kas ? data.settings.nominalKas : 0), 0);
    const totalMeja = rows.reduce((s, r) => s + (r.uangMeja ? data.settings.nominalUangMeja : 0), 0);
    const totalSampah = rows.reduce((s, r) => s + (r.uangSampah ? data.settings.nominalUangSampah : 0), 0);
    const totalAcara = rows.reduce((s, r) => s + (r.danaAcaraTahunan ? data.settings.nominalDanaAcaraTahunan : 0), 0);
    const totalSosial = rows.reduce((s, r) => s + (r.uangSosial ? data.settings.nominalUangSosial : 0), 0);
    const totalAll = rows.reduce((s, r) => s + r.totalDibayar, 0);
    const totalTunggakan = rows.reduce((s, r) => s + r.tunggakan, 0);

    return {
      records: rows,
      totalKas,
      totalMeja,
      totalSampah,
      totalAcara,
      totalSosial,
      totalAll,
      totalTunggakan,
      wargaCount: rows.length,
    };
  }, [sortedWarga, data.iuran, data.settings, selectedBulan, selectedTahun, useSemuaBulan, getIuranForWarga]);

  // 2. Calculations for Jimpitan in selected period (Iterates through all warga!)
  const jimpitanReportData = useMemo(() => {
    const nominal = data.settings.nominalJimpitan || 3000;
    const fullWeeklyNominal = 5 * nominal;

    const rows = sortedWarga.map((w, idx) => {
      let m1 = false, m2 = false, m3 = false, m4 = false, m5 = false;
      let totalDibayar = 0;

      if (useSemuaBulan) {
        const records = data.jimpitan.filter(j => j.wargaId === w.id && j.tahun === selectedTahun);
        records.forEach(j => {
          if (j.minggu1) m1 = true;
          if (j.minggu2) m2 = true;
          if (j.minggu3) m3 = true;
          if (j.minggu4) m4 = true;
          if (j.minggu5) m5 = true;
          totalDibayar += (j.total || 0);
        });
      } else {
        const record = getJimpitanForWarga(w.id, selectedBulan, selectedTahun);
        if (record) {
          m1 = record.minggu1;
          m2 = record.minggu2;
          m3 = record.minggu3;
          m4 = record.minggu4;
          m5 = record.minggu5;
          totalDibayar = record.total || 0;
        }
      }

      const tunggakan = Math.max(0, fullWeeklyNominal - totalDibayar);

      return {
        no: idx + 1,
        wargaId: w.id,
        nomorRumah: w.nomorRumah,
        namaWarga: w.namaWarga || w.nama,
        m1,
        m2,
        m3,
        m4,
        m5,
        totalDibayar,
        tunggakan,
      };
    });

    const totalJimpitan = rows.reduce((s, r) => s + r.totalDibayar, 0);
    const totalTunggakan = rows.reduce((s, r) => s + r.tunggakan, 0);

    return {
      records: rows,
      totalJimpitan,
      totalTunggakan,
    };
  }, [sortedWarga, data.jimpitan, data.settings.nominalJimpitan, selectedBulan, selectedTahun, useSemuaBulan, getJimpitanForWarga]);

  // 3. Donations in selected period
  const donasiReportData = useMemo(() => {
    const filtered = data.donasi.filter(d => {
      const date = new Date(d.tanggal);
      if (date.getFullYear() !== selectedTahun) return false;
      if (!useSemuaBulan && date.getMonth() + 1 !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const recordsWithWarga = filtered.map((d, idx) => {
      const info = getWargaInfo(d.wargaId, d.namaDonatur, d.nomorRumah);
      return {
        no: idx + 1,
        id: d.id,
        tanggal: d.tanggal,
        nomorRumah: info.nomorRumah !== '-' ? info.nomorRumah : (d.nomorRumah || '-'),
        namaDonatur: info.namaWarga !== '-' ? info.namaWarga : d.namaDonatur,
        nominal: d.nominal || 0,
        keterangan: d.keterangan || '-',
      };
    });

    const total = recordsWithWarga.reduce((s, d) => s + d.nominal, 0);
    return {
      records: recordsWithWarga,
      total,
    };
  }, [data.donasi, selectedBulan, selectedTahun, useSemuaBulan, getWargaInfo]);

  // 4. Calculations for Pengeluaran Dana in selected period
  const pengeluaranDanaReportData = useMemo(() => {
    const filtered = (data.pengeluaranDana || []).filter(p => {
      if (p.status === 'Dibatalkan') return false;
      const date = new Date(p.tanggal);
      if (date.getFullYear() !== selectedTahun) return false;
      if (!useSemuaBulan && date.getMonth() + 1 !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const recordsWithWarga = filtered.map((p, idx) => {
      const info = getWargaInfo(p.wargaId, p.namaWarga || p.penerima, p.nomorRumah);
      return {
        no: idx + 1,
        id: p.id,
        tanggal: p.tanggal,
        noBukti: p.noBukti,
        nomorRumah: info.nomorRumah,
        namaWargaPenerima: info.namaWarga !== '-' ? info.namaWarga : (p.penerima || '-'),
        kategori: p.kategori,
        keteranganPenggunaanDana: p.keteranganPenggunaanDana || p.keterangan || p.uraian || '-',
        nominal: p.nominal || 0,
      };
    });

    const total = recordsWithWarga.reduce((s, p) => s + p.nominal, 0);
    return {
      records: recordsWithWarga,
      total,
    };
  }, [data.pengeluaranDana, selectedBulan, selectedTahun, useSemuaBulan, getWargaInfo]);

  // 5. Dana Talangan in selected period
  const danaTalanganReportData = useMemo(() => {
    const filtered = (data.danaTalangan || []).filter(t => {
      if (t.statusAktif === 'Dibatalkan') return false;
      const date = new Date(t.tanggal);
      if (date.getFullYear() !== selectedTahun) return false;
      if (!useSemuaBulan && date.getMonth() + 1 !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const recordsWithWarga = filtered.map((t, idx) => {
      const info = getWargaInfo(t.wargaId, t.namaPeminjam, t.nomorRumah);
      return {
        no: idx + 1,
        id: t.id,
        tanggal: t.tanggal,
        nomorRumah: info.nomorRumah !== '-' ? info.nomorRumah : (t.nomorRumah || '-'),
        namaWarga: info.namaWarga !== '-' ? info.namaWarga : t.namaPeminjam,
        jumlahDipinjam: t.jumlahTalangan || 0,
        alasan: t.alasan,
        pelunasan: t.totalPelunasan || 0,
        sisa: t.sisaTalangan || 0,
        status: t.status,
      };
    });

    const totalDipinjam = recordsWithWarga.reduce((s, t) => s + t.jumlahDipinjam, 0);
    const totalPelunasan = recordsWithWarga.reduce((s, t) => s + t.pelunasan, 0);
    const totalSisa = recordsWithWarga.reduce((s, t) => s + t.sisa, 0);

    return {
      records: recordsWithWarga,
      totalDipinjam,
      totalPelunasan,
      totalSisa,
    };
  }, [data.danaTalangan, selectedBulan, selectedTahun, useSemuaBulan, getWargaInfo]);

  // 6. Buku Kas in selected period
  const bukuKasReportData = useMemo(() => {
    const filtered = (data.bukuKas || []).filter(b => {
      if (b.status === 'Dibatalkan') return false;
      if (!b.tanggal) return true;
      const [year, month] = b.tanggal.split('-');
      if (parseInt(year, 10) !== selectedTahun) return false;
      if (!useSemuaBulan && parseInt(month, 10) !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const recordsWithWarga = filtered.map((b, idx) => {
      const info = getWargaInfo(b.wargaId, b.namaWarga, b.nomorRumah);
      const isWargaSource = b.sourceType === 'iuran' || b.sourceType === 'jimpitan' || (b.wargaId || info.nomorRumah !== '-');
      return {
        no: idx + 1,
        id: b.id,
        tanggal: b.tanggal,
        noBukti: b.noBukti,
        jenis: b.pemasukan > 0 ? 'Pemasukan' : 'Pengeluaran',
        sumber: b.sourceType.toUpperCase(),
        nomorRumah: isWargaSource ? info.nomorRumah : (b.nomorRumah || '-'),
        namaWarga: isWargaSource ? info.namaWarga : (b.namaWarga || '-'),
        uraian: b.uraian,
        pemasukan: b.pemasukan || 0,
        pengeluaran: b.pengeluaran || 0,
        saldo: b.saldo || 0,
      };
    });

    const totalPemasukan = recordsWithWarga.reduce((s, b) => s + b.pemasukan, 0);
    const totalPengeluaran = recordsWithWarga.reduce((s, b) => s + b.pengeluaran, 0);
    const saldoAkhir = recordsWithWarga.length > 0 ? recordsWithWarga[recordsWithWarga.length - 1].saldo : 0;

    return {
      records: recordsWithWarga,
      totalPemasukan,
      totalPengeluaran,
      saldoAkhir,
    };
  }, [data.bukuKas, selectedBulan, selectedTahun, useSemuaBulan, getWargaInfo]);

  // 7. BOP in selected period
  const bopReportData = useMemo(() => {
    const filtered = data.bop.filter(b => {
      const date = new Date(b.tanggal);
      if (date.getFullYear() !== selectedTahun) return false;
      if (!useSemuaBulan && date.getMonth() + 1 !== selectedBulan) return false;
      return true;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const recordsWithWarga = filtered.map((b, idx) => {
      const info = getWargaInfo(b.wargaId, b.namaWarga, b.nomorRumah);
      return {
        no: idx + 1,
        id: b.id,
        tanggal: b.tanggal,
        jenis: b.jenis,
        kategori: b.kategori,
        nomorRumah: info.nomorRumah,
        namaWarga: info.namaWarga,
        uraian: b.uraian,
        nominal: b.nominal || 0,
        keterangan: b.keterangan || '-',
      };
    });

    const masuk = recordsWithWarga.filter(b => b.jenis === 'Pemasukan').reduce((s, b) => s + b.nominal, 0);
    const keluar = recordsWithWarga.filter(b => b.jenis === 'Pengeluaran').reduce((s, b) => s + b.nominal, 0);

    return {
      records: recordsWithWarga,
      masuk,
      keluar,
      saldo: masuk - keluar,
    };
  }, [data.bop, selectedBulan, selectedTahun, useSemuaBulan, getWargaInfo]);

  // Overall Kas RT Financial Statement (Laporan Keuangan Keseluruhan)
  const kasRtStatement = useMemo(() => {
    const totalPemasukan = iuranReportData.totalAll + jimpitanReportData.totalJimpitan + donasiReportData.total + bopReportData.masuk;
    const totalPengeluaran = bopReportData.keluar + pengeluaranDanaReportData.total;
    const saldoAkhir = totalPemasukan - totalPengeluaran;

    return {
      totalPemasukan,
      totalPengeluaran,
      saldoAkhir,
      isDefisit: saldoAkhir < 0,
    };
  }, [iuranReportData, jimpitanReportData, donasiReportData, bopReportData, pengeluaranDanaReportData]);

  // Dynamic orientation based on tab width
  const isLandscape = activeTab === 'iuran' || activeTab === 'jimpitan' || activeTab === 'buku_kas' || activeTab === 'dana_talangan';

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const periodLabel = useSemuaBulan ? `Tahun ${selectedTahun} (1 Tahun Penuh)` : `${NAMA_BULAN[selectedBulan - 1]} ${selectedTahun}`;

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
        ['PENGELUARAN', 'Total Pengeluaran Dana Kas RT', formatRupiah(pengeluaranDanaReportData.total)],
        ['TOTAL PENGELUARAN', 'Semua Pengeluaran Kas RT', formatRupiah(kasRtStatement.totalPengeluaran)],
        ['SALDO AKHIR RT', 'Total Pemasukan - Total Pengeluaran', formatRupiah(kasRtStatement.saldoAkhir)],
      ];
      downloadCSV(`Laporan_Kas_RT09_RW08_${periodStr}`, headers, rows);
    } else if (activeTab === 'iuran') {
      const headers = [
        'No', 
        'Nomor Rumah', 
        'Nama Warga', 
        'Kas', 
        'Uang Meja', 
        'Uang Sampah', 
        'Dana Acara Tahunan', 
        'Uang Sosial', 
        'Total Dibayar', 
        'Tunggakan', 
        'Status'
      ];
      const rows = iuranReportData.records.map(r => [
        r.no,
        r.nomorRumah,
        r.namaWarga,
        r.kas ? formatRupiah(data.settings.nominalKas) : 'Rp 0',
        r.uangMeja ? formatRupiah(data.settings.nominalUangMeja) : 'Rp 0',
        r.uangSampah ? formatRupiah(data.settings.nominalUangSampah) : 'Rp 0',
        r.danaAcaraTahunan ? formatRupiah(data.settings.nominalDanaAcaraTahunan) : 'Rp 0',
        r.uangSosial ? formatRupiah(data.settings.nominalUangSosial) : 'Rp 0',
        formatRupiah(r.totalDibayar),
        formatRupiah(r.tunggakan),
        r.status,
      ]);
      rows.push([
        '',
        '',
        'TOTAL',
        formatRupiah(iuranReportData.totalKas),
        formatRupiah(iuranReportData.totalMeja),
        formatRupiah(iuranReportData.totalSampah),
        formatRupiah(iuranReportData.totalAcara),
        formatRupiah(iuranReportData.totalSosial),
        formatRupiah(iuranReportData.totalAll),
        formatRupiah(iuranReportData.totalTunggakan),
        '',
      ]);
      downloadCSV(`Laporan_Iuran_RT09_${periodStr}`, headers, rows);
    } else if (activeTab === 'jimpitan') {
      const headers = ['No', 'Nomor Rumah', 'Nama Warga', 'M1', 'M2', 'M3', 'M4', 'M5', 'Total', 'Tunggakan'];
      const rows = jimpitanReportData.records.map(r => [
        r.no,
        r.nomorRumah,
        r.namaWarga,
        r.m1 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
        r.m2 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
        r.m3 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
        r.m4 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
        r.m5 ? formatRupiah(data.settings.nominalJimpitan) : 'Rp 0',
        formatRupiah(r.totalDibayar),
        formatRupiah(r.tunggakan),
      ]);
      rows.push([
        '',
        '',
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        formatRupiah(jimpitanReportData.totalJimpitan),
        formatRupiah(jimpitanReportData.totalTunggakan),
      ]);
      downloadCSV(`Laporan_Jimpitan_RT09_${periodStr}`, headers, rows);
    } else if (activeTab === 'donasi') {
      const headers = ['No', 'Tanggal', 'Nomor Rumah', 'Nama Donatur / Warga', 'Nominal', 'Keterangan'];
      const rows = donasiReportData.records.map(d => [
        d.no,
        d.tanggal,
        d.nomorRumah,
        d.namaDonatur,
        formatRupiah(d.nominal),
        d.keterangan,
      ]);
      rows.push(['', '', '', 'TOTAL', formatRupiah(donasiReportData.total), '']);
      downloadCSV(`Laporan_Donasi_RT09_${periodStr}`, headers, rows);
    } else if (activeTab === 'pengeluaran_dana') {
      const headers = ['No', 'Tanggal', 'Nomor Rumah', 'Nama Warga / Penerima', 'Kategori', 'Keterangan Penggunaan Dana', 'Nominal'];
      const rows = pengeluaranDanaReportData.records.map(p => [
        p.no,
        p.tanggal,
        p.nomorRumah,
        p.namaWargaPenerima,
        p.kategori,
        p.keteranganPenggunaanDana,
        formatRupiah(p.nominal),
      ]);
      rows.push(['', '', '', '', '', 'TOTAL', formatRupiah(pengeluaranDanaReportData.total)]);
      downloadCSV(`Laporan_Pengeluaran_Dana_RT09_${periodStr}`, headers, rows);
    } else if (activeTab === 'dana_talangan') {
      const headers = ['No', 'Tanggal', 'Nomor Rumah', 'Nama Warga', 'Jumlah Dipinjam', 'Alasan', 'Pelunasan', 'Sisa', 'Status'];
      const rows = danaTalanganReportData.records.map(t => [
        t.no,
        t.tanggal,
        t.nomorRumah,
        t.namaWarga,
        formatRupiah(t.jumlahDipinjam),
        t.alasan,
        formatRupiah(t.pelunasan),
        formatRupiah(t.sisa),
        t.status,
      ]);
      rows.push([
        '',
        '',
        '',
        'TOTAL',
        formatRupiah(danaTalanganReportData.totalDipinjam),
        '',
        formatRupiah(danaTalanganReportData.totalPelunasan),
        formatRupiah(danaTalanganReportData.totalSisa),
        '',
      ]);
      downloadCSV(`Laporan_Dana_Talangan_RT09_${periodStr}`, headers, rows);
    } else if (activeTab === 'buku_kas') {
      const headers = ['No', 'Tanggal', 'No Bukti', 'Jenis', 'Sumber', 'Nomor Rumah', 'Nama Warga', 'Uraian', 'Pemasukan', 'Pengeluaran', 'Saldo'];
      const rows = bukuKasReportData.records.map(b => [
        b.no,
        b.tanggal,
        b.noBukti,
        b.jenis,
        b.sumber,
        b.nomorRumah,
        b.namaWarga,
        b.uraian,
        formatRupiah(b.pemasukan),
        formatRupiah(b.pengeluaran),
        formatRupiah(b.saldo),
      ]);
      rows.push([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'TOTAL',
        formatRupiah(bukuKasReportData.totalPemasukan),
        formatRupiah(bukuKasReportData.totalPengeluaran),
        formatRupiah(bukuKasReportData.saldoAkhir),
      ]);
      downloadCSV(`Laporan_Buku_Kas_RT09_${periodStr}`, headers, rows);
    } else if (activeTab === 'bop') {
      const headers = ['No', 'Tanggal', 'Jenis', 'Kategori', 'Nomor Rumah', 'Nama Warga', 'Uraian', 'Nominal', 'Keterangan'];
      const rows = bopReportData.records.map(b => [
        b.no,
        b.tanggal,
        b.jenis,
        b.kategori,
        b.nomorRumah,
        b.namaWarga,
        b.uraian,
        formatRupiah(b.nominal),
        b.keterangan,
      ]);
      rows.push(['', '', '', '', '', '', 'TOTAL PEMASUKAN', formatRupiah(bopReportData.masuk), '']);
      rows.push(['', '', '', '', '', '', 'TOTAL PENGELUARAN', formatRupiah(bopReportData.keluar), '']);
      rows.push(['', '', '', '', '', '', 'SALDO BOP', formatRupiah(bopReportData.saldo), '']);
      downloadCSV(`Laporan_BOP_RT09_${periodStr}`, headers, rows);
    }
  };

  const getReportTitle = () => {
    switch (activeTab) {
      case 'kas_rt': return 'KEUANGAN KAS RT 09 RW 08 (REKAPITULASI)';
      case 'iuran': return 'IURAN BULANAN WARGA';
      case 'jimpitan': return 'JIMPITAN WARGA';
      case 'donasi': return 'DONASI DAN SUMBANGAN SUKARELA';
      case 'pengeluaran_dana': return 'PENGELUARAN DANA KAS RT';
      case 'dana_talangan': return 'DANA TALANGAN KEMATIAN';
      case 'buku_kas': return 'BUKU KAS UMUM';
      case 'bop': return 'BIAYA OPERASIONAL RT (BOP)';
      default: return 'KEUANGAN RT 09 RW 08';
    }
  };

  return (
    <div id="view-laporan-keuangan" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Inject custom print styles for landscape/portrait and column protection */}
      <PrintPageStyle landscape={isLandscape} />

      {/* Top Banner (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              CETAK & EKSPOR LAPORAN KEUANGAN
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Resmi & Valid
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Laporan lengkap RT 09 RW 08 Kelurahan Bangetayu Wetan dengan data Nomor Rumah & Nama Warga lengkap
          </p>
        </div>

        {/* Action button & Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            id="btn-print-laporan"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan / PDF
          </button>

          <button
            id="btn-export-laporan-csv"
            type="button"
            onClick={handleExportActiveTab}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>

          {/* All Months Toggle */}
          <button
            type="button"
            onClick={() => setUseSemuaBulan(!useSemuaBulan)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              useSemuaBulan 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {useSemuaBulan ? '1 Tahun Penuh' : 'Per Bulan'}
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
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'kas_rt'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Rekap Kas RT
        </button>

        <button
          id="tab-laporan-iuran"
          type="button"
          onClick={() => setActiveTab('iuran')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'iuran'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          1. Iuran Warga
        </button>

        <button
          id="tab-laporan-jimpitan"
          type="button"
          onClick={() => setActiveTab('jimpitan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'jimpitan'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CircleDollarSign className="w-4 h-4" />
          2. Jimpitan
        </button>

        <button
          id="tab-laporan-donasi"
          type="button"
          onClick={() => setActiveTab('donasi')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'donasi'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Gift className="w-4 h-4" />
          3. Donasi
        </button>

        <button
          id="tab-laporan-pengeluaran-dana"
          type="button"
          onClick={() => setActiveTab('pengeluaran_dana')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'pengeluaran_dana'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          4. Pengeluaran Dana
        </button>

        <button
          id="tab-laporan-dana-talangan"
          type="button"
          onClick={() => setActiveTab('dana_talangan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'dana_talangan'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          5. Dana Talangan
        </button>

        <button
          id="tab-laporan-buku-kas"
          type="button"
          onClick={() => setActiveTab('buku_kas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'buku_kas'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          6. Buku Kas
        </button>

        <button
          id="tab-laporan-bop"
          type="button"
          onClick={() => setActiveTab('bop')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'bop'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          7. BOP
        </button>
      </div>

      {/* PRINTABLE REPORT CARD CONTAINER */}
      <div
        id="printable-report-card"
        className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl print:bg-white print:text-black print:border-none print:p-0 print:shadow-none"
      >
        {/* Formal Header: KEUANGAN RT 09 RW 08 / KELURAHAN BANGETAYU WETAN */}
        <PrintReportHeader
          title={getReportTitle()}
          periode={periodLabel}
        />

        {/* Screen Header when not printing */}
        <div className="pb-4 mb-6 border-b border-slate-800 print:hidden text-center">
          <div className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold mb-1">
            RUKUN TETANGGA 09 RUKUN WARGA 08
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            {getReportTitle()}
          </h1>
          <div className="text-xs text-slate-300 font-medium mt-1">
            Kelurahan Bangetayu Wetan, Kecamatan Genuk, Kota Semarang
          </div>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700">
            Periode: {periodLabel}
          </div>
        </div>

        {/* TAB 1: LAPORAN KAS RT KESELURUHAN */}
        {activeTab === 'kas_rt' && (
          <div className="space-y-8">
            
            {/* A. PEMASUKAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500/40 print:border-black">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 print:text-black">
                  A. RINCIAN PEMASUKAN
                </h3>
                <span className="text-xs text-slate-400 print:text-black font-semibold">Subtotal</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* 5 Pos Iuran */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
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
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                  <div>
                    <span className="font-semibold text-white print:text-black">2. Total Jimpitan Mingguan</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Pengumpulan koin jimpitan warga RT 09
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(jimpitanReportData.totalJimpitan)}
                  </span>
                </div>

                {/* Donasi */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
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
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                  <div>
                    <span className="font-semibold text-white print:text-black">4. Total Pemasukan BOP</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Bantuan dinas / kelurahan / subsidi luar
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(bopReportData.masuk)}
                  </span>
                </div>
              </div>

              {/* Total Pemasukan Row */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/15 print:bg-gray-100 border border-emerald-500/30 print:border-black font-bold text-xs sm:text-sm">
                <span className="text-emerald-300 print:text-black uppercase">TOTAL PEMASUKAN KAS RT</span>
                <span className="font-mono text-emerald-400 print:text-black text-base">
                  {formatRupiah(kasRtStatement.totalPemasukan)}
                </span>
              </div>
            </div>

            {/* B. PENGELUARAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500/40 print:border-black">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-400 print:text-black">
                  B. RINCIAN PENGELUARAN KAS & OPERASIONAL RT
                </h3>
                <span className="text-xs text-slate-400 print:text-black font-semibold">Subtotal</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Pengeluaran BOP */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                  <div>
                    <span className="font-semibold text-white print:text-black">1. Pengeluaran BOP (Biaya Operasional)</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      ATK, listrik, kebersihan, perawatan, dll
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(bopReportData.keluar)}
                  </span>
                </div>

                {/* Pengeluaran Dana Kas RT */}
                <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-950/60 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                  <div>
                    <span className="font-semibold text-white print:text-black">2. Pengeluaran Dana Kas RT</span>
                    <div className="text-[11px] text-slate-400 print:text-gray-600">
                      Honor petugas sampah, uang meja, sosial, dll ({pengeluaranDanaReportData.records.length} transaksi)
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white print:text-black self-center">
                    {formatRupiah(pengeluaranDanaReportData.total)}
                  </span>
                </div>
              </div>

              {/* Total Pengeluaran Row */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/15 print:bg-gray-100 border border-rose-500/30 print:border-black font-bold text-xs sm:text-sm">
                <span className="text-rose-300 print:text-black uppercase">TOTAL PENGELUARAN KAS RT</span>
                <span className="font-mono text-rose-400 print:text-black text-base">
                  {formatRupiah(kasRtStatement.totalPengeluaran)}
                </span>
              </div>
            </div>

            {/* C. SALDO AKHIR */}
            <div className="p-4 rounded-2xl bg-slate-950/80 print:bg-gray-100 border border-slate-800 print:border-black flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-slate-400 print:text-black">
                  SALDO AKHIR KAS RT (SURPLUS / DEFISIT PERIODE INI)
                </div>
                <div className="text-[11px] text-slate-400 print:text-gray-700">
                  Total Seluruh Pemasukan dikurangi Total Seluruh Pengeluaran
                </div>
              </div>
              <div className={`font-mono text-xl sm:text-2xl font-black ${
                kasRtStatement.isDefisit ? 'text-rose-400 print:text-black' : 'text-emerald-400 print:text-black'
              }`}>
                {formatRupiah(kasRtStatement.saldoAkhir)}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LAPORAN IURAN */}
        {activeTab === 'iuran' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Pembayaran Iuran Warga (Lengkap 5 Pos)</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-400 font-bold">Total Tertagih: {formatRupiah(iuranReportData.totalAll)}</span>
                <span className="font-mono text-rose-400 font-bold">Total Tunggakan: {formatRupiah(iuranReportData.totalTunggakan)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9.5pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3 print:border print:border-black">No</th>
                    <th className="col-nomor-rumah py-2.5 px-3 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2.5 px-3 print:border print:border-black">Nama Warga</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">Kas</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">Uang Meja</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">Uang Sampah</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">Dana Acara</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">Uang Sosial</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Total Dibayar</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Tunggakan</th>
                    <th className="py-2.5 px-3 text-center print:border print:border-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {iuranReportData.records.map((r) => (
                    <tr key={r.wargaId} className="print:border-b print:border-black">
                      <td className="py-2 px-3 font-mono print:border print:border-black">{r.no}</td>
                      <td className="col-nomor-rumah py-2 px-3 font-mono font-bold print:border print:border-black">{r.nomorRumah}</td>
                      <td className="col-nama-warga py-2 px-3 font-semibold text-white print:text-black print:border print:border-black">{r.namaWarga}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.kas ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.uangMeja ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.uangSampah ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.danaAcaraTahunan ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.uangSosial ? '✓' : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 print:text-black print:border print:border-black">
                        {formatRupiah(r.totalDibayar)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-400 print:text-black print:border print:border-black">
                        {formatRupiah(r.tunggakan)}
                      </td>
                      <td className="py-2 px-3 text-center print:border print:border-black">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'Lunas' 
                            ? 'text-emerald-400 print:text-black' 
                            : r.status === 'Sebagian' 
                              ? 'text-amber-400 print:text-black' 
                              : 'text-rose-400 print:text-black'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={3} className="py-3 px-3 text-center print:border print:border-black">TOTAL</td>
                    <td className="py-3 px-2 text-center print:border print:border-black font-mono">{formatRupiah(iuranReportData.totalKas)}</td>
                    <td className="py-3 px-2 text-center print:border print:border-black font-mono">{formatRupiah(iuranReportData.totalMeja)}</td>
                    <td className="py-3 px-2 text-center print:border print:border-black font-mono">{formatRupiah(iuranReportData.totalSampah)}</td>
                    <td className="py-3 px-2 text-center print:border print:border-black font-mono">{formatRupiah(iuranReportData.totalAcara)}</td>
                    <td className="py-3 px-2 text-center print:border print:border-black font-mono">{formatRupiah(iuranReportData.totalSosial)}</td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-emerald-400 print:text-black">
                      {formatRupiah(iuranReportData.totalAll)}
                    </td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-rose-400 print:text-black">
                      {formatRupiah(iuranReportData.totalTunggakan)}
                    </td>
                    <td className="py-3 px-3 print:border print:border-black"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LAPORAN JIMPITAN */}
        {activeTab === 'jimpitan' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Detail Penerimaan Jimpitan Mingguan</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-cyan-400 font-bold">Total Terkumpul: {formatRupiah(jimpitanReportData.totalJimpitan)}</span>
                <span className="font-mono text-rose-400 font-bold">Total Tunggakan: {formatRupiah(jimpitanReportData.totalTunggakan)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9.5pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3 print:border print:border-black">No</th>
                    <th className="col-nomor-rumah py-2.5 px-3 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2.5 px-3 print:border print:border-black">Nama Warga</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">M1</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">M2</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">M3</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">M4</th>
                    <th className="py-2.5 px-2 text-center print:border print:border-black">M5</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Total</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Tunggakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {jimpitanReportData.records.map((r) => (
                    <tr key={r.wargaId} className="print:border-b print:border-black">
                      <td className="py-2 px-3 font-mono print:border print:border-black">{r.no}</td>
                      <td className="col-nomor-rumah py-2 px-3 font-mono font-bold print:border print:border-black">{r.nomorRumah}</td>
                      <td className="col-nama-warga py-2 px-3 font-semibold text-white print:text-black print:border print:border-black">{r.namaWarga}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.m1 ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.m2 ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.m3 ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.m4 ? '✓' : '-'}</td>
                      <td className="py-2 px-2 text-center print:border print:border-black">{r.m5 ? '✓' : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-cyan-400 print:text-black print:border print:border-black">
                        {formatRupiah(r.totalDibayar)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-400 print:text-black print:border print:border-black">
                        {formatRupiah(r.tunggakan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={8} className="py-3 px-3 text-center print:border print:border-black">TOTAL</td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-cyan-400 print:text-black">
                      {formatRupiah(jimpitanReportData.totalJimpitan)}
                    </td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-rose-400 print:text-black">
                      {formatRupiah(jimpitanReportData.totalTunggakan)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LAPORAN DONASI */}
        {activeTab === 'donasi' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Donasi & Sumbangan Sukarela</span>
              <span className="font-mono text-amber-400 font-bold">Total: {formatRupiah(donasiReportData.total)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9.5pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3 print:border print:border-black">No</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Tanggal</th>
                    <th className="col-nomor-rumah py-2.5 px-3 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2.5 px-3 print:border print:border-black">Nama Donatur / Warga</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Nominal</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {donasiReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 print:border print:border-black">
                        Tidak ada data donasi pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    donasiReportData.records.map((d) => (
                      <tr key={d.id} className="print:border-b print:border-black">
                        <td className="py-2 px-3 font-mono print:border print:border-black">{d.no}</td>
                        <td className="py-2 px-3 print:border print:border-black">{formatTanggalIndonesia(d.tanggal, 'short')}</td>
                        <td className="col-nomor-rumah py-2 px-3 font-mono font-bold print:border print:border-black">{d.nomorRumah}</td>
                        <td className="col-nama-warga py-2 px-3 font-semibold text-white print:text-black print:border print:border-black">{d.namaDonatur}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-400 print:text-black print:border print:border-black">
                          {formatRupiah(d.nominal)}
                        </td>
                        <td className="py-2 px-3 text-slate-300 print:text-black print:border print:border-black">{d.keterangan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={4} className="py-3 px-3 text-center print:border print:border-black">TOTAL</td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-amber-400 print:text-black">
                      {formatRupiah(donasiReportData.total)}
                    </td>
                    <td className="py-3 px-3 print:border print:border-black"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: LAPORAN PENGELUARAN DANA KAS RT */}
        {activeTab === 'pengeluaran_dana' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Transaksi Pengeluaran Dana Kas RT</span>
              <span className="font-mono text-rose-400 font-bold">Total: {formatRupiah(pengeluaranDanaReportData.total)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9.5pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3 print:border print:border-black">No</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Tanggal</th>
                    <th className="col-nomor-rumah py-2.5 px-3 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2.5 px-3 print:border print:border-black">Nama Warga / Penerima</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Kategori</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Keterangan Penggunaan Dana</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {pengeluaranDanaReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 print:border print:border-black">
                        Tidak ada catatan pengeluaran dana pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    pengeluaranDanaReportData.records.map((p) => (
                      <tr key={p.id} className="print:border-b print:border-black">
                        <td className="py-2 px-3 font-mono print:border print:border-black">{p.no}</td>
                        <td className="py-2 px-3 print:border print:border-black">{formatTanggalIndonesia(p.tanggal, 'short')}</td>
                        <td className="col-nomor-rumah py-2 px-3 font-mono font-bold print:border print:border-black">{p.nomorRumah}</td>
                        <td className="col-nama-warga py-2 px-3 font-semibold text-white print:text-black print:border print:border-black">{p.namaWargaPenerima}</td>
                        <td className="py-2 px-3 font-medium text-rose-400 print:text-black print:border print:border-black">{p.kategori}</td>
                        <td className="py-2 px-3 text-slate-300 print:text-black print:border print:border-black">{p.keteranganPenggunaanDana}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-400 print:text-black print:border print:border-black">
                          {formatRupiah(p.nominal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={6} className="py-3 px-3 text-center print:border print:border-black">TOTAL</td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-rose-400 print:text-black">
                      {formatRupiah(pengeluaranDanaReportData.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: LAPORAN DANA TALANGAN */}
        {activeTab === 'dana_talangan' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Dana Talangan Kematian</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-rose-400 font-bold">Dipinjam: {formatRupiah(danaTalanganReportData.totalDipinjam)}</span>
                <span className="font-mono text-emerald-400 font-bold">Pelunasan: {formatRupiah(danaTalanganReportData.totalPelunasan)}</span>
                <span className="font-mono text-amber-400 font-bold">Sisa: {formatRupiah(danaTalanganReportData.totalSisa)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9.5pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3 print:border print:border-black">No</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Tanggal</th>
                    <th className="col-nomor-rumah py-2.5 px-3 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2.5 px-3 print:border print:border-black">Nama Warga</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Jumlah Dipinjam</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Alasan</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Pelunasan</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Sisa</th>
                    <th className="py-2.5 px-3 text-center print:border print:border-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {danaTalanganReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 print:border print:border-black">
                        Tidak ada catatan dana talangan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    danaTalanganReportData.records.map((t) => (
                      <tr key={t.id} className="print:border-b print:border-black">
                        <td className="py-2 px-3 font-mono print:border print:border-black">{t.no}</td>
                        <td className="py-2 px-3 print:border print:border-black">{formatTanggalIndonesia(t.tanggal, 'short')}</td>
                        <td className="col-nomor-rumah py-2 px-3 font-mono font-bold print:border print:border-black">{t.nomorRumah}</td>
                        <td className="col-nama-warga py-2 px-3 font-semibold text-white print:text-black print:border print:border-black">{t.namaWarga}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-400 print:text-black print:border print:border-black">
                          {formatRupiah(t.jumlahDipinjam)}
                        </td>
                        <td className="py-2 px-3 text-slate-300 print:text-black print:border print:border-black">{t.alasan}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400 print:text-black print:border print:border-black">
                          {formatRupiah(t.pelunasan)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-400 print:text-black print:border print:border-black">
                          {formatRupiah(t.sisa)}
                        </td>
                        <td className="py-2 px-3 text-center print:border print:border-black">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'Lunas' ? 'text-emerald-400 print:text-black' : 'text-amber-400 print:text-black'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={4} className="py-3 px-3 text-center print:border print:border-black">TOTAL</td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-rose-400 print:text-black">
                      {formatRupiah(danaTalanganReportData.totalDipinjam)}
                    </td>
                    <td className="py-3 px-3 print:border print:border-black"></td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-emerald-400 print:text-black">
                      {formatRupiah(danaTalanganReportData.totalPelunasan)}
                    </td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-amber-400 print:text-black">
                      {formatRupiah(danaTalanganReportData.totalSisa)}
                    </td>
                    <td className="py-3 px-3 print:border print:border-black"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: LAPORAN BUKU KAS */}
        {activeTab === 'buku_kas' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Buku Kas Umum RT 09</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-400 font-bold">Pemasukan: {formatRupiah(bukuKasReportData.totalPemasukan)}</span>
                <span className="font-mono text-rose-400 font-bold">Pengeluaran: {formatRupiah(bukuKasReportData.totalPengeluaran)}</span>
                <span className="font-mono text-cyan-400 font-bold">Saldo Akhir: {formatRupiah(bukuKasReportData.saldoAkhir)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2 px-2 print:border print:border-black">No</th>
                    <th className="py-2 px-2 print:border print:border-black">Tanggal</th>
                    <th className="py-2 px-2 print:border print:border-black">No. Bukti</th>
                    <th className="py-2 px-2 print:border print:border-black">Jenis</th>
                    <th className="py-2 px-2 print:border print:border-black">Sumber</th>
                    <th className="col-nomor-rumah py-2 px-2 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2 px-2 print:border print:border-black">Nama Warga</th>
                    <th className="py-2 px-3 print:border print:border-black">Uraian</th>
                    <th className="py-2 px-2 text-right print:border print:border-black">Pemasukan</th>
                    <th className="py-2 px-2 text-right print:border print:border-black">Pengeluaran</th>
                    <th className="py-2 px-2 text-right print:border print:border-black">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {bukuKasReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 print:border print:border-black">
                        Tidak ada transaksi buku kas pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    bukuKasReportData.records.map((b) => (
                      <tr key={b.id} className="print:border-b print:border-black">
                        <td className="py-1.5 px-2 font-mono print:border print:border-black">{b.no}</td>
                        <td className="py-1.5 px-2 whitespace-nowrap print:border print:border-black">{formatTanggalIndonesia(b.tanggal, 'short')}</td>
                        <td className="py-1.5 px-2 font-mono text-[11px] print:border print:border-black">{b.noBukti}</td>
                        <td className="py-1.5 px-2 font-semibold print:border print:border-black">
                          <span className={b.jenis === 'Pemasukan' ? 'text-emerald-400 print:text-black' : 'text-rose-400 print:text-black'}>
                            {b.jenis}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-[11px] font-mono print:border print:border-black">{b.sumber}</td>
                        <td className="col-nomor-rumah py-1.5 px-2 font-mono font-bold print:border print:border-black">{b.nomorRumah}</td>
                        <td className="col-nama-warga py-1.5 px-2 font-medium text-white print:text-black print:border print:border-black">{b.namaWarga}</td>
                        <td className="py-1.5 px-3 text-slate-300 print:text-black print:border print:border-black">{b.uraian}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-emerald-400 print:text-black print:border print:border-black">
                          {b.pemasukan > 0 ? formatRupiah(b.pemasukan) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-rose-400 print:text-black print:border print:border-black">
                          {b.pengeluaran > 0 ? formatRupiah(b.pengeluaran) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-white print:text-black print:border print:border-black">
                          {formatRupiah(b.saldo)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={8} className="py-3 px-3 text-center print:border print:border-black">TOTAL</td>
                    <td className="py-3 px-2 text-right print:border print:border-black font-mono text-emerald-400 print:text-black">
                      {formatRupiah(bukuKasReportData.totalPemasukan)}
                    </td>
                    <td className="py-3 px-2 text-right print:border print:border-black font-mono text-rose-400 print:text-black">
                      {formatRupiah(bukuKasReportData.totalPengeluaran)}
                    </td>
                    <td className="py-3 px-2 text-right print:border print:border-black font-mono text-white print:text-black">
                      {formatRupiah(bukuKasReportData.saldoAkhir)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: LAPORAN BOP */}
        {activeTab === 'bop' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs print:hidden">
              <span className="font-bold text-white">Tabel Biaya Operasional RT (BOP)</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-emerald-400 font-bold">Pemasukan: {formatRupiah(bopReportData.masuk)}</span>
                <span className="font-mono text-rose-400 font-bold">Pengeluaran: {formatRupiah(bopReportData.keluar)}</span>
                <span className="font-mono text-cyan-400 font-bold">Saldo: {formatRupiah(bopReportData.saldo)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[9.5pt] print:border print:border-black">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-black font-bold text-slate-300 print:text-black">
                    <th className="py-2.5 px-3 print:border print:border-black">No</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Tanggal</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Jenis</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Kategori</th>
                    <th className="col-nomor-rumah py-2.5 px-3 print:border print:border-black">Nomor Rumah</th>
                    <th className="col-nama-warga py-2.5 px-3 print:border print:border-black">Nama Warga</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Uraian</th>
                    <th className="py-2.5 px-3 text-right print:border print:border-black">Nominal</th>
                    <th className="py-2.5 px-3 print:border print:border-black">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {bopReportData.records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 print:border print:border-black">
                        Tidak ada transaksi BOP pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    bopReportData.records.map((b) => (
                      <tr key={b.id} className="print:border-b print:border-black">
                        <td className="py-2 px-3 font-mono print:border print:border-black">{b.no}</td>
                        <td className="py-2 px-3 print:border print:border-black">{formatTanggalIndonesia(b.tanggal, 'short')}</td>
                        <td className="py-2 px-3 font-semibold print:border print:border-black">
                          <span className={b.jenis === 'Pemasukan' ? 'text-emerald-400 print:text-black' : 'text-rose-400 print:text-black'}>
                            {b.jenis}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-300 print:text-black print:border print:border-black">{b.kategori}</td>
                        <td className="col-nomor-rumah py-2 px-3 font-mono font-bold print:border print:border-black">{b.nomorRumah}</td>
                        <td className="col-nama-warga py-2 px-3 font-medium text-white print:text-black print:border print:border-black">{b.namaWarga}</td>
                        <td className="py-2 px-3 text-white print:text-black print:border print:border-black">{b.uraian}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold print:border print:border-black">
                          <span className={b.jenis === 'Pemasukan' ? 'text-emerald-400 print:text-black' : 'text-rose-400 print:text-black'}>
                            {formatRupiah(b.nominal)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 print:text-black print:border print:border-black">{b.keterangan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-bold text-white print:bg-gray-100 print:text-black print:border-t-2 print:border-black">
                    <td colSpan={7} className="py-3 px-3 text-center print:border print:border-black">TOTAL NETTO (PEMASUKAN - PENGELUARAN)</td>
                    <td className="py-3 px-3 text-right print:border print:border-black font-mono text-cyan-400 print:text-black">
                      {formatRupiah(bopReportData.saldo)}
                    </td>
                    <td className="py-3 px-3 print:border print:border-black"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Formal Printable Footer (Signatures & Timestamp) */}
        <PrintReportFooter
          ketuaRT={data.settings.ketuaRT || 'H. Sugiyanto, S.E.'}
          bendahara={data.settings.bendahara || 'Bambang Pamungkas, S.Kom.'}
          lokasi="Semarang"
        />

      </div>

    </div>
  );
};
