import React from 'react';
import { X, Bell, Lightbulb, TrendingUp, AlertTriangle, CheckCheck, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { SavingRecommendation } from '../types';
import { formatRupiah } from '../utils/finance';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: SavingRecommendation[];
  onSelectRecommendation: (rec: SavingRecommendation) => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  recommendations,
  onSelectRecommendation,
  onClearAll,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm h-full flex flex-col border-l shadow-2xl transition-all ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Pusat Notifikasi & Hemat</h2>
              <span className="text-[10px] text-slate-400">
                {recommendations.length} Rekomendasi Terdeteksi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClearAll}
              title="Tandai semua dibaca"
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Tutup notifikasi"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {recommendations.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
              <p className="text-xs font-semibold">Tidak ada notifikasi baru</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Pola belanjamu saat ini rapi dan terkontrol dengan baik!
              </p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => {
                  onSelectRecommendation(rec);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
                  theme === 'dark'
                    ? 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      rec.urgency === 'tinggi'
                        ? 'bg-rose-500/20 text-rose-400'
                        : rec.urgency === 'sedang'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {rec.urgency}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    Hemat ~{formatRupiah(rec.potentialSavingsMonthly)}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-100 mb-1">{rec.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                  {rec.description}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <Lightbulb className="w-3 h-3" />
                  <span className="line-clamp-1">{rec.actionableTip}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
