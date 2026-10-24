import React from 'react';
import { Sun, Moon, Wallet, Bell, ArrowUpDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TopHeaderProps {
  onOpenNotifications: () => void;
  onOpenExportImport: () => void;
  unreadCount: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenNotifications,
  onOpenExportImport,
  unreadCount,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={`w-full h-16 px-4 sm:px-5 flex items-center justify-between border-b backdrop-blur-md sticky top-0 z-30 shrink-0 transition-colors ${
        theme === 'dark'
          ? 'bg-slate-950/95 border-slate-800/80 text-white'
          : 'bg-white/95 border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20 shrink-0">
          <Wallet className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <h1 className="font-extrabold text-base tracking-tight leading-none">
              CatatAja
            </h1>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              AI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
            Asisten Keuangan Pintar
          </p>
        </div>
      </div>

      {/* Right: Uniform Action Bar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenExportImport}
          aria-label="Ekspor dan Impor Data"
          className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border-slate-800'
              : 'bg-slate-100 text-emerald-700 hover:bg-slate-200/80 border-slate-200/80'
          }`}
          title="Ekspor & Impor Data (JSON / CSV)"
        >
          <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
          <span>Backup</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ganti ke Mode Cerah' : 'Ganti ke Mode Gelap'}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900 text-amber-300 hover:bg-slate-800 border-slate-800'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border-slate-200/80'
          }`}
          title={theme === 'dark' ? 'Mode Cerah' : 'Mode Gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifikasi Rekomendasi Penghematan"
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border-slate-200/80'
          }`}
          title="Rekomendasi Hemat & Notifikasi"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
