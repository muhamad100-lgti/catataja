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

import {
  exportTransactionsToJson,
  exportTransactionsToCsv,
  parseImportedData,
} from './dataTransfer';

test('exportTransactionsToJson and parseImportedData round-trip JSON transactions', () => {
  const sample: Transaction[] = [
    {
      id: 'tx-json-1',
      type: 'income',
      amount: 8500000,
      category: 'gaji',
      categoryName: 'Gaji Utama',
      description: 'Gaji Oktober',
      date: '2026-10-01',
      paymentMethod: 'transfer',
      classification: 'savings',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'tx-json-2',
      type: 'expense',
      amount: 35000,
      category: 'makanan',
      categoryName: 'Makanan & Minuman',
      description: 'Bakso Malang',
      date: '2026-10-02',
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  const jsonStr = exportTransactionsToJson(sample, 'catataja-utama');
  const parsed = parseImportedData(jsonStr);
  assert.equal(parsed.format, 'json');
  assert.equal(parsed.transactions.length, 2);
  assert.equal(parsed.transactions[0].amount, 8500000);
  assert.equal(parsed.transactions[1].description, 'Bakso Malang');
});

test('exportTransactionsToCsv and parseImportedData round-trip CSV transactions', () => {
  const sample: Transaction[] = [
    {
      id: 'tx-csv-1',
      type: 'expense',
      amount: 25000,
      category: 'kopi_jajan',
      categoryName: 'Kopi & Jajan',
      description: 'Kopi Kenangan, Mall',
      date: '2026-10-03',
      paymentMethod: 'qris',
      classification: 'wants',
      createdAt: 3000,
      updatedAt: 3000,
    },
  ];

  const csvStr = exportTransactionsToCsv(sample);
  const parsed = parseImportedData(csvStr);
  assert.equal(parsed.format, 'csv');
  assert.equal(parsed.transactions.length, 1);
  assert.equal(parsed.transactions[0].amount, 25000);
  assert.equal(parsed.transactions[0].category, 'kopi_jajan');
  assert.equal(parsed.transactions[0].description, 'Kopi Kenangan, Mall');
});

