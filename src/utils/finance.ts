import { Transaction, MonthlySummary, MonthComparison, SavingRecommendation, BudgetClassification } from '../types';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { parseNumberWords } from './voiceParser';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  const isNeg = rounded < 0;
  const absStr = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNeg ? `-Rp ${absStr}` : `Rp ${absStr}`;
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

export function formatClassificationLabel(classification: BudgetClassification): string {
  if (classification === 'needs') return 'Kebutuhan';
  if (classification === 'wants') return 'Keinginan';
  return 'Tabungan';
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
  if (kopiTotal > 150000 || kopiCount >= 3) {
    const potential = Math.max(50000, Math.round(kopiTotal * 0.45));
    recommendations.push({
      id: 'rec_kopi',
      title: 'Optimalisasi Pengeluaran Kopi & Jajan',
      description: `Bulan ini kamu sudah jajan kopi/snack sebanyak ${kopiCount} kali (${formatRupiah(kopiTotal)}). Pola ini menghabiskan porsi yang cukup besar dari budget rekreasi.`,
      potentialSavingsMonthly: potential,
      category: 'kopi_jajan',
      urgency: kopiTotal > 350000 ? 'tinggi' : 'sedang',
      actionableTip: 'Batasi jajan di kedai maksimal 2-3 kali seminggu atau seduh kopi sendiri. Potensi hemat hingga ' + formatRupiah(potential) + '/bulan.',
      createdAt: Date.now(),
    });
  }

  // 2. Makanan & Pesan Antar check
  const makanTotal = curExpenses['makanan']?.total || 0;
  if (makanTotal > 800000) {
    const potential = Math.round(makanTotal * 0.2);
    recommendations.push({
      id: 'rec_makanan',
      title: 'Efisiensi Biaya Makan & Pesan Antar',
      description: `Pos Makanan & Minuman mencapai ${formatRupiah(makanTotal)}. Mengurangi ongkos kirim & biaya layanan aplikasi pesan antar dapat menghemat signifikan.`,
      potentialSavingsMonthly: potential,
      category: 'makanan',
      urgency: makanTotal > 2000000 ? 'tinggi' : 'sedang',
      actionableTip: `Kombinasikan masak sendiri atau meal-prep 3 hari seminggu untuk menghemat sekitar ${formatRupiah(potential)}/bulan.`,
      createdAt: Date.now() - 500,
    });
  }

  // 3. Belanja impulsif / lifestyle
  const belanjaTotal = curExpenses['belanja']?.total || 0;
  if (belanjaTotal > 250000) {
    const potential = Math.round(belanjaTotal * 0.35);
    recommendations.push({
      id: 'rec_belanja',
      title: 'Terapkan Aturan Tunggu 48 Jam Belanja',
      description: `Pengeluaran belanja lifestyle mencapai ${formatRupiah(belanjaTotal)}. Pembelian non-esensial sering dipicu diskon tanggal kembar atau flash sale.`,
      potentialSavingsMonthly: potential,
      category: 'belanja',
      urgency: belanjaTotal > 750000 ? 'tinggi' : 'sedang',
      actionableTip: 'Masukkan barang ke keranjang terlebih dahulu dan tunggu 48 jam sebelum memutuskan checkout.',
      createdAt: Date.now() - 1000,
    });
  }

  // 4. Hiburan & Langganan Streaming
  const hiburanTotal = curExpenses['hiburan']?.total || 0;
  if (hiburanTotal > 100000) {
    const potential = Math.round(hiburanTotal * 0.35);
    recommendations.push({
      id: 'rec_hiburan',
      title: 'Audit Langganan & Hiburan Bulanan',
      description: `Biaya hiburan & streaming tercatat ${formatRupiah(hiburanTotal)}. Evaluasi layanan berlangganan yang jarang digunakan.`,
      potentialSavingsMonthly: potential,
      category: 'hiburan',
      urgency: 'info',
      actionableTip: 'Gunakan paket patungan keluarga (family plan) atau hentikan langganan yang jarang ditonton.',
      createdAt: Date.now() - 2000,
    });
  }

  // 5. Rasio 50/30/20 Evaluation
  if (summary.wantsPct > 30 && summary.totalIncome > 0) {
    const overWants = Math.max(50000, Math.round(((summary.wantsPct - 30) / 100) * summary.totalIncome));
    recommendations.push({
      id: 'rec_matrix_wants',
      title: 'Peringatan Matriks: Keinginan > 30%',
      description: `Alokasi Keinginan (Wants) saat ini ${summary.wantsPct}%, melewati batas ideal 30%. Hal ini berisiko menekan porsi tabungan masa depanmu.`,
      potentialSavingsMonthly: overWants,
      category: 'belanja',
      urgency: 'tinggi',
      actionableTip: `Pangkas pengeluaran gaya hidup sebesar ${formatRupiah(overWants)} agar porsi tabungan 20% tetap terjaga.`,
      createdAt: Date.now() - 3000,
    });
  }

  // If no transactions in this month at all, guide user to record their first
  if (summary.transactionCount === 0) {
    return [
      {
        id: 'rec_onboarding_1',
        title: 'Mulai Catat Pemasukan & Pengeluaran Pertama',
        description: 'AI CatatAja siap memetakan matriks 50/30/20 dan mendeteksi celah penghematan begitu kamu mencatat transaksi.',
        potentialSavingsMonthly: 350000,
        category: 'makanan',
        urgency: 'info',
        actionableTip: 'Gunakan tombol mikrofon Suara AI atau tombol Tambah Manual untuk mencatat transaksi hari ini.',
        createdAt: Date.now(),
      },
      {
        id: 'rec_onboarding_2',
        title: 'Sisihkan 20% Tabungan di Awal Bulan',
        description: 'Metode Pay Yourself First memastikan target dana darurat dan investasi selalu tercapai sebelum uang terpakai untuk konsumsi.',
        potentialSavingsMonthly: 500000,
        category: 'investasi',
        urgency: 'sedang',
        actionableTip: 'Pisahkan rekening operasional harian (QRIS) dengan rekening khusus tabungan/dana darurat.',
        createdAt: Date.now() - 1000,
      },
    ];
  }

  // Default fallback recommendation if spending is very tidy
  if (recommendations.length === 0) {
    const suggestedSave = Math.max(150000, Math.round((summary.totalIncome || summary.totalExpense || 1000000) * 0.12));
    recommendations.push({
      id: 'rec_invest',
      title: 'Pola Pengeluaran Terkendali Sangat Rapi',
      description: `Total pengeluaran bulan ${summary.monthName} (${formatRupiah(summary.totalExpense)}) berada dalam batas aman dan rasio belanja terkontrol.`,
      potentialSavingsMonthly: suggestedSave,
      category: 'investasi',
      urgency: 'info',
      actionableTip: `Pertahankan disiplin ini dan alokasikan surplus kas ke Reksa Dana Pasar Uang atau deposito fleksibel.`,
      createdAt: Date.now(),
    });
  }

  return recommendations;
}

