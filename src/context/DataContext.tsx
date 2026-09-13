import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Warga, 
  IuranRecord, 
  JimpitanRecord, 
  DonasiRecord, 
  BopRecord, 
  BukuKasRecord,
  SaldoAwalRecord,
  DanaTalangan,
  DanaTalanganStatus,
  PelunasanTalangan,
  DanaTalanganFund,
  AppSettings, 
  AppStateData, 
  IuranStatus,
  AppUser,
  UserRole,
  UserStatus,
  AuditLogItem
} from '../types';
import { DEFAULT_SETTINGS, createEmptyData, createSampleData } from '../data/sampleData';
import { generateId } from '../utils/format';
import { hashPassword, verifyPassword } from '../utils/auth';
import { 
  generateNoBukti, 
  computeBukuKasRunningBalances, 
  syncAllSourcesToBukuKas, 
  reconcileBukuKas,
  ReconciliationReport,
  makeMonthDate
} from '../utils/bukuKasHelper';

const STORAGE_KEY = 'keuangan_rt09_rw08_v1_store';
const SESSION_KEY = 'keuangan_rt09_active_session_v1';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface RestorePreview {
  valid: boolean;
  wargaCount: number;
  iuranCount: number;
  jimpitanCount: number;
  donasiCount: number;
  bopCount: number;
  bukuKasCount: number;
  saldoAwalCount: number;
  danaTalanganCount?: number;
  pelunasanTalanganCount?: number;
  fundsCount?: number;
  usersCount: number;
  parsedData?: AppStateData;
  error?: string;
}

export interface PeriodFilterState {
  mode: 'bulan-tahun' | 'rentang-tanggal' | 'semua';
  bulan: number; // 1-12
  tahun: number;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
}

