import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, CreditCard, Tag } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { Transaction, TransactionType, PaymentMethod, BudgetClassification } from '../types';
import { formatRupiah } from '../utils/finance';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: {
    type: TransactionType;
    amount: number;
    category: string;
    categoryName: string;
    description: string;
    date: string;
    paymentMethod: PaymentMethod;
    classification: BudgetClassification;
  }) => Promise<any>;
  initialData?: Transaction | null;
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { theme } = useTheme();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('makanan');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [classification, setClassification] = useState<BudgetClassification>('needs');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDescription(initialData.description);
      setDate(initialData.date);
      setPaymentMethod(initialData.paymentMethod);
      setClassification(initialData.classification);
    } else {
      setType('expense');
      setAmount('');
      setCategory('makanan');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('qris');
      setClassification('needs');
    }
  }, [initialData, isOpen]);

  const handleCategoryChange = (newCatId: string) => {
    setCategory(newCatId);
    const catList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const cat = catList.find((c) => c.id === newCatId);
    if (cat) {
      setClassification(cat.defaultClassification);
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const defaultCat = newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
    setCategory(defaultCat.id);
    setClassification(defaultCat.defaultClassification);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!num || num <= 0) return;

    const catList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const cat = catList.find((c) => c.id === category) || catList[0];

    await onSave({
      type,
      amount: num,
      category,
      categoryName: cat.name,
      description: description.trim() || cat.name,
      date,
      paymentMethod,
      classification,
    });

    onClose();
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <h2 className="font-bold text-base">
            {initialData ? 'Ubah Transaksi' : 'Tambah Transaksi Manual'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Income vs Expense Toggle */}
          <div
            className={`grid grid-cols-2 p-1 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pengeluaran (-)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pemasukan (+)
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Nominal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="number"
                required
                min="1"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl text-lg font-bold border transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                } outline-none`}
              />
            </div>
            {numAmount > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block tabular-nums">
                {formatRupiah(numAmount)}
              </span>
            )}
          </div>

          {/* Category selection */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Kategori</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer flex items-center gap-2 ${
                    category === cat.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                      : theme === 'dark'
                      ? 'border-slate-800 bg-slate-800/30 text-slate-300 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Keterangan / Catatan
            </label>
            <input
              type="text"
              placeholder="Contoh: Belanja Mingguan Superindo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs border ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              } outline-none focus:border-emerald-500`}
            />
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Tanggal</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                } outline-none`}
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                <span>Pembayaran</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className={`w-full px-3 py-2 rounded-xl text-xs border uppercase ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                } outline-none`}
              >
                <option value="qris">QRIS</option>
                <option value="tunai">Tunai / Cash</option>
                <option value="transfer">Transfer Bank</option>
                <option value="kartu">Kartu Debit/Kredit</option>
              </select>
            </div>
          </div>

          {/* 50/30/20 Classification */}
          {type === 'expense' && (
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                Klasifikasi Matriks 50/30/20
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setClassification('needs')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                    classification === 'needs'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : theme === 'dark'
                      ? 'border-slate-800 text-slate-400'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Kebutuhan (50%)
                </button>
                <button
                  type="button"
                  onClick={() => setClassification('wants')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                    classification === 'wants'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : theme === 'dark'
                      ? 'border-slate-800 text-slate-400'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Keinginan (30%)
                </button>
                <button
                  type="button"
                  onClick={() => setClassification('savings')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                    classification === 'savings'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : theme === 'dark'
                      ? 'border-slate-800 text-slate-400'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Tabungan (20%)
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className="flex-2 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialData ? 'Simpan Perubahan' : 'Tambah Transaksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