export interface AIMonthlyAnalysisResult {
  healthScore: number;
  statusLabel: string;
  summaryNarrative: string;
  actionablePoints: string[];
  highlightQuote: string;
  perspectiveTitle?: string;
}

export function generateLocalMonthlyAIAnalysis(
  transactions: Transaction[],
  monthKey: string,
  perspectiveIndex = 0
): AIMonthlyAnalysisResult {
  const prevMonthKey = getPreviousMonthKey(monthKey);
  const summary = calculateMonthlySummary(transactions, monthKey);
  const comparison = compareMonths(transactions, monthKey, prevMonthKey);

  if (summary.transactionCount === 0) {
    return {
      healthScore: 85,
      statusLabel: 'Siap Menganalisis Transaksi',
      perspectiveTitle: 'Mode Siaga AI Finansial',
      summaryNarrative: `Belum ada transaksi tercatat pada periode ${summary.monthName}. Tambahkan pemasukan atau pengeluaran lewat fitur Suara AI maupun input manual agar asisten AI dapat menghitung skor kesehatan finansial dan distribusi matriks 50/30/20 secara otomatis.`,
      actionablePoints: [
        'Catat pemasukan utama (Gaji/Bisnis/Freelance) sebagai dasar perhitungan rasio 50/30/20.',
        'Gunakan fitur Catat Suara AI atau ketik kalimat singkat seperti "Makan siang 35 ribu QRIS".',
        'Atau buka menu Sync / Backup untuk memuat Data Simulasi maupun mengimpor file CSV/JSON.',
      ],
      highlightQuote: 'Langkah pertama menuju kebebasan finansial dimulai dari pencatatan yang jujur dan konsisten.',
    };
  }

  // Find top expense category
  const sortedCategories = Object.entries(summary.categoryExpenses).sort(
    (a, b) => b[1].total - a[1].total
  );
  const topCatName = sortedCategories[0]?.[1]?.name || 'Pengeluaran Harian';
  const topCatAmount = sortedCategories[0]?.[1]?.total || 0;

  let healthScore = 78;
  let statusLabel = 'Kondisi Finansial Stabil';

  if (summary.netCashflow < 0) {
    healthScore = 48;
    statusLabel = 'Perlu Waspada (Defisit Kas)';
  } else if (summary.savingsRate >= 25 && summary.wantsPct <= 30) {
    healthScore = 94;
    statusLabel = 'Sangat Sehat & Disiplin';
  } else if (summary.savingsRate >= 20) {
    healthScore = 88;
    statusLabel = 'Sehat (Sesuai Target 50/30/20)';
  } else if (summary.savingsRate >= 10) {
    healthScore = 74;
    statusLabel = 'Cukup Baik (Perlu Optimasi)';
  } else {
    healthScore = 62;
    statusLabel = 'Rasio Tabungan Rendah';
  }

  const mode = perspectiveIndex % 3;

  if (mode === 1) {
    return {
      healthScore,
      statusLabel,
      perspectiveTitle: 'Fokus Audit Matriks 50/30/20',
      summaryNarrative: `Berdasarkan audit matriks 50/30/20 periode ${summary.monthName}, distribusi danamu saat ini adalah ${summary.needsPct}% Kebutuhan Pokok, ${summary.wantsPct}% Keinginan/Gaya Hidup, dan ${summary.savingsPct}% Tabungan. Pos pengeluaran terbesar berada pada kategori ${topCatName} sebesar ${formatRupiah(topCatAmount)}.`,
      actionablePoints: [
        summary.needsPct > 50
          ? `Porsi Kebutuhan (${summary.needsPct}%) melewati batas 50%. Evaluasi tagihan utilitas dan biaya makan harian.`
          : `Porsi Kebutuhan (${summary.needsPct}%) sangat terkendali di bawah ambang 50%.`,
        summary.wantsPct > 30
          ? `Pangkas pos Keinginan dari ${summary.wantsPct}% menjadi maksimal 30% dengan membatasi belanja non-esensial.`
          : `Porsi Keinginan (${summary.wantsPct}%) terjaga aman dalam koridor ideal ≤30%.`,
        `Fokuskan penghematan pada kategori ${topCatName} (${formatRupiah(topCatAmount)}) untuk menambah cadangan kas bersih.`,
      ],
      highlightQuote: 'Jangan menabung apa yang tersisa setelah belanja, tapi belanjakan apa yang tersisa setelah menabung.',
    };
  }

  if (mode === 2) {
    const idealEmergencyFund = Math.max(summary.totalExpense * 6, 15_000_000);
    return {
      healthScore,
      statusLabel,
      perspectiveTitle: 'Proyeksi Arus Kas & Dana Darurat',
      summaryNarrative: `Arus kas bersih bulan ${summary.monthName} tercatat ${formatRupiah(summary.netCashflow)} dari total pemasukan ${formatRupiah(summary.totalIncome)} dan pengeluaran ${formatRupiah(summary.totalExpense)}. Dengan rata-rata biaya hidup bulanan saat ini, target dana darurat ideal (6x pengeluaran) berada di kisaran ${formatRupiah(idealEmergencyFund)}.`,
      actionablePoints: [
        summary.netCashflow > 0
          ? `Amankan surplus ${formatRupiah(summary.netCashflow)} bulan ini ke instrumen likuid (Reksa Dana Pasar Uang / Deposito).`
          : `Hentikan sementara pengeluaran kategori Keinginan (${formatRupiah(summary.wantsAmount)}) untuk menutup defisit kas.`,
        `Tetapkan batas pengeluaran mingguan maksimal ${formatRupiah(Math.round((summary.totalIncome > 0 ? summary.totalIncome * 0.7 : summary.totalExpense) / 4))}.`,
        'Audit metode pembayaran QRIS dan kartu agar pengeluaran mikro tetap terpantau setiap akhir pekan.',
      ],
      highlightQuote: 'Dana darurat yang kuat mengubah krisis finansial menjadi sekadar ketidaknyamanan kecil.',
    };
  }

  const diffSentence =
    comparison.expensePrevious > 0
      ? ` Dibandingkan ${comparison.previousMonthName}, pengeluaranmu ${comparison.expenseDiff <= 0 ? 'turun' : 'naik'} ${Math.abs(comparison.expenseDiffPct)}% (${formatRupiah(Math.abs(comparison.expenseDiff))}).`
      : '';

  return {
    healthScore,
    statusLabel,
    perspectiveTitle: 'Ringkasan Eksekutif Bulanan',
    summaryNarrative: `Pada periode ${summary.monthName}, total pemasukan tercatat ${formatRupiah(summary.totalIncome)} dengan pengeluaran ${formatRupiah(summary.totalExpense)}, menghasilkan arus kas bersih ${formatRupiah(summary.netCashflow)} (rasio tabungan ${summary.savingsRate}%). Kategori tertinggi bulan ini adalah ${topCatName} (${formatRupiah(topCatAmount)}).${diffSentence}`,
    actionablePoints: [
      summary.savingsRate < 20
        ? `Tingkatkan rasio tabungan dari ${summary.savingsRate}% menuju target ideal 20% dengan menyisihkan dana di awal bulan.`
        : `Pertahankan rasio tabungan ${summary.savingsRate}% dan alokasikan surplus ${formatRupiah(Math.max(0, summary.netCashflow))} ke pos investasi.`,
      topCatAmount > 0
        ? `Kendalikan pos ${topCatName} (${formatRupiah(topCatAmount)}) dengan menetapkan plafon anggaran mingguan.`
        : 'Terus catat pengeluaran harian secara rutin untuk menjaga akurasi analisis.',
      summary.wantsPct > 30
        ? `Kurangi frekuensi belanja gaya hidup (${summary.wantsPct}% dari pemasukan) agar kembali ke batas 30%.`
        : 'Distribusi kebutuhan dan gaya hidup sudah seimbang; pertahankan kebiasaan belanja terencana.',
    ],
    highlightQuote: 'Disiplin kecil dalam mencatat pengeluaran setiap hari adalah pondasi kebebasan finansial.',
  };
}

