import { CategoryInfo } from '../types';

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'makanan',
    name: 'Makanan & Minuman',
    icon: 'Utensils',
    color: '#f97316', // orange
    type: 'expense',
    defaultClassification: 'needs',
  },
  {
    id: 'kopi_jajan',
    name: 'Kopi & Jajan',
    icon: 'Coffee',
    color: '#eab308', // amber
    type: 'expense',
    defaultClassification: 'wants',
  },
  {
    id: 'transport',
    name: 'Transportasi & Bensin',
    icon: 'Car',
    color: '#06b6d4', // cyan
    type: 'expense',
    defaultClassification: 'needs',
  },
  {
    id: 'belanja',
    name: 'Belanja & Lifestyle',
    icon: 'ShoppingBag',
    color: '#ec4899', // pink
    type: 'expense',
    defaultClassification: 'wants',
  },
  {
    id: 'tagihan',
    name: 'Tagihan & Utilitas',
    icon: 'Receipt',
    color: '#8b5cf6', // purple
    type: 'expense',
    defaultClassification: 'needs',
  },
  {
    id: 'hiburan',
    name: 'Hiburan & Streaming',
    icon: 'Film',
    color: '#a855f7', // violet
    type: 'expense',
    defaultClassification: 'wants',
  },
  {
    id: 'kesehatan',
    name: 'Kesehatan & Obat',
    icon: 'HeartPulse',
    color: '#ef4444', // red
    type: 'expense',
    defaultClassification: 'needs',
  },
  {
    id: 'pendidikan',
    name: 'Pendidikan & Buku',
    icon: 'GraduationCap',
    color: '#3b82f6', // blue
    type: 'expense',
    defaultClassification: 'needs',
  },
  {
    id: 'amal',
    name: 'Donasi & Sedekah',
    icon: 'HeartHandshake',
    color: '#10b981', // emerald
    type: 'expense',
    defaultClassification: 'wants',
  },
  {
    id: 'lainnya_keluar',
    name: 'Pengeluaran Lainnya',
    icon: 'MoreHorizontal',
    color: '#64748b', // slate
    type: 'expense',
    defaultClassification: 'wants',
  },
];

export const INCOME_CATEGORIES: CategoryInfo[] = [
  {
    id: 'gaji',
    name: 'Gaji Utama',
    icon: 'Wallet',
    color: '#10b981', // emerald
    type: 'income',
    defaultClassification: 'savings',
  },
  {
    id: 'freelance',
    name: 'Freelance & Side Job',
    icon: 'Briefcase',
    color: '#14b8a6', // teal
    type: 'income',
    defaultClassification: 'savings',
  },
  {
    id: 'bisnis',
    name: 'Hasil Bisnis/Usaha',
    icon: 'Store',
    color: '#3b82f6', // blue
    type: 'income',
    defaultClassification: 'savings',
  },
  {
    id: 'investasi',
    name: 'Dividen & Investasi',
    icon: 'TrendingUp',
    color: '#8b5cf6', // purple
    type: 'income',
    defaultClassification: 'savings',
  },
  {
    id: 'bonus',
    name: 'Bonus & Hadiah',
    icon: 'Gift',
    color: '#f59e0b', // amber
    type: 'income',
    defaultClassification: 'savings',
  },
  {
    id: 'lainnya_masuk',
    name: 'Pemasukan Lainnya',
    icon: 'PlusCircle',
    color: '#64748b', // slate
    type: 'income',
    defaultClassification: 'savings',
  },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryById(id: string): CategoryInfo {
  const found = ALL_CATEGORIES.find((c) => c.id === id);
  if (found) return found;
  return {
    id: 'lainnya',
    name: 'Lainnya',
    icon: 'HelpCircle',
    color: '#64748b',
    type: 'expense',
    defaultClassification: 'wants',
  };
}
