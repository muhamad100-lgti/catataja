import React, { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Edit2,
  Plus,
  Mic,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Upload,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import { Transaction, TransactionType } from '../types';
import { formatRupiah, formatMonthLabel, formatClassificationLabel } from '../utils/finance';
import { ALL_CATEGORIES } from '../constants/categories';

interface TransactionListViewProps {
  selectedMonth: string;
  onOpenManualModal: (tx?: Transaction) => void;
  onOpenVoiceModal: () => void;
  onOpenExportImport: (tab: 'export' | 'import') => void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  selectedMonth,
  onOpenManualModal,
  onOpenVoiceModal,
  onOpenExportImport,
}) => {
  const { theme } = useTheme();
  const { transactions, deleteTransaction } = useSync();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (!t.date.startsWith(selectedMonth)) return false;
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const descMatch = t.description.toLowerCase().includes(query);
          const catMatch = t.categoryName.toLowerCase().includes(query);
          const amountMatch = t.amount.toString().includes(query);
          if (!descMatch && !catMatch && !amountMatch) return false;
        }

        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [transactions, selectedMonth, filterType, filterCategory, searchQuery]);

  const totalFilteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalFilteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Top Title & Primary Actions (uncluttered single row) */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
            Riwayat Transaksi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Periode: {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenVoiceModal}
            aria-label="Catat Suara"
            className="h-9 px-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Suara AI</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenManualModal()}
            className="h-9 px-3 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs hover:bg-emerald-600 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi, kopi, gaji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              } outline-none focus:border-emerald-500`}
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenExportImport('export')}
            aria-label="Ekspor Transaksi"
            className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Ekspor JSON / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ekspor</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenExportImport('import')}
            aria-label="Impor Transaksi"
            className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Impor JSON / CSV"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>Impor</span>
          </button>
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`h-8 px-3 rounded-xl font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-emerald-500 text-white shadow-2xs'
                : theme === 'dark'
                ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Semua ({filteredTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expense')}
            className={`h-8 px-3 rounded-xl font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              filterType === 'expense'
                ? 'bg-rose-500 text-white shadow-2xs'
                : theme === 'dark'
                ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setFilterType('income')}
            className={`h-8 px-3 rounded-xl font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : theme === 'dark'
                ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Pemasukan
          </button>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter berdasarkan Kategori"
            className={`h-8 px-2.5 rounded-xl font-medium shrink-0 border text-xs cursor-pointer outline-none ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">Semua Kategori</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtered Summary Card */}
      <div
        className={`p-3.5 rounded-2xl border text-xs grid grid-cols-2 gap-3 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            Total Pengeluaran Filter
          </span>
          <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatRupiah(totalFilteredExpense)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
            Total Pemasukan Filter
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatRupiah(totalFilteredIncome)}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div
            className={`text-center py-10 px-4 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-slate-900/30 border-slate-800 text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Tidak ada transaksi yang cocok
            </p>
            <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">
              Tambahkan transaksi baru atau impor data backup JSON/CSV Anda.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = ALL_CATEGORIES.find((c) => c.id === tx.category);
            return (
              <div
                key={tx.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between group ${
                  theme === 'dark'
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                    style={{ backgroundColor: cat?.color || '#64748b' }}
                  >
                    {tx.type === 'income' ? (
                      <ArrowDownLeft className="w-5 h-5 text-emerald-100" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-rose-100" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                      {tx.description}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      <span className="truncate">{tx.categoryName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{tx.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase font-semibold shrink-0">{tx.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block tabular-nums ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {formatClassificationLabel(tx.classification)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenManualModal(tx)}
                      aria-label={`Edit ${tx.description}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      aria-label={`Hapus ${tx.description}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
