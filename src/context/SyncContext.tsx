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
          setTransactions(json.transactions);
          setConnectedDevices(Math.max(1, json.activeConnections || 1));
          setLastSyncedAt(new Date());
        }
      }
    } catch (e) {
      console.warn('Initial REST sync fallback to local cache', e);
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
            setTransactions(msg.data);
            setLastSyncedAt(new Date());
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
        // Auto-reconnect in 3s
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connectWs();

    // Heartbeat ping every 25s
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

      // Optimistic local update
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
      } catch (err) {
        console.warn('Network offline, transaction saved locally', err);
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
      } catch (err) {
        console.warn('Network offline, update stored locally', err);
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
      } catch (err) {
        console.warn('Network offline, deletion stored locally', err);
      }
    },
    [roomId]
  );

  const resetToDemoData = useCallback(async (): Promise<void> => {
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
    } catch (err) {
      console.warn('Reset error', err);
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
    } catch (err) {
      console.warn('Simulation seed error', err);
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
