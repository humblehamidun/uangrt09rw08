import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Menu, 
  Wallet, 
  LogOut, 
  Cloud, 
  User, 
  Settings, 
  ChevronDown,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { formatRupiah, NAMA_BULAN } from '../../utils/format';
import { DatabaseConfigModal } from '../common/DatabaseConfigModal';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  currentTabName: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, currentTabName }) => {
  const { data, currentUser, logout } = useData();
  const [showDbModal, setShowDbModal] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate live global kas balance
  const totalIuran = data.iuran.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalJimpitan = data.jimpitan.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalDonasi = data.donasi.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalPemasukanBop = data.bop
    .filter(b => b.jenis === 'Pemasukan')
    .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalPengeluaranBop = data.bop
    .filter(b => b.jenis === 'Pengeluaran')
    .reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  const totalPengeluaranDana = (data.pengeluaranDana || [])
    .filter(p => p.status === 'Aktif')
    .reduce((acc, curr) => acc + (curr.nominal || 0), 0);

  const totalPemasukan = totalIuran + totalJimpitan + totalDonasi + totalPemasukanBop;
  const saldoKas = totalPemasukan - (totalPengeluaranBop + totalPengeluaranDana);

  const today = new Date();
  const dateFormatted = `${today.getDate()} ${NAMA_BULAN[today.getMonth()]} ${today.getFullYear()}`;

  const isFirebaseActive = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);

  return (
    <>
      <header 
        id="app-header" 
        className="sticky top-0 z-30 w-full bg-white border-b border-[#E5E7EB] px-4 sm:px-6 lg:px-8 py-3 no-print transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      >
        <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-[1600px] mx-auto">
          
          {/* Left section: Hamburger button & Current Page Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={onToggleMobileMenu}
              className="p-2 -ml-2 rounded-lg text-[#6B7280] hover:text-[#1F2937] hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-[#1E5AA8]/20 transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#1F2937] tracking-tight leading-none">
                  {currentTabName}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#198754] border border-emerald-200">
                  RT 09 RW 08
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5 hidden sm:block">
                Kelurahan Bangetayu Wetan &bull; {dateFormatted}
              </p>
            </div>
          </div>

          {/* Right Section: Saldo Kas, Database Status, User Profile & Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live Saldo Kas RT Widget */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-[#E5E7EB]">
              <div className="p-1 rounded-md bg-emerald-50 text-[#198754] border border-emerald-100">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-[#6B7280] font-medium leading-tight">
                  Saldo Kas RT
                </div>
                <div className={`text-xs font-bold font-mono leading-none mt-0.5 ${saldoKas >= 0 ? 'text-[#198754]' : 'text-[#DC3545]'}`}>
                  {formatRupiah(saldoKas)}
                </div>
              </div>
            </div>

            {/* Cloud Database Status */}
            <button
              id="btn-db-status"
              type="button"
              onClick={() => setShowDbModal(true)}
              title="Status Database & Persistensi"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7F9FC] hover:bg-slate-100 text-[#6B7280] hover:text-[#1F2937] border border-[#E5E7EB] text-xs transition-colors"
            >
              <Cloud className={`w-3.5 h-3.5 ${isFirebaseActive ? 'text-[#198754]' : 'text-[#1E5AA8]'}`} />
              <span className="hidden md:inline text-[11px] font-medium">
                {isFirebaseActive ? 'Firebase Aktif' : 'Database'}
              </span>
            </button>

            {/* User Profile & Dropdown */}
            {currentUser && (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="btn-user-profile-menu"
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-lg hover:bg-slate-100 border border-transparent hover:border-[#E5E7EB] transition-colors focus:outline-none"
                  aria-expanded={userDropdownOpen}
                >
                  {/* Lingkaran Avatar Sederhana */}
                  <div className="w-8 h-8 rounded-full bg-[#1E5AA8] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {currentUser.nama.charAt(0).toUpperCase()}
                  </div>

                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-xs font-semibold text-[#1F2937] leading-tight max-w-[130px] truncate">
                      {currentUser.nama}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-medium leading-none mt-0.5">
                      {currentUser.role}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] hidden md:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div 
                    id="user-dropdown-menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E5E7EB] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-4 py-2 border-b border-[#E5E7EB] md:hidden">
                      <p className="text-xs font-semibold text-[#1F2937]">{currentUser.nama}</p>
                      <p className="text-[11px] text-[#6B7280]">{currentUser.role}</p>
                    </div>

                    <div className="px-3 py-1.5 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Akun Pengguna
                    </div>

                    <div className="px-3 py-1.5 text-xs text-[#1F2937] flex items-center gap-2 hover:bg-slate-50">
                      <User className="w-4 h-4 text-[#1E5AA8]" />
                      <div>
                        <span className="font-medium">Profil: {currentUser.nama}</span>
                        <span className="block text-[10px] text-[#6B7280]">Role: {currentUser.role}</span>
                      </div>
                    </div>

                    <div className="my-1 border-t border-[#E5E7EB]" />

                    <button
                      id="dropdown-item-logout"
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-xs font-medium text-[#DC3545] hover:bg-rose-50 flex items-center gap-2 text-left transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Database Config Modal */}
      <DatabaseConfigModal
        isOpen={showDbModal}
        onClose={() => setShowDbModal(false)}
      />
    </>
  );
};
