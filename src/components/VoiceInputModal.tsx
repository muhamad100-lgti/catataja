import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, X, RefreshCw, Volume2, ArrowRight } from 'lucide-react';
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
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [micError, setMicError] = useState<string | null>(null);

  // Editable fields in preview
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editCategory, setEditCategory] = useState<string>('makanan');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('qris');

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // When modal opens, auto-start listening if supported
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
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
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
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

        // If final result
        if (event.results[event.results.length - 1].isFinal) {
          processTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setMicError('Izin mikrofon belum diberikan. Silakan izinkan atau gunakan contoh suara di bawah.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setMicError(`Gangguan suara: ${event.error}`);
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
      setMicError('Gagal mengakses audio mikrofon');
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

  // Process transcript with instant local NLP and optional AI refinement
  const processTranscript = async (text: string) => {
    if (!text.trim()) return;

    // 1. Immediately apply high-precision local Indonesian parser
    const localResult = parseVoiceInput(text);
    applyParsedResult(localResult);

    // 2. Query AI in background for nuance
    setIsProcessingAI(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
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
            rawText: text,
          };
          applyParsedResult(result);
        }
      }
    } catch (e) {
      // Local result already set and working
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
    setTranscript(sampleText);
    processTranscript(sampleText);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md max-h-[90vh] flex flex-col rounded-t-[32px] sm:rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">Catat Lewat Suara AI</h2>
              <p className="text-[11px] text-slate-400">Teknologi pengenalan suara otomatis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Animated Big Microphone Section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative my-2">
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse-ring"></div>
                  <div className="absolute -inset-3 rounded-full bg-emerald-500/15 animate-ping"></div>
                </>
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? 'Hentikan rekaman' : 'Mulai bicara'}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-rose-500/40 scale-105'
                    : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-emerald-500/40 hover:scale-105'
                }`}
              >
                {isListening ? (
                  <Mic className="w-10 h-10 animate-bounce" />
                ) : (
                  <MicOff className="w-10 h-10 opacity-90" />
                )}
              </button>
            </div>

            <p className="mt-3 text-sm font-semibold">
              {isListening
                ? 'Sedang mendengarkan... Bicaralah sekarang'
                : 'Tekan mikrofon untuk mulai berbicara'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs mt-0.5">
              Contoh: "Beli kopi kenangan 25 ribu pakai QRIS" atau "Gaji masuk 8 juta transfer"
            </p>

            {micError && (
              <div className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                {micError}
              </div>
            )}
          </div>

          {/* Spoken Transcript Bubble */}
          {(transcript || isListening) && (
            <div
              className={`p-4 rounded-2xl border text-sm transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hasil Suara Terdeteksi:</span>
              </div>
              <p className="font-medium text-slate-200 dark:text-slate-200 italic">
                "{transcript || 'Mendengarkan...'}"
              </p>
            </div>
          )}

          {/* Quick Voice Demo Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Coba Kalimat Suara Cepat:</span>
              <span className="text-[10px]">Klik untuk tes langsung</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('Beli kopi kenangan 25 ribu pakai QRIS')}
                className="text-left px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/40 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <span>☕ Kopi 25rb QRIS</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Makan siang bakso 35 ribu tunai')}
                className="text-left px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/40 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <span>🍜 Makan siang 35rb Tunai</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Isi bensin pertamax 40 ribu')}
                className="text-left px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/40 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <span>⛽ Bensin 40rb</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Gaji bulanan masuk 8 juta 500 ribu transfer')}
                className="text-left px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/40 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <span>💼 Gaji 8,5jt Transfer</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            </div>
          </div>

          {/* Extracted Structured Data Result & Confirmation */}
          {isProcessingAI ? (
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center gap-3 text-sm text-emerald-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI sedang mengekstrak nominal & kategori...</span>
            </div>
          ) : parsedResult ? (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                theme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Berhasil Diekstrak AI
                </span>
                <span className="text-[10px] text-slate-400">Periksa & Sesuaikan</span>
              </div>

              {/* Amount & Type selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
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
                  <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">
                    {formatRupiah(editAmount)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Jenis
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
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
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
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
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
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
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
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Transaksi Suara ({formatRupiah(editAmount)})</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
