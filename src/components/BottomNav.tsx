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

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenVoiceModal,
  unreadAlertsCount = 0,
}) => {
  const { theme } = useTheme();

  return (
    <div className="sticky bottom-0 w-full shrink-0 z-30">
      {/* Floating Center Voice Button for quick recording */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={onOpenVoiceModal}
          aria-label="Catat transaksi dengan suara AI"
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-4 ${
            theme === 'dark' ? 'border-slate-950' : 'border-white'
          }`}
        >
          <Mic className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          <span className="sr-only">Input Suara</span>
        </button>
      </div>

      {/* Navigation bar container */}
      <nav
        aria-label="Navigasi Utama"
        className={`w-full h-16 px-2 border-t flex items-center justify-between backdrop-blur-md transition-colors ${
          theme === 'dark'
            ? 'bg-slate-900/95 border-slate-800 text-slate-400'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
        {/* Tab 1: Beranda */}
        <button
          type="button"
          onClick={() => onSelectTab('beranda')}
          aria-label="Beranda"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'beranda'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${activeTab === 'beranda' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1">Beranda</span>
        </button>

        {/* Tab 2: Transaksi */}
        <button
          type="button"
          onClick={() => onSelectTab('transaksi')}
          aria-label="Riwayat Transaksi"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all mr-5 cursor-pointer ${
            activeTab === 'transaksi'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ReceiptText className={`w-5 h-5 transition-transform ${activeTab === 'transaksi' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1">Transaksi</span>
        </button>

        {/* Spacer for center Voice button */}
        <div className="w-12 shrink-0"></div>

        {/* Tab 3: Matriks & Tren */}
        <button
          type="button"
          onClick={() => onSelectTab('matriks')}
          aria-label="Bandingkan Bulan dan Matriks Arus Kas"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ml-5 cursor-pointer ${
            activeTab === 'matriks'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className={`w-5 h-5 transition-transform ${activeTab === 'matriks' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1">Matriks</span>
        </button>

        {/* Tab 4: AI & Rekomendasi */}
        <button
          type="button"
          onClick={() => onSelectTab('ai')}
          aria-label="AI Penasihat dan Rekomendasi Penghematan"
          className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Sparkles className={`w-5 h-5 transition-transform ${activeTab === 'ai' ? 'scale-110' : ''}`} />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadAlertsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">AI Hemat</span>
        </button>

        {/* Tab 5: Sinkronisasi */}
        <button
          type="button"
          onClick={() => onSelectTab('sync')}
          aria-label="Sinkronisasi Real-Time Antar Perangkat"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'sync'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <RefreshCw className={`w-5 h-5 transition-transform ${activeTab === 'sync' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1">Sync</span>
        </button>
      </nav>
    </div>
  );
};
