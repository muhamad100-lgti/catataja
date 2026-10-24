import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingDown,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Award,
  AlertTriangle,
  Bookmark,
  Share2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import {
  calculateMonthlySummary,
  compareMonths,
  formatRupiah,
  getPreviousMonthKey,
  generateSavingRecommendations,
  formatMonthLabel,
} from '../utils/finance';
import { SavingRecommendation } from '../types';

interface AIAdvisorViewProps {
  selectedMonth: string;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({ selectedMonth }) => {
  const { theme } = useTheme();
  const { transactions } = useSync();

  const prevMonthKey = getPreviousMonthKey(selectedMonth);
  const summary = calculateMonthlySummary(transactions, selectedMonth);
  const comparison = compareMonths(transactions, selectedMonth, prevMonthKey);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<SavingRecommendation[]>(() => {
    return generateSavingRecommendations(transactions, selectedMonth);
  });

  // AI Monthly Analysis response
  const [aiAnalysis, setAiAnalysis] = useState<{
    healthScore: number;
    statusLabel: string;
    summaryNarrative: string;
    actionablePoints: string[];
    highlightQuote?: string;
  } | null>(null);

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Generate automated monthly summary via Gemini API
  const fetchMonthlySummaryAI = async () => {
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/monthly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthKey: selectedMonth,
          summary,
          comparison,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch {
      // Fallback handled by local summary metrics
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Generate pattern-based recommendations via Gemini API
  const fetchAISavingRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const res = await fetch('/api/gemini/saving-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          transactions: transactions.filter((t) => t.date.startsWith(selectedMonth)),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRecommendations(data);
        }
      }
    } catch {
      // Local recommendations remain active
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    // Refresh local algorithmic recommendations when transactions/month changes
    const localRecs = generateSavingRecommendations(transactions, selectedMonth);
    setRecommendations(localRecs);
  }, [transactions, selectedMonth]);

  // Initial load of AI summary when transactions exist
  useEffect(() => {
    if (!aiAnalysis && summary.transactionCount > 0) {
      fetchMonthlySummaryAI();
    }
  }, [selectedMonth, summary.transactionCount]);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPotentialSavings = recommendations.reduce(
    (acc, r) => acc + (r.potentialSavingsMonthly || 0),
    0
  );

  return (
    <div className="p-4 space-y-4">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI Penasihat Finansial</span>
          </h2>
          <p className="text-xs text-slate-400">Periode: {formatMonthLabel(selectedMonth)}</p>
        </div>

        <button
          onClick={fetchMonthlySummaryAI}
          disabled={isLoadingAI}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAI ? 'animate-spin' : ''}`} />
          <span>Analisis Ulang</span>
        </button>
      </div>

      {/* Automated Monthly Executive Summary Card */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800'
            : 'bg-gradient-to-br from-white via-emerald-50/40 to-slate-50 border-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                Skor Kesehatan Keuangan
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {summary.transactionCount === 0
                  ? 'Siap Menganalisis Transaksi'
                  : aiAnalysis?.statusLabel || 'Kondisi Finansial Stabil'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {summary.transactionCount === 0 ? '—' : aiAnalysis?.healthScore || 85}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              {summary.transactionCount === 0 ? '' : '/100'}
            </span>
          </div>
        </div>

        {/* Narrative analysis text */}
        <div className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
          {isLoadingAI ? (
            <div className="py-4 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Gemini AI sedang merangkum laporan bulananmu...</span>
            </div>
          ) : (
            <p>
              {summary.transactionCount === 0
                ? `Belum ada transaksi di bulan ${formatMonthLabel(
                    selectedMonth
                  )}. AI CatatAja siap menganalisis kesehatan keuangan, menghitung rasio 50/30/20, dan menyajikan ringkasan eksekutif begitu kamu mulai mencatat transaksi pertamamu.`
                : aiAnalysis?.summaryNarrative ||
                  `Pada bulan ${formatMonthLabel(
                    selectedMonth
                  )}, rasio tabunganmu mencapai ${summary.savingsRate}%. Arus kas surplus terkendali dengan porsi kebutuhan dasar sebesar ${
                    summary.needsPct
                  }%. Evaluasi perbandingan menunjukkan pola belanja yang dapat dioptimalkan pada pos rekreasi dan jajan harian.`}
            </p>
          )}

          {aiAnalysis?.highlightQuote && summary.transactionCount > 0 && (
            <blockquote className="p-2.5 rounded-xl bg-emerald-500/10 border-l-2 border-emerald-500 text-[11px] text-emerald-800 dark:text-emerald-300 italic font-medium">
              "{aiAnalysis.highlightQuote}"
            </blockquote>
          )}
        </div>

        {/* Actionable points */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {summary.transactionCount === 0 ? 'Langkah Memulai:' : '3 Rekomendasi Utama Bulan Ini:'}
          </span>
          {(summary.transactionCount === 0
            ? [
                'Gunakan tombol suara di bagian bawah untuk mencatat transaksi tanpa ngetik.',
                'Catat pemasukan bulanan untuk memetakan matriks 50/30/20 secara otomatis.',
                'Data tersinkronisasi instan ke laptop/tablet via Sync Room.',
              ]
            : aiAnalysis?.actionablePoints || [
                'Sisihkan 20% dana darurat di awal gajian.',
                'Terapkan batas maksimal belanja kopi 2x seminggu.',
                'Pantau perbandingan pengeluaran mingguan di dashboard.',
              ]
          ).map((pt, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Opportunities Header & CTA */}
      <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
              Peluang Penghematan Terdeteksi
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {formatRupiah(totalPotentialSavings)} / bulan
            </span>
          </div>
        </div>

        <button
          onClick={fetchAISavingRecommendations}
          disabled={isLoadingRecs}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoadingRecs ? 'animate-spin' : ''}`} />
          <span>Gali Pola AI</span>
        </button>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Rekomendasi Berdasarkan Pola Belanja Kamu ({recommendations.length})
        </h3>

        {recommendations.map((rec) => {
          const isBookmarked = bookmarkedIds.has(rec.id);
          return (
            <div
              key={rec.id}
              className={`p-4 rounded-3xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                      rec.urgency === 'tinggi'
                        ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                        : rec.urgency === 'sedang'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    Prioritas {rec.urgency}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Hemat ~{formatRupiah(rec.potentialSavingsMonthly)}/bln
                  </span>
                </div>

                <button
                  onClick={() => toggleBookmark(rec.id)}
                  aria-label="Simpan rekomendasi"
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">{rec.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{rec.description}</p>

              {/* Actionable tip pill */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/15 flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px]">
                    Langkah Nyata:
                  </span>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">{rec.actionableTip}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
