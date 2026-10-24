import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  PieChart,
  BarChart2,
  Layers,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import {
  calculateMonthlySummary,
  compareMonths,
  formatRupiah,
  getPreviousMonthKey,
  formatCompactRupiah,
  formatMonthLabel,
} from '../utils/finance';
import { ALL_CATEGORIES } from '../constants/categories';

interface MonthlyComparisonViewProps {
  selectedMonth: string;
}

export const MonthlyComparisonView: React.FC<MonthlyComparisonViewProps> = ({
  selectedMonth,
}) => {
  const { theme } = useTheme();
  const { transactions } = useSync();

  const [activeSubTab, setActiveSubTab] = useState<'comparison' | 'matrix'>('comparison');

  const prevMonthKey = getPreviousMonthKey(selectedMonth);
  const comparison = compareMonths(transactions, selectedMonth, prevMonthKey);
  const currentSummary = calculateMonthlySummary(transactions, selectedMonth);
  const previousSummary = calculateMonthlySummary(transactions, prevMonthKey);

  // Payment method breakdown for the matrix
  const currentMonthTx = transactions.filter((t) => t.date.startsWith(selectedMonth));
  const paymentMethodMatrix = ['qris', 'tunai', 'transfer', 'kartu'].map((method) => {
    const list = currentMonthTx.filter((t) => t.paymentMethod === method);
    const expense = list.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const count = list.length;
    return { method, expense, count };
  });

  return (
    <div className="p-4 space-y-4">
      {/* Sub Tabs Selector */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-800/40 dark:bg-slate-900 border border-slate-700/60">
        <button
          onClick={() => setActiveSubTab('comparison')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'comparison'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Bandingkan Bulan</span>
        </button>
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'matrix'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriks Arus Kas</span>
        </button>
      </div>

      {transactions.length === 0 && (
        <div
          className={`p-4 rounded-2xl border text-center ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Belum Ada Transaksi Tercatat
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Mulai catat pemasukan dan pengeluaran lewat tombol mikrofon/tambah di bawah agar grafik perbandingan terisi otomatis.
          </p>
        </div>
      )}

      {activeSubTab === 'comparison' ? (
        /* ================= SUB-TAB 1: PERBANDINGAN BULAN INI VS BULAN KEMARIN ================= */
        <div className="space-y-4">
          {/* Header period notice */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>Perbandingan Bulan Ini vs Kemarin:</span>
            <span className="text-emerald-400">
              {comparison.currentMonthName} vs {comparison.previousMonthName}
            </span>
          </div>

          {/* Side-by-side Grand Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Expense Comparison */}
            <div
              className={`p-4 rounded-3xl border ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Pengeluaran
              </span>
              <div className="text-base sm:text-lg font-extrabold text-slate-100">
                {formatCompactRupiah(comparison.expenseCurrent)}
              </div>
              <span className="text-[10px] text-slate-400 block mb-2">
                Bulan lalu: {formatCompactRupiah(comparison.expensePrevious)}
              </span>

              {/* Difference Badge */}
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                  comparison.expenseDiff <= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {comparison.expenseDiff <= 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                <span>
                  {comparison.expenseDiff <= 0 ? 'Hemat ' : 'Naik +'}
                  {Math.abs(comparison.expenseDiffPct)}%
                </span>
              </div>
            </div>

            {/* Total Income Comparison */}
            <div
              className={`p-4 rounded-3xl border ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Pemasukan
              </span>
              <div className="text-base sm:text-lg font-extrabold text-emerald-400">
                {formatCompactRupiah(comparison.incomeCurrent)}
              </div>
              <span className="text-[10px] text-slate-400 block mb-2">
                Bulan lalu: {formatCompactRupiah(comparison.incomePrevious)}
              </span>

              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                  comparison.incomeDiff >= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {comparison.incomeDiff >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {comparison.incomeDiff >= 0 ? '+' : ''}
                  {comparison.incomeDiffPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Visual Delta Bar Comparison */}
          <div
            className={`p-4 rounded-3xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="font-bold text-xs">Visualisasi Perbandingan Belanja</h3>

            {/* Current month bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-400">
                  {comparison.currentMonthName} (Bulan Ini)
                </span>
                <span className="font-bold">{formatRupiah(comparison.expenseCurrent)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        (comparison.expenseCurrent /
                          (Math.max(comparison.expenseCurrent, comparison.expensePrevious) || 1)) *
                          100
                      )
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Previous month bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">{comparison.previousMonthName} (Bulan Kemarin)</span>
                <span className="font-bold text-slate-300">{formatRupiah(comparison.expensePrevious)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        (comparison.expensePrevious /
                          (Math.max(comparison.expenseCurrent, comparison.expensePrevious) || 1)) *
                          100
                      )
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Per-Category Comparison Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Rincian Perbandingan Tiap Kategori
            </h3>

            {comparison.categoryComparisons.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border rounded-2xl">
                Belum ada data pengeluaran kategori yang cukup untuk dibandingkan.
              </div>
            ) : (
              <div className="space-y-2">
                {comparison.categoryComparisons.map((catComp) => {
                  const cat = ALL_CATEGORIES.find((c) => c.id === catComp.category);
                  const isSaved = catComp.diff <= 0;

                  return (
                    <div
                      key={catComp.category}
                      className={`p-3 rounded-2xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-900/60 border-slate-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat?.color || '#64748b' }}
                          ></span>
                          <span className="text-xs font-bold text-slate-100">{catComp.name}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-100 block">
                            {formatRupiah(catComp.current)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              isSaved ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isSaved ? 'Turun ' : 'Naik +'}
                            {catComp.diffPct}% ({formatCompactRupiah(Math.abs(catComp.diff))})
                          </span>
                        </div>
                      </div>

                      {/* Mini visual indicator */}
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Bulan lalu: {formatRupiah(catComp.previous)}</span>
                        <span>{isSaved ? '🟢 Terkendali' : '🔴 Meningkat'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= SUB-TAB 2: MATRIKS PEMASUKAN DAN PENGELUARAN ================= */
        <div className="space-y-4">
          {/* Section 1: Matriks 50/30/20 Framework */}
          <div
            className={`p-5 rounded-3xl border space-y-4 ${
              theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs sm:text-sm">Matriks 50/30/20 Evaluasi Keuangan</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Standar Finansial
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Memetakan pengeluaran ke dalam 3 kuadran esensial: 50% Kebutuhan Pokok, 30% Keinginan &
              Gaya Hidup, serta 20% Tabungan/Investasi.
            </p>

            {/* Matrix cards grid */}
            <div className="space-y-3">
              {/* Needs card */}
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-blue-400">1. Kebutuhan Pokok (Needs)</span>
                  <span className="font-bold text-slate-100">
                    {currentSummary.needsPct}% (Target 50%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, currentSummary.needsPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nominal: {formatRupiah(currentSummary.needsAmount)}</span>
                  <span>
                    {currentSummary.needsPct <= 55 ? '✅ Sesuai Target' : '⚠️ Melebihi Porsi'}
                  </span>
                </div>
              </div>

              {/* Wants card */}
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-purple-400">2. Keinginan & Rekreasi (Wants)</span>
                  <span className="font-bold text-slate-100">
                    {currentSummary.wantsPct}% (Target 30%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, currentSummary.wantsPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nominal: {formatRupiah(currentSummary.wantsAmount)}</span>
                  <span>
                    {currentSummary.wantsPct <= 35 ? '✅ Aman' : '🔴 Perlu Ditekan'}
                  </span>
                </div>
              </div>

              {/* Savings card */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-emerald-400">3. Tabungan & Investasi (Savings)</span>
                  <span className="font-bold text-slate-100">
                    {currentSummary.savingsPct}% (Target 20%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, currentSummary.savingsPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Sisa Tabungan: {formatRupiah(Math.max(0, currentSummary.netCashflow))}</span>
                  <span>
                    {currentSummary.savingsPct >= 20 ? '🌟 Sangat Bagus' : '⚡ Perlu Ditingkatkan'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Matriks 4-Kuadran Pengeluaran */}
          <div
            className={`p-5 rounded-3xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs sm:text-sm">Matriks 4-Kuadran Arus Kas</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Q1 */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">
                  Kuadran I: Esensial Rutin
                </span>
                <p className="text-[11px] text-slate-300 font-semibold mb-1">Kost, Makan, Listrik</p>
                <span className="text-xs font-bold text-slate-100">
                  {formatRupiah(currentSummary.needsAmount)}
                </span>
              </div>

              {/* Q2 */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">
                  Kuadran II: Investasi Masa Depan
                </span>
                <p className="text-[11px] text-slate-300 font-semibold mb-1">Tabungan & Edukasi</p>
                <span className="text-xs font-bold text-slate-100">
                  {formatRupiah(Math.max(0, currentSummary.netCashflow))}
                </span>
              </div>

              {/* Q3 */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-[10px] font-bold text-purple-400 uppercase block mb-1">
                  Kuadran III: Rekreasi & Gaya Hidup
                </span>
                <p className="text-[11px] text-slate-300 font-semibold mb-1">Kopi, Nonton, Belanja</p>
                <span className="text-xs font-bold text-slate-100">
                  {formatRupiah(currentSummary.wantsAmount)}
                </span>
              </div>

              {/* Q4 */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                  Kuadran IV: Biaya Tak Terduga
                </span>
                <p className="text-[11px] text-slate-300 font-semibold mb-1">Obat, Service, Admin</p>
                <span className="text-xs font-bold text-slate-100">
                  {formatRupiah(currentSummary.categoryExpenses['kesehatan']?.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Matriks Metode Pembayaran */}
          <div
            className={`p-5 rounded-3xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs sm:text-sm">Matriks Kanal Pembayaran</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {paymentMethodMatrix.map((item) => (
                <div
                  key={item.method}
                  className="p-3 rounded-2xl bg-slate-800/30 border border-slate-800"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    {item.method === 'qris'
                      ? '📱 QRIS'
                      : item.method === 'tunai'
                      ? '💵 Tunai'
                      : item.method === 'transfer'
                      ? '🏦 Transfer Bank'
                      : '💳 Kartu'}
                  </span>
                  <span className="text-xs font-bold text-slate-100 block">
                    {formatRupiah(item.expense)}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.count} Transaksi</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
