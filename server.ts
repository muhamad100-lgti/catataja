import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryName: string;
  description: string;
  date: string;
  paymentMethod: 'tunai' | 'qris' | 'transfer' | 'kartu';
  classification: 'needs' | 'wants' | 'savings';
  createdAt: number;
  updatedAt: number;
  synced?: boolean;
}

interface ParsedVoiceResult {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryName: string;
  description: string;
  paymentMethod: 'tunai' | 'qris' | 'transfer' | 'kartu';
  classification: 'needs' | 'wants' | 'savings';
  confidence: number;
  rawText: string;
}

function parseNumberWords(text: string): number | null {
  const clean = text.toLowerCase().trim();

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

  const rawNumMatch = clean.match(/(?:rp\.?\s*)?([\d]{1,3}(?:\.[\d]{3})+|\d+)/i);
  if (rawNumMatch) {
    const parsed = parseInt(rawNumMatch[1].replace(/\./g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

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

function parseVoiceInput(transcript: string): ParsedVoiceResult {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  const incomeKeywords = [
    'gaji', 'bonus', 'dapat uang', 'pemasukan', 'penjualan', 'omset',
    'laba', 'freelance', 'dividen', 'cair', 'tf masuk', 'transfer masuk'
  ];
  const isIncome = incomeKeywords.some((kw) => lower.includes(kw));
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

  const amount = parseNumberWords(text) || 0;

  let paymentMethod: 'tunai' | 'qris' | 'transfer' | 'kartu' = 'tunai';
  if (lower.includes('qris') || lower.includes('kris') || lower.includes('scan')) {
    paymentMethod = 'qris';
  } else if (lower.includes('transfer') || lower.includes('tf') || lower.includes('m-banking') || lower.includes('bca') || lower.includes('mandiri') || lower.includes('bri') || lower.includes('bni')) {
    paymentMethod = 'transfer';
  } else if (lower.includes('kartu') || lower.includes('debit') || lower.includes('kredit')) {
    paymentMethod = 'kartu';
  } else if (lower.includes('cash') || lower.includes('tunai')) {
    paymentMethod = 'tunai';
  } else {
    paymentMethod = isIncome ? 'transfer' : 'qris';
  }

  let categoryId = 'lainnya_keluar';
  let categoryName = 'Pengeluaran Lainnya';
  let classification: 'needs' | 'wants' | 'savings' = 'wants';

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

  let description = text;
  let cleanedTitle = text
    .replace(/\b(?:pakai|via|lewat|pake)\s+(?:qris|kris|tunai|cash|transfer|kartu|debit|kredit)\b/gi, '')
    .replace(/\b(?:sebesar|seharga|senilai)\b/gi, '')
    .replace(/(?:rp\.?\s*)?[\d.,]+\s*(?:juta|jt|ribu|rb|k\b)/gi, '')
    .replace(/(?:rp\.?\s*)?[\d.,]+/gi, '')
    .trim();

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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '5mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'] as const;
const modelCooldownUntil: Record<string, number> = {};

async function generateJsonWithFallback<T>(prompt: string, timeoutMs = 4000): Promise<T | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const now = Date.now();
  for (const modelName of GEMINI_MODELS) {
    if (modelCooldownUntil[modelName] && now < modelCooldownUntil[modelName]) {
      continue;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs)
      );

      const geminiPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      if (response?.text) {
        return JSON.parse(response.text) as T;
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        // Put this specific model on cooldown for 15 minutes and try the next fallback model
        modelCooldownUntil[modelName] = Date.now() + 15 * 60 * 1000;
        continue;
      }
      if (msg.includes('404') || msg.includes('NOT_FOUND')) {
        modelCooldownUntil[modelName] = Date.now() + 60 * 60 * 1000;
        continue;
      }
      // On timeout or transient network issue, break out and use deterministic local engine
      break;
    }
  }

  return null;
}

// Seed data generator for demo/new rooms
function getInitialSeedTransactions(): Transaction[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');

  return [
    // Current month transactions
    {
      id: 'tx-cur-1',
      type: 'income',
      amount: 9500000,
      category: 'gaji',
      categoryName: 'Gaji Utama',
      description: 'Gaji Bulan Ini PT Tech Inovasi',
      date: `${y}-${m}-01`,
      paymentMethod: 'transfer',
      classification: 'savings',
      createdAt: Date.now() - 86400000 * 20,
      updatedAt: Date.now() - 86400000 * 20,
    },
    {
      id: 'tx-cur-2',
      type: 'income',
      amount: 1500000,
      category: 'freelance',
      categoryName: 'Freelance & Side Job',
      description: 'Desain UI Mobile App Klien',
      date: `${y}-${m}-05`,
      paymentMethod: 'transfer',
      classification: 'savings',
      createdAt: Date.now() - 86400000 * 16,
      updatedAt: Date.now() - 86400000 * 16,
    },
    {
      id: 'tx-cur-3',
      type: 'expense',
      amount: 1800000,
      category: 'tagihan',
      categoryName: 'Tagihan & Utilitas',
      description: 'Sewa Kost & Listrik Bulanan',
      date: `${y}-${m}-02`,
      paymentMethod: 'transfer',
      classification: 'needs',
      createdAt: Date.now() - 86400000 * 19,
      updatedAt: Date.now() - 86400000 * 19,
    },
    {
      id: 'tx-cur-4',
      type: 'expense',
      amount: 1250000,
      category: 'makanan',
      categoryName: 'Makanan & Minuman',
      description: 'Belanja Bahan Makanan & Supermarket',
      date: `${y}-${m}-06`,
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now() - 86400000 * 15,
    },
    {
      id: 'tx-cur-5',
      type: 'expense',
      amount: 420000,
      category: 'kopi_jajan',
      categoryName: 'Kopi & Jajan',
      description: 'Kopi Susu & Pastry mingguan',
      date: `${y}-${m}-08`,
      paymentMethod: 'qris',
      classification: 'wants',
      createdAt: Date.now() - 86400000 * 13,
      updatedAt: Date.now() - 86400000 * 13,
    },
    {
      id: 'tx-cur-6',
      type: 'expense',
      amount: 350000,
      category: 'transport',
      categoryName: 'Transportasi & Bensin',
      description: 'Isi Bensin Pertamax & Saldo E-Toll',
      date: `${y}-${m}-10`,
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: Date.now() - 86400000 * 11,
      updatedAt: Date.now() - 86400000 * 11,
    },
    {
      id: 'tx-cur-7',
      type: 'expense',
      amount: 650000,
      category: 'belanja',
      categoryName: 'Belanja & Lifestyle',
      description: 'Beli Sepatu Olahraga Promo',
      date: `${y}-${m}-14`,
      paymentMethod: 'kartu',
      classification: 'wants',
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'tx-cur-8',
      type: 'expense',
      amount: 189000,
      category: 'hiburan',
      categoryName: 'Hiburan & Streaming',
      description: 'Langganan Netflix Premium & Spotify',
      date: `${y}-${m}-16`,
      paymentMethod: 'kartu',
      classification: 'wants',
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    },
    // Previous month transactions for comparative analytics
    {
      id: 'tx-prev-1',
      type: 'income',
      amount: 9000000,
      category: 'gaji',
      categoryName: 'Gaji Utama',
      description: 'Gaji Bulan Kemarin',
      date: `${prevY}-${prevM}-01`,
      paymentMethod: 'transfer',
      classification: 'savings',
      createdAt: Date.now() - 86400000 * 50,
      updatedAt: Date.now() - 86400000 * 50,
    },
    {
      id: 'tx-prev-2',
      type: 'expense',
      amount: 1800000,
      category: 'tagihan',
      categoryName: 'Tagihan & Utilitas',
      description: 'Sewa Kost & Listrik Bulan Lalu',
      date: `${prevY}-${prevM}-02`,
      paymentMethod: 'transfer',
      classification: 'needs',
      createdAt: Date.now() - 86400000 * 49,
      updatedAt: Date.now() - 86400000 * 49,
    },
    {
      id: 'tx-prev-3',
      type: 'expense',
      amount: 1600000,
      category: 'makanan',
      categoryName: 'Makanan & Minuman',
      description: 'Makan & Resto Bulan Lalu',
      date: `${prevY}-${prevM}-12`,
      paymentMethod: 'qris',
      classification: 'needs',
      createdAt: Date.now() - 86400000 * 40,
      updatedAt: Date.now() - 86400000 * 40,
    },
    {
      id: 'tx-prev-4',
      type: 'expense',
      amount: 580000,
      category: 'kopi_jajan',
      categoryName: 'Kopi & Jajan',
      description: 'Kopi Kedai & Nongkrong',
      date: `${prevY}-${prevM}-18`,
      paymentMethod: 'qris',
      classification: 'wants',
      createdAt: Date.now() - 86400000 * 35,
      updatedAt: Date.now() - 86400000 * 35,
    },
    {
      id: 'tx-prev-5',
      type: 'expense',
      amount: 400000,
      category: 'transport',
      categoryName: 'Transportasi & Bensin',
      description: 'Bensin & Ojol Bulan Lalu',
      date: `${prevY}-${prevM}-20`,
      paymentMethod: 'tunai',
      classification: 'needs',
      createdAt: Date.now() - 86400000 * 33,
      updatedAt: Date.now() - 86400000 * 33,
    },
    {
      id: 'tx-prev-6',
      type: 'expense',
      amount: 900000,
      category: 'belanja',
      categoryName: 'Belanja & Lifestyle',
      description: 'Baju & Aksesoris',
      date: `${prevY}-${prevM}-25`,
      paymentMethod: 'kartu',
      classification: 'wants',
      createdAt: Date.now() - 86400000 * 28,
      updatedAt: Date.now() - 86400000 * 28,
    },
  ];
}

// In-Memory store for rooms with persistence per session
interface RoomStore {
  transactions: Transaction[];
  lastUpdated: number;
}
const rooms: Map<string, RoomStore> = new Map();

function getRoomData(roomId: string): RoomStore {
  const normalizedId = (roomId || 'default').trim().toLowerCase();
  if (!rooms.has(normalizedId)) {
    rooms.set(normalizedId, {
      transactions: [],
      lastUpdated: Date.now(),
    });
  }
  return rooms.get(normalizedId)!;
}

// WebSocket Server attached to HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });
const roomSubscriptions = new Map<WebSocket, string>();

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      const clientRoom = roomSubscriptions.get(client);
      if (clientRoom === roomId) {
        client.send(payload);
      }
    }
  });
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const roomId = (url.searchParams.get('roomId') || 'default').trim().toLowerCase();
  roomSubscriptions.set(ws, roomId);

  // Send initial data immediately
  const room = getRoomData(roomId);
  ws.send(
    JSON.stringify({
      type: 'init',
      roomId,
      data: room.transactions,
      timestamp: Date.now(),
    })
  );

  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      if (msg.type === 'switch_room' && msg.roomId) {
        const newRoom = msg.roomId.trim().toLowerCase();
        roomSubscriptions.set(ws, newRoom);
        const data = getRoomData(newRoom);
        ws.send(
          JSON.stringify({
            type: 'init',
            roomId: newRoom,
            data: data.transactions,
            timestamp: Date.now(),
          })
        );
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (e) {
      console.error('WS message error', e);
    }
  });

  ws.on('close', () => {
    roomSubscriptions.delete(ws);
  });
});

