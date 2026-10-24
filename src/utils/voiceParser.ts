import { TransactionType, PaymentMethod, BudgetClassification } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';

export interface ParsedVoiceResult {
  type: TransactionType;
  amount: number;
  category: string;
  categoryName: string;
  description: string;
  paymentMethod: PaymentMethod;
  classification: BudgetClassification;
  confidence: number;
  rawText: string;
}

export function parseNumberWords(text: string): number | null {
  const clean = text.toLowerCase().trim();

  // Pattern 1: e.g. "1 juta 500 ribu", "2,5 juta", "2.5 juta", "10 juta"
  const jutaMatch = clean.match(/([\d.,]+)\s*(?:juta|jt)/);
  const ribuMatch = clean.match(/([\d.,]+)\s*(?:ribu|rb|k\b)/);

  if (jutaMatch && ribuMatch) {
    const jutaVal = parseFloat(jutaMatch[1].replace(',', '.'));
    const ribuVal = parseFloat(ribuMatch[1].replace(',', '.'));
    return Math.round(jutaVal * 1_000_000 + ribuVal * 1_000);
  }

  if (jutaMatch) {
    const jutaVal = parseFloat(jutaMatch[1].replace(',', '.'));
    return Math.round(jutaVal * 1_000_000);
  }

  if (ribuMatch) {
    const ribuVal = parseFloat(ribuMatch[1].replace(',', '.'));
    return Math.round(ribuVal * 1_000);
  }

  // Pattern 2: direct number with dots/commas e.g. "Rp 25.000", "50000", "25.000"
  const rawNumMatch = clean.match(/(?:rp\.?\s*)?([\d]{1,3}(?:\.[\d]{3})+|\d+)/i);
  if (rawNumMatch) {
    const parsed = parseInt(rawNumMatch[1].replace(/\./g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Word-based number recognition for common Indonesian spoken numbers
  const wordMap: Record<string, number> = {
    'sepuluh': 10,
    'sebelas': 11,
    'dua belas': 12,
    'dua puluh': 20,
    'dua puluh lima': 25,
    'tiga puluh': 30,
    'lima puluh': 50,
    'seratus': 100,
    'dua ratus': 200,
    'lima ratus': 500,
    'satu': 1,
    'dua': 2,
    'tiga': 3,
    'empat': 4,
    'lima': 5,
    'enam': 6,
    'tujuh': 7,
    'delapan': 8,
    'sembilan': 9,
  };

  for (const [w, val] of Object.entries(wordMap)) {
    if (clean.includes(w + ' ribu')) {
      return val * 1_000;
    }
    if (clean.includes(w + ' juta')) {
      return val * 1_000_000;
    }
  }

  return null;
}

export function parseVoiceInput(transcript: string): ParsedVoiceResult {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  // 1. Determine Type
  const incomeKeywords = [
    'gaji', 'bonus', 'dapat uang', 'pemasukan', 'penjualan', 'omset',
    'laba', 'freelance', 'dividen', 'cair', 'tf masuk', 'transfer masuk'
  ];
  const isIncome = incomeKeywords.some((kw) => lower.includes(kw));
  const type: TransactionType = isIncome ? 'income' : 'expense';

  // 2. Extract Amount
  const amount = parseNumberWords(text) || 0;

  // 3. Determine Payment Method
  let paymentMethod: PaymentMethod = 'tunai';
  if (lower.includes('qris') || lower.includes('kris') || lower.includes('scan')) {
    paymentMethod = 'qris';
  } else if (lower.includes('transfer') || lower.includes('tf') || lower.includes('m-banking') || lower.includes('bca') || lower.includes('mandiri') || lower.includes('bri') || lower.includes('bni')) {
    paymentMethod = 'transfer';
  } else if (lower.includes('kartu') || lower.includes('debit') || lower.includes('kredit')) {
    paymentMethod = 'kartu';
  } else if (lower.includes('cash') || lower.includes('tunai')) {
    paymentMethod = 'tunai';
  } else {
    // Default sensible method
    paymentMethod = isIncome ? 'transfer' : 'qris';
  }

  // 4. Determine Category & Classification
  let categoryId = 'lainnya_keluar';
  let categoryName = 'Pengeluaran Lainnya';
  let classification: BudgetClassification = 'wants';

  if (type === 'income') {
    if (lower.includes('gaji') || lower.includes('salary')) {
      categoryId = 'gaji';
      categoryName = 'Gaji Utama';
    } else if (lower.includes('freelance') || lower.includes('proyek') || lower.includes('side job')) {
      categoryId = 'freelance';
      categoryName = 'Freelance & Side Job';
    } else if (lower.includes('investasi') || lower.includes('dividen') || lower.includes('saham') || lower.includes('crypto')) {
      categoryId = 'investasi';
      categoryName = 'Dividen & Investasi';
    } else if (lower.includes('bisnis') || lower.includes('toko') || lower.includes('jual') || lower.includes('omset')) {
      categoryId = 'bisnis';
      categoryName = 'Hasil Bisnis/Usaha';
    } else if (lower.includes('bonus') || lower.includes('thr') || lower.includes('hadiah')) {
      categoryId = 'bonus';
      categoryName = 'Bonus & Hadiah';
    } else {
      categoryId = 'lainnya_masuk';
      categoryName = 'Pemasukan Lainnya';
    }
    classification = 'savings';
  } else {
    if (lower.includes('kopi') || lower.includes('coffee') || lower.includes('boba') || lower.includes('snack') || lower.includes('jajan') || lower.includes('starbucks') || lower.includes('kenangan') || lower.includes('kafe') || lower.includes('cafe')) {
      categoryId = 'kopi_jajan';
      categoryName = 'Kopi & Jajan';
      classification = 'wants';
    } else if (lower.includes('makan') || lower.includes('resto') || lower.includes('warteg') || lower.includes('mie') || lower.includes('nasi') || lower.includes('sarapan') || lower.includes('siang') || lower.includes('malam') || lower.includes('bakso') || lower.includes('soto') || lower.includes('mcd') || lower.includes('kfc')) {
      categoryId = 'makanan';
      categoryName = 'Makanan & Minuman';
      classification = 'needs';
    } else if (lower.includes('bensin') || lower.includes('pertalite') || lower.includes('pertamax') || lower.includes('gojek') || lower.includes('grab') || lower.includes('tol') || lower.includes('parkir') || lower.includes('service') || lower.includes('angkot') || lower.includes('kereta') || lower.includes('mrt')) {
      categoryId = 'transport';
      categoryName = 'Transportasi & Bensin';
      classification = 'needs';
    } else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('wifi') || lower.includes('indihome') || lower.includes('air') || lower.includes('pdam') || lower.includes('pulsa') || lower.includes('paket data') || lower.includes('kontrakan') || lower.includes('kost')) {
      categoryId = 'tagihan';
      categoryName = 'Tagihan & Utilitas';
      classification = 'needs';
    } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('bioskop') || lower.includes('nonton') || lower.includes('game') || lower.includes('steam') || lower.includes('yt premium')) {
      categoryId = 'hiburan';
      categoryName = 'Hiburan & Streaming';
      classification = 'wants';
    } else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('apotek') || lower.includes('klinik') || lower.includes('vitamin') || lower.includes('rs') || lower.includes('rumah sakit')) {
      categoryId = 'kesehatan';
      categoryName = 'Kesehatan & Obat';
      classification = 'needs';
    } else if (lower.includes('buku') || lower.includes('kursus') || lower.includes('sekolah') || lower.includes('kuliah') || lower.includes('les')) {
      categoryId = 'pendidikan';
      categoryName = 'Pendidikan & Buku';
      classification = 'needs';
    } else if (lower.includes('sedekah') || lower.includes('zakat') || lower.includes('infaq') || lower.includes('donasi') || lower.includes('masjid')) {
      categoryId = 'amal';
      categoryName = 'Donasi & Sedekah';
      classification = 'wants';
    } else if (lower.includes('belanja') || lower.includes('shopee') || lower.includes('tokopedia') || lower.includes('baju') || lower.includes('sepatu') || lower.includes('supermarket') || lower.includes('indomaret') || lower.includes('alfamart')) {
      categoryId = 'belanja';
      categoryName = 'Belanja & Lifestyle';
      classification = 'wants';
    }
  }

  // 5. Clean Description
  // Capitalize first letter and tidy up
  let description = text;
  // If user says "beli kopi kenangan 25 ribu pakai qris" -> description could be "Kopi Kenangan" or clean title
  // Strip trailing "pakai qris", "pakai tunai", "transfer", "ribu", "juta", etc.
  let cleanedTitle = text
    .replace(/\b(?:pakai|via|lewat|pake)\s+(?:qris|kris|tunai|cash|transfer|kartu|debit|kredit)\b/gi, '')
    .replace(/\b(?:sebesar|seharga|senilai)\b/gi, '')
    .replace(/(?:rp\.?\s*)?[\d.,]+\s*(?:juta|jt|ribu|rb|k\b)/gi, '')
    .replace(/(?:rp\.?\s*)?[\d.,]+/gi, '')
    .trim();

  // Strip leading verbs if needed
  cleanedTitle = cleanedTitle.replace(/^(?:beli|bayar|makan|isi|pesan|belanja|dapat|terima)\s+/i, '');
  if (cleanedTitle.length > 2) {
    description = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
  } else {
    description = categoryName;
  }

  return {
    type,
    amount,
    category: categoryId,
    categoryName,
    description,
    paymentMethod,
    classification,
    confidence: amount > 0 ? 0.95 : 0.6,
    rawText: text,
  };
}
