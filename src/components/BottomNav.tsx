import React from 'react';
import { Home, ReceiptText, BarChart3, Sparkles, RefreshCw, Mic } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type ActiveTab = 'beranda' | 'transaksi' | 'matriks' | 'ai' | 'sync';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenVoiceModal: () => void;
  unreadAlertsCount?: number;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'beranda',
    label: 'Beranda',
    ariaLabel: 'Beranda',
    icon: Home,
  },
  {
    id: 'transaksi',
    label: 'Transaksi',
    ariaLabel: 'Riwayat Transaksi',
    icon: ReceiptText,
  },
  {
    id: 'matriks',
    label: 'Matriks',
    ariaLabel: 'Bandingkan Bulan dan Matriks Arus Kas',
    icon: BarChart3,
  },
  {
    id: 'ai',
    label: 'AI Hemat',
    ariaLabel: 'AI Penasihat dan Rekomendasi Penghematan',
    icon: Sparkles,
  },
  {
    id: 'sync',
    label: 'Sync',
    ariaLabel: 'Sinkronisasi dan Backup Data',
    icon: RefreshCw,
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenVoiceModal,
  unreadAlertsCount = 0,
}) => {
  const { theme } = useTheme();

  return (
    <div className="sticky bottom-0 w-full shrink-0 z-30">
      <nav
        aria-label="Navigasi Utama"
        className={`w-full h-16 px-1.5 border-t grid grid-cols-6 items-center backdrop-blur-md transition-colors ${
          theme === 'dark'
            ? 'bg-slate-900/95 border-slate-800 text-slate-400'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.id === 'ai' && unreadAlertsCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`relative h-full flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {/* Active top indicator bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-500" />
              )}

              <div
                className={`relative flex items-center justify-center w-9 h-7 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-500/12 dark:bg-emerald-500/15'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] leading-none whitespace-nowrap tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Slot 6: Symmetrical Voice AI Action Button */}
        <button
          type="button"
          onClick={onOpenVoiceModal}
          aria-label="Catat transaksi dengan suara AI"
          className="relative h-full flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none group"
        >
          <div className="flex items-center justify-center w-9 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-sm shadow-emerald-500/25 group-hover:scale-105 group-active:scale-95 transition-transform">
            <Mic className="w-4 h-4 shrink-0 text-white" />
          </div>
          <span className="text-[10px] leading-none font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tracking-tight">
            Suara AI
          </span>
        </button>
      </nav>
    </div>
  );
};
