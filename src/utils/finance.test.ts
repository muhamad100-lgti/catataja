import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah,
  formatCompactRupiah,
  getCurrentMonthKey,
  getPreviousMonthKey,
  calculateMonthlySummary,
  compareMonths,
  generateSavingRecommendations,
} from './finance';
import { Transaction } from '../types';

test('formatRupiah formats Indonesian currency with dot separators', () => {
  assert.equal(formatRupiah(25000), 'Rp 25.000');
  assert.equal(formatRupiah(1500000), 'Rp 1.500.000');
  assert.equal(formatRupiah(0), 'Rp 0');
});

test('formatCompactRupiah formats compact numbers correctly', () => {
  assert.equal(formatCompactRupiah(2500000), 'Rp 2,5 jt');
  assert.equal(formatCompactRupiah(50000), 'Rp 50 rb');
  assert.equal(formatCompactRupiah(1200000000), 'Rp 1,2 M');
});

test('getPreviousMonthKey decrements month and wraps year', () => {
  assert.equal(getPreviousMonthKey('2026-10'), '2026-09');
  assert.equal(getPreviousMonthKey('2026-01'), '2025-12');
});

test('calculateMonthlySummary aggregates income, expenses and 50-30-20 categories', () => {
  const sampleTransactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      amount: 10000000,
      category: 'gaji',
      categoryName: 'Gaji Utama',
      description: 'Gaji Bulanan',
      date: '2026-10-01',
      paymentMethod: 'transfer',
      classification: 'savings',
      createdAt: 100,
      updatedAt: 100,
    },
    {
      id: '2',
      type: 'expense',
      amount: 4000000,
      category: 'makanan',
      categoryName: 'Makanan & Minuman',
      description: 'Makan Pokok',
      date: '2026-10-05',
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: 101,
      updatedAt: 101,
    },
    {
      id: '3',
      type: 'expense',
      amount: 2000000,
      category: 'belanja',
      categoryName: 'Belanja & Lifestyle',
      description: 'Pakaian & Gadget',
      date: '2026-10-10',
      paymentMethod: 'kartu',
      classification: 'wants',
      createdAt: 102,
      updatedAt: 102,
    },
  ];

  const summary = calculateMonthlySummary(sampleTransactions, '2026-10');
  assert.equal(summary.totalIncome, 10000000);
  assert.equal(summary.totalExpense, 6000000);
  assert.equal(summary.netCashflow, 4000000);
  assert.equal(summary.savingsRate, 40);
  assert.equal(summary.needsAmount, 4000000);
  assert.equal(summary.wantsAmount, 2000000);
  assert.equal(summary.needsPct, 40);
  assert.equal(summary.wantsPct, 20);
});

test('compareMonths correctly computes differences between two months', () => {
  const transactions: Transaction[] = [
    {
      id: 'm1',
      type: 'expense',
      amount: 3000000,
      category: 'makanan',
      categoryName: 'Makanan & Minuman',
      description: 'Makan',
      date: '2026-09-15',
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: 10,
      updatedAt: 10,
    },
    {
      id: 'm2',
      type: 'expense',
      amount: 4500000,
      category: 'makanan',
      categoryName: 'Makanan & Minuman',
      description: 'Makan',
      date: '2026-10-15',
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: 20,
      updatedAt: 20,
    },
  ];

  const comp = compareMonths(transactions, '2026-10', '2026-09');
  assert.equal(comp.expenseCurrent, 4500000);
  assert.equal(comp.expensePrevious, 3000000);
  assert.equal(comp.expenseDiff, 1500000);
  assert.equal(comp.expenseDiffPct, 50); // +50% increase
});