interface DataContextType {
  data: AppStateData;
  isLoading: boolean;
  showInitModal: boolean;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Authentication & Session
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setupAdmin: (nama: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>;

  // User Management
  addUser: (user: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>, password: string) => Promise<{ success: boolean; message?: string }>;
  updateUser: (id: string, updates: Partial<Omit<AppUser, 'id' | 'createdAt' | 'passwordHash'>>, newPassword?: string) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (id: string) => { success: boolean; message?: string };
  toggleUserStatus: (id: string) => void;

  // Audit Logs
  logAudit: (aktivitas: string, detail: string) => void;

  // Period Filter
  periodFilter: PeriodFilterState;
  setPeriodFilter: React.Dispatch<React.SetStateAction<PeriodFilterState>>;

  // Initialization
  initializeWithEmpty: () => void;
  initializeWithSample: () => void;
  
  // Warga CRUD
  addWarga: (warga: Omit<Warga, 'id' | 'createdAt' | 'updatedAt'>, force?: boolean) => { success: boolean; isDuplicate?: boolean; message?: string };
  updateWarga: (id: string, warga: Partial<Omit<Warga, 'id' | 'createdAt'>>) => void;
  deleteWarga: (id: string) => void;
  checkWargaDuplicate: (nomorRumah: string, nama: string, excludeId?: string) => boolean;
  
  // Iuran
  getIuranForWarga: (wargaId: string, bulan: number, tahun: number) => IuranRecord | undefined;
  toggleIuranCategory: (
    wargaId: string, 
    bulan: number, 
    tahun: number, 
    category: 'kas' | 'uangMeja' | 'uangSampah' | 'danaAcaraTahunan' | 'uangSosial', 
    checked: boolean
  ) => void;
  updateIuranKeterangan: (wargaId: string, bulan: number, tahun: number, keterangan: string) => void;
  
  // Jimpitan
  getJimpitanForWarga: (wargaId: string, bulan: number, tahun: number) => JimpitanRecord | undefined;
  toggleJimpitanMinggu: (
    wargaId: string, 
    bulan: number, 
    tahun: number, 
    minggu: 'minggu1' | 'minggu2' | 'minggu3' | 'minggu4' | 'minggu5', 
    checked: boolean
  ) => void;
  
  // Donasi CRUD
  addDonasi: (donasi: Omit<DonasiRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDonasi: (id: string, donasi: Partial<Omit<DonasiRecord, 'id' | 'createdAt'>>) => void;
  deleteDonasi: (id: string) => void;
  
  // BOP CRUD
  addBop: (bop: Omit<BopRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBop: (id: string, bop: Partial<Omit<BopRecord, 'id' | 'createdAt'>>) => void;
  deleteBop: (id: string) => void;

  // Dana Talangan Kematian
  addDanaTalangan: (talangan: Omit<DanaTalangan, 'id' | 'createdAt' | 'updatedAt' | 'totalPelunasan' | 'sisaTalangan' | 'status' | 'statusAktif'>) => { success: boolean; message?: string };
  updateDanaTalangan: (id: string, updates: Partial<Pick<DanaTalangan, 'tanggal' | 'nomorRumah' | 'namaPeminjam' | 'namaPenerima' | 'jumlahTalangan' | 'alasan' | 'tanggalJatuhTempo' | 'keterangan'>>) => { success: boolean; message?: string };
  cancelDanaTalangan: (id: string, reason: string) => { success: boolean; message?: string };

  // Pelunasan Talangan
  addPelunasanTalangan: (talanganId: string, item: { tanggal: string; jumlah: number; keterangan?: string }) => { success: boolean; message?: string };
  cancelPelunasanTalangan: (pelunasanId: string, reason: string) => { success: boolean; message?: string };

  // Dana Talangan Funds
  addDanaTalanganFund: (fund: Omit<DanaTalanganFund, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDanaTalanganFund: (id: string, updates: Partial<Omit<DanaTalanganFund, 'id' | 'createdAt'>>) => void;
  deleteDanaTalanganFund: (id: string) => void;

  // Buku Kas & Saldo Awal
  addSaldoAwal: (saldo: Omit<SaldoAwalRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSaldoAwal: (id: string, updates: Partial<Omit<SaldoAwalRecord, 'id' | 'createdAt'>>) => void;
  deleteSaldoAwal: (id: string) => void;
  recalculateBukuKasBalances: () => void;
  repairAndRebuildBukuKas: () => ReconciliationReport;
  resolveDuplicates: (recordIdsToRemove: string[]) => void;
  cancelBukuKasItem: (id: string, reason: string) => void;
  
  // Settings
  updateSettings: (newSettings: AppSettings) => void;
  
  // Backup & Restore
  exportBackupJson: () => void;
  backupData: () => void;
  restoreBackupJson: (jsonString: string) => { success: boolean; message: string };
  restoreData: (jsonString: string) => { success: boolean; message: string };
  inspectRestoreJson: (jsonString: string) => RestorePreview;
  applyRestoredData: (restoredData: AppStateData) => void;
  resetAllData: () => void;
  clearAllData: () => void;
  loadSampleDataset: () => void;
  resetToDefaultSample: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppStateData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
          const warga = Array.isArray(parsed.warga) ? parsed.warga : [];
          const iuran = Array.isArray(parsed.iuran) ? parsed.iuran : [];
          const jimpitan = Array.isArray(parsed.jimpitan) ? parsed.jimpitan : [];
          const donasi = Array.isArray(parsed.donasi) ? parsed.donasi : [];
          const bop = Array.isArray(parsed.bop) ? parsed.bop : [];
          const saldoAwal = Array.isArray(parsed.saldoAwal) ? parsed.saldoAwal : [];
          const danaTalangan = Array.isArray(parsed.danaTalangan) ? parsed.danaTalangan : [];
          const pelunasanTalangan = Array.isArray(parsed.pelunasanTalangan) ? parsed.pelunasanTalangan : [];
          const danaTalanganFunds = Array.isArray(parsed.danaTalanganFunds) && parsed.danaTalanganFunds.length > 0 
            ? parsed.danaTalanganFunds 
            : [{
                id: 'dtf-initial-2026',
                tanggal: '2026-01-01',
                jenis: 'Saldo Awal' as const,
                jumlah: 5000000,
                sumberDana: 'Kas RT',
                keterangan: 'Dana awal talangan kematian RT 09 RW 08',
                createdBy: 'H. Sugiyanto, S.E.',
                createdAt: '2026-01-01T08:00:00.000Z',
              }];
          let bukuKas = Array.isArray(parsed.bukuKas) ? parsed.bukuKas : [];

          // Auto-sync if empty or if talangan needs to be reflected
          const hasTalanganSourceInBk = bukuKas.some(b => b.sourceType === 'dana_talangan' || b.sourceType === 'pelunasan_talangan');
          if ((bukuKas.length === 0 || (!hasTalanganSourceInBk && (danaTalangan.length > 0 || pelunasanTalangan.length > 0))) && 
              (iuran.length > 0 || jimpitan.length > 0 || donasi.length > 0 || bop.length > 0 || saldoAwal.length > 0 || danaTalangan.length > 0)) {
            bukuKas = syncAllSourcesToBukuKas({
              warga,
              iuran,
              jimpitan,
              donasi,
              bop,
              saldoAwal,
              danaTalangan,
              pelunasanTalangan,
              settings,
            }, bukuKas);
          } else {
            bukuKas = computeBukuKasRunningBalances(bukuKas);
          }

          return {
            users: Array.isArray(parsed.users) ? parsed.users : [],
            warga,
            iuran,
            jimpitan,
            donasi,
            bop,
            danaTalangan,
            pelunasanTalangan,
            danaTalanganFunds,
            bukuKas,
            saldoAwal,
            auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
            settings,
            initialized: parsed.initialized ?? true,
          };
        }
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    return {
      users: [],
      warga: [],
      iuran: [],
      jimpitan: [],
      donasi: [],
      bop: [],
      danaTalangan: [],
      pelunasanTalangan: [],
      danaTalanganFunds: [],
      bukuKas: [],
      saldoAwal: [],
      auditLogs: [],
      settings: { ...DEFAULT_SETTINGS },
      initialized: false,
    };
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showInitModal, setShowInitModal] = useState<boolean>(!data.initialized);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Period Filter State
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      mode: 'bulan-tahun',
      bulan: curMonth,
      tahun: curYear,
      tanggalMulai: `${curYear}-${pad(curMonth)}-01`,
      tanggalSelesai: `${curYear}-${pad(curMonth)}-${new Date(curYear, curMonth, 0).getDate()}`
    };
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const sessionStored = localStorage.getItem(SESSION_KEY);
      if (sessionStored) {
        const session = JSON.parse(sessionStored);
        if (session && session.userId && Array.isArray(data.users)) {
          const matched = data.users.find(u => u.id === session.userId && u.status === 'Aktif');
          return matched || null;
        }
      }
    } catch (e) {
      console.error('Session read error:', e);
    }
    return null;
  });

  // Keep session synced when users change
  useEffect(() => {
    if (currentUser) {
      const freshUser = data.users.find(u => u.id === currentUser.id);
      if (!freshUser || freshUser.status !== 'Aktif') {
        setCurrentUser(null);
        localStorage.removeItem(SESSION_KEY);
      } else {
        setCurrentUser(freshUser);
      }
    }
  }, [data.users]);

  // Auto persist to localStorage whenever data changes
  useEffect(() => {
    if (data.initialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to persist to localStorage:', err);
      }
    }
  }, [data]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev.slice(-3), { id, message, type }]); // Keep last 4 max
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Internal Audit Logger
  const logAudit = useCallback((aktivitas: string, detail: string) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const tanggal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const waktu = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newLog: AuditLogItem = {
      id: generateId(),
      tanggal,
      waktu,
      timestamp: now.toISOString(),
      pengguna: currentUser ? currentUser.nama : 'Sistem / Setup',
      username: currentUser ? currentUser.username : 'sistem',
      role: currentUser ? currentUser.role : 'Admin',
      aktivitas,
      detail,
    };

    setData(prev => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs].slice(0, 1000) // Keep latest 1000 logs
    }));
  }, [currentUser]);

  // Authentication: Setup initial Administrator
  const setupAdmin = useCallback(async (nama: string, username: string, password: string) => {
    setIsLoading(true);
    try {
      const trimmedUser = username.trim().toLowerCase();
      if (!trimmedUser || !password || !nama.trim()) {
        return { success: false, message: 'Semua kolom wajib diisi.' };
      }

      const hash = await hashPassword(password);
      const now = new Date().toISOString();
      const adminUser: AppUser = {
        id: 'admin-' + generateId(),
        nama: nama.trim(),
        username: trimmedUser,
        passwordHash: hash,
        role: 'Admin',
        status: 'Aktif',
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
      };

      setData(prev => ({
        ...prev,
        users: [adminUser],
        initialized: true,
      }));

      // Set active session
      setCurrentUser(adminUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: adminUser.id, createdAt: now }));

      logAudit('Setup Administrator', `Akun Administrator "${adminUser.nama}" (@${adminUser.username}) berhasil dikonfigurasi`);
      addToast(`Administrator "${adminUser.nama}" berhasil dibuat!`, 'success');
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Gagal membuat administrator.' };
    } finally {
      setIsLoading(false);
    }
  }, [addToast, logAudit]);

  // Authentication: Login
  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const cleanUser = username.trim().toLowerCase();
      const user = data.users.find(u => u.username.toLowerCase() === cleanUser);

      if (!user) {
        return { success: false, message: 'Username atau password salah. Silakan coba lagi.' };
      }

      if (user.status !== 'Aktif') {
        return { success: false, message: 'Akun Anda dinonaktifkan oleh Pengurus RT. Hubungi Administrator.' };
      }

      const isMatch = await verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        return { success: false, message: 'Username atau password salah. Silakan coba lagi.' };
      }

      const now = new Date().toISOString();
      const updatedUser: AppUser = {
        ...user,
        lastLogin: now,
        updatedAt: now,
      };

      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === user.id ? updatedUser : u),
      }));

      setCurrentUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, loginAt: now }));

      logAudit('Login', `Pengguna ${user.nama} (${user.role}) berhasil masuk ke sistem`);
      addToast(`Selamat datang, ${user.nama}!`, 'success');
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Terjadi kesalahan sistem saat proses login.' };
    } finally {
      setIsLoading(false);
    }
  }, [data.users, addToast, logAudit]);

  // Authentication: Logout
  const logout = useCallback(() => {
    if (currentUser) {
      logAudit('Logout', `Pengguna ${currentUser.nama} (${currentUser.role}) keluar dari sistem`);
    }
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    addToast('Anda telah keluar dari aplikasi.', 'info');
  }, [currentUser, addToast, logAudit]);

  // User Management: Add User
  const addUser = useCallback(async (
    userInput: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>,
    passwordPlain: string
  ) => {
    const cleanUser = userInput.username.trim().toLowerCase();
    const exists = data.users.some(u => u.username.toLowerCase() === cleanUser);
    if (exists) {
      return { success: false, message: `Username "${cleanUser}" sudah digunakan.` };
    }

    if (!passwordPlain || passwordPlain.length < 5) {
      return { success: false, message: 'Password minimal 5 karakter.' };
    }

    const hash = await hashPassword(passwordPlain);
    const now = new Date().toISOString();
    const newUser: AppUser = {
      ...userInput,
      id: generateId(),
      username: cleanUser,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    };

    setData(prev => ({
      ...prev,
      users: [...prev.users, newUser],
    }));

    logAudit('Tambah Pengguna', `Menambahkan pengguna baru "${newUser.nama}" (@${newUser.username}) dengan role ${newUser.role}`);
    addToast(`Pengguna "${newUser.nama}" berhasil ditambahkan.`, 'success');
    return { success: true };
  }, [data.users, addToast, logAudit]);

  // User Management: Update User
  const updateUser = useCallback(async (
    id: string,
    updates: Partial<Omit<AppUser, 'id' | 'createdAt' | 'passwordHash'>>,
    newPassword?: string
  ) => {
    let newHash: string | undefined = undefined;
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.length < 5) {
        return { success: false, message: 'Password baru minimal 5 karakter.' };
      }
      newHash = await hashPassword(newPassword);
    }

    setData(prev => ({
      ...prev,
      users: prev.users.map(u => {
        if (u.id !== id) return u;
        return {
          ...u,
          ...updates,
          passwordHash: newHash !== undefined ? newHash : u.passwordHash,
          updatedAt: new Date().toISOString(),
        };
      })
    }));

    const targetUser = data.users.find(u => u.id === id);
    const detail = newHash ? 'Perubahan profil dan reset password' : 'Perubahan data profil/role';
    logAudit('Ubah Pengguna', `${detail} pada pengguna "${targetUser?.nama || id}"`);
    addToast('Data pengguna berhasil diperbarui.', 'success');
    return { success: true };
  }, [data.users, addToast, logAudit]);

  // User Management: Delete User
  const deleteUser = useCallback((id: string) => {
    if (currentUser?.id === id) {
      return { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif.' };
    }

    const targetUser = data.users.find(u => u.id === id);
    setData(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id),
    }));

    logAudit('Hapus Pengguna', `Menghapus akun pengguna "${targetUser?.nama || id}"`);
    addToast('Pengguna berhasil dihapus.', 'info');
    return { success: true };
  }, [currentUser, data.users, addToast, logAudit]);

  // User Management: Toggle Status
  const toggleUserStatus = useCallback((id: string) => {
    if (currentUser?.id === id) {
      addToast('Anda tidak dapat menonaktifkan akun sendiri.', 'warning');
      return;
    }

    const targetUser = data.users.find(u => u.id === id);
    const nextStatus: UserStatus = targetUser?.status === 'Aktif' ? 'Nonaktif' : 'Aktif';

    setData(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === id ? { ...u, status: nextStatus, updatedAt: new Date().toISOString() } : u)
    }));

    logAudit('Ubah Status Pengguna', `Status akun "${targetUser?.nama}" diubah menjadi ${nextStatus}`);
    addToast(`Status akun "${targetUser?.nama}" kini ${nextStatus}.`, 'info');
  }, [currentUser, data.users, addToast, logAudit]);

  // Initialize
  const initializeWithEmpty = useCallback(() => {
    const empty = createEmptyData();
    // Preserve existing users if any
    empty.users = data.users;
    setData(empty);
    setShowInitModal(false);
    logAudit('Reset Data', 'Aplikasi diatur ke data kosong');
    addToast('Aplikasi dimulai dengan data kosong', 'info');
  }, [data.users, addToast, logAudit]);

  const initializeWithSample = useCallback(() => {
    const sample = createSampleData();
    // Preserve existing users if any
    sample.users = data.users;
    setData(sample);
    setShowInitModal(false);
    logAudit('Load Data Contoh', 'Contoh data warga dan transaksi dimuat');
    addToast('Data contoh RT 09 RW 08 berhasil dimuat', 'success');
  }, [data.users, addToast, logAudit]);

  // Duplicate check: Nomor Rumah + Nama Warga
  const checkWargaDuplicate = useCallback((nomorRumah: string, nama: string, excludeId?: string): boolean => {
    const cleanNo = nomorRumah.trim().toLowerCase();
    const cleanNama = nama.trim().toLowerCase();
    return data.warga.some(w => 
      w.id !== excludeId && 
      w.nomorRumah.trim().toLowerCase() === cleanNo && 
      w.nama.trim().toLowerCase() === cleanNama
    );
  }, [data.warga]);

  // Warga CRUD
  const addWarga = useCallback((wargaInput: Omit<Warga, 'id' | 'createdAt' | 'updatedAt'>, force = false) => {
    const isDup = checkWargaDuplicate(wargaInput.nomorRumah, wargaInput.nama);
    if (isDup && !force) {
      return { 
        success: false, 
        isDuplicate: true, 
        message: `Warga dengan Nomor Rumah "${wargaInput.nomorRumah}" dan Nama "${wargaInput.nama}" sudah ada. Konfirmasi jika ingin tetap menambahkan.` 
      };
    }

    const now = new Date().toISOString();
    const newWarga: Warga = {
      ...wargaInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.nama || 'Pengurus RT',
      updatedBy: currentUser?.nama || 'Pengurus RT',
    };

    setData(prev => ({
      ...prev,
      warga: [...prev.warga, newWarga],
    }));

    logAudit('Tambah Warga', `Rumah ${newWarga.nomorRumah} - ${newWarga.nama} (${newWarga.status})`);
    addToast(`Data warga "${newWarga.nama}" berhasil ditambahkan`, 'success');
    return { success: true };
  }, [checkWargaDuplicate, currentUser, addToast, logAudit]);

  const updateWarga = useCallback((id: string, update: Partial<Omit<Warga, 'id' | 'createdAt'>>) => {
    const target = data.warga.find(w => w.id === id);
    setData(prev => ({
      ...prev,
      warga: prev.warga.map(w => w.id === id ? { 
        ...w, 
        ...update, 
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.nama || 'Pengurus RT'
      } : w)
    }));
    logAudit('Ubah Warga', `Memperbarui data warga Rumah ${target?.nomorRumah || ''} - ${target?.nama || ''}`);
    addToast('Data warga berhasil diperbarui', 'success');
  }, [currentUser, data.warga, addToast, logAudit]);

  const deleteWarga = useCallback((id: string) => {
    const target = data.warga.find(w => w.id === id);
    setData(prev => ({
      ...prev,
      warga: prev.warga.filter(w => w.id !== id),
    }));
    logAudit('Hapus Warga', `Menghapus warga Rumah ${target?.nomorRumah || ''} - ${target?.nama || ''}`);
    addToast('Data warga berhasil dihapus. Riwayat transaksi tetap tersimpan.', 'info');
  }, [data.warga, addToast, logAudit]);

  // Iuran lookup
  const getIuranForWarga = useCallback((wargaId: string, bulan: number, tahun: number): IuranRecord | undefined => {
    return data.iuran.find(i => i.wargaId === wargaId && i.bulan === bulan && i.tahun === tahun);
  }, [data.iuran]);

  // Calculate Iuran Total & Status based on boolean flags and settings
  const computeIuranDetails = useCallback((
    kas: boolean, 
    meja: boolean, 
    sampah: boolean, 
    acara: boolean, 
    sosial: boolean,
    settings: AppSettings
  ): { total: number; status: IuranStatus } => {
    let total = 0;
    if (kas) total += settings.nominalKas;
    if (meja) total += settings.nominalUangMeja;
    if (sampah) total += settings.nominalUangSampah;
    if (acara) total += settings.nominalDanaAcaraTahunan;
    if (sosial) total += settings.nominalUangSosial;

    const allChecked = kas && meja && sampah && acara && sosial;
    const noneChecked = !kas && !meja && !sampah && !acara && !sosial;

    const status: IuranStatus = allChecked ? 'Lunas' : noneChecked ? 'Belum Bayar' : 'Sebagian';
    return { total, status };
  }, []);

  // Toggle single category in Iuran
  const toggleIuranCategory = useCallback((
    wargaId: string,
    bulan: number,
    tahun: number,
    category: 'kas' | 'uangMeja' | 'uangSampah' | 'danaAcaraTahunan' | 'uangSosial',
    checked: boolean
  ) => {
    setData(prev => {
      const existing = prev.iuran.find(i => i.wargaId === wargaId && i.bulan === bulan && i.tahun === tahun);
      const now = new Date().toISOString();
      const userName = currentUser?.nama || 'Pengurus RT';

      let targetRecordId: string;
      let newIuranList: IuranRecord[];

      if (existing) {
        targetRecordId = existing.id;
        const updatedRecord = {
          ...existing,
          [category]: checked,
          updatedAt: now,
          updatedBy: userName,
        };
        const { total, status } = computeIuranDetails(
          updatedRecord.kas,
          updatedRecord.uangMeja,
          updatedRecord.uangSampah,
          updatedRecord.danaAcaraTahunan,
          updatedRecord.uangSosial,
          prev.settings
        );
        updatedRecord.total = total;
        updatedRecord.status = status;

        newIuranList = prev.iuran.map(i => (i.id === existing.id ? updatedRecord : i));
      } else {
        targetRecordId = generateId();
        const newRecordDraft = {
          id: targetRecordId,
          wargaId,
          bulan,
          tahun,
          kas: false,
          uangMeja: false,
          uangSampah: false,
          danaAcaraTahunan: false,
          uangSosial: false,
          [category]: checked,
          keterangan: '',
          createdAt: now,
          updatedAt: now,
          createdBy: userName,
          updatedBy: userName,
        };
        const { total, status } = computeIuranDetails(
          newRecordDraft.kas,
          newRecordDraft.uangMeja,
          newRecordDraft.uangSampah,
          newRecordDraft.danaAcaraTahunan,
          newRecordDraft.uangSosial,
          prev.settings
        );
        const newRecord: IuranRecord = {
          ...newRecordDraft,
          total,
          status,
        };
        newIuranList = [...prev.iuran, newRecord];
      }

      // Synchronize with Buku Kas
      const catNominalMap: Record<string, number> = {
        kas: prev.settings.nominalKas,
        uangMeja: prev.settings.nominalUangMeja,
        uangSampah: prev.settings.nominalUangSampah,
        danaAcaraTahunan: prev.settings.nominalDanaAcaraTahunan,
        uangSosial: prev.settings.nominalUangSosial,
      };
      const catNominal = catNominalMap[category] || 0;
      const catLabels: Record<string, string> = {
        kas: 'Kas RT',
        uangMeja: 'Uang Meja',
        uangSampah: 'Uang Sampah',
        danaAcaraTahunan: 'Dana Acara Tahunan',
        uangSosial: 'Uang Sosial',
      };
      const catLabel = catLabels[category] || category;
      const recordDate = makeMonthDate(tahun, bulan, 5);
      const targetWarga = prev.warga.find(w => w.id === wargaId);
      const rumahStr = targetWarga ? `Rumah ${targetWarga.nomorRumah}` : 'Rumah -';
      const namaStr = targetWarga ? targetWarga.nama : 'Warga';
      const subId = `${targetRecordId}_${category}`;

      let newBukuKas = [...prev.bukuKas];
      const existingBkIndex = newBukuKas.findIndex(b => b.sourceType === 'iuran' && b.sourceId === subId);

      if (checked) {
        if (existingBkIndex >= 0) {
          newBukuKas[existingBkIndex] = {
            ...newBukuKas[existingBkIndex],
            status: 'Aktif',
            pemasukan: catNominal,
            updatedAt: now,
            updatedBy: userName,
          };
        } else {
          const noBukti = generateNoBukti('IUR', recordDate, newBukuKas);
          newBukuKas.push({
            id: `bk-iur-${subId}`,
            tanggal: recordDate,
            noBukti,
            sourceType: 'iuran',
            sourceId: subId,
            subSource: category,
            kategori: `Iuran - ${catLabel}`,
            uraian: `Pembayaran Iuran ${catLabel} - ${rumahStr} - ${namaStr}`,
            pemasukan: catNominal,
            pengeluaran: 0,
            saldo: 0,
            status: 'Aktif',
            petugas: userName,
            createdBy: userName,
            createdAt: now,
            updatedBy: userName,
            updatedAt: now,
            keterangan: `Periode Bulan ${bulan}/${tahun}`,
          });
        }
      } else {
        if (existingBkIndex >= 0) {
          newBukuKas[existingBkIndex] = {
            ...newBukuKas[existingBkIndex],
            status: 'Dibatalkan',
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: 'Pembayaran iuran dibatalkan oleh pengguna',
            updatedAt: now,
            updatedBy: userName,
          };
        }
      }

      newBukuKas = computeBukuKasRunningBalances(newBukuKas);

      return {
        ...prev,
        iuran: newIuranList,
        bukuKas: newBukuKas,
      };
    });

    const categoryNames: Record<string, string> = {
      kas: 'Kas RT',
      uangMeja: 'Uang Meja',
      uangSampah: 'Uang Sampah',
      danaAcaraTahunan: 'Dana Acara Tahunan',
      uangSosial: 'Uang Sosial',
    };
    const cName = categoryNames[category] || category;
    const warga = data.warga.find(w => w.id === wargaId);
    logAudit(
      checked ? 'Mencatat Pembayaran Iuran' : 'Membatalkan Pembayaran Iuran',
      `Rumah ${warga?.nomorRumah || '-'} - ${warga?.nama || 'Warga'} (${cName}) - Periode ${bulan}/${tahun}`
    );
    addToast(`${checked ? 'Mencatat pembayaran' : 'Membatalkan'} ${cName}`, 'success');
  }, [computeIuranDetails, currentUser, data.warga, addToast, logAudit]);

  // Update Iuran Keterangan
  const updateIuranKeterangan = useCallback((wargaId: string, bulan: number, tahun: number, keterangan: string) => {
    setData(prev => {
      const existing = prev.iuran.find(i => i.wargaId === wargaId && i.bulan === bulan && i.tahun === tahun);
      const now = new Date().toISOString();
      const userName = currentUser?.nama || 'Pengurus RT';

      if (existing) {
        return {
          ...prev,
          iuran: prev.iuran.map(i => i.id === existing.id ? { ...i, keterangan, updatedAt: now, updatedBy: userName } : i)
        };
      } else {
        const newRecord: IuranRecord = {
          id: generateId(),
          wargaId,
          bulan,
          tahun,
          kas: false,
          uangMeja: false,
          uangSampah: false,
          danaAcaraTahunan: false,
          uangSosial: false,
          total: 0,
          status: 'Belum Bayar',
          keterangan,
          createdAt: now,
          updatedAt: now,
          createdBy: userName,
          updatedBy: userName,
        };
        return {
          ...prev,
          iuran: [...prev.iuran, newRecord]
        };
      }
    });
    addToast('Catatan iuran tersimpan', 'info');
  }, [currentUser, addToast]);

  // Jimpitan lookup
  const getJimpitanForWarga = useCallback((wargaId: string, bulan: number, tahun: number): JimpitanRecord | undefined => {
    return data.jimpitan.find(j => j.wargaId === wargaId && j.bulan === bulan && j.tahun === tahun);
  }, [data.jimpitan]);

  // Toggle single week in Jimpitan
  const toggleJimpitanMinggu = useCallback((
    wargaId: string,
    bulan: number,
    tahun: number,
    minggu: 'minggu1' | 'minggu2' | 'minggu3' | 'minggu4' | 'minggu5',
    checked: boolean
  ) => {
    setData(prev => {
      const existing = prev.jimpitan.find(j => j.wargaId === wargaId && j.bulan === bulan && j.tahun === tahun);
      const now = new Date().toISOString();
      const nominal = prev.settings.nominalJimpitan;
      const userName = currentUser?.nama || 'Pengurus RT';

      let targetRecordId: string;
      let newJimpitanList: JimpitanRecord[];

      if (existing) {
        targetRecordId = existing.id;
        const updated = {
          ...existing,
          [minggu]: checked,
          updatedAt: now,
          updatedBy: userName,
        };
        const count = [updated.minggu1, updated.minggu2, updated.minggu3, updated.minggu4, updated.minggu5].filter(Boolean).length;
        updated.total = count * nominal;
        updated.status = count > 0 ? 'Sudah Bayar' : 'Belum Bayar';
        newJimpitanList = prev.jimpitan.map(j => (j.id === existing.id ? updated : j));
      } else {
        targetRecordId = generateId();
        const draft = {
          id: targetRecordId,
          wargaId,
          bulan,
          tahun,
          minggu1: false,
          minggu2: false,
          minggu3: false,
          minggu4: false,
          minggu5: false,
          [minggu]: checked,
          createdAt: now,
          updatedAt: now,
          createdBy: userName,
          updatedBy: userName,
        };
        const count = checked ? 1 : 0;
        const newRecord: JimpitanRecord = {
          ...draft,
          total: count * nominal,
          status: count > 0 ? 'Sudah Bayar' : 'Belum Bayar',
          tanggal: now.split('T')[0],
        };
        newJimpitanList = [...prev.jimpitan, newRecord];
      }

      // Synchronize with Buku Kas
      const weekLabels: Record<string, { label: string; day: number }> = {
        minggu1: { label: 'Minggu 1', day: 7 },
        minggu2: { label: 'Minggu 2', day: 14 },
        minggu3: { label: 'Minggu 3', day: 21 },
        minggu4: { label: 'Minggu 4', day: 28 },
        minggu5: { label: 'Minggu 5', day: 30 },
      };
      const wInfo = weekLabels[minggu] || { label: minggu, day: 1 };
      const recordDate = makeMonthDate(tahun, bulan, wInfo.day);
      const targetWarga = prev.warga.find(w => w.id === wargaId);
      const rumahStr = targetWarga ? `Rumah ${targetWarga.nomorRumah}` : 'Rumah -';
      const namaStr = targetWarga ? targetWarga.nama : 'Warga';
      const subId = `${targetRecordId}_${minggu}`;

      let newBukuKas = [...prev.bukuKas];
      const existingBkIndex = newBukuKas.findIndex(b => b.sourceType === 'jimpitan' && b.sourceId === subId);

      if (checked) {
        if (existingBkIndex >= 0) {
          newBukuKas[existingBkIndex] = {
            ...newBukuKas[existingBkIndex],
            status: 'Aktif',
            pemasukan: nominal,
            updatedAt: now,
            updatedBy: userName,
          };
        } else {
          const noBukti = generateNoBukti('JMP', recordDate, newBukuKas);
          newBukuKas.push({
            id: `bk-jmp-${subId}`,
            tanggal: recordDate,
            noBukti,
            sourceType: 'jimpitan',
            sourceId: subId,
            subSource: minggu,
            kategori: 'Jimpitan',
            uraian: `Jimpitan ${wInfo.label} - ${rumahStr} - ${namaStr}`,
            pemasukan: nominal,
            pengeluaran: 0,
            saldo: 0,
            status: 'Aktif',
            petugas: userName,
            createdBy: userName,
            createdAt: now,
            updatedBy: userName,
            updatedAt: now,
            keterangan: `Periode Bulan ${bulan}/${tahun}`,
          });
        }
      } else {
        if (existingBkIndex >= 0) {
          newBukuKas[existingBkIndex] = {
            ...newBukuKas[existingBkIndex],
            status: 'Dibatalkan',
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: 'Pembayaran jimpitan dibatalkan oleh pengguna',
            updatedAt: now,
            updatedBy: userName,
          };
        }
      }

      newBukuKas = computeBukuKasRunningBalances(newBukuKas);

      return {
        ...prev,
        jimpitan: newJimpitanList,
        bukuKas: newBukuKas,
      };
    });

    const mLabels: Record<string, string> = {
      minggu1: 'Minggu ke-1',
      minggu2: 'Minggu ke-2',
      minggu3: 'Minggu ke-3',
      minggu4: 'Minggu ke-4',
      minggu5: 'Minggu ke-5',
    };
    const mName = mLabels[minggu] || minggu;
    const warga = data.warga.find(w => w.id === wargaId);
    logAudit(
      checked ? 'Mencatat Jimpitan' : 'Membatalkan Jimpitan',
      `Rumah ${warga?.nomorRumah || '-'} - ${warga?.nama || 'Warga'} (${mName}) - Periode ${bulan}/${tahun}`
    );
    addToast(`Pembayaran Jimpitan ${mName} ${checked ? 'berhasil dicatat' : 'dibatalkan'}`, 'success');
  }, [currentUser, data.warga, addToast, logAudit]);

  // Donasi CRUD
  const addDonasi = useCallback((donasiInput: Omit<DonasiRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newDonasi: DonasiRecord = {
      ...donasiInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      createdBy: userName,
      updatedBy: userName,
    };

    setData(prev => {
      const noBukti = generateNoBukti('DON', newDonasi.tanggal, prev.bukuKas);
      const newBkItem: BukuKasRecord = {
        id: `bk-don-${newDonasi.id}`,
        tanggal: newDonasi.tanggal,
        noBukti,
        sourceType: 'donasi',
        sourceId: newDonasi.id,
        kategori: 'Donasi',
        uraian: `Donasi dari ${newDonasi.namaDonatur}${newDonasi.nomorRumah ? ` (Rumah ${newDonasi.nomorRumah})` : ''}`,
        pemasukan: newDonasi.nominal,
        pengeluaran: 0,
        saldo: 0,
        status: 'Aktif',
        petugas: userName,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
        keterangan: newDonasi.keterangan || 'Donasi kegiatan / kas RT',
      };

      const newBukuKas = computeBukuKasRunningBalances([...prev.bukuKas, newBkItem]);

      return {
        ...prev,
        donasi: [newDonasi, ...prev.donasi],
        bukuKas: newBukuKas,
      };
    });

    logAudit('Menambah Donasi', `Donasi dari "${newDonasi.namaDonatur}" sejumlah Rp ${newDonasi.nominal.toLocaleString('id-ID')}`);
    addToast('Donasi berhasil dicatat dan masuk ke Buku Kas.', 'success');
  }, [currentUser, addToast, logAudit]);

  const updateDonasi = useCallback((id: string, update: Partial<Omit<DonasiRecord, 'id' | 'createdAt'>>) => {
    const target = data.donasi.find(d => d.id === id);
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedDonasi = prev.donasi.map(d => d.id === id ? { 
        ...d, 
        ...update, 
        updatedAt: now,
        updatedBy: userName
      } : d);

      const targetD = updatedDonasi.find(d => d.id === id);

      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'donasi' && b.sourceId === id && targetD) {
          return {
            ...b,
            tanggal: targetD.tanggal || b.tanggal,
            uraian: `Donasi dari ${targetD.namaDonatur}${targetD.nomorRumah ? ` (Rumah ${targetD.nomorRumah})` : ''}`,
            pemasukan: targetD.nominal ?? b.pemasukan,
            keterangan: targetD.keterangan || b.keterangan,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        donasi: updatedDonasi,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Mengubah Donasi', `Memperbarui donasi dari "${target?.namaDonatur || id}"`);
    addToast('Data donasi berhasil diperbarui di Buku Kas', 'success');
  }, [currentUser, data.donasi, addToast, logAudit]);

  const deleteDonasi = useCallback((id: string) => {
    const target = data.donasi.find(d => d.id === id);
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'donasi' && b.sourceId === id) {
          return {
            ...b,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: 'Donasi dihapus dari sistem',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        donasi: prev.donasi.filter(d => d.id !== id),
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Menghapus Donasi', `Menghapus catatan donasi dari "${target?.namaDonatur || id}"`);
    addToast('Data donasi berhasil dihapus dan dibatalkan di Buku Kas', 'info');
  }, [currentUser, data.donasi, addToast, logAudit]);

  // BOP CRUD
  const addBop = useCallback((bopInput: Omit<BopRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newBop: BopRecord = {
      ...bopInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      createdBy: userName,
      updatedBy: userName,
    };

    setData(prev => {
      const isPemasukan = newBop.jenis === 'Pemasukan';
      const noBukti = generateNoBukti('BOP', newBop.tanggal, prev.bukuKas);
      const newBkItem: BukuKasRecord = {
        id: `bk-bop-${newBop.id}`,
        tanggal: newBop.tanggal,
        noBukti,
        sourceType: 'bop',
        sourceId: newBop.id,
        kategori: `BOP - ${newBop.kategori}`,
        uraian: newBop.uraian,
        pemasukan: isPemasukan ? newBop.nominal : 0,
        pengeluaran: !isPemasukan ? newBop.nominal : 0,
        saldo: 0,
        status: 'Aktif',
        petugas: userName,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
        keterangan: newBop.keterangan || (isPemasukan ? 'Pemasukan operasional RT' : 'Pengeluaran operasional RT'),
      };

      const newBukuKas = computeBukuKasRunningBalances([...prev.bukuKas, newBkItem]);

      return {
        ...prev,
        bop: [newBop, ...prev.bop],
        bukuKas: newBukuKas,
      };
    });

    logAudit('Menambah Transaksi BOP', `${newBop.jenis} (${newBop.kategori}) - "${newBop.uraian}" sejumlah Rp ${newBop.nominal.toLocaleString('id-ID')}`);
    addToast('Transaksi BOP berhasil dicatat dan masuk ke Buku Kas.', 'success');
  }, [currentUser, addToast, logAudit]);

  const updateBop = useCallback((id: string, update: Partial<Omit<BopRecord, 'id' | 'createdAt'>>) => {
    const target = data.bop.find(b => b.id === id);
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedBopList = prev.bop.map(b => b.id === id ? { 
        ...b, 
        ...update, 
        updatedAt: now,
        updatedBy: userName
      } : b);

      const targetB = updatedBopList.find(b => b.id === id);

      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'bop' && b.sourceId === id && targetB) {
          const isPemasukan = targetB.jenis === 'Pemasukan';
          return {
            ...b,
            tanggal: targetB.tanggal || b.tanggal,
            kategori: `BOP - ${targetB.kategori}`,
            uraian: targetB.uraian || b.uraian,
            pemasukan: isPemasukan ? targetB.nominal : 0,
            pengeluaran: !isPemasukan ? targetB.nominal : 0,
            keterangan: targetB.keterangan || b.keterangan,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        bop: updatedBopList,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Mengubah Transaksi BOP', `Memperbarui transaksi BOP "${target?.uraian || id}"`);
    addToast('Transaksi BOP berhasil diperbarui di Buku Kas', 'success');
  }, [currentUser, data.bop, addToast, logAudit]);

  const deleteBop = useCallback((id: string) => {
    const target = data.bop.find(b => b.id === id);
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'bop' && b.sourceId === id) {
          return {
            ...b,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: 'Transaksi BOP dihapus dari sistem',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        bop: prev.bop.filter(b => b.id !== id),
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Menghapus Transaksi BOP', `Menghapus transaksi BOP "${target?.uraian || id}"`);
    addToast('Transaksi BOP berhasil dihapus dan dibatalkan di Buku Kas', 'info');
  }, [currentUser, data.bop, addToast, logAudit]);

  // Dana Talangan Handlers
  const addDanaTalangan = useCallback((talanganInput: Omit<DanaTalangan, 'id' | 'createdAt' | 'updatedAt' | 'totalPelunasan' | 'sisaTalangan' | 'status' | 'statusAktif'>): { success: boolean; message?: string } => {
    if (!talanganInput.jumlahTalangan || talanganInput.jumlahTalangan <= 0) {
      return { success: false, message: 'Jumlah talangan harus lebih besar dari Rp 0.' };
    }
    if (!talanganInput.namaPeminjam?.trim()) {
      return { success: false, message: 'Nama peminjam wajib diisi.' };
    }

    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newId = `tal-${Date.now()}`;
    const newTalangan: DanaTalangan = {
      ...talanganInput,
      id: newId,
      totalPelunasan: 0,
      sisaTalangan: talanganInput.jumlahTalangan,
      status: 'Belum Lunas',
      statusAktif: 'Aktif',
      createdBy: userName,
      updatedBy: userName,
      createdAt: now,
      updatedAt: now,
    };

    let noBuktiCreated = '';
    setData(prev => {
      const existingBk = prev.bukuKas || [];
      const noBukti = generateNoBukti('TAL', newTalangan.tanggal, existingBk);
      noBuktiCreated = noBukti;
      const newBkItem: BukuKasRecord = {
        id: `bk-tal-${newTalangan.id}`,
        tanggal: newTalangan.tanggal,
        noBukti,
        sourceType: 'dana_talangan',
        sourceId: newTalangan.id,
        kategori: 'Talangan Kematian',
        uraian: `Dana talangan kematian - ${newTalangan.namaPeminjam} (Rumah ${newTalangan.nomorRumah})`,
        pemasukan: 0,
        pengeluaran: newTalangan.jumlahTalangan,
        saldo: 0,
        status: 'Aktif',
        petugas: userName,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
        keterangan: newTalangan.keterangan ? `${newTalangan.alasan}: ${newTalangan.keterangan}` : `Alasan: ${newTalangan.alasan}`,
      };

      const updatedBk = computeBukuKasRunningBalances([...existingBk, newBkItem]);
      return {
        ...prev,
        danaTalangan: [newTalangan, ...(prev.danaTalangan || [])],
        bukuKas: updatedBk,
      };
    });

    logAudit('Tambah Dana Talangan', `Pemberian dana talangan Rp ${newTalangan.jumlahTalangan.toLocaleString('id-ID')} kepada ${newTalangan.namaPeminjam} (Rumah ${newTalangan.nomorRumah}) - Bukti: ${noBuktiCreated}`);
    addToast(`Dana talangan sebesar Rp ${newTalangan.jumlahTalangan.toLocaleString('id-ID')} berhasil dicatat & masuk ke Buku Kas.`, 'success');
    return { success: true };
  }, [currentUser, addToast, logAudit]);

  const updateDanaTalangan = useCallback((id: string, updates: Partial<Pick<DanaTalangan, 'tanggal' | 'nomorRumah' | 'namaPeminjam' | 'namaPenerima' | 'jumlahTalangan' | 'alasan' | 'tanggalJatuhTempo' | 'keterangan'>>): { success: boolean; message?: string } => {
    const target = (data.danaTalangan || []).find(t => t.id === id);
    if (!target) {
      return { success: false, message: 'Data talangan tidak ditemukan.' };
    }

    const newJumlah = updates.jumlahTalangan !== undefined ? updates.jumlahTalangan : target.jumlahTalangan;
    if (newJumlah <= 0) {
      return { success: false, message: 'Jumlah talangan harus lebih besar dari Rp 0.' };
    }
    if (newJumlah < target.totalPelunasan) {
      return { 
        success: false, 
        message: `Jumlah talangan baru (Rp ${newJumlah.toLocaleString('id-ID')}) tidak boleh lebih kecil dari total pelunasan yang sudah dibayar (Rp ${target.totalPelunasan.toLocaleString('id-ID')}).` 
      };
    }

    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newSisa = Math.max(0, newJumlah - target.totalPelunasan);
    const newStatus: DanaTalanganStatus = target.totalPelunasan === 0 ? 'Belum Lunas' : newSisa <= 0 ? 'Lunas' : 'Sebagian';

    setData(prev => {
      const updatedTalanganList = (prev.danaTalangan || []).map(t => {
        if (t.id === id) {
          return {
            ...t,
            ...updates,
            jumlahTalangan: newJumlah,
            sisaTalangan: newSisa,
            status: newStatus,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return t;
      });

      const targetUpdated = updatedTalanganList.find(t => t.id === id)!;

      // Update Buku Kas linked item
      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'dana_talangan' && b.sourceId === id) {
          return {
            ...b,
            tanggal: targetUpdated.tanggal || b.tanggal,
            uraian: `Dana talangan kematian - ${targetUpdated.namaPeminjam} (Rumah ${targetUpdated.nomorRumah})`,
            pengeluaran: targetUpdated.jumlahTalangan,
            keterangan: targetUpdated.keterangan ? `${targetUpdated.alasan}: ${targetUpdated.keterangan}` : `Alasan: ${targetUpdated.alasan}`,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        danaTalangan: updatedTalanganList,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Edit Dana Talangan', `Memperbarui data talangan kematian ${target.namaPeminjam} (Rumah ${target.nomorRumah})`);
    addToast('Data talangan kematian berhasil diperbarui.', 'success');
    return { success: true };
  }, [currentUser, data.danaTalangan, addToast, logAudit]);

  const cancelDanaTalangan = useCallback((id: string, reason: string): { success: boolean; message?: string } => {
    const target = (data.danaTalangan || []).find(t => t.id === id);
    if (!target) {
      return { success: false, message: 'Data talangan tidak ditemukan.' };
    }

    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      // Cancel target talangan
      const updatedTalanganList = (prev.danaTalangan || []).map(t => {
        if (t.id === id) {
          return {
            ...t,
            statusAktif: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: reason || 'Dibatalkan oleh pengurus',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return t;
      });

      // Also cancel all pelunasan for this talangan
      const updatedPelunasanList = (prev.pelunasanTalangan || []).map(p => {
        if (p.talanganId === id && p.status === 'Aktif') {
          return {
            ...p,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: `Induk talangan dibatalkan: ${reason}`,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return p;
      });

      // Cancel Buku Kas items for both talangan and related pelunasan
      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'dana_talangan' && b.sourceId === id) {
          return {
            ...b,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: reason || 'Talangan dibatalkan',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        if (b.sourceType === 'pelunasan_talangan') {
          const pel = (prev.pelunasanTalangan || []).find(p => p.id === b.sourceId);
          if (pel && pel.talanganId === id) {
            return {
              ...b,
              status: 'Dibatalkan' as const,
              cancelledAt: now,
              cancelledBy: userName,
              cancelReason: `Induk talangan dibatalkan: ${reason}`,
              updatedAt: now,
              updatedBy: userName,
            };
          }
        }
        return b;
      });

      return {
        ...prev,
        danaTalangan: updatedTalanganList,
        pelunasanTalangan: updatedPelunasanList,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Batalkan Dana Talangan', `Membatalkan talangan ${target.namaPeminjam} (Alasan: ${reason})`);
    addToast('Dana talangan dan seluruh pelunasan terkait berhasil dibatalkan di Buku Kas.', 'warning');
    return { success: true };
  }, [currentUser, data.danaTalangan, addToast, logAudit]);

  // Pelunasan Talangan Handlers
  const addPelunasanTalangan = useCallback((talanganId: string, item: { tanggal: string; jumlah: number; keterangan?: string }): { success: boolean; message?: string } => {
    const parent = (data.danaTalangan || []).find(t => t.id === talanganId);
    if (!parent) {
      return { success: false, message: 'Data talangan tidak ditemukan.' };
    }
    if (parent.statusAktif !== 'Aktif') {
      return { success: false, message: 'Tidak dapat mencatat pelunasan pada talangan yang sudah dibatalkan.' };
    }
    if (!item.jumlah || item.jumlah <= 0) {
      return { success: false, message: 'Jumlah pelunasan harus lebih besar dari Rp 0.' };
    }
    if (item.jumlah > parent.sisaTalangan) {
      return { 
        success: false, 
        message: `Jumlah pelunasan (Rp ${item.jumlah.toLocaleString('id-ID')}) tidak boleh melebihi sisa talangan (Rp ${parent.sisaTalangan.toLocaleString('id-ID')}).` 
      };
    }

    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newPelId = `pel-${Date.now()}`;
    const newPelunasan: PelunasanTalangan = {
      id: newPelId,
      talanganId,
      tanggal: item.tanggal,
      jumlah: item.jumlah,
      keterangan: item.keterangan,
      status: 'Aktif',
      createdBy: userName,
      updatedBy: userName,
      createdAt: now,
      updatedAt: now,
    };

    const newTotalPelunasan = parent.totalPelunasan + item.jumlah;
    const newSisa = Math.max(0, parent.jumlahTalangan - newTotalPelunasan);
    const newStatus: DanaTalanganStatus = newSisa <= 0 ? 'Lunas' : 'Sebagian';

    let noBuktiCreated = '';
    setData(prev => {
      const existingBk = prev.bukuKas || [];
      const noBukti = generateNoBukti('PEL', item.tanggal, existingBk);
      noBuktiCreated = noBukti;
      const newBkItem: BukuKasRecord = {
        id: `bk-pel-${newPelunasan.id}`,
        tanggal: item.tanggal,
        noBukti,
        sourceType: 'pelunasan_talangan',
        sourceId: newPelunasan.id,
        kategori: 'Pelunasan Talangan',
        uraian: `Pelunasan talangan - ${parent.namaPeminjam} (Rumah ${parent.nomorRumah})`,
        pemasukan: item.jumlah,
        pengeluaran: 0,
        saldo: 0,
        status: 'Aktif',
        petugas: userName,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
        keterangan: item.keterangan || `Pelunasan dana talangan kematian (${parent.namaPeminjam})`,
      };

      const updatedTalanganList = (prev.danaTalangan || []).map(t => {
        if (t.id === talanganId) {
          return {
            ...t,
            totalPelunasan: newTotalPelunasan,
            sisaTalangan: newSisa,
            status: newStatus,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return t;
      });

      const updatedBk = computeBukuKasRunningBalances([...existingBk, newBkItem]);

      return {
        ...prev,
        danaTalangan: updatedTalanganList,
        pelunasanTalangan: [newPelunasan, ...(prev.pelunasanTalangan || [])],
        bukuKas: updatedBk,
      };
    });

    logAudit('Tambah Pelunasan', `Penerimaan pelunasan talangan Rp ${item.jumlah.toLocaleString('id-ID')} dari ${parent.namaPeminjam} (Rumah ${parent.nomorRumah}) - Bukti: ${noBuktiCreated}`);
    addToast(`Pelunasan sebesar Rp ${item.jumlah.toLocaleString('id-ID')} berhasil dicatat & masuk ke Buku Kas.`, 'success');
    return { success: true };
  }, [currentUser, data.danaTalangan, addToast, logAudit]);

  const cancelPelunasanTalangan = useCallback((pelunasanId: string, reason: string): { success: boolean; message?: string } => {
    const targetPel = (data.pelunasanTalangan || []).find(p => p.id === pelunasanId);
    if (!targetPel) {
      return { success: false, message: 'Data pelunasan tidak ditemukan.' };
    }

    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedPelList = (prev.pelunasanTalangan || []).map(p => {
        if (p.id === pelunasanId) {
          return {
            ...p,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: reason || 'Dibatalkan oleh pengurus',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return p;
      });

      // Recalculate parent talangan
      const parent = (prev.danaTalangan || []).find(t => t.id === targetPel.talanganId);
      let updatedTalanganList = prev.danaTalangan || [];
      if (parent) {
        const newTotalPelunasan = Math.max(0, parent.totalPelunasan - targetPel.jumlah);
        const newSisa = Math.max(0, parent.jumlahTalangan - newTotalPelunasan);
        const newStatus: DanaTalanganStatus = newTotalPelunasan === 0 ? 'Belum Lunas' : newSisa <= 0 ? 'Lunas' : 'Sebagian';

        updatedTalanganList = updatedTalanganList.map(t => {
          if (t.id === targetPel.talanganId) {
            return {
              ...t,
              totalPelunasan: newTotalPelunasan,
              sisaTalangan: newSisa,
              status: newStatus,
              updatedAt: now,
              updatedBy: userName,
            };
          }
          return t;
        });
      }

      // Update Buku Kas entry for this pelunasan
      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'pelunasan_talangan' && b.sourceId === pelunasanId) {
          return {
            ...b,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: reason || 'Pelunasan dibatalkan',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        danaTalangan: updatedTalanganList,
        pelunasanTalangan: updatedPelList,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Batalkan Pelunasan', `Membatalkan pelunasan Rp ${targetPel.jumlah.toLocaleString('id-ID')} (Alasan: ${reason})`);
    addToast('Pelunasan talangan berhasil dibatalkan di Buku Kas.', 'warning');
    return { success: true };
  }, [currentUser, data.pelunasanTalangan, addToast, logAudit]);

  // Dana Talangan Fund Handlers
  const addDanaTalanganFund = useCallback((fundInput: Omit<DanaTalanganFund, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newFund: DanaTalanganFund = {
      ...fundInput,
      id: generateId(),
      createdBy: userName,
      createdAt: now,
      updatedAt: now,
    };

    setData(prev => ({
      ...prev,
      danaTalanganFunds: [newFund, ...(prev.danaTalanganFunds || [])],
    }));

    logAudit(
      fundInput.jenis === 'Saldo Awal' ? 'Atur Dana Talangan Awal' : 'Penambahan Dana Talangan',
      `${fundInput.jenis}: Rp ${fundInput.jumlah.toLocaleString('id-ID')} (${fundInput.sumberDana || 'Kas RT'})`
    );
    addToast(`${fundInput.jenis} Dana Talangan Rp ${fundInput.jumlah.toLocaleString('id-ID')} berhasil dicatat.`, 'success');
  }, [currentUser, addToast, logAudit]);

  const updateDanaTalanganFund = useCallback((id: string, updates: Partial<Omit<DanaTalanganFund, 'id' | 'createdAt'>>) => {
    const now = new Date().toISOString();
    setData(prev => ({
      ...prev,
      danaTalanganFunds: (prev.danaTalanganFunds || []).map(f => f.id === id ? { ...f, ...updates, updatedAt: now } : f),
    }));
    logAudit('Ubah Dana Talangan', 'Memperbarui data alokasi dana talangan');
    addToast('Alokasi dana talangan berhasil diperbarui.', 'success');
  }, [addToast, logAudit]);

  const deleteDanaTalanganFund = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      danaTalanganFunds: (prev.danaTalanganFunds || []).filter(f => f.id !== id),
    }));
    logAudit('Hapus Dana Talangan', 'Menghapus catatan dana talangan');
    addToast('Catatan dana talangan berhasil dihapus.', 'info');
  }, [addToast, logAudit]);

  // Saldo Awal Handlers
  const addSaldoAwal = useCallback((saldoInput: Omit<SaldoAwalRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    const newSaldo: SaldoAwalRecord = {
      ...saldoInput,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      createdBy: userName,
      updatedBy: userName,
    };

    setData(prev => {
      const noBukti = generateNoBukti('SA', newSaldo.tanggal, prev.bukuKas);
      const newBkItem: BukuKasRecord = {
        id: `bk-sa-${newSaldo.id}`,
        tanggal: newSaldo.tanggal,
        noBukti,
        sourceType: 'saldo_awal',
        sourceId: newSaldo.id,
        kategori: 'Saldo Awal',
        uraian: newSaldo.keterangan || 'Saldo Awal Kas RT',
        pemasukan: newSaldo.nominal,
        pengeluaran: 0,
        saldo: 0,
        status: 'Aktif',
        petugas: userName,
        createdBy: userName,
        createdAt: now,
        updatedBy: userName,
        updatedAt: now,
        keterangan: 'Pencatatan Saldo Awal Kas RT',
      };

      const newBukuKas = computeBukuKasRunningBalances([...prev.bukuKas, newBkItem]);

      return {
        ...prev,
        saldoAwal: [...(prev.saldoAwal || []), newSaldo],
        bukuKas: newBukuKas,
      };
    });

    logAudit('Menambah Saldo Awal', `Mencatat saldo awal sebesar Rp ${newSaldo.nominal.toLocaleString('id-ID')} (${newSaldo.keterangan || 'Saldo Awal'})`);
    addToast('Saldo awal berhasil dicatat di Buku Kas', 'success');
  }, [currentUser, addToast, logAudit]);

  const updateSaldoAwal = useCallback((id: string, updates: Partial<Omit<SaldoAwalRecord, 'id' | 'createdAt'>>) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedList = (prev.saldoAwal || []).map(s => s.id === id ? { ...s, ...updates, updatedAt: now, updatedBy: userName } : s);
      const targetS = updatedList.find(s => s.id === id);

      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'saldo_awal' && b.sourceId === id && targetS) {
          return {
            ...b,
            tanggal: targetS.tanggal || b.tanggal,
            pemasukan: targetS.nominal ?? b.pemasukan,
            uraian: targetS.keterangan || b.uraian,
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        saldoAwal: updatedList,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Mengubah Saldo Awal', `Memperbarui data saldo awal`);
    addToast('Saldo awal berhasil diperbarui', 'success');
  }, [currentUser, addToast, logAudit]);

  const deleteSaldoAwal = useCallback((id: string) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';

    setData(prev => {
      const updatedBk = prev.bukuKas.map(b => {
        if (b.sourceType === 'saldo_awal' && b.sourceId === id) {
          return {
            ...b,
            status: 'Dibatalkan' as const,
            cancelledAt: now,
            cancelledBy: userName,
            cancelReason: 'Saldo awal dihapus oleh pengguna',
            updatedAt: now,
            updatedBy: userName,
          };
        }
        return b;
      });

      return {
        ...prev,
        saldoAwal: (prev.saldoAwal || []).filter(s => s.id !== id),
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });

    logAudit('Menghapus Saldo Awal', `Menghapus catatan saldo awal`);
    addToast('Saldo awal berhasil dihapus dari Buku Kas', 'info');
  }, [currentUser, addToast, logAudit]);

  // Recalculate balances
  const recalculateBukuKasBalances = useCallback(() => {
    setData(prev => ({
      ...prev,
      bukuKas: computeBukuKasRunningBalances(prev.bukuKas),
    }));
    logAudit('Hitung Ulang Saldo', 'Menghitung ulang seluruh saldo berjalan Buku Kas');
    addToast('Seluruh saldo berjalan Buku Kas berhasil dihitung ulang', 'success');
  }, [logAudit, addToast]);

  // Rebuild / Repair Buku Kas from all source transactions
  const repairAndRebuildBukuKas = useCallback((): ReconciliationReport => {
    let report: ReconciliationReport = {
      isMatched: true,
      totalDifference: 0,
      sources: [],
      activeCount: 0,
      cancelledCount: 0,
      totalPemasukan: 0,
      totalPengeluaran: 0,
      saldoAkhir: 0,
    };

    setData(prev => {
      const synced = syncAllSourcesToBukuKas({
        warga: prev.warga,
        iuran: prev.iuran,
        jimpitan: prev.jimpitan,
        donasi: prev.donasi,
        bop: prev.bop,
        saldoAwal: prev.saldoAwal || [],
        danaTalangan: prev.danaTalangan || [],
        pelunasanTalangan: prev.pelunasanTalangan || [],
        settings: prev.settings,
      }, prev.bukuKas, currentUser);

      const updated = {
        ...prev,
        bukuKas: synced,
      };

      report = reconcileBukuKas(updated);
      return updated;
    });

    logAudit('Perbaiki Buku Kas', `Sinkronisasi ulang Buku Kas dari seluruh sumber transaksi (Status rekonsiliasi: ${report.isMatched ? 'Sesuai' : 'Terdapat Selisih'})`);
    addToast(`Buku Kas berhasil diperbaiki. Status: ${report.isMatched ? 'Semua data sesuai' : 'Terdapat selisih'}`, report.isMatched ? 'success' : 'warning');
    return report;
  }, [currentUser, logAudit, addToast]);

  // Remove duplicate entries
  const resolveDuplicates = useCallback((recordIdsToRemove: string[]) => {
    const idSet = new Set(recordIdsToRemove);
    setData(prev => {
      const filtered = prev.bukuKas.filter(b => !idSet.has(b.id));
      return {
        ...prev,
        bukuKas: computeBukuKasRunningBalances(filtered),
      };
    });
    logAudit('Hapus Duplikasi Buku Kas', `Membersihkan ${recordIdsToRemove.length} transaksi duplikat dari Buku Kas`);
    addToast(`${recordIdsToRemove.length} transaksi duplikat berhasil dibersihkan`, 'success');
  }, [logAudit, addToast]);

  // Cancel item manually
  const cancelBukuKasItem = useCallback((id: string, reason: string) => {
    const now = new Date().toISOString();
    const userName = currentUser?.nama || 'Pengurus RT';
    setData(prev => {
      const updatedBk = prev.bukuKas.map(b => b.id === id ? {
        ...b,
        status: 'Dibatalkan' as const,
        cancelledAt: now,
        cancelledBy: userName,
        cancelReason: reason || 'Dibatalkan secara manual oleh pengurus',
        updatedAt: now,
        updatedBy: userName,
      } : b);

      return {
        ...prev,
        bukuKas: computeBukuKasRunningBalances(updatedBk),
      };
    });
    logAudit('Batalkan Transaksi Buku Kas', `Membatalkan item buku kas (${reason})`);
    addToast('Transaksi Buku Kas berhasil dibatalkan', 'warning');
  }, [currentUser, logAudit, addToast]);

  // Settings
  const updateSettings = useCallback((newSettings: AppSettings) => {
    setData(prev => ({
      ...prev,
      settings: newSettings,
    }));
    logAudit('Perubahan Pengaturan', `Memperbarui nominal tarif iuran dan informasi identitas RT`);
    addToast('Pengaturan sistem berhasil disimpan', 'success');
  }, [addToast, logAudit]);

  // Export Backup JSON
  const exportBackupJson = useCallback(() => {
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const fileName = `backup-keuangan-rt-09-${dateStr}.json`;

      const sanitizedUsers = data.users.map(u => ({
        id: u.id,
        nama: u.nama,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        passwordHash: u.passwordHash
      }));

      const backupPayload = {
        appName: 'KEUANGAN RT 09 RW 08',
        subTitle: 'Kelurahan Bangetayu Wetan',
        backupDate: now.toISOString(),
        version: '3.0',
        users: sanitizedUsers,
        warga: data.warga,
        iuran: data.iuran,
        jimpitan: data.jimpitan,
        donasi: data.donasi,
        bop: data.bop,
        danaTalangan: data.danaTalangan,
        pelunasanTalangan: data.pelunasanTalangan,
        danaTalanganFunds: data.danaTalanganFunds,
        bukuKas: data.bukuKas,
        saldoAwal: data.saldoAwal,
        auditLogs: data.auditLogs,
        settings: data.settings,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logAudit('Backup Database', `Mengekspor cadangan database lengkap ke file ${fileName}`);
      addToast('Backup berhasil dibuat.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Gagal membuat file backup.', 'error');
    }
  }, [data, addToast, logAudit]);

  // Inspect restore JSON without immediately committing
  const inspectRestoreJson = useCallback((jsonString: string): RestorePreview => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, wargaCount: 0, iuranCount: 0, jimpitanCount: 0, donasiCount: 0, bopCount: 0, bukuKasCount: 0, saldoAwalCount: 0, usersCount: 0, error: 'Format file JSON tidak valid.' };
      }

      const wargaCount = Array.isArray(parsed.warga) ? parsed.warga.length : 0;
      const iuranCount = Array.isArray(parsed.iuran) ? parsed.iuran.length : 0;
      const jimpitanCount = Array.isArray(parsed.jimpitan) ? parsed.jimpitan.length : 0;
      const donasiCount = Array.isArray(parsed.donasi) ? parsed.donasi.length : 0;
      const bopCount = Array.isArray(parsed.bop) ? parsed.bop.length : 0;
      const danaTalanganCount = Array.isArray(parsed.danaTalangan) ? parsed.danaTalangan.length : 0;
      const pelunasanTalanganCount = Array.isArray(parsed.pelunasanTalangan) ? parsed.pelunasanTalangan.length : 0;
      const fundsCount = Array.isArray(parsed.danaTalanganFunds) ? parsed.danaTalanganFunds.length : 0;
      const bukuKasCount = Array.isArray(parsed.bukuKas) ? parsed.bukuKas.length : 0;
      const saldoAwalCount = Array.isArray(parsed.saldoAwal) ? parsed.saldoAwal.length : 0;
      const usersCount = Array.isArray(parsed.users) ? parsed.users.length : 0;

      const restoredSaldoAwal = Array.isArray(parsed.saldoAwal) ? parsed.saldoAwal : [];
      const restoredTalangan = Array.isArray(parsed.danaTalangan) ? parsed.danaTalangan : [];
      const restoredPelunasan = Array.isArray(parsed.pelunasanTalangan) ? parsed.pelunasanTalangan : [];
      const restoredFunds = Array.isArray(parsed.danaTalanganFunds) ? parsed.danaTalanganFunds : [];
      let restoredBukuKas = Array.isArray(parsed.bukuKas) ? parsed.bukuKas : [];

      if (restoredBukuKas.length === 0 && (iuranCount > 0 || jimpitanCount > 0 || donasiCount > 0 || bopCount > 0 || saldoAwalCount > 0 || danaTalanganCount > 0)) {
        restoredBukuKas = syncAllSourcesToBukuKas({
          warga: parsed.warga || [],
          iuran: parsed.iuran || [],
          jimpitan: parsed.jimpitan || [],
          donasi: parsed.donasi || [],
          bop: parsed.bop || [],
          saldoAwal: restoredSaldoAwal,
          danaTalangan: restoredTalangan,
          pelunasanTalangan: restoredPelunasan,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        }, []);
      } else {
        restoredBukuKas = computeBukuKasRunningBalances(restoredBukuKas);
      }

      const normalized: AppStateData = {
        users: Array.isArray(parsed.users) ? parsed.users : data.users,
        warga: Array.isArray(parsed.warga) ? parsed.warga : [],
        iuran: Array.isArray(parsed.iuran) ? parsed.iuran : [],
        jimpitan: Array.isArray(parsed.jimpitan) ? parsed.jimpitan : [],
        donasi: Array.isArray(parsed.donasi) ? parsed.donasi : [],
        bop: Array.isArray(parsed.bop) ? parsed.bop : [],
        danaTalangan: restoredTalangan,
        pelunasanTalangan: restoredPelunasan,
        danaTalanganFunds: restoredFunds,
        bukuKas: restoredBukuKas,
        saldoAwal: restoredSaldoAwal,
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        initialized: true,
      };

      return {
        valid: true,
        wargaCount,
        iuranCount,
        jimpitanCount,
        donasiCount,
        bopCount,
        danaTalanganCount,
        pelunasanTalanganCount,
        fundsCount,
        bukuKasCount,
        saldoAwalCount,
        usersCount,
        parsedData: normalized,
      };
    } catch {
      return { valid: false, wargaCount: 0, iuranCount: 0, jimpitanCount: 0, donasiCount: 0, bopCount: 0, bukuKasCount: 0, saldoAwalCount: 0, usersCount: 0, error: 'File tidak dapat dibaca sebagai JSON.' };
    }
  }, [data.users]);

  // Apply parsed restored data
  const applyRestoredData = useCallback((restoredData: AppStateData) => {
    setData(restoredData);
    logAudit('Restore Database', `Memulihkan database: ${restoredData.warga.length} warga, ${restoredData.iuran.length} iuran, ${restoredData.jimpitan.length} jimpitan, ${restoredData.donasi.length} donasi, ${restoredData.bop.length} BOP, ${restoredData.bukuKas.length} Buku Kas`);
    addToast('Database berhasil dipulihkan.', 'success');
  }, [addToast, logAudit]);

  // Restore directly with fallback string
  const restoreBackupJson = useCallback((jsonString: string) => {
    const inspected = inspectRestoreJson(jsonString);
    if (!inspected.valid || !inspected.parsedData) {
      addToast(inspected.error || 'Gagal memulihkan file cadangan.', 'error');
      return { success: false, message: inspected.error || 'File tidak valid' };
    }
    applyRestoredData(inspected.parsedData);
    return { success: true, message: 'Restore berhasil' };
  }, [inspectRestoreJson, applyRestoredData, addToast]);

  // Reset all data
  const resetAllData = useCallback(() => {
    const empty = createEmptyData();
    empty.users = data.users;
    setData(empty);
    logAudit('Bersihkan Seluruh Data', 'Membersihkan seluruh data warga dan transaksi');
    addToast('Seluruh data transaksi dan warga telah dibersihkan', 'warning');
  }, [data.users, addToast, logAudit]);

  // Load sample dataset
  const loadSampleDataset = useCallback(() => {
    const sample = createSampleData();
    sample.users = data.users;
    setData(sample);
    logAudit('Reset ke Data Contoh', 'Mengisi ulang sistem dengan data demonstrasi lengkap');
    addToast('Data contoh berhasil dimuat ulang', 'success');
  }, [data.users, addToast, logAudit]);

  const value = useMemo(() => ({
    data,
    isLoading,
    showInitModal,
    toasts,
    addToast,
    removeToast,
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    setupAdmin,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    logAudit,
    periodFilter,
    setPeriodFilter,
    initializeWithEmpty,
    initializeWithSample,
    addWarga,
    updateWarga,
    deleteWarga,
    checkWargaDuplicate,
    getIuranForWarga,
    toggleIuranCategory,
    updateIuranKeterangan,
    getJimpitanForWarga,
    toggleJimpitanMinggu,
    addDonasi,
    updateDonasi,
    deleteDonasi,
    addBop,
    updateBop,
    deleteBop,
    addDanaTalangan,
    updateDanaTalangan,
    cancelDanaTalangan,
    addPelunasanTalangan,
    cancelPelunasanTalangan,
    addDanaTalanganFund,
    updateDanaTalanganFund,
    deleteDanaTalanganFund,
    addSaldoAwal,
    updateSaldoAwal,
    deleteSaldoAwal,
    recalculateBukuKasBalances,
    repairAndRebuildBukuKas,
    resolveDuplicates,
    cancelBukuKasItem,
    updateSettings,
    exportBackupJson,
    backupData: exportBackupJson,
    restoreBackupJson,
    restoreData: restoreBackupJson,
    inspectRestoreJson,
    applyRestoredData,
    resetAllData,
    clearAllData: resetAllData,
    loadSampleDataset,
    resetToDefaultSample: loadSampleDataset,
  }), [
    data,
    isLoading,
    showInitModal,
    toasts,
    addToast,
    removeToast,
    currentUser,
    login,
    logout,
    setupAdmin,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    logAudit,
    periodFilter,
    initializeWithEmpty,
    initializeWithSample,
    addWarga,
    updateWarga,
    deleteWarga,
    checkWargaDuplicate,
    getIuranForWarga,
    toggleIuranCategory,
    updateIuranKeterangan,
    getJimpitanForWarga,
    toggleJimpitanMinggu,
    addDonasi,
    updateDonasi,
    deleteDonasi,
    addBop,
    updateBop,
    deleteBop,
    addDanaTalangan,
    updateDanaTalangan,
    cancelDanaTalangan,
    addPelunasanTalangan,
    cancelPelunasanTalangan,
    addDanaTalanganFund,
    updateDanaTalanganFund,
    deleteDanaTalanganFund,
    addSaldoAwal,
    updateSaldoAwal,
    deleteSaldoAwal,
    recalculateBukuKasBalances,
    repairAndRebuildBukuKas,
    resolveDuplicates,
    cancelBukuKasItem,
    updateSettings,
    exportBackupJson,
    restoreBackupJson,
    inspectRestoreJson,
    applyRestoredData,
    resetAllData,
    loadSampleDataset,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