export function getMonthlyExpenseBreakdownText(
  transactions: Transaction[],
  monthKey: string
): string {
  const summary = calculateMonthlySummary(transactions, monthKey);
  const expenseTxs = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(monthKey))
    .sort((a, b) => b.amount - a.amount);

  if (expenseTxs.length === 0) {
    return `Selama periode **${summary.monthName}**, belum ada pengeluaran yang tercatat (**Total: Rp 0**).\n\nKamu bisa:\n• Mencatat pengeluaran lewat tombol **Suara AI** (misal: *"Beli makan siang 35 ribu pakai QRIS"*).\n• Menekan tombol **Catat Manual** di Beranda.\n• Atau membuka tab **Sync** lalu klik **Muat Simulasi** untuk melihat contoh rincian pengeluaran lengkap.`;
  }

  const sortedCategories = Object.entries(summary.categoryExpenses).sort(
    (a, b) => b[1].total - a[1].total
  );

  const categoryLines = sortedCategories
    .map(([, cat], idx) => {
      const pct = summary.totalExpense > 0 ? Math.round((cat.total / summary.totalExpense) * 100) : 0;
      return `${idx + 1}. **${cat.name}**: ${formatRupiah(cat.total)} (${pct}% · ${cat.count}x transaksi)`;
    })
    .join('\n');

  const itemLines = expenseTxs
    .slice(0, 10)
    .map(
      (tx) =>
        `• **${tx.description}**: ${formatRupiah(tx.amount)} (${tx.categoryName} · ${tx.paymentMethod.toUpperCase()} · ${tx.date})`
    )
    .join('\n');

  const moreNote =
    expenseTxs.length > 10
      ? `\n*(+${expenseTxs.length - 10} transaksi lainnya di tab Transaksi)*`
      : '';

  return `Berikut rincian lengkap **apa saja yang telah dihabiskan selama ${summary.monthName}** (Total: **${formatRupiah(summary.totalExpense)}** dari **${expenseTxs.length} transaksi**):\n\n**Rekap Per Kategori:**\n${categoryLines}\n\n**Daftar Item Pengeluaran:**\n${itemLines}${moreNote}\n\n**Evaluasi Alokasi**: Sebesar **${formatRupiah(summary.needsAmount)}** (${summary.needsPct}%) digunakan untuk Kebutuhan Pokok dan **${formatRupiah(summary.wantsAmount)}** (${summary.wantsPct}%) untuk Keinginan/Gaya Hidup.`;
}

