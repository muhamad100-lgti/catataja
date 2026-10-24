import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  TrendingDown,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Award,
  Bookmark,
  Send,
  MessageSquare,
  ReceiptText,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSync } from '../context/SyncContext';
import {
  calculateMonthlySummary,
  compareMonths,
  formatRupiah,
  getPreviousMonthKey,
  generateSavingRecommendations,
  formatMonthLabel,
  generateLocalMonthlyAIAnalysis,
  answerFinancialQuestionLocally,
  AIMonthlyAnalysisResult,
} from '../utils/finance';
import { SavingRecommendation } from '../types';
import { ALL_CATEGORIES } from '../constants/categories';

interface AIAdvisorViewProps {
  selectedMonth: string;
  initialQuestion?: string | null;
  onClearInitialQuestion?: () => void;
}

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS = [
  'Apa saja yang telah dihabiskan selama bulan ini?',
  'Apa pos pengeluaran terbesarku?',
  'Evaluasi rasio 50/30/20 saya',
  'Simulasi bagi gaji 7 juta',
  'Berapa target dana darurat ideal?',
];

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  selectedMonth,
  initialQuestion,
  onClearInitialQuestion,
}) => {
  const { theme } = useTheme();
  const { transactions } = useSync();

  const prevMonthKey = getPreviousMonthKey(selectedMonth);
  const summary = calculateMonthlySummary(transactions, selectedMonth);
  const comparison = compareMonths(transactions, selectedMonth, prevMonthKey);

  const monthExpenseTxs = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(selectedMonth))
    .sort((a, b) => b.amount - a.amount);

  const sortedExpenseCategories = Object.entries(summary.categoryExpenses).sort(
    (a, b) => b[1].total - a[1].total
  );

  const [perspectiveIdx, setPerspectiveIdx] = useState<number>(0);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<SavingRecommendation[]>(() => {
    return generateSavingRecommendations(transactions, selectedMonth);
  });

  // AI Monthly Analysis response — initialized immediately with deterministic AI engine
  const [aiAnalysis, setAiAnalysis] = useState<AIMonthlyAnalysisResult>(() =>
    generateLocalMonthlyAIAnalysis(transactions, selectedMonth, 0)
  );

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Interactive AI Consultation Chat State
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAskingAI, setIsAskingAI] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>(() => [
    {
      id: 'welcome-ai',
      role: 'assistant',
      text: answerFinancialQuestionLocally('ringkasan', transactions, selectedMonth),
    },
  ]);

  useEffect(() => {
    if (chatHistory.length > 1 && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Keep local analysis and recommendations synchronized when transactions or month change
  useEffect(() => {
    setRecommendations(generateSavingRecommendations(transactions, selectedMonth));
    setAiAnalysis(generateLocalMonthlyAIAnalysis(transactions, selectedMonth, perspectiveIdx));
    setChatHistory((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-ai') {
        return [
          {
            id: 'welcome-ai',
            role: 'assistant',
            text: answerFinancialQuestionLocally('ringkasan', transactions, selectedMonth),
          },
        ];
      }
      return prev;
    });
  }, [transactions, selectedMonth]);

  // Handle initialQuestion passed from Dashboard or other views
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      handleAskQuestion(initialQuestion);
      if (onClearInitialQuestion) {
        onClearInitialQuestion();
      }
    }
  }, [initialQuestion]);

  // Generate automated monthly summary via Gemini API with seamless local fallback (works on GitHub Pages)
  const fetchMonthlySummaryAI = async () => {
    setIsLoadingAI(true);
    const nextIdx = perspectiveIdx + 1;
    setPerspectiveIdx(nextIdx);
    const localFallback = generateLocalMonthlyAIAnalysis(transactions, selectedMonth, nextIdx);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const res = await fetch('/api/gemini/monthly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthKey: selectedMonth,
          summary,
          comparison,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data.healthScore === 'number' && data.summaryNarrative) {
          setAiAnalysis({
            ...localFallback,
            ...data,
            perspectiveTitle: localFallback.perspectiveTitle,
          });
          setIsLoadingAI(false);
          return;
        }
      }
    } catch {
      // Static host (GitHub Pages) or offline — use local AI analysis
    }

    await new Promise((r) => setTimeout(r, 300));
    setAiAnalysis(localFallback);
    setIsLoadingAI(false);
  };

  // Generate pattern-based recommendations via Gemini API with seamless local fallback
  const fetchAISavingRecommendations = async () => {
    setIsLoadingRecs(true);
    const localRecs = generateSavingRecommendations(transactions, selectedMonth);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const res = await fetch('/api/gemini/saving-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          transactions: transactions.filter((t) => t.date.startsWith(selectedMonth)),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRecommendations(data);
          setIsLoadingRecs(false);
          return;
        }
      }
    } catch {
      // Static host (GitHub Pages) or offline — use local AI pattern detector
    }

    await new Promise((r) => setTimeout(r, 300));
    setRecommendations(localRecs);
    setIsLoadingRecs(false);
  };

  // Ask interactive AI financial advisor question
  const handleAskQuestion = async (rawQuestion: string) => {
    const q = rawQuestion.trim();
    if (!q || isAskingAI) return;

    const userMsg: ChatItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
    };
    setChatHistory((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setIsAskingAI(true);

    // Immediately compute local financial answer so response is fast and reliable
    let replyText = answerFinancialQuestionLocally(q, transactions, selectedMonth);

    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const isStatic =
      host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('netlify.app');

    const isItemizedSpendingQuery =
      q.toLowerCase().includes('dihabiskan') ||
      q.toLowerCase().includes('habis buat apa') ||
      q.toLowerCase().includes('rincian pengeluaran') ||
      q.toLowerCase().includes('daftar pengeluaran');

    if (!isStatic && !isItemizedSpendingQuery) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            monthKey: selectedMonth,
            summary,
            transactions: transactions.filter((t) => t.date.startsWith(selectedMonth)),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.answer && typeof data.answer === 'string') {
            replyText = data.answer;
          }
        }
      } catch {
        // Static host (GitHub Pages) or offline — replyText from local engine is already ready
      }
    }

    const aiMsg: ChatItem = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      text: replyText,
    };
    setChatHistory((prev) => [...prev, aiMsg]);
    setIsAskingAI(false);
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPotentialSavings = recommendations.reduce(
    (acc, r) => acc + (r.potentialSavingsMonthly || 0),
    0
  );

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Top Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-base flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>AI Penasihat Finansial</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Periode: {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMonthlySummaryAI}
          disabled={isLoadingAI}
          className="h-9 px-3 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAI ? 'animate-spin' : ''}`} />
          <span>Analisis Ulang</span>
        </button>
      </div>

      {/* Interactive AI Financial Advisor Chat Card */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
          theme === 'dark'
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Tanya AI Konsultan Keuangan
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tanyakan apa saja yang telah dihabiskan bulan ini atau simulasi anggaran
              </p>
            </div>
          </div>
        </div>

        {/* Featured Inquiry Button: Apa saja yang telah dihabiskan selama bulan ini? */}
        <button
          type="button"
          onClick={() => handleAskQuestion('Apa saja yang telah dihabiskan selama bulan ini?')}
          disabled={isAskingAI}
          className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
            theme === 'dark'
              ? 'bg-emerald-950/35 border-emerald-500/35 hover:border-emerald-400 text-emerald-200'
              : 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-400 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <ReceiptText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block leading-snug">
                Apa saja yang telah dihabiskan bulan ini?
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block truncate">
                Rekap kategori & daftar pengeluaran {formatMonthLabel(selectedMonth)}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold shrink-0">
            Cek Rincian
          </span>
        </button>

        {/* Quick Question Suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.slice(1).map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => handleAskQuestion(promptText)}
              disabled={isAskingAI}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700'
              }`}
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Chat Messages Box */}
        <div
          ref={chatContainerRef}
          className={`max-h-80 overflow-y-auto p-3 rounded-2xl border space-y-2.5 ${
            theme === 'dark'
              ? 'bg-slate-950/70 border-slate-800/80'
              : 'bg-slate-50/80 border-slate-200/80'
          }`}
        >
          {chatHistory.map((item) => (
            <div
              key={item.id}
              className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                  item.role === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-br-sm'
                    : theme === 'dark'
                    ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-2xs'
                }`}
              >
                {item.text.replace(/\*\*/g, '')}
              </div>
            </div>
          ))}
          {isAskingAI && (
            <div className="flex justify-start">
              <div
                className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border border-slate-800 text-slate-400'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>AI sedang merangkum catatan pengeluaranmu...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion(questionInput);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Tanya AI: Apa saja yang telah dihabiskan bulan ini?"
            className={`flex-1 h-10 px-3.5 rounded-xl text-xs border outline-none transition-colors ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
            }`}
          />
          <button
            type="submit"
            disabled={!questionInput.trim() || isAskingAI}
            aria-label="Kirim pertanyaan ke AI"
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Tanya</span>
          </button>
        </form>
      </div>

      {/* Visual Breakdown Card: Rincian Pengeluaran Bulan Ini */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-3 ${
          theme === 'dark'
            ? 'bg-slate-900/75 border-slate-800'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-emerald-500 shrink-0" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Rekap Pengeluaran Bulan {formatMonthLabel(selectedMonth)}
            </h3>
          </div>
          <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatRupiah(summary.totalExpense)}
          </span>
        </div>

        {monthExpenseTxs.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            Belum ada pengeluaran yang tercatat pada bulan {formatMonthLabel(selectedMonth)}.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Category Breakdown Bars */}
            <div className="space-y-2">
              {sortedExpenseCategories.map(([catId, catData]) => {
                const catInfo = ALL_CATEGORIES.find((c) => c.id === catId);
                const pct =
                  summary.totalExpense > 0
                    ? Math.round((catData.total / summary.totalExpense) * 100)
                    : 0;
                return (
                  <div key={catId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: catInfo?.color || '#10b981' }}
                        />
                        <span>{catData.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          ({catData.count}x)
                        </span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatRupiah(catData.total)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(4, pct)}%`,
                          backgroundColor: catInfo?.color || '#10b981',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Itemized List of Top Expenses This Month */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Daftar Item yang Dihabiskan ({monthExpenseTxs.length} Transaksi):
              </span>
              {monthExpenseTxs.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800/60"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {tx.description}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {tx.categoryName} · {tx.paymentMethod.toUpperCase()} · {tx.date}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                    {formatRupiah(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Automated Monthly Executive Summary Card */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800'
            : 'bg-gradient-to-br from-white via-emerald-50/40 to-slate-50 border-emerald-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {aiAnalysis.perspectiveTitle || 'Skor Kesehatan Keuangan'}
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {aiAnalysis.statusLabel}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {summary.transactionCount === 0 ? '—' : aiAnalysis.healthScore}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              {summary.transactionCount === 0 ? '' : '/100'}
            </span>
          </div>
        </div>

        {/* Narrative analysis text */}
        <div className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2.5">
          {isLoadingAI ? (
            <div className="py-4 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>AI sedang menganalisis matriks keuanganmu...</span>
            </div>
          ) : (
            <p>{aiAnalysis.summaryNarrative}</p>
          )}

          {aiAnalysis.highlightQuote && (
            <blockquote className="p-3 rounded-2xl bg-emerald-500/10 border-l-3 border-emerald-500 text-[11px] text-emerald-800 dark:text-emerald-300 italic font-medium">
              "{aiAnalysis.highlightQuote}"
            </blockquote>
          )}
        </div>

        {/* Actionable points */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800/60 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {summary.transactionCount === 0 ? 'Langkah Memulai:' : '3 Rekomendasi Utama Bulan Ini:'}
          </span>
          {aiAnalysis.actionablePoints.map((pt, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Opportunities Header & CTA */}
      <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block truncate">
              Potensi Penghematan Bulanan
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatRupiah(totalPotentialSavings)} / bln
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAISavingRecommendations}
          disabled={isLoadingRecs}
          className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoadingRecs ? 'animate-spin' : ''}`} />
          <span>Gali Pola AI</span>
        </button>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Rekomendasi Pola Belanja ({recommendations.length})
        </h3>

        {recommendations.map((rec) => {
          const isBookmarked = bookmarkedIds.has(rec.id);
          return (
            <div
              key={rec.id}
              className={`p-4 rounded-3xl border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      rec.urgency === 'tinggi'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                        : rec.urgency === 'sedang'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                        : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25'
                    }`}
                  >
                    Prioritas {rec.urgency}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    Hemat ~{formatRupiah(rec.potentialSavingsMonthly)}/bln
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleBookmark(rec.id)}
                  aria-label="Simpan rekomendasi"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                {rec.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {rec.description}
              </p>

              {/* Actionable tip box */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/15 flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[11px]">
                    Langkah Nyata:
                  </span>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">
                    {rec.actionableTip}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
