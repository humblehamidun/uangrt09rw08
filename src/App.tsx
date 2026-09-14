/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { TabType, UserRole } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/common/ToastContainer';
import { InitWelcomeModal } from './components/common/InitWelcomeModal';
import { LoginPage } from './components/auth/LoginPage';
import { SetupAdminPage } from './components/auth/SetupAdminPage';
import { UnauthorizedNotice } from './components/common/UnauthorizedNotice';

// Views
import { DashboardView } from './components/views/DashboardView';
import { BukuKasView } from './components/views/BukuKasView';
import { DataWargaView } from './components/views/DataWargaView';
import { IuranView } from './components/views/IuranView';
import { JimpitanView } from './components/views/JimpitanView';
import { DonasiView } from './components/views/DonasiView';
import { BopView } from './components/views/BopView';
import { DanaTalanganView } from './components/views/DanaTalanganView';
import { PengeluaranDanaView } from './components/views/PengeluaranDanaView';
import { LaporanView } from './components/views/LaporanView';
import { PengaturanView } from './components/views/PengaturanView';
import { UserManagementView } from './components/views/UserManagementView';
import { AuditLogView } from './components/views/AuditLogView';
import { BackupRestoreView } from './components/views/BackupRestoreView';

const TAB_TITLES: Record<TabType, string> = {
  'dashboard': 'Dashboard Utama',
  'buku-kas': 'Buku Kas Otomatis',
  'warga': 'Data Warga',
  'iuran': 'Catatan Iuran',
  'jimpitan': 'Catatan Jimpitan',
  'donasi': 'Catatan Donasi',
  'bop': 'Buku Kas Operasional (BOP)',
  'dana-talangan': 'Dana Talangan Kematian',
  'pengeluaran-dana': 'Pengeluaran Dana Kas RT',
  'laporan': 'Laporan Keuangan',
  'audit-log': 'Audit Log Aktivitas',
  'pengguna': 'Manajemen Pengguna',
  'backup': 'Backup & Restore Database',
  'pengaturan': 'Pengaturan Sistem',
};

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data, currentUser } = useData();

  // 1. If no users configured yet, present Setup Administrator flow
  if (data.users.length === 0) {
    return (
      <>
        <SetupAdminPage />
        <ToastContainer />
      </>
    );
  }

  // 2. If users exist but no active session, show Login Page
  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  // 3. User is authenticated -> Enforce RBAC
  const userRole: UserRole = currentUser.role;
  const isRestrictedForNonAdmin = activeTab === 'pengguna' || activeTab === 'pengaturan' || activeTab === 'backup';

  const renderView = () => {
    // If attempting to access Admin-only pages without Admin role
    if (userRole !== 'Admin' && isRestrictedForNonAdmin) {
      return (
        <UnauthorizedNotice 
          onBackToDashboard={() => setActiveTab('dashboard')} 
          message="Anda tidak memiliki izin untuk mengakses halaman ini."
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'buku-kas':
        return <BukuKasView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'warga':
        return <DataWargaView />;
      case 'iuran':
        return <IuranView />;
      case 'jimpitan':
        return <JimpitanView />;
      case 'donasi':
        return <DonasiView />;
      case 'bop':
        return <BopView />;
      case 'dana-talangan':
        return <DanaTalanganView />;
      case 'pengeluaran-dana':
        return <PengeluaranDanaView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'laporan':
        return <LaporanView />;
      case 'audit-log':
        return <AuditLogView />;
      case 'pengguna':
        return <UserManagementView />;
      case 'backup':
        return <BackupRestoreView />;
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#1F2937] flex flex-col font-sans selection:bg-[#1E5AA8]/20 selection:text-[#1E5AA8]">
      
      {/* Top Header */}
      <Header 
        currentTabName={TAB_TITLES[activeTab] || 'Dashboard'}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
      />

      {/* Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        
        {/* Desktop & Mobile Sidebar */}
        <Sidebar 
          currentTab={activeTab} 
          onSelectTab={(tab) => setActiveTab(tab)} 
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 pb-24 md:pb-8">
          {renderView()}
        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav 
        currentTab={activeTab} 
        onSelectTab={(tab) => setActiveTab(tab)} 
        onOpenFullMenu={() => setMobileMenuOpen(true)}
      />

      {/* Global Toast Notifications */}
      <ToastContainer />

    </div>
  );
};

export default function App() {
  return (
    <DataProvider>
      <MainContent />
    </DataProvider>
  );
}
