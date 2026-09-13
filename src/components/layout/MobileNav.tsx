import React from 'react';
import { NavigationTab } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  Coins, 
  CircleDollarSign, 
  Menu
} from 'lucide-react';

interface MobileNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenFullMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenFullMenu,
}) => {
  const quickTabs: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'iuran', label: 'Iuran', icon: Coins },
    { id: 'jimpitan', label: 'Jimpitan', icon: CircleDollarSign },
    { id: 'warga', label: 'Warga', icon: Users },
  ];

  return (
    <div 
      id="mobile-bottom-nav" 
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] lg:hidden px-2 py-1.5 flex items-center justify-around no-print shadow-[0_-2px_6px_rgba(0,0,0,0.04)]"
    >
      {quickTabs.map(item => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors min-w-[56px] min-h-[44px] ${
              isActive ? 'text-[#1E5AA8] font-bold' : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* Menu Drawer button */}
      <button
        id="bottom-nav-more"
        type="button"
        onClick={onOpenFullMenu}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors min-w-[56px] min-h-[44px] ${
          !quickTabs.some(t => t.id === currentTab) ? 'text-[#1E5AA8] font-bold' : 'text-[#6B7280] hover:text-[#1F2937]'
        }`}
      >
        <Menu className="w-5 h-5 stroke-2" />
        <span className="text-[10px] mt-0.5 tracking-tight">Semua</span>
      </button>
    </div>
  );
};