export function answerFinancialQuestionLocally(
  question: string,
  transactions: Transaction[],
  monthKey: string
): string {
  const q = question.toLowerCase().trim();
  const summary = calculateMonthlySummary(transactions, monthKey);
  const prevKey = getPreviousMonthKey(monthKey);
  const comparison = compareMonths(transactions, monthKey, prevKey);

  const sortedCategories = Object.entries(summary.categoryExpenses).sort(
    (a, b) => b[1].total - a[1].total
  );
  const topCat = sortedCategories[0]?.[1];

  // 1. Check if user asks what they have spent this month ("apa saja yang telah dihabiskan selama bulan ini", "habis buat apa", "rincian pengeluaran", etc.)
  if (
    q.includes('dihabiskan') ||
    q.includes('habis buat apa') ||
    q.includes('habis kemana') ||
    q.includes('habis ke mana') ||
    q.includes('apa saja yang') ||
    q.includes('apa aja yang') ||
    q.includes('rincian pengeluaran') ||
    q.includes('daftar pengeluaran') ||
    q.includes('belanja apa saja') ||
    q.includes('belanja apa aja') ||
    q.includes('pengeluaran bulan ini')
  ) {
    return getMonthlyExpenseBreakdownText(transactions, monthKey);
  }

  // 2. Check if user asks to simulate a specific income/salary number in their question
  const queriedAmount = parseNumberWords(q);
  if (
    queriedAmount &&
    queriedAmount >= 500_000 &&
    (q.includes('gaji') || q.includes('bagi') || q.includes('atur') || q.includes('alokasi') || q.includes('50/30/20') || q.includes('penghasilan') || q.includes('uang'))
  ) {
    const needs50 = Math.round(queriedAmount * 0.5);
    const wants30 = Math.round(queriedAmount * 0.3);
    const save20 = Math.round(queriedAmount * 0.2);
    return `Berikut simulasi pembagian anggaran ideal dengan metode **50/30/20** untuk nominal **${formatRupiah(queriedAmount)}**:\n\n• **50% Kebutuhan Pokok (${formatRupiah(needs50)})**: Gunakan untuk makan pokok, tempat tinggal/kost, listrik, kuota, dan transportasi kerja.\n• **30% Keinginan & Gaya Hidup (${formatRupiah(wants30)})**: Batas maksimal untuk kopi/jajan, hiburan, langganan streaming, dan belanja lifestyle (maksimal ~${formatRupiah(Math.round(wants30 / 4))}/minggu).\n• **20% Tabungan & Investasi (${formatRupiah(save20)})**: Langsung pisahkan di awal bulan ke rekening dana darurat atau Reksa Dana Pasar Uang.`;
  }

  if (q.includes('dana darurat') || q.includes('darurat')) {
    const baseExpense = summary.totalExpense > 0 ? summary.totalExpense : 3_500_000;
    const singleTarget = baseExpense * 6;
    const familyTarget = baseExpense * 12;
    return `Berdasarkan pengeluaran bulananmu (${summary.totalExpense > 0 ? formatRupiah(summary.totalExpense) : 'estimasi Rp 3.500.000'}), berikut target **Dana Darurat Ideal**:\n\n• **Lajang (6x Pengeluaran)**: **${formatRupiah(singleTarget)}**\n• **Menikah / Keluarga (9–12x Pengeluaran)**: **${formatRupiah(familyTarget)}**\n\n**Strategi Mencapainya**: Sisihkan minimal 20% pemasukan setiap awal gajian ke rekening terpisah atau Reksa Dana Pasar Uang agar mudah dicairkan kapan saja tanpa risiko fluktuasi.`;
  }

  if (q.includes('boros') || q.includes('terbesar') || q.includes('bocor') || q.includes('kategori')) {
    if (summary.transactionCount === 0 || sortedCategories.length === 0) {
      return `Saat ini belum ada pengeluaran tercatat di periode **${summary.monthName}**. Coba catat beberapa transaksi terlebih dahulu (misalnya lewat tombol Suara AI) agar saya bisa membedah pos pengeluaran terbesarmu secara akurat.`;
    }
    const listStr = sortedCategories
      .slice(0, 3)
      .map(([, val], idx) => `${idx + 1}. **${val.name}**: ${formatRupiah(val.total)} (${val.count}x transaksi)`)
      .join('\n');
    return `Hasil audit pengeluaranmu di bulan **${summary.monthName}** (Total: **${formatRupiah(summary.totalExpense)}**):\n\n${listStr}\n\n**Saran Efisiensi**: Pos **${topCat.name}** menyerap porsi terbesar. Jika kamu memangkas 25% saja dari pos tersebut, kamu bisa langsung menghemat **${formatRupiah(Math.round(topCat.total * 0.25))}** bulan ini.`;
  }

  if (q.includes('50/30/20') || q.includes('rasio') || q.includes('matriks')) {
    if (summary.transactionCount === 0) {
      return `Rasio **50/30/20** membagi penghasilanmu menjadi:\n• **50% Kebutuhan (Needs)**: Makan, tagihan, transportasi.\n• **30% Keinginan (Wants)**: Jajan, kopi, hiburan, belanja.\n• **20% Tabungan (Savings)**: Dana darurat & investasi.\n\nKetik nominal gajimu (misal: *"Simulasi gaji 7 juta"*) atau catat transaksi pertamamu untuk melihat rasio aktualmu!`;
    }
    return `Evaluasi **Matriks 50/30/20** kamu pada periode **${summary.monthName}**:\n\n• **Kebutuhan Pokok**: **${summary.needsPct}%** (${formatRupiah(summary.needsAmount)}) — *Target ≤ 50%*\n• **Keinginan & Lifestyle**: **${summary.wantsPct}%** (${formatRupiah(summary.wantsAmount)}) — *Target ≤ 30%*\n• **Tabungan & Sisa Kas**: **${summary.savingsPct}%** (${formatRupiah(Math.max(0, summary.netCashflow))}) — *Target ≥ 20%*\n\n**Kesimpulan AI**: ${summary.savingsRate >= 20 ? 'Komposisi anggaranmu sudah sangat sehat! Pertahankan porsi tabungan di atas 20%.' : 'Porsi tabungan masih di bawah 20%. Kurangi pengeluaran kategori Keinginan agar target tabungan bulan ini tercapai.'}`;
  }

  if (q.includes('investasi') || q.includes('reksadana') || q.includes('saham') || q.includes('menabung') || q.includes('nabung')) {
    const surplus = Math.max(0, summary.netCashflow);
    return `Rekomendasi strategi **Tabungan & Investasi** untuk kondisimu saat ini:\n\n1. **Alokasi Surplus Bulan Ini**: ${surplus > 0 ? `Kamu memiliki sisa kas bersih **${formatRupiah(surplus)}** (${summary.savingsRate}%).` : 'Pastikan arus kas bulanan positif terlebih dahulu sebelum masuk ke instrumen berisiko.'}\n2. **Jangka Pendek (< 1 Tahun)**: Gunakan **Reksa Dana Pasar Uang (RDPU)** atau deposito bank digital untuk dana darurat.\n3. **Jangka Menengah–Panjang (> 3 Tahun)**: Alokasikan secara rutin (Dollar Cost Averaging) ke **Reksa Dana Pendapatan Tetap / Obligasi Negara (SBN)** atau indeks saham.`;
  }

  // Default comprehensive diagnostic answer
  if (summary.transactionCount === 0) {
    return `Halo! Saya **AI Penasihat Finansial CatatAja**. Saat ini saldo periode **${summary.monthName}** masih kosong (Rp 0).\n\nKamu bisa:\n1. Menanyakan **"Apa saja yang telah dihabiskan bulan ini?"** setelah mencatat transaksi.\n2. Mencatat transaksi lewat **Suara AI** (contoh: *"Beli kopi 25 ribu pakai QRIS"*).\n3. Menanyakan simulasi gaji (contoh: *"Cara atur gaji 6 juta dengan 50/30/20"*).\n4. Memuat data contoh di tab **Sync** untuk melihat analisis grafik lengkap.`;
  }

  const trendText =
    comparison.expensePrevious > 0
      ? `Dibandingkan bulan lalu, pengeluaranmu ${comparison.expenseDiff <= 0 ? 'lebih hemat' : 'naik'} **${Math.abs(comparison.expenseDiffPct)}%**.`
      : '';

  return `Berdasarkan catatan keuanganmu di **${summary.monthName}**:\n\n• **Pemasukan**: ${formatRupiah(summary.totalIncome)}\n• **Pengeluaran**: ${formatRupiah(summary.totalExpense)}\n• **Sisa Kas Bersih**: **${formatRupiah(summary.netCashflow)}** (Rasio Simpanan **${summary.savingsRate}%**)\n• **Pos Terbesar**: ${topCat ? `${topCat.name} (${formatRupiah(topCat.total)})` : '-'}\n\n${trendText} ${summary.netCashflow >= 0 ? `Fokus utamamu minggu ini adalah menjaga agar pengeluaran kategori Keinginan (${summary.wantsPct}%) tidak melewati 30% sehingga surplus kas tetap aman.` : 'Perhatian: pengeluaran bulan ini melampaui pemasukan. Tunda belanja non-esensial hingga arus kas kembali positif.'}`;
}
