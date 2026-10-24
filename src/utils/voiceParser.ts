import { TransactionType, PaymentMethod, BudgetClassification } from '../types';

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

  if (clean.includes('setengah juta')) {
    return 500_000;
  }
  if (clean.includes('sejuta') || clean.includes('satu juta')) {
    const extraRibu = clean.match(/([\d.,]+)\s*(?:ribu|rb|k\b)/);
    if (extraRibu) {
      return 1_000_000 + Math.round(parseFloat(extraRibu[1].replace(',', '.')) * 1_000);
    }
    return 1_000_000;
  }
  if (clean.includes('seratus ribu')) {
    return 100_000;
  }
  if (clean.includes('seribu')) {
    return 1_000;
  }

  // Pattern 1: e.g. "1 juta 500 ribu", "2,5 juta", "2.5 juta", "10 juta", "25rb", "25k"
  const jutaMatch = clean.match(/([\d.,]+)\s*(?:juta|jt)\b/);
  const ribuMatch = clean.match(/([\d.,]+)\s*(?:ribu|rb|k)\b/);

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
      // If user typed a small number like "beli kopi 25" without "ribu", keep exact unless < 1000 and context implies ribu
      if (parsed < 1000 && (clean.includes('rb') || clean.includes('ribu'))) {
        return parsed * 1000;
      }
      return parsed;
    }
  }

  // Word-based number recognition for common Indonesian spoken numbers (longest phrases first)
  const wordEntries: Array<[string, number]> = [
    ['seratus lima puluh', 150],
    ['dua ratus lima puluh', 250],
    ['tujuh puluh lima', 75],
    ['dua puluh lima', 25],
    ['tiga puluh lima', 35],
    ['empat puluh lima', 45],
    ['lima puluh lima', 55],
    ['enam puluh lima', 65],
    ['delapan puluh lima', 85],
    ['sembilan puluh lima', 95],
    ['lima ratus', 500],
    ['empat ratus', 400],
    ['tiga ratus', 300],
    ['dua ratus', 200],
    ['seratus', 100],
    ['sembilan puluh', 90],
    ['delapan puluh', 80],
    ['tujuh puluh', 70],
    ['enam puluh', 60],
    ['lima puluh', 50],
    ['empat puluh', 40],
    ['tiga puluh', 30],
    ['dua puluh', 20],
    ['sembilan belas', 19],
    ['delapan belas', 18],
    ['tujuh belas', 17],
    ['enam belas', 16],
    ['lima belas', 15],
    ['empat belas', 14],
    ['tiga belas', 13],
    ['dua belas', 12],
    ['sebelas', 11],
    ['sepuluh', 10],
    ['sembilan', 9],
    ['delapan', 8],
    ['tujuh', 7],
    ['enam', 6],
    ['lima', 5],
    ['empat', 4],
    ['tiga', 3],
    ['dua', 2],
    ['satu', 1],
  ];

  for (const [w, val] of wordEntries) {
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
    'laba', 'freelance', 'dividen', 'cair', 'tf masuk', 'transfer masuk',
    'komisi', 'thr', 'honor', 'bayaran proyek'
  ];
  const isIncome = incomeKeywords.some((kw) => lower.includes(kw));
  const type: TransactionType = isIncome ? 'income' : 'expense';

  // 2. Extract Amount
  const amount = parseNumberWords(text) || 0;

  // 3. Determine Payment Method
  let paymentMethod: PaymentMethod = 'tunai';
  if (lower.includes('qris') || lower.includes('kris') || lower.includes('scan') || lower.includes('gopay') || lower.includes('ovo') || lower.includes('dana') || lower.includes('shopeepay')) {
    paymentMethod = 'qris';
  } else if (lower.includes('transfer') || lower.includes('tf') || lower.includes('m-banking') || lower.includes('bca') || lower.includes('mandiri') || lower.includes('bri') || lower.includes('bni') || lower.includes('bank')) {
    paymentMethod = 'transfer';
  } else if (lower.includes('kartu') || lower.includes('debit') || lower.includes('kredit') || lower.includes('cc')) {
    paymentMethod = 'kartu';
  } else if (lower.includes('cash') || lower.includes('tunai')) {
    paymentMethod = 'tunai';
  } else {
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
    } else if (lower.includes('freelance') || lower.includes('proyek') || lower.includes('side job') || lower.includes('klien') || lower.includes('desain') || lower.includes('honor')) {
      categoryId = 'freelance';
      categoryName = 'Freelance & Side Job';
    } else if (lower.includes('investasi') || lower.includes('dividen') || lower.includes('saham') || lower.includes('crypto') || lower.includes('reksadana') || lower.includes('bunga')) {
      categoryId = 'investasi';
      categoryName = 'Dividen & Investasi';
    } else if (lower.includes('bisnis') || lower.includes('toko') || lower.includes('jual') || lower.includes('omset') || lower.includes('warung') || lower.includes('dagang')) {
      categoryId = 'bisnis';
      categoryName = 'Hasil Bisnis/Usaha';
    } else if (lower.includes('bonus') || lower.includes('thr') || lower.includes('hadiah') || lower.includes('komisi')) {
      categoryId = 'bonus';
      categoryName = 'Bonus & Hadiah';
    } else {
      categoryId = 'lainnya_masuk';
      categoryName = 'Pemasukan Lainnya';
    }
    classification = 'savings';
  } else {
    if (lower.includes('kopi') || lower.includes('coffee') || lower.includes('boba') || lower.includes('snack') || lower.includes('jajan') || lower.includes('starbucks') || lower.includes('kenangan') || lower.includes('janji jiwa') || lower.includes('fore') || lower.includes('kafe') || lower.includes('cafe') || lower.includes('es teh') || lower.includes('cilok') || lower.includes('martabak')) {
      categoryId = 'kopi_jajan';
      categoryName = 'Kopi & Jajan';
      classification = 'wants';
    } else if (lower.includes('makan') || lower.includes('resto') || lower.includes('warteg') || lower.includes('mie') || lower.includes('nasi') || lower.includes('sarapan') || lower.includes('siang') || lower.includes('malam') || lower.includes('bakso') || lower.includes('soto') || lower.includes('mcd') || lower.includes('kfc') || lower.includes('ayam') || lower.includes('padang') || lower.includes('sate') || lower.includes('gofood') || lower.includes('grabfood') || lower.includes('air galon') || lower.includes('sembako')) {
      categoryId = 'makanan';
      categoryName = 'Makanan & Minuman';
      classification = 'needs';
    } else if (lower.includes('bensin') || lower.includes('pertalite') || lower.includes('pertamax') || lower.includes('shell') || lower.includes('gojek') || lower.includes('grab') || lower.includes('maxim') || lower.includes('tol') || lower.includes('parkir') || lower.includes('service') || lower.includes('bengkel') || lower.includes('angkot') || lower.includes('kereta') || lower.includes('krl') || lower.includes('mrt') || lower.includes('transjakarta') || lower.includes('ojol')) {
      categoryId = 'transport';
      categoryName = 'Transportasi & Bensin';
      classification = 'needs';
    } else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('token') || lower.includes('wifi') || lower.includes('indihome') || lower.includes('biznet') || lower.includes('air') || lower.includes('pdam') || lower.includes('pulsa') || lower.includes('paket data') || lower.includes('kuota') || lower.includes('kontrakan') || lower.includes('kost') || lower.includes('sewa') || lower.includes('bpjs') || lower.includes('cicilan')) {
      categoryId = 'tagihan';
      categoryName = 'Tagihan & Utilitas';
      classification = 'needs';
    } else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('bioskop') || lower.includes('nonton') || lower.includes('game') || lower.includes('steam') || lower.includes('youtube') || lower.includes('konser') || lower.includes('karaoke') || lower.includes('liburan') || lower.includes('tiket')) {
      categoryId = 'hiburan';
      categoryName = 'Hiburan & Streaming';
      classification = 'wants';
    } else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('apotek') || lower.includes('klinik') || lower.includes('vitamin') || lower.includes('rs') || lower.includes('rumah sakit') || lower.includes('halodoc') || lower.includes('gigi')) {
      categoryId = 'kesehatan';
      categoryName = 'Kesehatan & Obat';
      classification = 'needs';
    } else if (lower.includes('buku') || lower.includes('kursus') || lower.includes('sekolah') || lower.includes('kuliah') || lower.includes('les') || lower.includes('udemy') || lower.includes('seminar') || lower.includes('spp')) {
      categoryId = 'pendidikan';
      categoryName = 'Pendidikan & Buku';
      classification = 'needs';
    } else if (lower.includes('sedekah') || lower.includes('zakat') || lower.includes('infaq') || lower.includes('donasi') || lower.includes('masjid') || lower.includes('amal') || lower.includes('sumbangan')) {
      categoryId = 'amal';
      categoryName = 'Donasi & Sedekah';
      classification = 'wants';
    } else if (lower.includes('belanja') || lower.includes('shopee') || lower.includes('tokopedia') || lower.includes('tiktok') || lower.includes('lazada') || lower.includes('baju') || lower.includes('celana') || lower.includes('sepatu') || lower.includes('skincare') || lower.includes('kosmetik') || lower.includes('supermarket') || lower.includes('indomaret') || lower.includes('alfamart')) {
      categoryId = 'belanja';
      categoryName = 'Belanja & Lifestyle';
      classification = 'wants';
    }
  }

  // 5. Clean Description
  let description = text;
  let cleanedTitle = text
    .replace(/\b(?:pakai|via|lewat|pake|dengan)\s+(?:qris|kris|tunai|cash|transfer|tf|kartu|debit|kredit|gopay|ovo|dana|bca|mandiri|bri|bni)\b/gi, '')
    .replace(/\b(?:qris|kris|tunai|cash|transfer)\b/gi, '')
    .replace(/\b(?:sebesar|seharga|senilai|habis|total)\b/gi, '')
    .replace(/(?:rp\.?\s*)?[\d.,]+\s*(?:juta|jt|ribu|rb|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?[\d.,]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  cleanedTitle = cleanedTitle.replace(/^(?:beli|bayar|isi|pesan|dapat|terima|masuk)\s+/i, '').trim();
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
    confidence: amount > 0 ? 0.96 : 0.65,
    rawText: text,
  };
}
