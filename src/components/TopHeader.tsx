import React from 'react';
import { Sun, Moon, Sparkles, Bell, ArrowUpDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';

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
  const { syncStatus, connectedDevices } = useSync();

  return (
    <header
      className={`w-full px-4 py-3 flex items-center justify-between border-b backdrop-blur-md sticky top-0 z-30 transition-colors ${
        theme === 'dark'
          ? 'bg-slate-950/95 border-slate-800/80 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900'
      }`}
    >
      {/* Brand logo & status */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
          <Sparkles className="w-4 h-4 fill-white/80" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-base tracking-tight">CatatAja</h1>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              · AI
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            ></span>
            <span>
              {syncStatus === 'connected'
                ? `Sync Real-time (${connectedDevices} dev)`
                : syncStatus === 'connecting'
                ? 'Menghubungkan...'
                : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons: Export/Import, Theme toggle & Notifications */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenExportImport}
          aria-label="Ekspor dan Impor Data"
          className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border-slate-800'
              : 'bg-slate-100 text-emerald-700 hover:bg-slate-200 border-slate-200'
          }`}
          title="Ekspor & Impor Data (JSON / CSV)"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Data</span>
        </button>

        {/* Dark/Light mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ganti ke Mode Cerah' : 'Ganti ke Mode Gelap'}
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900 text-amber-300 hover:bg-slate-800 border-slate-800'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
          }`}
          title={theme === 'dark' ? 'Mode Cerah' : 'Mode Gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifikasi Rekomendasi Penghematan"
          className={`p-2 rounded-xl relative transition-all cursor-pointer border ${
            theme === 'dark'
              ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
          }`}
          title="Rekomendasi Hemat & Notifikasi"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
