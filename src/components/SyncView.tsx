import React, { useState } from 'react';
import {
  RefreshCw,
  Smartphone,
  Laptop,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  RotateCcw,
  Wifi,
  Radio,
  Download,
  Upload,
  Database,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';

interface SyncViewProps {
  onOpenExportImport: (tab: 'export' | 'import') => void;
}

export const SyncView: React.FC<SyncViewProps> = ({ onOpenExportImport }) => {
  const { theme } = useTheme();
  const {
    roomId,
    switchRoom,
    syncStatus,
    connectedDevices,
    lastSyncedAt,
    resetToDemoData,
    loadSimulationData,
    transactions,
  } = useSync();

  const [inputRoomId, setInputRoomId] = useState<string>(roomId);
  const [copied, setCopied] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);

  const handleApplyRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    switchRoom(inputRoomId.trim());
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setIsResetting(true);
    setConfirmClear(false);
    await resetToDemoData();
    setIsResetting(false);
  };

  const handleLoadSimulation = async () => {
    setIsSeeding(true);
    await loadSimulationData();
    setIsSeeding(false);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Header */}
      <div>
        <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-500" />
          <span>Sinkronisasi & Cadangan Data</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sinkronkan catatan antar perangkat atau ekspor/impor file backup JSON & CSV
        </p>
      </div>

      {/* Backup Export & Import Card */}
      <div
        className={`p-5 rounded-3xl border space-y-3 ${
          theme === 'dark'
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Ekspor & Impor Data Keuangan
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {transactions.length} Transaksi
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Simpan salinan transaksi ke perangkat Anda dalam format JSON (backup penuh) atau CSV
          (Microsoft Excel / Google Sheets), serta pulihkan kapan saja.
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onOpenExportImport('export')}
            className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Data</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenExportImport('import')}
            className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>Impor Data</span>
          </button>
        </div>
      </div>

      {/* Sync Status Grand Card */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-500/30'
            : 'bg-emerald-50/70 border-emerald-200'
        }`}
      >
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            theme === 'dark' ? 'border-slate-800/60' : 'border-emerald-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                {syncStatus === 'connected'
                  ? 'Sinkronisasi Real-Time Aktif'
                  : 'Penyimpanan Lokal Aktif (Offline-First)'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {lastSyncedAt
                  ? `Terakhir diperbarui: ${lastSyncedAt.toLocaleTimeString('id-ID')}`
                  : 'Tersimpan otomatis di perangkat'}
              </span>
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0">
            <Radio className="w-3.5 h-3.5" />
            <span>{connectedDevices} Perangkat</span>
          </span>
        </div>

        {/* Current Room Code */}
        <div
          className={`mt-4 flex items-center justify-between p-3 rounded-2xl border ${
            theme === 'dark'
              ? 'bg-slate-950/60 border-slate-800'
              : 'bg-white border-emerald-200'
          }`}
        >
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
              Kode Ruang Sinkronisasi (Sync Room):
            </span>
            <span className="text-sm font-black font-mono tracking-wider text-emerald-600 dark:text-emerald-400">
              {roomId}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              aria-label="Tampilkan Kode QR"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Tampilkan Kode QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Salin Kode Sync"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin'}</span>
            </button>
          </div>
        </div>

        {/* QR Code expansion */}
        {showQR && (
          <div className="mt-4 p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 mb-2">
              <QrCode className="w-28 h-28 text-slate-900" />
            </div>
            <p className="text-xs font-bold">Pindai dari Kamera HP Lain</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Buka aplikasi CatatAja di perangkat kedua dan masukkan kode: <b>{roomId}</b>
            </p>
          </div>
        )}
      </div>

      {/* Switch / Join Another Room */}
      <div
        className={`p-5 rounded-3xl border ${
          theme === 'dark' ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
          Ganti atau Gabung Ruang Sync Lain
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Gunakan kode unik untuk berbagi catatan keuangan bersama pasangan, keluarga, atau antar
          gadget pribadi.
        </p>

        <form onSubmit={handleApplyRoom} className="flex gap-2">
          <input
            type="text"
            required
            aria-label="Kode Ruang Sync"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="Masukkan kode ruang..."
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-mono font-bold border ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-700 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            } outline-none focus:border-emerald-500`}
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-xs"
          >
            Terapkan
          </button>
        </form>
      </div>

      {/* Multi-Device Illustrated Guide */}
      <div
        className={`p-5 rounded-3xl border space-y-3 ${
          theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Cara Kerja Sinkronisasi Instan</span>
        </h3>

        <div className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-800 dark:text-slate-200 block">
                1. Input Cepat di Ponsel (Suara)
              </b>
              <span>
                Catat pengeluaran di jalan menggunakan pengenalan suara tanpa repot mengetik.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-800 dark:text-slate-200 block">
                2. Langsung Muncul di Laptop / Tablet
              </b>
              <span>
                Data disiarkan via WebSocket server ke seluruh perangkat pada ruang sync yang sama.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Wifi className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-800 dark:text-slate-200 block">
                3. Mode Offline-First & Backup File
              </b>
              <span>
                Data tetap tersimpan di memori perangkat dan dapat diekspor ke file JSON/CSV kapan
                saja.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management: Clear or Load Simulation */}
      <div className="space-y-2.5">
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Kosongkan Semua Data
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Hapus semua catatan dan kembalikan saldo ke Rp 0 ({transactions.length} transaksi)
            </span>
          </div>

          <button
            type="button"
            onClick={handleClearData}
            disabled={isResetting || transactions.length === 0}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40 ${
              confirmClear
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{confirmClear ? 'Yakin Kosongkan?' : 'Kosongkan'}</span>
          </button>
        </div>

        <div
          className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
            theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Muat Data Simulasi (Opsional)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Isi otomatis data contoh pengeluaran & pemasukan Indonesia untuk uji coba
            </span>
          </div>

          <button
            type="button"
            onClick={handleLoadSimulation}
            disabled={isSeeding}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>Muat Simulasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
