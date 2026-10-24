import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  FolderUp,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import {
  exportTransactionsToJson,
  exportTransactionsToCsv,
  parseImportedData,
} from '../utils/dataTransfer';
import { formatRupiah } from '../utils/finance';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'export' | 'import';
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'export',
}) => {
  const { theme } = useTheme();
  const { transactions, roomId, importTransactions } = useSync();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [rawImportText, setRawImportText] = useState<string>('');
  const [copiedFormat, setCopiedFormat] = useState<'json' | 'csv' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusMessage(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayStr = new Date().toISOString().split('T')[0];

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatusMessage({
        type: 'success',
        text: `File ${filename} berhasil diunduh (${transactions.length} transaksi).`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Gagal mengunduh file secara otomatis. Gunakan tombol Salin di bawah.',
      });
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = exportTransactionsToJson(transactions, roomId);
    triggerDownload(
      jsonStr,
      `catataja-backup-${todayStr}.json`,
      'application/json;charset=utf-8'
    );
  };

  const handleDownloadCsv = () => {
    const csvStr = exportTransactionsToCsv(transactions);
    triggerDownload(
      '\uFEFF' + csvStr,
      `catataja-transaksi-${todayStr}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleCopyExport = async (format: 'json' | 'csv') => {
    const text =
      format === 'json'
        ? exportTransactionsToJson(transactions, roomId)
        : exportTransactionsToCsv(transactions);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setStatusMessage({
        type: 'success',
        text: `Data ${format.toUpperCase()} (${transactions.length} transaksi) berhasil disalin ke clipboard.`,
      });
      setTimeout(() => setCopiedFormat(null), 2500);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Gagal menyalin ke clipboard.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = String(event.target?.result || '');
      setRawImportText(content);
      setStatusMessage({
        type: 'success',
        text: `File "${file.name}" berhasil dibaca. Klik tombol "Proses Impor Data" di bawah untuk menyimpan.`,
      });
    };
    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: 'Gagal membaca file yang dipilih.',
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFillSampleCsv = () => {
    const sampleCsv = [
      'ID,Tanggal,Jenis,Kategori_ID,Nama_Kategori,Deskripsi,Nominal,Metode_Pembayaran,Klasifikasi',
      `tx-sample-1,${todayStr},Pemasukan,gaji,Gaji Utama,Gaji Bulanan,8500000,transfer,savings`,
      `tx-sample-2,${todayStr},Pengeluaran,makanan,Makanan & Minuman,Makan Siang Nasi Padang,35000,qris,needs`,
      `tx-sample-3,${todayStr},Pengeluaran,kopi_jajan,Kopi & Jajan,Es Kopi Susu,22000,qris,wants`,
    ].join('\n');
    setRawImportText(sampleCsv);
    setStatusMessage(null);
  };

  const handleProcessImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      setIsImporting(true);
      const result = parseImportedData(rawImportText);
      const count = await importTransactions(result.transactions, importMode);
      setStatusMessage({
        type: 'success',
        text: `Berhasil mengimpor ${count} transaksi (${result.format.toUpperCase()}) dengan mode ${
          importMode === 'merge' ? 'Gabungkan' : 'Ganti Semua'
        }!`,
      });
      setRawImportText('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal memproses data impor. Pastikan format JSON atau CSV benar.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ekspor dan Impor Data Keuangan"
        className={`w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div>
            <h2 className="font-bold text-base">Ekspor & Impor Data</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cadangkan atau pulihkan transaksi dalam format JSON & CSV (Excel)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal ekspor impor"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-5 pt-3">
          <div
            className={`grid grid-cols-2 p-1 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('export');
                setStatusMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Data ({transactions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('import');
                setStatusMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Impor Data</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              )}
              <span className="leading-relaxed font-medium">{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Summary Box */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  theme === 'dark'
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Catatan Tersimpan:</span>
                  <span className="font-bold font-mono">{transactions.length} Transaksi</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Pemasukan:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatRupiah(totalIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total Pengeluaran:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Download Options */}
              <div className="space-y-2.5">
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    theme === 'dark'
                      ? 'bg-slate-950/40 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Format Backup JSON</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Cadangan lengkap untuk dipulihkan kapan saja
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyExport('json')}
                      aria-label="Salin JSON"
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Salin JSON ke Clipboard"
                    >
                      {copiedFormat === 'json' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh JSON</span>
                    </button>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    theme === 'dark'
                      ? 'bg-slate-950/40 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Format Tabel CSV (Excel)</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Buka langsung di Microsoft Excel / Google Sheets
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyExport('csv')}
                      aria-label="Salin CSV"
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Salin CSV ke Clipboard"
                    >
                      {copiedFormat === 'csv' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProcessImport} className="space-y-4">
              {/* Import Mode Selection */}
              <div>
                <label className="text-xs font-bold block mb-1.5">
                  Pilih Mode Penyimpanan Impor:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : theme === 'dark'
                        ? 'border-slate-800 bg-slate-950/50 text-slate-400'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold block">Gabungkan (Merge)</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      Tambah ke data yang ada tanpa menghapus catatan lama
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : theme === 'dark'
                        ? 'border-slate-800 bg-slate-950/50 text-slate-400'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold block">Ganti Semua (Replace)</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      Hapus catatan lama dan ganti dengan isi file impor
                    </span>
                  </button>
                </div>
              </div>

              {/* File Upload Picker */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,application/json,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/40'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50'
                  }`}
                >
                  <FolderUp className="w-6 h-6 text-emerald-500" />
                  <span className="text-xs font-bold">
                    Pilih File Backup (.JSON atau .CSV)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Klik untuk mengunggah file dari HP atau komputer Anda
                  </span>
                </button>
              </div>

              {/* Paste Raw JSON/CSV Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="import-raw-textarea"
                    className="text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Atau Tempel Data JSON / CSV:
                  </label>
                  <button
                    type="button"
                    onClick={handleFillSampleCsv}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Isi Contoh Format CSV
                  </button>
                </div>
                <textarea
                  id="import-raw-textarea"
                  rows={4}
                  value={rawImportText}
                  onChange={(e) => setRawImportText(e.target.value)}
                  placeholder='Tempel teks backup JSON atau baris CSV di sini...'
                  className={`w-full p-3 rounded-xl text-xs font-mono border outline-none focus:border-emerald-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Submit Import Button */}
              <button
                type="submit"
                disabled={isImporting || !rawImportText.trim()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isImporting ? 'Memproses Impor Data...' : 'Proses Impor Data Sekarang'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
