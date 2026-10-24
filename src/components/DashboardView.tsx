import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Mic,
  Plus,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  PieChart,
  Calendar,
  Download,
  Upload,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import {
  calculateMonthlySummary,
  compareMonths,
  formatRupiah,
  getPreviousMonthKey,
  formatMonthLabel,
} from '../utils/finance';
import { Transaction } from '../types';
import { ALL_CATEGORIES } from '../constants/categories';

interface DashboardViewProps {
  selectedMonth: string;
  onChangeMonth: (m: string) => void;
  onOpenVoiceModal: () => void;
  onOpenManualModal: () => void;
  onOpenExportImport: (tab: 'export' | 'import') => void;
  onNavigateToTab: (tab: 'beranda' | 'transaksi' | 'matriks' | 'ai' | 'sync') => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedMonth,
  onChangeMonth,
  onOpenVoiceModal,
  onOpenManualModal,
  onOpenExportImport,
  onNavigateToTab,
  onSelectTransaction,
}) => {
  const { theme } = useTheme();
  const { transactions } = useSync();

  const prevMonth = getPreviousMonthKey(selectedMonth);
  const summary = calculateMonthlySummary(transactions, selectedMonth);
  const comparison = compareMonths(transactions, selectedMonth, prevMonth);

  // Recent transactions for this month
  const monthTransactions = transactions
    .filter((t) => t.date.startsWith(selectedMonth))
    .sort((a, b) => b.createdAt - a.createdAt);

  // Month navigation options (current, prev 4 months)
  const availableMonths = [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date();
    d.setMonth(d.getMonth() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Periode Pembukuan:</span>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => onChangeMonth(e.target.value)}
          aria-label="Pilih Periode Bulan"
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-white hover:border-slate-700'
              : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
          }`}
        >
          {availableMonths.map((mKey) => (
            <option key={mKey} value={mKey}>
              {formatMonthLabel(mKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Main Financial Balance Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-xl shadow-emerald-950/20">
        <div className="flex items-center justify-between text-xs text-emerald-100/90 font-medium mb-1">
          <span>Arus Kas Bersih (Sisa Dana)</span>
          <span className="text-[11px] font-semibold text-emerald-100">
            {formatMonthLabel(selectedMonth)}
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
          {formatRupiah(summary.netCashflow)}
        </div>

        {/* Savings rate info */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="font-semibold text-emerald-200 tabular-nums">
            Rasio Simpanan: {summary.savingsRate}%
          </span>
          <span aria-hidden="true" className="text-emerald-200/50">·</span>
          {summary.netCashflow >= 0 ? (
            <span className="text-[11px] text-emerald-100">Arus Kas Surplus</span>
          ) : (
            <span className="text-[11px] text-rose-300 font-semibold">Defisit Waspada</span>
          )}
        </div>

        {/* Sub-metrics: Pemasukan & Pengeluaran */}
        <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-emerald-300 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-100/80 block">Pemasukan</span>
              <span className="text-sm font-bold tracking-tight tabular-nums">
                {formatRupiah(summary.totalIncome)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-rose-300 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-100/80 block">Pengeluaran</span>
              <span className="text-sm font-bold tracking-tight text-rose-200 tabular-nums">
                {formatRupiah(summary.totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons (Voice Input & Manual) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenVoiceModal}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-600/15 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow group-hover:scale-105 transition-transform shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block font-bold text-slate-900 dark:text-slate-100">Catat Suara AI</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Bicara tanpa ngetik
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenManualModal}
          className={`p-3.5 rounded-2xl border font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs group ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="block font-bold text-slate-900 dark:text-slate-100">Catat Manual</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
              Ketik form lengkap
            </span>
          </div>
        </button>
      </div>

      {/* Quick Export & Import Data Bar */}
      <div
        className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
          theme === 'dark'
            ? 'bg-slate-900/60 border-slate-800'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="min-w-0">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
            Cadangkan & Pulihkan Data
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
            Ekspor atau impor file JSON & CSV (Excel)
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenExportImport('export')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-white border-slate-300 text-emerald-700 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenExportImport('import')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor</span>
          </button>
        </div>
      </div>

      {/* Month-over-Month Comparison Alert Widget */}
      <button
        type="button"
        onClick={() => onNavigateToTab('matriks')}
        aria-label="Buka perbandingan bulan ini dan kemarin"
        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
          comparison.expenseCurrent === 0 && comparison.expensePrevious === 0
            ? theme === 'dark'
              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
            : comparison.expenseDiff <= 0
            ? theme === 'dark'
              ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
              : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300'
            : theme === 'dark'
            ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
            : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              comparison.expenseCurrent === 0 && comparison.expensePrevious === 0
                ? 'bg-emerald-500/10 text-emerald-500'
                : comparison.expenseDiff <= 0
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-amber-500/20 text-amber-500'
            }`}
          >
            {comparison.expenseCurrent === 0 && comparison.expensePrevious === 0 ? (
              <PieChart className="w-5 h-5" />
            ) : comparison.expenseDiff <= 0 ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {comparison.expenseCurrent === 0 && comparison.expensePrevious === 0
                  ? 'Perbandingan Bulan Ini vs Kemarin'
                  : comparison.expenseDiff <= 0
                  ? `Pengeluaran Turun ${Math.abs(comparison.expenseDiffPct)}% vs Bulan Lalu`
                  : `Pengeluaran Naik +${comparison.expenseDiffPct}% vs Bulan Lalu`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {comparison.expenseCurrent === 0 && comparison.expensePrevious === 0
                ? 'Mulai catat transaksi untuk membandingkan performa pengeluaranmu'
                : comparison.expenseDiff <= 0
                ? `Berhasil menghemat ${formatRupiah(Math.abs(comparison.expenseDiff))} dibanding ${comparison.previousMonthName}`
                : `Lebih boros ${formatRupiah(comparison.expenseDiff)} dibanding ${comparison.previousMonthName}`}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </button>

      {/* 50/30/20 Matriks Snapshot Card */}
      <div
        className={`p-4 rounded-2xl border transition-colors ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <PieChart className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Matriks Alokasi Dana (50/30/20)</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('matriks')}
            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
          >
            <span>Detail Matriks</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Triple progress bar */}
        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${Math.min(100, summary.needsPct)}%` }}
            className="h-full bg-blue-500 transition-all duration-500"
            title={`Kebutuhan: ${summary.needsPct}%`}
          ></div>
          <div
            style={{ width: `${Math.min(100, summary.wantsPct)}%` }}
            className="h-full bg-purple-500 transition-all duration-500"
            title={`Keinginan: ${summary.wantsPct}%`}
          ></div>
          <div
            style={{ width: `${Math.min(100, summary.savingsPct)}%` }}
            className="h-full bg-emerald-400 transition-all duration-500"
            title={`Tabungan: ${summary.savingsPct}%`}
          ></div>
        </div>

        {/* Legend */}
        <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            <div>
              <span className="block font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {summary.needsPct}%
              </span>
              <span className="text-[10px]">Kebutuhan (50%)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
            <div>
              <span className="block font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {summary.wantsPct}%
              </span>
              <span className="text-[10px]">Keinginan (30%)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <div>
              <span className="block font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {summary.savingsPct}%
              </span>
              <span className="text-[10px]">Tabungan (20%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Transaksi Terbaru ({monthTransactions.length})
          </h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('transaksi')}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Lihat Semua
          </button>
        </div>

        {monthTransactions.length === 0 ? (
          <div
            className={`p-8 text-center rounded-2xl border ${
              theme === 'dark'
                ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Belum ada transaksi di bulan ini
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Gunakan tombol suara di tengah bawah atau tombol Impor di atas untuk memasukkan data.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthTransactions.slice(0, 6).map((tx) => {
              const cat = ALL_CATEGORIES.find((c) => c.id === tx.category);
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    theme === 'dark'
                      ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                      style={{ backgroundColor: cat?.color || '#64748b' }}
                    >
                      {tx.categoryName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                        {tx.description}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{tx.categoryName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tx.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase font-medium">{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span
                      className={`text-xs font-bold block tabular-nums ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </span>
                    <span
                      className={`text-[10px] font-medium ${
                        tx.classification === 'needs'
                          ? 'text-blue-600 dark:text-blue-400'
                          : tx.classification === 'wants'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {tx.classification}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
