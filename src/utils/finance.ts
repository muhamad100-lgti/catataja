import { Transaction, MonthlySummary, MonthComparison, SavingRecommendation } from '../types';
import { EXPENSE_CATEGORIES } from '../constants/categories';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)} rb`;
  }
  return `${sign}Rp ${abs}`;
}

export function getCurrentMonthKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const mIndex = parseInt(monthStr, 10) - 1;
  const mName = INDO_MONTHS[mIndex] || monthStr;
  return `${mName} ${yearStr}`;
}

export function calculateMonthlySummary(transactions: Transaction[], monthKey: string): MonthlySummary {
  const filtered = transactions.filter((t) => t.date.startsWith(monthKey));

  let totalIncome = 0;
  let totalExpense = 0;
  let needsAmount = 0;
  let wantsAmount = 0;
  let savingsAmount = 0;

  const categoryExpenses: Record<string, { total: number; count: number; name: string }> = {};

  for (const t of filtered) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;

      if (t.classification === 'needs') {
        needsAmount += t.amount;
      } else if (t.classification === 'wants') {
        wantsAmount += t.amount;
      } else if (t.classification === 'savings') {
        savingsAmount += t.amount;
      }

      if (!categoryExpenses[t.category]) {
        categoryExpenses[t.category] = {
          total: 0,
          count: 0,
          name: t.categoryName || t.category,
        };
      }
      categoryExpenses[t.category].total += t.amount;
      categoryExpenses[t.category].count += 1;
    }
  }

  const netCashflow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netCashflow / totalIncome) * 100))) : 0;

  // 50/30/20 percentages relative to income (or relative to expense if income is 0)
  const baseForPct = totalIncome > 0 ? totalIncome : (totalExpense || 1);
  const needsPct = Math.round((needsAmount / baseForPct) * 100);
  const wantsPct = Math.round((wantsAmount / baseForPct) * 100);
  const actualSavings = Math.max(0, netCashflow) + savingsAmount;
  const savingsPct = Math.round((actualSavings / baseForPct) * 100);

  return {
    monthKey,
    monthName: formatMonthLabel(monthKey),
    totalIncome,
    totalExpense,
    netCashflow,
    savingsRate,
    needsAmount,
    wantsAmount,
    savingsAmount,
    needsPct,
    wantsPct,
    savingsPct,
    transactionCount: filtered.length,
    categoryExpenses,
  };
}

export function compareMonths(
  transactions: Transaction[],
  currentMonthKey: string,
  previousMonthKey: string
): MonthComparison {
  const currentSummary = calculateMonthlySummary(transactions, currentMonthKey);
  const previousSummary = calculateMonthlySummary(transactions, previousMonthKey);

  const incomeCurrent = currentSummary.totalIncome;
  const incomePrevious = previousSummary.totalIncome;
  const incomeDiff = incomeCurrent - incomePrevious;
  const incomeDiffPct = incomePrevious === 0 ? (incomeCurrent > 0 ? 100 : 0) : Math.round((incomeDiff / incomePrevious) * 100);

  const expenseCurrent = currentSummary.totalExpense;
  const expensePrevious = previousSummary.totalExpense;
  const expenseDiff = expenseCurrent - expensePrevious;
  const expenseDiffPct = expensePrevious === 0 ? (expenseCurrent > 0 ? 100 : 0) : Math.round((expenseDiff / expensePrevious) * 100);

  // Compare categories
  const allCatKeys = Array.from(
    new Set([
      ...Object.keys(currentSummary.categoryExpenses),
      ...Object.keys(previousSummary.categoryExpenses),
    ])
  );

  const categoryComparisons = allCatKeys.map((catKey) => {
    const cur = currentSummary.categoryExpenses[catKey]?.total || 0;
    const prev = previousSummary.categoryExpenses[catKey]?.total || 0;
    const name =
      currentSummary.categoryExpenses[catKey]?.name ||
      previousSummary.categoryExpenses[catKey]?.name ||
      EXPENSE_CATEGORIES.find((c) => c.id === catKey)?.name ||
      catKey;
    const diff = cur - prev;
    const diffPct = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round((diff / prev) * 100);

    let trend: 'up' | 'down' | 'equal' = 'equal';
    if (diff > 0) trend = 'up';
    else if (diff < 0) trend = 'down';

    return {
      category: catKey,
      name,
      current: cur,
      previous: prev,
      diff,
      diffPct,
      trend,
    };
  }).sort((a, b) => b.current - a.current);

  return {
    currentMonthKey,
    previousMonthKey,
    currentMonthName: formatMonthLabel(currentMonthKey),
    previousMonthName: formatMonthLabel(previousMonthKey),
    incomeCurrent,
    incomePrevious,
    incomeDiff,
    incomeDiffPct,
    expenseCurrent,
    expensePrevious,
    expenseDiff,
    expenseDiffPct,
    netCurrent: currentSummary.netCashflow,
    netPrevious: previousSummary.netCashflow,
    categoryComparisons,
  };
}

export function generateSavingRecommendations(
  transactions: Transaction[],
  monthKey: string
): SavingRecommendation[] {
  const summary = calculateMonthlySummary(transactions, monthKey);
  const recommendations: SavingRecommendation[] = [];

  const curExpenses = summary.categoryExpenses;

  // 1. Kopi & Jajan / Kafe habit check
  const kopiTotal = curExpenses['kopi_jajan']?.total || 0;
  const kopiCount = curExpenses['kopi_jajan']?.count || 0;
  if (kopiTotal > 200000 || kopiCount >= 5) {
    const potential = Math.round(kopiTotal * 0.45);
    recommendations.push({
      id: 'rec_kopi',
      title: 'Optimalisasi Pengeluaran Kopi & Jajan',
      description: `Bulan ini kamu sudah jajan kopi/snack sebanyak ${kopiCount} kali (${formatRupiah(kopiTotal)}). Pola ini menghabiskan porsi yang cukup besar dari budget rekreasi.`,
      potentialSavingsMonthly: potential,
      category: 'kopi_jajan',
      urgency: kopiTotal > 400000 ? 'tinggi' : 'sedang',
      actionableTip: 'Coba kurangi jajan di kedai menjadi 2-3 kali seminggu atau beralih ke seduh kopi di rumah. Hemat hingga ' + formatRupiah(potential) + '/bulan.',
      createdAt: Date.now(),
    });
  }

  // 2. Belanja impulsif / lifestyle
  const belanjaTotal = curExpenses['belanja']?.total || 0;
  if (belanjaTotal > 400000) {
    const potential = Math.round(belanjaTotal * 0.3);
    recommendations.push({
      id: 'rec_belanja',
      title: 'Terapkan Aturan 48 Jam Belanja',
      description: `Pengeluaran belanja lifestyle mencapai ${formatRupiah(belanjaTotal)}. Pola ini cenderung dipengaruhi pembelian impulsif.`,
      potentialSavingsMonthly: potential,
      category: 'belanja',
      urgency: 'sedang',
      actionableTip: 'Tunggu 48 jam sebelum checkout barang yang diinginkan. Seringkali setelah 2 hari keinginan tersebut mereda.',
      createdAt: Date.now() - 1000,
    });
  }

  // 3. Hiburan & Langganan Streaming
  const hiburanTotal = curExpenses['hiburan']?.total || 0;
  if (hiburanTotal > 150000) {
    const potential = Math.round(hiburanTotal * 0.35);
    recommendations.push({
      id: 'rec_hiburan',
      title: 'Audit Langganan & Streaming',
      description: `Biaya hiburan/streaming bulan ini ${formatRupiah(hiburanTotal)}. Periksa aplikasi atau layanan yang jarang dipakai.`,
      potentialSavingsMonthly: potential,
      category: 'hiburan',
      urgency: 'info',
      actionableTip: 'Pilih paket keluarga (family sharing) bersama teman atau jeda langganan layanan yang tidak ditonton bulan ini.',
      createdAt: Date.now() - 2000,
    });
  }

  // 4. Rasio 50/30/20 Evaluation
  if (summary.wantsPct > 35 && summary.totalIncome > 0) {
    const overWants = Math.round(((summary.wantsPct - 30) / 100) * summary.totalIncome);
    recommendations.push({
      id: 'rec_matrix_wants',
      title: 'Peringatan Matriks: Keinginan > 30%',
      description: `Alokasi Keinginan (Wants) kamu saat ini ${summary.wantsPct}%, melebihi panduan ideal 30%. Arus tabungan kamu terancam tertekan.`,
      potentialSavingsMonthly: overWants,
      category: 'belanja',
      urgency: 'tinggi',
      actionableTip: `Tekan pengeluaran non-esensial sebesar ${formatRupiah(overWants)} agar porsi tabungan tetap aman minimal 20%.`,
      createdAt: Date.now() - 3000,
    });
  }

  // If no transactions in this month at all, guide user to record their first
  if (summary.transactionCount === 0) {
    return [
      {
        id: 'rec_onboarding',
        title: 'Mulai Catat Transaksi Pertamamu',
        description: 'AI CatatAja siap memetakan pola pengeluaranmu dan merekomendasikan pos-pos hemat otomatis begitu kamu mencatat transaksi.',
        potentialSavingsMonthly: 0,
        category: 'belanja',
        urgency: 'info',
        actionableTip: 'Tekan tombol mikrofon di bawah dan ucapkan misal "Makan siang 35 ribu tunai" atau tekan tombol tambah manual.',
        createdAt: Date.now(),
      },
    ];
  }

  // Default fallback recommendation if spending is very tidy
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_invest',
      title: 'Pola Pengeluaran Terkendali Sangat Rapi',
      description: 'Pengeluaran bulan ini berada dalam batas wajar dan rasio belanja terkontrol. Ini momentum ideal untuk meningkatkan alokasi tabungan.',
      potentialSavingsMonthly: Math.round((summary.totalIncome || 1000000) * 0.1),
      category: 'amal',
      urgency: 'info',
      actionableTip: 'Pertahankan disiplin ini dan alihkan sisa kas ke dana darurat atau instrumen tabungan berimbal hasil.',
      createdAt: Date.now(),
    });
  }

  return recommendations;
}
