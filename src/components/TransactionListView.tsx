import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Edit2, Plus, Mic, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import { Transaction, TransactionType } from '../types';
import { formatRupiah, formatMonthLabel } from '../utils/finance';
import { ALL_CATEGORIES } from '../constants/categories';

interface TransactionListViewProps {
  selectedMonth: string;
  onOpenManualModal: (tx?: Transaction) => void;
  onOpenVoiceModal: () => void;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  selectedMonth,
  onOpenManualModal,
  onOpenVoiceModal,
}) => {
  const { theme } = useTheme();
  const { transactions, deleteTransaction } = useSync();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month match
      if (!t.date.startsWith(selectedMonth)) return false;

      // Type match
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Category match
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(query);
        const catMatch = t.categoryName.toLowerCase().includes(query);
        const amountMatch = t.amount.toString().includes(query);
        if (!descMatch && !catMatch && !amountMatch) return false;
      }

      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [transactions, selectedMonth, filterType, filterCategory, searchQuery]);

  // Aggregate for current filtered view
  const totalFilteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalFilteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Top Title & Quick Add */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base">Riwayat Transaksi</h2>
          <p className="text-xs text-slate-400">Periode: {formatMonthLabel(selectedMonth)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenVoiceModal}
            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
            title="Catat Suara"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenManualModal()}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/30 hover:bg-emerald-600 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi, kopi, gaji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs border transition-colors ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            } outline-none focus:border-emerald-500`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-800/40 text-slate-400 hover:text-white'
            }`}
          >
            Semua ({filteredTransactions.length})
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all cursor-pointer ${
              filterType === 'expense'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-800/40 text-slate-400 hover:text-white'
            }`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all cursor-pointer ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/40 text-slate-400 hover:text-white'
            }`}
          >
            Pemasukan
          </button>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter berdasarkan Kategori"
            className={`px-2.5 py-1.5 rounded-xl font-medium shrink-0 border text-xs cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-white border-slate-300 text-slate-700'
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
        className={`p-3 rounded-2xl border text-xs grid grid-cols-2 gap-2 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div>
          <span className="text-[10px] text-slate-400 block">Total Pengeluaran Filter:</span>
          <span className="font-bold text-rose-400">{formatRupiah(totalFilteredExpense)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Total Pemasukan Filter:</span>
          <span className="font-bold text-emerald-400">{formatRupiah(totalFilteredIncome)}</span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-xs font-semibold">Tidak ada transaksi yang cocok</p>
            <p className="text-[11px] mt-1 text-slate-500">
              Coba sesuaikan kata kunci pencarian atau ubah filter
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
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: cat?.color || '#64748b' }}
                  >
                    {tx.type === 'income' ? (
                      <ArrowDownLeft className="w-5 h-5 text-emerald-100" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-rose-100" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-100 block line-clamp-1">
                      {tx.description}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{tx.categoryName}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold">{tx.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold">
                      {tx.classification}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onOpenManualModal(tx)}
                      aria-label="Edit transaksi"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      aria-label="Hapus transaksi"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
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
