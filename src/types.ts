export type WargaStatus = 'Aktif' | 'Tidak Aktif';

export interface Warga {
  id: string;
  nomorRumah: string;
  nama: string;
  namaWarga?: string;
  status: WargaStatus;
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type IuranStatus = 'Lunas' | 'Sebagian' | 'Belum Bayar';

export interface IuranRecord {
  id: string;
  wargaId: string;
  bulan: number; // 1 - 12
  tahun: number;
  kas: boolean;
  uangMeja: boolean;
  uangSampah: boolean;
  danaAcaraTahunan: boolean;
  uangSosial: boolean;
  total: number;
  status: IuranStatus;
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface JimpitanRecord {
  id: string;
  wargaId: string;
  bulan: number; // 1 - 12
  tahun: number;
  minggu1: boolean;
  minggu2: boolean;
  minggu3: boolean;
  minggu4: boolean;
  minggu5: boolean;
  total: number;
  status?: 'Sudah Bayar' | 'Belum Bayar';
  tanggal?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface DonasiRecord {
  id: string;
  wargaId?: string;
  tanggal: string; // YYYY-MM-DD
  namaDonatur: string;
  nomorRumah?: string;
  namaWarga?: string;
  nominal: number;
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type BopJenis = 'Pemasukan' | 'Pengeluaran';

export interface BopRecord {
  id: string;
  wargaId?: string;
  nomorRumah?: string;
  namaWarga?: string;
  tanggal: string; // YYYY-MM-DD
  jenis: BopJenis;
  kategori: string;
  uraian: string;
  nominal: number;
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface AppSettings {
  namaRT: string;
  rw: string;
  kelurahan: string;
  kecamatan?: string;
  kota?: string;
  provinsi?: string;
  ketuaRT: string;
  bendahara: string;
  kontakWa?: string;
  nominalKas: number;
  nominalUangMeja: number;
  nominalUangSampah: number;
  nominalDanaAcaraTahunan: number;
  nominalUangSosial: number;
  nominalJimpitan: number;
}

export type SettingsConfig = AppSettings;

export type UserRole = 'Admin' | 'Bendahara' | 'Ketua RT';
export type UserStatus = 'Aktif' | 'Nonaktif';

export interface AppUser {
  id: string;
  nama: string;
  username: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export type BukuKasSourceType = 'iuran' | 'jimpitan' | 'donasi' | 'bop' | 'saldo_awal' | 'dana_talangan' | 'pelunasan_talangan' | 'pengeluaran_dana';
export type BukuKasStatus = 'Aktif' | 'Dibatalkan';

export type PengeluaranDanaKategori = 
  | 'Petugas Sampah'
  | 'Uang Meja'
  | 'Kegiatan RT'
  | 'Kebersihan'
  | 'Perawatan'
  | 'Administrasi'
  | 'Listrik'
  | 'Air'
  | 'Keamanan'
  | 'Sosial'
  | 'Lainnya';

export interface PengeluaranDana {
  id: string;
  tanggal: string; // YYYY-MM-DD
  noBukti: string; // OUT-YYYYMMDD-XXXX
  kategori: PengeluaranDanaKategori | string;
  nominal: number;
  penerima: string;
  wargaId?: string;
  nomorRumah?: string;
  namaWarga?: string;
  periode?: string;
  keterangan?: string;
  keteranganPenggunaanDana?: string;
  sourceType: 'pengeluaran_dana';
  status: 'Aktif' | 'Dibatalkan';
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export type DanaTalanganStatus = 'Belum Lunas' | 'Sebagian' | 'Lunas';
export type DanaTalanganStatusAktif = 'Aktif' | 'Dibatalkan';

export interface DanaTalangan {
  id: string;
  tanggal: string; // YYYY-MM-DD
  wargaId?: string;
  nomorRumah: string;
  namaPeminjam: string;
  namaPenerima: string;
  jumlahTalangan: number;
  alasan: string;
  tanggalJatuhTempo?: string; // YYYY-MM-DD (opsional)
  status: DanaTalanganStatus;
  totalPelunasan: number;
  sisaTalangan: number;
  keterangan?: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  statusAktif: DanaTalanganStatusAktif;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface PelunasanTalangan {
  id: string;
  talanganId: string;
  tanggal: string; // YYYY-MM-DD
  jumlah: number;
  keterangan?: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  status: 'Aktif' | 'Dibatalkan';
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export type DanaTalanganFundJenis = 'Saldo Awal' | 'Penambahan Dana';

export interface DanaTalanganFund {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: DanaTalanganFundJenis;
  jumlah: number;
  sumberDana?: string; // e.g. Kas RT, Donasi Khusus, Kas Sosial
  keterangan?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BukuKasRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  noBukti: string; // IUR-YYYYMMDD-XXXX, JMP-YYYYMMDD-XXXX, DON-YYYYMMDD-XXXX, BOP-YYYYMMDD-XXXX, SA-YYYYMMDD-XXXX, TAL-YYYYMMDD-XXXX, PEL-YYYYMMDD-XXXX
  sourceType: BukuKasSourceType;
  sourceId: string; // Identifier to source item (e.g. iuranId_kas, jimpitanId_minggu1, donasiId, bopId, saldoAwalId, talanganId, pelunasanId)
  subSource?: string; // e.g. kas, uangMeja, uangSampah, danaAcaraTahunan, uangSosial, minggu1..minggu5
  wargaId?: string;
  nomorRumah?: string;
  namaWarga?: string;
  kategori: string; // Display category e.g. "Kas", "Uang Meja", "Talangan Kematian", "Pelunasan Talangan"
  uraian: string; // e.g. "Dana talangan kematian - Budi"
  pemasukan: number;
  pengeluaran: number;
  saldo: number; // Running balance (computed dynamically/cached)
  status: BukuKasStatus;
  petugas?: string;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  keterangan?: string;
}

export interface SaldoAwalRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nominal: number;
  keterangan: string;
  periodeTahun?: number;
  periodeBulan?: number;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;   // HH:mm:ss
  timestamp: string; // ISO
  pengguna: string; // display name
  username: string;
  role: UserRole;
  aktivitas: string;
  detail: string;
}

export interface AppStateData {
  users: AppUser[];
  warga: Warga[];
  iuran: IuranRecord[];
  jimpitan: JimpitanRecord[];
  donasi: DonasiRecord[];
  bop: BopRecord[];
  danaTalangan: DanaTalangan[];
  pelunasanTalangan: PelunasanTalangan[];
  danaTalanganFunds: DanaTalanganFund[];
  pengeluaranDana: PengeluaranDana[];
  bukuKas: BukuKasRecord[];
  saldoAwal: SaldoAwalRecord[];
  auditLogs: AuditLogItem[];
  settings: AppSettings;
  initialized: boolean;
}

export type NavigationTab = 
  | 'dashboard'
  | 'warga'
  | 'iuran'
  | 'jimpitan'
  | 'donasi'
  | 'bop'
  | 'dana-talangan'
  | 'pengeluaran-dana'
  | 'buku-kas'
  | 'laporan'
  | 'pengaturan'
  | 'pengguna'
  | 'audit-log'
  | 'backup';

export type TabType = NavigationTab;
