export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'tunai' | 'qris' | 'transfer' | 'kartu';

export type BudgetClassification = 'needs' | 'wants' | 'savings';

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  defaultClassification: BudgetClassification;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  categoryName: string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  classification: BudgetClassification;
  createdAt: number;
  updatedAt: number;
  synced?: boolean;
}

export interface BudgetGoal {
  category: string;
  monthlyLimit: number;
}

export interface MonthlySummary {
  monthKey: string; // YYYY-MM
  monthName: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  savingsRate: number; // percentage (0-100)
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  transactionCount: number;
  categoryExpenses: Record<string, { total: number; count: number; name: string }>;
  aiInsight?: string;
}

export interface MonthComparison {
  currentMonthKey: string;
  previousMonthKey: string;
  currentMonthName: string;
  previousMonthName: string;
  incomeCurrent: number;
  incomePrevious: number;
  incomeDiff: number;
  incomeDiffPct: number;
  expenseCurrent: number;
  expensePrevious: number;
  expenseDiff: number;
  expenseDiffPct: number;
  netCurrent: number;
  netPrevious: number;
  categoryComparisons: Array<{
    category: string;
    name: string;
    current: number;
    previous: number;
    diff: number;
    diffPct: number;
    trend: 'up' | 'down' | 'equal';
  }>;
}

export interface SavingRecommendation {
  id: string;
  title: string;
  description: string;
  potentialSavingsMonthly: number;
  category: string;
  urgency: 'tinggi' | 'sedang' | 'info';
  actionableTip: string;
  createdAt: number;
  isRead?: boolean;
}

export interface SyncMessage {
  type: 'init' | 'transaction:created' | 'transaction:updated' | 'transaction:deleted' | 'ping';
  roomId: string;
  data?: any;
  timestamp: number;
}
