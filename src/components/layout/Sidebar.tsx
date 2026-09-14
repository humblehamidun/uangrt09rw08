import React from 'react';
import { NavigationTab, UserRole } from '../../types';
import { 
  LayoutDashboard, 
  BookOpen,
  Users, 
  Coins, 
  CircleDollarSign, 
  Gift, 
  Briefcase, 
  HeartHandshake,
  Receipt,
  BarChart3, 
  Settings, 
  X,
  Building2,
  Activity,
  Database,
  UserCheck
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  id: NavigationTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeCountKey?: string;
  allowedRoles?: UserRole[];
}

export const navItems: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'warga', label: 'Data Warga', icon: Users, badgeCountKey: 'warga' },
  { id: 'iuran', label: 'Iuran', icon: Coins },
  { id: 'jimpitan', label: 'Jimpitan', icon: CircleDollarSign },
  { id: 'donasi', label: 'Donasi', icon: Gift },
  { id: 'bop', label: 'BOP', icon: Briefcase },
  { id: 'dana-talangan', label: 'Dana Talangan Kematian', icon: HeartHandshake, badgeCountKey: 'talangan' },
  { id: 'pengeluaran-dana', label: 'Pengeluaran Dana', icon: Receipt },
  { id: 'buku-kas', label: 'Buku Kas', icon: BookOpen },
  { id: 'laporan', label: 'Laporan', icon: BarChart3 },
  { id: 'audit-log', label: 'Audit Log', icon: Activity },
  { id: 'pengguna', label: 'Manajemen Pengguna', icon: UserCheck, allowedRoles: ['Admin'] },
  { id: 'backup', label: 'Backup & Restore', icon: Database, allowedRoles: ['Admin'] },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings, allowedRoles: ['Admin'] },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { data, currentUser } = useData();

  const handleItemClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const wargaActiveCount = data.warga.filter(w => w.status === 'Aktif').length;
  const talanganActiveCount = (data.danaTalangan || []).filter(t => t.statusAktif === 'Aktif' && t.status !== 'Lunas').length;
  const userRole: UserRole = currentUser?.role || 'Admin';

  const visibleNavItems = navItems.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          id="mobile-nav-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-200 no-print"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 no-print overflow-y-auto ${
          isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } lg:static lg:h-[calc(100vh-61px)]`}
      >
        {/* Top Section: Logo, Civic Emblem & Brand Identitas */}
        <div className="flex flex-col p-4">
          
          {/* Header Bar with Logo Emblem */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#1E5AA8] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-[#1F2937] tracking-tight leading-tight uppercase">
                  KEUANGAN RT
                </div>
                <div className="text-[11px] font-bold text-[#1E5AA8] leading-tight">
                  RT 09 RW 08
                </div>
                <div className="text-[10px] text-[#6B7280] font-medium leading-none mt-0.5">
                  BANGETAYU WETAN
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              id="btn-close-mobile-nav"
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#1F2937] hover:bg-slate-100 lg:hidden"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Civic Subtitle Pill */}
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-[#F7F9FC] border border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#6B7280]">Kelurahan Bangetayu Wetan</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white text-[#1E5AA8] border border-[#E5E7EB]">
              Kota Semarang
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-0.5" aria-label="Menu Utama">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors relative group text-left ${
                    isActive
                      ? 'bg-blue-50 text-[#1E5AA8] font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#1E5AA8] before:rounded-r'
                      : 'text-[#6B7280] hover:text-[#1F2937] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#1E5AA8]' : 'text-[#6B7280] group-hover:text-[#1F2937]'
                    }`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badgeCountKey === 'warga' && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 ${
                      isActive 
                        ? 'bg-[#1E5AA8]/10 text-[#1E5AA8]' 
                        : 'bg-slate-100 text-[#6B7280]'
                    }`}>
                      {wargaActiveCount}
                    </span>
                  )}

                  {item.badgeCountKey === 'talangan' && talanganActiveCount > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 ${
                      isActive 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {talanganActiveCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Officer Details */}
        <div className="p-3.5 border-t border-[#E5E7EB] bg-[#F8FAFC] mt-auto">
          <div className="text-[11px] text-[#6B7280] space-y-1">
            <div className="flex items-center justify-between">
              <span>Ketua RT:</span>
              <span className="text-[#1F2937] font-medium truncate max-w-[120px]">{data.settings.ketuaRT}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bendahara:</span>
              <span className="text-[#1F2937] font-medium truncate max-w-[120px]">{data.settings.bendahara}</span>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
};
