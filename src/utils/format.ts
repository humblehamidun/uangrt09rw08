export const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

/**
 * Formats number to Indonesian Rupiah representation: e.g. Rp 5.000, Rp 35.000, Rp 1.250.000
 */
export function formatRupiah(nominal: number): string {
  if (nominal === undefined || nominal === null || isNaN(nominal)) {
    return 'Rp 0';
  }
  const isNegative = nominal < 0;
  const absVal = Math.abs(Math.round(nominal));
  const parts = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '- ' : ''}Rp ${parts}`;
}

/**
 * Formats date to Indonesian style (e.g., "13 September 2026" or "13/09/2026")
 */
export function formatTanggalIndonesia(dateStr: string, format: 'full' | 'short' = 'full'): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (format === 'short') {
        return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
      }
      return `${day} ${NAMA_BULAN[month - 1] || ''} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    if (format === 'short') {
      return `${day < 10 ? '0' + day : day}/${month + 1 < 10 ? '0' + (month + 1) : month + 1}/${year}`;
    }
    return `${day} ${NAMA_BULAN[month]} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Returns unique string ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Download arbitrary data as a CSV file in browser
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCSV = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to compute weeks range for a given month and year
 */
export function getWeeksInMonth(year: number, month: number) {
  return [
    { id: 1, label: 'Minggu 1', range: `1 - 7 ${NAMA_BULAN[month - 1]}` },
    { id: 2, label: 'Minggu 2', range: `8 - 14 ${NAMA_BULAN[month - 1]}` },
    { id: 3, label: 'Minggu 3', range: `15 - 21 ${NAMA_BULAN[month - 1]}` },
    { id: 4, label: 'Minggu 4', range: `22 - 28 ${NAMA_BULAN[month - 1]}` },
    { id: 5, label: 'Minggu 5', range: `29 - Akhir ${NAMA_BULAN[month - 1]}` },
  ];
}

/**
 * Converts numbers into Indonesian spelled-out words (terbilang)
 * e.g. 1500000 -> "satu juta lima ratus ribu"
 */
export function terbilang(nominal: number): string {
  if (nominal === undefined || nominal === null || isNaN(nominal)) return 'nol';
  const n = Math.floor(Math.abs(nominal));
  if (n === 0) return 'nol';

  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

  const convert = (num: number): string => {
    if (num < 12) {
      return satuan[num];
    } else if (num < 20) {
      return `${convert(num - 10)} belas`;
    } else if (num < 100) {
      const sisa = num % 10;
      return `${convert(Math.floor(num / 10))} puluh ${sisa > 0 ? convert(sisa) : ''}`.trim();
    } else if (num < 200) {
      return `seratus ${convert(num - 100)}`.trim();
    } else if (num < 1000) {
      const sisa = num % 100;
      return `${convert(Math.floor(num / 100))} ratus ${sisa > 0 ? convert(sisa) : ''}`.trim();
    } else if (num < 2000) {
      return `seribu ${convert(num - 1000)}`.trim();
    } else if (num < 1000000) {
      const sisa = num % 1000;
      return `${convert(Math.floor(num / 1000))} ribu ${sisa > 0 ? convert(sisa) : ''}`.trim();
    } else if (num < 1000000000) {
      const sisa = num % 1000000;
      return `${convert(Math.floor(num / 1000000))} juta ${sisa > 0 ? convert(sisa) : ''}`.trim();
    } else if (num < 1000000000000) {
      const sisa = num % 1000000000;
      return `${convert(Math.floor(num / 1000000000))} milyar ${sisa > 0 ? convert(sisa) : ''}`.trim();
    } else {
      const sisa = num % 1000000000000;
      return `${convert(Math.floor(num / 1000000000000))} triliun ${sisa > 0 ? convert(sisa) : ''}`.trim();
    }
  };

  return convert(n);
}

