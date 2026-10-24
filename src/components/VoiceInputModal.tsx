import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, X, RefreshCw, Volume2, ArrowRight, Send } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { parseVoiceInput, ParsedVoiceResult } from '../utils/voiceParser';
import { formatRupiah } from '../utils/finance';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { TransactionType, PaymentMethod, BudgetClassification } from '../types';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: {
    type: TransactionType;
    amount: number;
    category: string;
    categoryName: string;
    description: string;
    date: string;
    paymentMethod: PaymentMethod;
    classification: BudgetClassification;
  }) => Promise<any>;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [customTextInput, setCustomTextInput] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Editable fields in preview
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editCategory, setEditCategory] = useState<string>('makanan');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('qris');

  const recognitionRef = useRef<any>(null);

  // When modal opens, reset state and start listening if SpeechRecognition is available
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setCustomTextInput('');
      setParsedResult(null);
      setMicError(null);
      startListening();
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    setMicError(null);
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        setCustomTextInput(currentTranscript);

        if (event.results[event.results.length - 1].isFinal) {
          processTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setMicError('Izin mikrofon belum aktif. Ketik kalimat transaksi di kotak bawah atau klik contoh cepat.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setMicError('Mikrofon tidak terdeteksi. Gunakan kotak ketik kalimat AI di bawah.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
  };

  // Process transcript with instant local NLP and optional AI server refinement
  const processTranscript = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    // 1. Immediately apply high-precision local Indonesian parser
    const localResult = parseVoiceInput(clean);
    applyParsedResult(localResult);

    // 2. Skip server call on static hosts (e.g. GitHub Pages) for instant zero-latency UX
    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    if (host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('netlify.app')) {
      return;
    }

    // 3. Query AI backend in background for nuance when server is running
    setIsProcessingAI(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: clean }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const aiResult = await res.json();
        if (aiResult.amount && aiResult.category) {
          const result: ParsedVoiceResult = {
            type: aiResult.type || localResult.type,
            amount: Number(aiResult.amount) || localResult.amount,
            category: aiResult.category || localResult.category,
            categoryName: aiResult.categoryName || localResult.categoryName,
            description: aiResult.description || localResult.description,
            paymentMethod: aiResult.paymentMethod || localResult.paymentMethod,
            classification: aiResult.classification || localResult.classification,
            confidence: aiResult.confidence || 0.98,
            rawText: clean,
          };
          applyParsedResult(result);
        }
      }
    } catch {
      // Local result already applied
    } finally {
      setIsProcessingAI(false);
    }
  };

  const applyParsedResult = (result: ParsedVoiceResult) => {
    setParsedResult(result);
    setEditAmount(result.amount);
    setEditType(result.type);
    setEditCategory(result.category);
    setEditDescription(result.description);
    setEditPaymentMethod(result.paymentMethod);
  };

  const handleApplyPreset = (sampleText: string) => {
    stopListening();
    setTranscript(sampleText);
    setCustomTextInput(sampleText);
    processTranscript(sampleText);
  };

  const handleManualSentenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTextInput.trim()) return;
    stopListening();
    setTranscript(customTextInput.trim());
    processTranscript(customTextInput.trim());
  };

  const handleSave = async () => {
    if (editAmount <= 0) return;

    const catList = editType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const cat = catList.find((c) => c.id === editCategory) || catList[0];

    const today = new Date().toISOString().split('T')[0];

    await onSave({
      type: editType,
      amount: editAmount,
      category: editCategory,
      categoryName: cat.name,
      description: editDescription || cat.name,
      date: today,
      paymentMethod: editPaymentMethod,
      classification: cat.defaultClassification,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">Catat Suara & Kalimat AI</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ucapkan atau ketik kalimat, AI otomatis mendeteksi nominal & kategori
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Animated Microphone Section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative my-1">
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse-ring"></div>
                  <div className="absolute -inset-3 rounded-full bg-emerald-500/15 animate-ping"></div>
                </>
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? 'Hentikan rekaman' : 'Mulai bicara'}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-500/40 scale-105'
                    : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-emerald-500/30 hover:scale-105'
                }`}
              >
                {isListening ? (
                  <Mic className="w-8 h-8 animate-bounce" />
                ) : (
                  <MicOff className="w-8 h-8 opacity-90" />
                )}
              </button>
            </div>

            <p className="mt-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              {isListening
                ? 'Mendengarkan... Silakan bicara'
                : 'Ketuk mikrofon untuk bicara atau ketik kalimat di bawah'}
            </p>

            {micError && (
              <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
                {micError}
              </div>
            )}
          </div>

          {/* Direct Natural Language Input Box (works everywhere including GitHub Pages without mic) */}
          <form onSubmit={handleManualSentenceSubmit} className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Ketik / Edit Kalimat Transaksi AI:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                placeholder="Contoh: Beli kopi kenangan 25 ribu pakai QRIS"
                className={`flex-1 h-10 px-3.5 rounded-xl text-xs border outline-none transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                }`}
              />
              <button
                type="submit"
                disabled={!customTextInput.trim()}
                className="h-10 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Proses AI</span>
              </button>
            </div>
          </form>

          {/* Spoken Transcript Bubble */}
          {(transcript || isListening) && (
            <div
              className={`p-3.5 rounded-2xl border text-xs transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Kalimat Dianalisis AI:</span>
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 italic">
                "{transcript || 'Mendengarkan...'}"
              </p>
            </div>
          )}

          {/* Quick Voice Demo Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Contoh Kalimat Cepat:</span>
              <span>Ketuk untuk uji coba</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Kopi 25rb QRIS', text: 'Beli kopi kenangan 25 ribu pakai QRIS' },
                { label: 'Makan siang 35rb Tunai', text: 'Makan siang bakso 35 ribu tunai' },
                { label: 'Bensin 40rb QRIS', text: 'Isi bensin pertamax 40 ribu pakai QRIS' },
                { label: 'Gaji 8,5jt Transfer', text: 'Gaji bulanan masuk 8 juta 500 ribu transfer' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset.text)}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                    theme === 'dark'
                      ? 'bg-slate-800/50 hover:bg-emerald-500/10 border-slate-700/70 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300'
                      : 'bg-slate-100 hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700'
                  }`}
                >
                  <span className="truncate">{preset.label}</span>
                  <ArrowRight className="w-3 h-3 opacity-60 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Extracted Structured Data Result & Confirmation */}
          {parsedResult ? (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                theme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <div
                className={`flex items-center justify-between pb-2 border-b ${
                  theme === 'dark' ? 'border-slate-800/80' : 'border-emerald-200/80'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  {isProcessingAI ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyempurnakan Ekstraksi AI...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Berhasil Diekstrak AI</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Periksa & Sesuaikan
                </span>
              </div>

              {/* Amount & Type selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    value={editAmount || ''}
                    onChange={(e) => setEditAmount(Number(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block tabular-nums">
                    {formatRupiah(editAmount)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                    Jenis Transaksi
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as TransactionType)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {(editType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                    Pembayaran
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border uppercase ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="qris">QRIS</option>
                    <option value="tunai">Tunai / Cash</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="kartu">Kartu Debit/Kredit</option>
                  </select>
                </div>
              </div>

              {/* Note / Description */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Misal: Kopi Kenangan Mall"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={editAmount <= 0}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Transaksi ({formatRupiah(editAmount)})</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