// REST Sync Endpoints
app.get('/api/sync/:roomId', (req, res) => {
  const roomId = (req.params.roomId || 'default').trim().toLowerCase();
  const room = getRoomData(roomId);
  res.json({
    roomId,
    transactions: room.transactions,
    lastUpdated: room.lastUpdated,
    activeConnections: Array.from(roomSubscriptions.values()).filter((r) => r === roomId).length,
  });
});

app.post('/api/sync/:roomId/transaction', (req, res) => {
  const roomId = (req.params.roomId || 'default').trim().toLowerCase();
  const transaction: Transaction = req.body;

  if (!transaction || !transaction.amount || !transaction.type) {
    return res.status(400).json({ error: 'Data transaksi tidak valid' });
  }

  const room = getRoomData(roomId);
  const existingIdx = room.transactions.findIndex((t) => t.id === transaction.id);

  if (existingIdx >= 0) {
    room.transactions[existingIdx] = {
      ...transaction,
      updatedAt: Date.now(),
    };
  } else {
    room.transactions.unshift({
      ...transaction,
      id: transaction.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: transaction.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  }

  room.lastUpdated = Date.now();

  // Real-time broadcast to all connected devices in this room
  broadcastToRoom(roomId, {
    type: existingIdx >= 0 ? 'transaction:updated' : 'transaction:created',
    roomId,
    data: existingIdx >= 0 ? room.transactions[existingIdx] : room.transactions[0],
    timestamp: Date.now(),
  });

  res.json({ success: true, transaction: existingIdx >= 0 ? room.transactions[existingIdx] : room.transactions[0] });
});

app.delete('/api/sync/:roomId/transaction/:id', (req, res) => {
  const roomId = (req.params.roomId || 'default').trim().toLowerCase();
  const id = req.params.id;
  const room = getRoomData(roomId);

  const idx = room.transactions.findIndex((t) => t.id === id);
  if (idx >= 0) {
    const deleted = room.transactions.splice(idx, 1)[0];
    room.lastUpdated = Date.now();

    broadcastToRoom(roomId, {
      type: 'transaction:deleted',
      roomId,
      data: { id },
      timestamp: Date.now(),
    });

    return res.json({ success: true, deletedId: id });
  }

  res.status(404).json({ error: 'Transaksi tidak ditemukan' });
});

app.post('/api/sync/:roomId/reset', (req, res) => {
  const roomId = (req.params.roomId || 'default').trim().toLowerCase();
  const room = getRoomData(roomId);
  room.transactions = [];
  room.lastUpdated = Date.now();

  broadcastToRoom(roomId, {
    type: 'init',
    roomId,
    data: room.transactions,
    timestamp: Date.now(),
  });

  res.json({ success: true, message: 'Data berhasil dikosongkan (Rp 0)', transactions: room.transactions });
});

app.post('/api/sync/:roomId/seed', (req, res) => {
  const roomId = (req.params.roomId || 'default').trim().toLowerCase();
  const room = getRoomData(roomId);
  room.transactions = getInitialSeedTransactions();
  room.lastUpdated = Date.now();

  broadcastToRoom(roomId, {
    type: 'init',
    roomId,
    data: room.transactions,
    timestamp: Date.now(),
  });

  res.json({ success: true, message: 'Data simulasi berhasil dimuat', transactions: room.transactions });
});

app.post('/api/sync/:roomId/import', (req, res) => {
  const roomId = (req.params.roomId || 'default').trim().toLowerCase();
  const { transactions: incomingTx, mode = 'merge' } = req.body || {};

  if (!Array.isArray(incomingTx)) {
    return res.status(400).json({ error: 'Format data transaksi tidak valid' });
  }

  const room = getRoomData(roomId);
  const validIncoming: Transaction[] = incomingTx
    .filter((t: any) => t && typeof t.amount === 'number' && t.amount > 0 && t.id)
    .map((t: any) => ({
      id: String(t.id),
      type: t.type === 'income' ? 'income' : 'expense',
      amount: Math.round(Number(t.amount)),
      category: String(t.category || 'lainnya_keluar'),
      categoryName: String(t.categoryName || 'Lainnya'),
      description: String(t.description || 'Transaksi Impor'),
      date: String(t.date || new Date().toISOString().split('T')[0]),
      paymentMethod: ['tunai', 'qris', 'transfer', 'kartu'].includes(t.paymentMethod)
        ? t.paymentMethod
        : 'qris',
      classification: ['needs', 'wants', 'savings'].includes(t.classification)
        ? t.classification
        : 'needs',
      createdAt: Number(t.createdAt) || Date.now(),
      updatedAt: Date.now(),
    }));

  if (mode === 'replace') {
    room.transactions = validIncoming.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    const map = new Map<string, Transaction>();
    for (const existing of room.transactions) {
      map.set(existing.id, existing);
    }
    for (const item of validIncoming) {
      map.set(item.id, item);
    }
    room.transactions = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  room.lastUpdated = Date.now();

  broadcastToRoom(roomId, {
    type: 'init',
    roomId,
    data: room.transactions,
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    importedCount: validIncoming.length,
    totalCount: room.transactions.length,
    transactions: room.transactions,
  });
});

// AI Endpoints powered by Gemini API with deterministic local fallback
function buildLocalMonthlySummary(summary: any, comparison: any) {
  const totalIncome = Number(summary?.totalIncome || 0);
  const totalExpense = Number(summary?.totalExpense || 0);
  const netCashflow = Number(summary?.netCashflow ?? totalIncome - totalExpense);
  const savingsRate = Number(summary?.savingsRate || 0);
  const needsPct = Number(summary?.needsPct || 0);
  const wantsPct = Number(summary?.wantsPct || 0);
  const txCount = Number(summary?.transactionCount || 0);

  if (txCount === 0 && totalIncome === 0 && totalExpense === 0) {
    return {
      healthScore: 85,
      statusLabel: 'Siap Menganalisis Transaksi',
      summaryNarrative:
        'Belum ada transaksi yang tercatat pada periode ini. Tambahkan pemasukan atau pengeluaran pertama Anda melalui input manual maupun suara agar AI dapat memetakan rasio 50/30/20 secara akurat.',
      actionablePoints: [
        'Catat pemasukan utama untuk mengaktifkan perhitungan rasio tabungan otomatis.',
        'Gunakan fitur Catat Suara AI untuk mencatat pengeluaran harian dengan cepat.',
        'Targetkan alokasi minimal 20% pemasukan untuk tabungan dan dana darurat.',
      ],
      highlightQuote: 'Langkah pertama menuju kebebasan finansial dimulai dari pencatatan yang konsisten.',
    };
  }

  let healthScore = 78;
  let statusLabel = 'Cukup Baik';
  if (netCashflow < 0) {
    healthScore = 48;
    statusLabel = 'Perlu Waspada (Defisit)';
  } else if (savingsRate >= 25) {
    healthScore = 92;
    statusLabel = 'Sangat Sehat';
  } else if (savingsRate >= 15) {
    healthScore = 84;
    statusLabel = 'Kondisi Finansial Stabil';
  } else {
    healthScore = 68;
    statusLabel = 'Perlu Optimasi Tabungan';
  }

  const diffInfo =
    comparison && typeof comparison.expenseDiffPct === 'number' && comparison.prevExpense > 0
      ? ` Dibandingkan bulan sebelumnya, pengeluaran Anda berubah ${comparison.expenseDiffPct >= 0 ? '+' : ''}${comparison.expenseDiffPct}%.`
      : '';

  return {
    healthScore,
    statusLabel,
    summaryNarrative: `Total pemasukan tercatat Rp ${totalIncome.toLocaleString('id-ID')} dengan total pengeluaran Rp ${totalExpense.toLocaleString('id-ID')}, menghasilkan arus kas bersih Rp ${netCashflow.toLocaleString('id-ID')} (rasio tabungan ${savingsRate}%). Distribusi anggaran saat ini terdiri dari ${needsPct}% kebutuhan esensial dan ${wantsPct}% keinginan.${diffInfo}`,
    actionablePoints: [
      savingsRate < 20
        ? `Tingkatkan porsi tabungan dari ${savingsRate}% menuju target ideal 20% dengan menyisihkan dana di awal bulan.`
        : `Pertahankan rasio tabungan ${savingsRate}% dan alokasikan surplus Rp ${Math.max(0, netCashflow).toLocaleString('id-ID')} ke instrumen berisiko rendah.`,
      wantsPct > 30
        ? `Porsi keinginan (${wantsPct}%) melebihi batas ideal 30%. Evaluasi pengeluaran gaya hidup dan jajan harian.`
        : 'Porsi pengeluaran gaya hidup masih dalam batas aman di bawah 30%.',
      'Catat setiap transaksi QRIS dan tunai secara rutin agar analisis bulanan tetap presisi.',
    ],
    highlightQuote: 'Disiplin kecil hari ini adalah kebebasan finansial di masa depan.',
  };
}

app.post('/api/gemini/monthly-summary', async (req, res) => {
  const { monthKey, summary, comparison } = req.body || {};

  if (!summary || Number(summary.transactionCount || 0) === 0) {
    return res.json(buildLocalMonthlySummary(summary, comparison));
  }

  const prompt = `
Anda adalah Asisten Keuangan Pribadi AI cerdas untuk aplikasi "CatatAja".
Analisis data keuangan pengguna untuk bulan ${monthKey}:
- Total Pemasukan: Rp ${Number(summary.totalIncome || 0).toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${Number(summary.totalExpense || 0).toLocaleString('id-ID')}
- Arus Kas Bersih (Sisa Dana): Rp ${Number(summary.netCashflow || 0).toLocaleString('id-ID')}
- Rasio Tabungan: ${summary.savingsRate}%
- Porsi Kebutuhan (Needs): ${summary.needsPct}% (ideal: 50%)
- Porsi Keinginan (Wants): ${summary.wantsPct}% (ideal: 30%)
- Porsi Tabungan/Investasi: ${summary.savingsPct}% (ideal: 20%)
${comparison ? `- Pengeluaran vs Bulan Lalu: ${comparison.expenseDiffPct >= 0 ? '+' : ''}${comparison.expenseDiffPct}% (Selisih: Rp ${Number(comparison.expenseDiff || 0).toLocaleString('id-ID')})` : ''}

Tugas:
Berikan ringkasan eksekutif keuangan dalam Bahasa Indonesia yang ramah, profesional, dan to-the-point:
1. Skor Kesehatan Keuangan (0-100).
2. Status singkat (misal: "Sangat Sehat", "Cukup Baik", "Perlu Waspada", "Defisit").
3. Rangkuman narasi 2 paragraf padat tentang performa bulan ini dan perbandingan dengan bulan lalu.
4. Tiga (3) poin kunci saran aksi langsung untuk efisiensi bulan depan.

Format jawaban harus JSON:
{
  "healthScore": 85,
  "statusLabel": "Sangat Sehat",
  "summaryNarrative": "...",
  "actionablePoints": ["...", "...", "..."],
  "highlightQuote": "..."
}
`;

  const parsed = await generateJsonWithFallback<any>(prompt, 4000);
  if (parsed && typeof parsed.healthScore === 'number' && parsed.summaryNarrative) {
    return res.json(parsed);
  }

  return res.json(buildLocalMonthlySummary(summary, comparison));
});

app.post('/api/gemini/saving-recommendations', async (req, res) => {
  const { summary } = req.body || {};

  const prompt = `
Sebagai pakar perencana keuangan di aplikasi CatatAja, analisis pola belanja pengguna berdasarkan daftar kategori pengeluaran berikut:
${JSON.stringify(summary?.categoryExpenses || {})}

Total Pengeluaran: Rp ${(summary?.totalExpense || 0).toLocaleString('id-ID')}
Total Pemasukan: Rp ${(summary?.totalIncome || 0).toLocaleString('id-ID')}

Tugas:
Identifikasi kebocoran halus (latte factor, impulsif belanja, langganan tersembunyi, biaya antar) dan rekomendasikan 3 ide penghematan konkret yang realistis diterapkan masyarakat Indonesia.

Format jawaban harus JSON Array:
[
  {
    "id": "rec_ai_1",
    "title": "Judul rekomendasi singkat",
    "description": "Penjelasan pola belanja yang dideteksi",
    "potentialSavingsMonthly": 250000,
    "category": "kopi_jajan",
    "urgency": "tinggi" | "sedang" | "info",
    "actionableTip": "Langkah nyata penghematan"
  }
]
`;

  const parsed = await generateJsonWithFallback<any[]>(prompt, 4000);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return res.json(parsed);
  }

  const catExpenses: Record<string, number> = summary?.categoryExpenses || {};
  const kopiSpent = Number(catExpenses.kopi_jajan || 0);
  const makanSpent = Number(catExpenses.makanan || 0);
  const belanjaSpent = Number(catExpenses.belanja || 0);

  return res.json([
    {
      id: 'rec_ai_fallback_1',
      title: 'Batasi Latte Factor & Jajan Harian',
      description:
        kopiSpent > 0
          ? `Pengeluaran kopi & camilan tercatat Rp ${kopiSpent.toLocaleString('id-ID')}. Mengurangi frekuensi jajan dapat menghemat arus kas secara signifikan.`
          : 'Pembelian minuman kekinian dan camilan ringan sering kali tidak terasa namun dapat menumpuk hingga ratusan ribu rupiah sebulan.',
      potentialSavingsMonthly: kopiSpent > 0 ? Math.max(50000, Math.round(kopiSpent * 0.4)) : 250000,
      category: 'kopi_jajan',
      urgency: kopiSpent > 300000 ? 'tinggi' : 'sedang',
      actionableTip: 'Terapkan kuota jajan maksimal 2 kali seminggu dan bawa tumbler sendiri saat beraktivitas.',
    },
    {
      id: 'rec_ai_fallback_2',
      title: 'Optimalkan Anggaran Makan & Pesan Antar',
      description:
        makanSpent > 0
          ? `Pos makanan mencapai Rp ${makanSpent.toLocaleString('id-ID')}. Mengurangi biaya layanan pesan antar akan sangat membantu penghematan.`
          : 'Belanja makanan tanpa daftar rencana atau terlalu sering pesan antar sering meningkatkan pengeluaran bulanan.',
      potentialSavingsMonthly: makanSpent > 0 ? Math.max(75000, Math.round(makanSpent * 0.2)) : 200000,
      category: 'makanan',
      urgency: 'sedang',
      actionableTip: 'Susun daftar menu mingguan dan batasi penggunaan aplikasi pesan antar maksimal 2 kali seminggu.',
    },
    {
      id: 'rec_ai_fallback_3',
      title: 'Aturan Tunggu 24 Jam Sebelum Checkout',
      description:
        belanjaSpent > 0
          ? `Tercatat belanja lifestyle sebesar Rp ${belanjaSpent.toLocaleString('id-ID')}. Pastikan setiap pembelian sesuai prioritas kebutuhan.`
          : 'Pembelian impulsif di e-commerce sering terjadi saat promo tanggal kembar atau flash sale.',
      potentialSavingsMonthly: belanjaSpent > 0 ? Math.max(50000, Math.round(belanjaSpent * 0.3)) : 150000,
      category: 'belanja',
      urgency: 'info',
      actionableTip: 'Masukkan barang ke keranjang terlebih dahulu dan tunggu 24 jam sebelum memutuskan membayar.',
    },
  ]);
});

app.post('/api/gemini/parse-voice', async (req, res) => {
  const { transcript } = req.body || {};

  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Transkrip suara kosong' });
  }

  const localParsed = parseVoiceInput(transcript);

  const prompt = `
Tugas: Ekstrak data transaksi keuangan dari kalimat suara bahasa Indonesia berikut:
"${transcript}"

Kategori yang tersedia:
- Pengeluaran: "makanan", "kopi_jajan", "transport", "belanja", "tagihan", "hiburan", "kesehatan", "pendidikan", "amal", "lainnya_keluar"
- Pemasukan: "gaji", "freelance", "bisnis", "investasi", "bonus", "lainnya_masuk"

Metode Pembayaran: "tunai", "qris", "transfer", "kartu"
Klasifikasi 50/30/20: "needs" (kebutuhan esensial), "wants" (keinginan/rekreasi), "savings" (tabungan/investasi)

Format jawaban JSON:
{
  "type": "expense" | "income",
  "amount": number,
  "category": string,
  "categoryName": string,
  "description": string,
  "paymentMethod": "tunai" | "qris" | "transfer" | "kartu",
  "classification": "needs" | "wants" | "savings",
  "confidence": number
}
`;

  const aiParsed = await generateJsonWithFallback<any>(prompt, 2500);
  if (aiParsed && typeof aiParsed.amount === 'number' && aiParsed.amount > 0 && aiParsed.category) {
    return res.json({
      type: aiParsed.type || localParsed.type,
      amount: aiParsed.amount || localParsed.amount || 25000,
      category: aiParsed.category || localParsed.category,
      categoryName: aiParsed.categoryName || localParsed.categoryName,
      description: aiParsed.description || localParsed.description,
      paymentMethod: aiParsed.paymentMethod || localParsed.paymentMethod,
      classification: aiParsed.classification || localParsed.classification,
      confidence: aiParsed.confidence || 0.95,
    });
  }

  return res.json({
    type: localParsed.type,
    amount: localParsed.amount || 25000,
    category: localParsed.category,
    categoryName: localParsed.categoryName,
    description: localParsed.description,
    paymentMethod: localParsed.paymentMethod,
    classification: localParsed.classification,
    confidence: localParsed.confidence,
  });
});

// Vite middleware in dev or static files in production
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`CatatAja full-stack server running on http://0.0.0.0:${port}`);
  });
}

setupVite();
