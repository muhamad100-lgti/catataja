import { Transaction, TransactionType, PaymentMethod, BudgetClassification } from '../types';
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';

export interface BackupPayload {
  app: 'CatatAja';
  version: string;
  exportedAt: string;
  roomId: string;
  transactionCount: number;
  transactions: Transaction[];
}

export function exportTransactionsToJson(transactions: Transaction[], roomId = 'catataja-utama'): string {
  const payload: BackupPayload = {
    app: 'CatatAja',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    roomId,
    transactionCount: transactions.length,
    transactions,
  };
  return JSON.stringify(payload, null, 2);
}

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    'ID',
    'Tanggal',
    'Jenis',
    'Kategori_ID',
    'Nama_Kategori',
    'Deskripsi',
    'Nominal',
    'Metode_Pembayaran',
    'Klasifikasi',
  ];

  const rows = transactions.map((tx) => [
    escapeCsvCell(tx.id),
    escapeCsvCell(tx.date),
    escapeCsvCell(tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
    escapeCsvCell(tx.category),
    escapeCsvCell(tx.categoryName),
    escapeCsvCell(tx.description),
    escapeCsvCell(tx.amount),
    escapeCsvCell(tx.paymentMethod),
    escapeCsvCell(tx.classification),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function parseCsvRow(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function normalizeTransaction(raw: any, index = 0): Transaction | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawAmount =
    typeof raw.amount === 'number'
      ? raw.amount
      : parseFloat(String(raw.amount ?? raw.nominal ?? raw.Nominal ?? '0').replace(/[^0-9.-]/g, ''));

  if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
    return null;
  }

  const rawTypeStr = String(raw.type ?? raw.jenis ?? raw.Jenis ?? 'expense').toLowerCase().trim();
  const type: TransactionType =
    rawTypeStr === 'income' || rawTypeStr === 'pemasukan' || rawTypeStr === 'masuk' || rawTypeStr === '+'
      ? 'income'
      : 'expense';

  const catList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const rawCat = String(raw.category ?? raw.Kategori_ID ?? raw.kategori ?? '').toLowerCase().trim();
  const rawCatName = String(raw.categoryName ?? raw.Nama_Kategori ?? raw.namaKategori ?? '').trim();

  let matchedCat =
    ALL_CATEGORIES.find((c) => c.id.toLowerCase() === rawCat) ||
    ALL_CATEGORIES.find((c) => c.name.toLowerCase() === rawCatName.toLowerCase()) ||
    ALL_CATEGORIES.find((c) => rawCatName && c.name.toLowerCase().includes(rawCatName.toLowerCase())) ||
    catList[0];

  const rawDate = String(raw.date ?? raw.tanggal ?? raw.Tanggal ?? '').trim();
  const dateMatch = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
  const date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];

  const rawMethod = String(
    raw.paymentMethod ?? raw.Metode_Pembayaran ?? raw.metode ?? 'qris'
  )
    .toLowerCase()
    .trim();
  const paymentMethod: PaymentMethod =
    rawMethod === 'tunai' || rawMethod === 'cash'
      ? 'tunai'
      : rawMethod === 'transfer' || rawMethod === 'tf'
      ? 'transfer'
      : rawMethod === 'kartu' || rawMethod === 'debit' || rawMethod === 'kredit'
      ? 'kartu'
      : 'qris';

  const rawClass = String(
    raw.classification ?? raw.Klasifikasi ?? matchedCat.defaultClassification
  )
    .toLowerCase()
    .trim();
  const classification: BudgetClassification =
    rawClass === 'needs' || rawClass === 'kebutuhan'
      ? 'needs'
      : rawClass === 'savings' || rawClass === 'tabungan'
      ? 'savings'
      : rawClass === 'wants' || rawClass === 'keinginan'
      ? 'wants'
      : matchedCat.defaultClassification;

  const description =
    String(raw.description ?? raw.Deskripsi ?? raw.deskripsi ?? raw.catatan ?? '').trim() ||
    matchedCat.name;

  const now = Date.now();
  return {
    id: String(raw.id ?? raw.ID ?? `tx-imp-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`),
    type,
    amount: Math.round(rawAmount),
    category: matchedCat.id,
    categoryName: rawCatName || matchedCat.name,
    description,
    date,
    paymentMethod,
    classification,
    createdAt: Number(raw.createdAt) || now - index * 1000,
    updatedAt: Number(raw.updatedAt) || now,
  };
}

export function parseImportedData(rawContent: string): {
  transactions: Transaction[];
  format: 'json' | 'csv';
} {
  const trimmed = (rawContent || '').trim();
  if (!trimmed) {
    throw new Error('Data impor kosong. Pilih file JSON/CSV atau tempel data terlebih dahulu.');
  }

  // Try JSON first if it starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.transactions)
        ? parsed.transactions
        : Array.isArray(parsed.data)
        ? parsed.data
        : null;

      if (!list) {
        throw new Error('Format JSON tidak memiliki daftar transaksi yang valid.');
      }

      const transactions = list
        .map((item: any, idx: number) => normalizeTransaction(item, idx))
        .filter((t: Transaction | null): t is Transaction => t !== null);

      if (transactions.length === 0 && list.length > 0) {
        throw new Error('Tidak ada transaksi valid dengan nominal > 0 di dalam file JSON.');
      }

      return { transactions, format: 'json' };
    } catch (err: any) {
      throw new Error(err?.message || 'File JSON tidak valid.');
    }
  }

  // Otherwise parse as CSV
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('File CSV harus memiliki baris header dan minimal 1 baris data transaksi.');
  }

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headers = parseCsvRow(lines[0], delimiter).map((h) => h.trim());

  const transactions: Transaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i], delimiter);
    if (cells.length < 2) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] ?? '';
    });

    // Also support positional fallback if headers were custom
    const normalized = normalizeTransaction(
      {
        id: rowObj.ID || rowObj.id,
        date: rowObj.Tanggal || rowObj.date || rowObj.Date || cells[1] || cells[0],
        type: rowObj.Jenis || rowObj.type || rowObj.Type || cells[2],
        category: rowObj.Kategori_ID || rowObj.category || cells[3],
        categoryName: rowObj.Nama_Kategori || rowObj.categoryName || rowObj.Kategori || cells[4],
        description: rowObj.Deskripsi || rowObj.description || rowObj.Catatan || cells[5],
        amount: rowObj.Nominal || rowObj.amount || rowObj.Jumlah || cells[6],
        paymentMethod: rowObj.Metode_Pembayaran || rowObj.paymentMethod || rowObj.Metode || cells[7],
        classification: rowObj.Klasifikasi || rowObj.classification || cells[8],
      },
      i
    );

    if (normalized) {
      transactions.push(normalized);
    }
  }

  if (transactions.length === 0) {
    throw new Error('Tidak ditemukan baris transaksi yang valid pada data CSV.');
  }

  return { transactions, format: 'csv' };
}
