import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Transaction, SyncMessage } from '../types';

interface SyncContextType {
  roomId: string;
  transactions: Transaction[];
  syncStatus: 'connected' | 'connecting' | 'offline';
  connectedDevices: number;
  lastSyncedAt: Date | null;
  switchRoom: (newRoomId: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  importTransactions: (incoming: Transaction[], mode: 'merge' | 'replace') => Promise<number>;
  resetToDemoData: () => Promise<void>;
  loadSimulationData: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

const DEFAULT_ROOM = 'catataja-utama';
const STORAGE_PREFIX = 'catataja_tx_';

function buildLocalSeedTransactions(): Transaction[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');

  return [
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
      description: 'Kopi Susu & Pastry Mingguan',
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

function isStaticHostEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('netlify.app');
}

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState<string>(() => {
    return localStorage.getItem('catataja_room_id') || DEFAULT_ROOM;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (localStorage.getItem('catataja_mock_cleared') !== 'v3') {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}catataja-utama`);
        localStorage.removeItem(`${STORAGE_PREFIX}default`);
      } catch {}
      localStorage.setItem('catataja_mock_cleared', 'v3');
      return [];
    }
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${roomId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'offline'>(() =>
    isStaticHostEnvironment() ? 'offline' : 'connecting'
  );
  const [connectedDevices, setConnectedDevices] = useState<number>(1);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Save to local storage whenever transactions or roomId changes
  useEffect(() => {
    localStorage.setItem('catataja_room_id', roomId);
    localStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify(transactions));
  }, [transactions, roomId]);

  // REST initial fetch
  const fetchRoomData = useCallback(async (rId: string) => {
    if (isStaticHostEnvironment()) {
      const savedRaw = localStorage.getItem(`${STORAGE_PREFIX}${rId}`);
      const savedLocal: Transaction[] = savedRaw ? JSON.parse(savedRaw) : [];
      setTransactions(savedLocal);
      setSyncStatus('offline');
      return;
    }

    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(rId)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (Array.isArray(json.transactions)) {
          if (json.transactions.length > 0) {
            setTransactions(json.transactions);
          } else {
            const savedRaw = localStorage.getItem(`${STORAGE_PREFIX}${rId}`);
            const savedLocal: Transaction[] = savedRaw ? JSON.parse(savedRaw) : [];
            if (savedLocal.length > 0) {
              setTransactions(savedLocal);
              fetch(`/api/sync/${encodeURIComponent(rId)}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: savedLocal, mode: 'merge' }),
              }).catch(() => {});
            } else {
              setTransactions([]);
            }
          }
          setConnectedDevices(Math.max(1, json.activeConnections || 1));
          setLastSyncedAt(new Date());
        }
      } else {
        setSyncStatus('offline');
      }
    } catch {
      setSyncStatus('offline');
    }
  }, []);

  // WebSocket real-time connection
  useEffect(() => {
    let isMounted = true;
    let failCount = 0;
    fetchRoomData(roomId);

    if (isStaticHostEnvironment()) {
      return;
    }

    function connectWs() {
      if (!isMounted || failCount >= 3) return;
      if (failCount === 0) {
        setSyncStatus('connecting');
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${encodeURIComponent(roomId)}`;

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          failCount = 0;
          setSyncStatus('connected');
          setLastSyncedAt(new Date());
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg: SyncMessage = JSON.parse(event.data);
            if (msg.roomId && msg.roomId.toLowerCase() !== roomId.toLowerCase()) return;

            if (msg.type === 'init' && Array.isArray(msg.data)) {
              if (msg.data.length > 0) {
                setTransactions(msg.data);
                setLastSyncedAt(new Date());
              }
            } else if (msg.type === 'transaction:created' && msg.data) {
              setTransactions((prev) => {
                if (prev.some((t) => t.id === msg.data.id)) return prev;
                return [msg.data, ...prev];
              });
              setLastSyncedAt(new Date());
            } else if (msg.type === 'transaction:updated' && msg.data) {
              setTransactions((prev) =>
                prev.map((t) => (t.id === msg.data.id ? msg.data : t))
              );
              setLastSyncedAt(new Date());
            } else if (msg.type === 'transaction:deleted' && msg.data?.id) {
              setTransactions((prev) => prev.filter((t) => t.id !== msg.data.id));
              setLastSyncedAt(new Date());
            }
          } catch {
            // ignore malformed WS frames
          }
        };

        socket.onclose = () => {
          if (!isMounted) return;
          failCount += 1;
          setSyncStatus('offline');
          if (failCount < 3) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
          }
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch {
        setSyncStatus('offline');
      }
    }

    connectWs();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, fetchRoomData]);

  const switchRoom = useCallback((newRoomId: string) => {
    const cleanId = (newRoomId || DEFAULT_ROOM).trim().toLowerCase();
    setRoomId(cleanId);
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${cleanId}`);
      setTransactions(saved ? JSON.parse(saved) : []);
    } catch {
      setTransactions([]);
    }
  }, []);

  const addTransaction = useCallback(
    async (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setTransactions((prev) => [newTx, ...prev]);

      if (!isStaticHostEnvironment()) {
        try {
          const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTx),
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json = await res.json();
            if (json.transaction) {
              setLastSyncedAt(new Date());
              return json.transaction;
            }
          }
        } catch {
          // Saved locally
        }
      }

      return newTx;
    },
    [roomId]
  );

  const updateTransaction = useCallback(
    async (tx: Transaction): Promise<void> => {
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));

      if (!isStaticHostEnvironment()) {
        try {
          await fetch(`/api/sync/${encodeURIComponent(roomId)}/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
          });
          setLastSyncedAt(new Date());
        } catch {
          // Saved locally
        }
      }
    },
    [roomId]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));

      if (!isStaticHostEnvironment()) {
        try {
          await fetch(`/api/sync/${encodeURIComponent(roomId)}/transaction/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
          setLastSyncedAt(new Date());
        } catch {
          // Saved locally
        }
      }
    },
    [roomId]
  );

  const importTransactions = useCallback(
    async (incoming: Transaction[], mode: 'merge' | 'replace'): Promise<number> => {
      if (!Array.isArray(incoming) || incoming.length === 0) return 0;

      setTransactions((prev) => {
        if (mode === 'replace') {
          return [...incoming].sort((a, b) => b.createdAt - a.createdAt);
        }
        const map = new Map<string, Transaction>();
        for (const existing of prev) {
          map.set(existing.id, existing);
        }
        for (const item of incoming) {
          map.set(item.id, item);
        }
        return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      });

      if (!isStaticHostEnvironment()) {
        try {
          const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions: incoming, mode }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json = await res.json();
            if (Array.isArray(json.transactions)) {
              setTransactions(json.transactions);
              setLastSyncedAt(new Date());
            }
          }
        } catch {
          // Offline import persisted to localStorage via effect
        }
      }

      return incoming.length;
    },
    [roomId]
  );

  const resetToDemoData = useCallback(async (): Promise<void> => {
    setTransactions([]);
    localStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify([]));
    if (!isStaticHostEnvironment()) {
      try {
        const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/reset`, {
          method: 'POST',
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (json.transactions) {
            setTransactions(json.transactions);
            setLastSyncedAt(new Date());
          }
        }
      } catch {
        // Local reset already completed
      }
    }
  }, [roomId]);

  const loadSimulationData = useCallback(async (): Promise<void> => {
    // 1. Immediately apply local seed transactions so it works 100% on GitHub Pages & offline
    const localSeeds = buildLocalSeedTransactions();
    setTransactions(localSeeds);
    localStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify(localSeeds));

    if (!isStaticHostEnvironment()) {
      try {
        const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/seed`, {
          method: 'POST',
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (Array.isArray(json.transactions) && json.transactions.length > 0) {
            setTransactions(json.transactions);
            setLastSyncedAt(new Date());
          }
        }
      } catch {
        // Local seed already loaded
      }
    }
  }, [roomId]);

  return (
    <SyncContext.Provider
      value={{
        roomId,
        transactions,
        syncStatus,
        connectedDevices,
        lastSyncedAt,
        switchRoom,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        importTransactions,
        resetToDemoData,
        loadSimulationData,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
