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

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomId, setRoomId] = useState<string>(() => {
    return localStorage.getItem('catataja_room_id') || DEFAULT_ROOM;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Clear old initial mock data if present so user starts fresh with Rp 0
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

  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
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
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(rId)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.transactions)) {
          if (json.transactions.length > 0) {
            setTransactions(json.transactions);
          } else {
            // If server restarted with empty memory but local cache has transactions, sync local up to server
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
      }
    } catch {
      // Offline mode: local cache already loaded
    }
  }, []);

  // WebSocket real-time connection
  useEffect(() => {
    let isMounted = true;
    fetchRoomData(roomId);

    function connectWs() {
      if (!isMounted) return;
      setSyncStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${encodeURIComponent(roomId)}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) return;
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
        } catch (e) {
          console.error('Error handling WebSocket message', e);
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setSyncStatus('offline');
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
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

      try {
        const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTx),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.transaction) {
            setLastSyncedAt(new Date());
            return json.transaction;
          }
        }
      } catch {
        // Saved locally
      }

      return newTx;
    },
    [roomId]
  );

  const updateTransaction = useCallback(
    async (tx: Transaction): Promise<void> => {
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));

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
    },
    [roomId]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));

      try {
        await fetch(`/api/sync/${encodeURIComponent(roomId)}/transaction/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        setLastSyncedAt(new Date());
      } catch {
        // Saved locally
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

      try {
        const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: incoming, mode }),
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.transactions)) {
            setTransactions(json.transactions);
            setLastSyncedAt(new Date());
          }
        }
      } catch {
        // Offline import persisted to localStorage via effect
      }

      return incoming.length;
    },
    [roomId]
  );

  const resetToDemoData = useCallback(async (): Promise<void> => {
    setTransactions([]);
    localStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify([]));
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.transactions) {
          setTransactions(json.transactions);
          setLastSyncedAt(new Date());
        }
      }
    } catch {
      // Local reset already completed
    }
  }, [roomId]);

  const loadSimulationData = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}/seed`, {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.transactions) {
          setTransactions(json.transactions);
          setLastSyncedAt(new Date());
        }
      }
    } catch {
      // Ignore offline seed error
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
