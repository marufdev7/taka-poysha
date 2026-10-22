'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, RefreshCw, FileText, CheckCircle2, FileDown, TrendingUp, TrendingDown, Wallet, ArrowDownUp, Clock, AlertCircle } from 'lucide-react';
import { formatMonthBengali, formatBDT, toBengaliNumerals, cleanLatex } from '@/lib/utils';
import { exportAiReportToPdf } from '@/lib/pdfExport';

interface AiReport {
  id: string;
  month: string;
  summaryData: string;
  content: string;
  createdAt: string | Date;
}

interface LiveSummary {
  month: string;
  generatedAt: string;
  currency: string;
  viewType: string;
  totalTransactions: number;
  incomeCount: number;
  expenseCount: number;
  income: { total: number; prev_month: number; growth_pct: number };
  expense: { total: number; prev_month: number; growth_pct: number };
  net_savings: number;
  savings_rate_pct: number;
  daily_avg_expense: number;
  today_expense: number;
  days_elapsed: number;
  days_remaining?: number;
  total_wallet_balance?: number;
  projected_remaining_expense?: number;
  projected_deficit_or_surplus?: number;
  expense_by_category: { name: string; amount: number; prev: number }[];
  daily_breakdown: { date: string; amount: number }[];
  top_expenses: { date: string; category: string; amount: number; note: string; by: string }[];
}

interface AiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  userId: string;
  isFamilyView: boolean;
  aiReports: AiReport[];
  onRefresh: () => void;
}

function formatInline(str: string) {
  return cleanLatex(str)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');
}

function FormattedReport({ text }: { text: string }) {
  const sanitizedText = cleanLatex(text || '');
  const lines = sanitizedText.split('\n');

  return (
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed font-['Hind_Siliguri',sans-serif]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // H3 heading (e.g. ### 📊 2026-10 মাসের রিপোর্ট)
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="text-base font-bold text-purple-950 pt-2 pb-1.5 border-b border-purple-100 flex items-center gap-2"
            >
              {trimmed.replace(/^###\s+/, '')}
            </h4>
          );
        }

        // H2 heading
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className="text-lg font-bold text-purple-950 pt-3 pb-1 border-b border-purple-100"
            >
              {trimmed.replace(/^##\s+/, '')}
            </h3>
          );
        }

        // Blockquote / Notice (e.g. > **ব্যবহৃত মডেল:** ...)
        if (trimmed.startsWith('> ')) {
          const content = trimmed.replace(/^>\s+/, '');
          return (
            <div
              key={idx}
              className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-r-xl text-xs text-purple-900 my-2"
            >
              <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </div>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="text-purple-600 font-bold text-xs mt-1">•</span>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-purple-600 font-bold text-xs mt-0.5">{numMatch[1]}</span>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
        );
      })}
    </div>
  );
}

// ─── Live Stats Card ──────────────────────────────────────────────────────────
function LiveStatsBar({ summary }: { summary: LiveSummary }) {
  const savingsColor = summary.net_savings >= 0 ? 'text-emerald-700' : 'text-rose-700';
  const savingsBg = summary.net_savings >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
      {/* Income */}
      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70">
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mb-0.5">
          <TrendingUp className="w-3 h-3" />
          মোট আয়
        </div>
        <div className="text-sm font-bold text-emerald-800">
          ৳ {summary.income.total.toLocaleString('en-IN')}
        </div>
        {summary.income.growth_pct !== 0 && (
          <div className={`text-[9px] mt-0.5 ${summary.income.growth_pct > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {summary.income.growth_pct > 0 ? '▲' : '▼'} {Math.abs(summary.income.growth_pct)}%
          </div>
        )}
      </div>

      {/* Expense */}
      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/70">
        <div className="flex items-center gap-1 text-[10px] text-rose-600 font-medium mb-0.5">
          <TrendingDown className="w-3 h-3" />
          মোট ব্যয়
        </div>
        <div className="text-sm font-bold text-rose-800">
          ৳ {summary.expense.total.toLocaleString('en-IN')}
        </div>
        {summary.expense.growth_pct !== 0 && (
          <div className={`text-[9px] mt-0.5 ${summary.expense.growth_pct > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {summary.expense.growth_pct > 0 ? '▲' : '▼'} {Math.abs(summary.expense.growth_pct)}%
          </div>
        )}
      </div>

      {/* Savings */}
      <div className={`p-2.5 rounded-xl border ${savingsBg}`}>
        <div className={`flex items-center gap-1 text-[10px] font-medium mb-0.5 ${savingsColor}`}>
          <Wallet className="w-3 h-3" />
          নিট সঞ্চয়
        </div>
        <div className={`text-sm font-bold ${savingsColor}`}>
          ৳ {summary.net_savings.toLocaleString('en-IN')}
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5">
          সঞ্চয়ের হার: {summary.savings_rate_pct}%
        </div>
      </div>

      {/* Daily Average */}
      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70">
        <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium mb-0.5">
          <ArrowDownUp className="w-3 h-3" />
          দৈনিক গড়
        </div>
        <div className="text-sm font-bold text-amber-800">
          ৳ {summary.daily_avg_expense.toLocaleString('en-IN')}
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5 truncate" title={`বাকি ${summary.days_remaining} দিন`}>
          {summary.days_elapsed} দিন {summary.days_remaining !== undefined ? `• বাকি: ${summary.days_remaining} দিন` : ''}
        </div>
      </div>
    </div>
  );
}

export function AiReportModal({
  isOpen,
  onClose,
  householdId,
  userId,
  isFamilyView,
  aiReports,
  onRefresh,
}: AiReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [currentReport, setCurrentReport] = useState<AiReport | null>(null);
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ─── Auto-fetch LIVE summary whenever modal opens ──────────────────────────
  const fetchLiveSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const params = new URLSearchParams({
        householdId: householdId || '',
        userId: userId || '',
        isFamilyView: String(isFamilyView),
      });

      const res = await fetch(`/api/ai-report?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLiveSummary(data.summary);
        // If there's a saved report for this month, show it
        if (data.latestReport) {
          setCurrentReport(data.latestReport);
        }
      } else {
        setSummaryError('লাইভ ডেটা লোড করতে সমস্যা হয়েছে।');
      }
    } catch (err) {
      console.error('Failed to fetch live summary:', err);
      setSummaryError('সার্ভার সংযোগে সমস্যা হয়েছে।');
    } finally {
      setSummaryLoading(false);
    }
  }, [householdId, userId, isFamilyView]);

  useEffect(() => {
    if (isOpen) {
      // Always fetch fresh live data when modal opens
      fetchLiveSummary();
    } else {
      // Reset state when modal closes
      setLiveSummary(null);
      setCurrentReport(null);
      setSummaryError(null);
    }
  }, [isOpen, fetchLiveSummary]);

  const handleExportPdf = async () => {
    if (!currentReport) return;
    setDownloadingPdf(true);
    try {
      await exportAiReportToPdf({
        reportContent: currentReport.content,
        month: currentReport.month || currentMonthKey,
        isFamilyView,
      });
    } catch (err) {
      console.error(err);
      alert('PDF ফাইল ডাউনলোড করতে সমস্যা হয়েছে');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          userId,
          isFamilyView,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentReport(data.report);
        // Update the live summary too — the POST returns fresh summary
        if (data.summary) {
          setLiveSummary(data.summary);
        }
        onRefresh();
      } else {
        alert('রিপোর্ট তৈরিতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setLoading(false);
    }
  };

  const reportAge = currentReport?.createdAt
    ? getReportAge(new Date(currentReport.createdAt))
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-start justify-center pt-8 sm:pt-12 p-3 sm:p-4 overflow-y-auto animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-modal-pop my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800">
                মাসিক AI আর্থিক মূল্যায়ন ও রিপোর্ট
              </h3>
              <p className="text-xs text-slate-400">
                {isFamilyView ? 'পারিবারিক সমন্বিত হিসাব' : 'ব্যক্তিগত হিসাব'} •{' '}
                {formatMonthBengali(currentMonthKey)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Stats (always fresh) */}
        <div className="mt-3 shrink-0">
          {summaryLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-purple-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              লাইভ ডেটা লোড হচ্ছে...
            </div>
          ) : summaryError ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {summaryError}
            </div>
          ) : liveSummary ? (
            <>
              <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 mb-2 gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-purple-500" />
                  লাইভ ডেটা • {liveSummary.totalTransactions}টি লেনদেন (আয় {liveSummary.incomeCount} + ব্যয় {liveSummary.expenseCount})
                </span>
                {liveSummary.total_wallet_balance !== undefined && (
                  <span className="font-semibold text-purple-700 bg-purple-50/80 border border-purple-200/60 px-2 py-0.5 rounded-md">
                    বর্তমান মোট ওয়ালেট স্থিতি: ৳ {liveSummary.total_wallet_balance.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <LiveStatsBar summary={liveSummary} />
            </>
          ) : null}
        </div>

        {/* Action & Info Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-2 shrink-0 bg-purple-50/70 p-3 rounded-2xl border border-purple-100/70">
          <div className="flex items-center gap-2 text-purple-900">
            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold block">
                স্বয়ংক্রিয় আর্থিক মূল্যায়ন ও বিশেষজ্ঞ সঞ্চয় পরামর্শ
              </span>
              {reportAge && (
                <span className="text-[10px] text-purple-500">
                  শেষ রিপোর্ট: {reportAge}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentReport && (
              <button
                onClick={handleExportPdf}
                disabled={downloadingPdf}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-purple-700 border border-purple-200/80 shadow-xs transition cursor-pointer disabled:opacity-50"
                title="PDF ফাইল সরাসরি ডাউনলোড করুন (কোনো প্রিন্ট অপশন আসবে না)"
              >
                {downloadingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>{downloadingPdf ? 'ডাউনলোড হচ্ছে...' : 'PDF ডাউনলোড'}</span>
              </button>
            )}

            <button
              onClick={handleGenerateReport}
              disabled={loading || summaryLoading}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'বিশ্লেষণ হচ্ছে...' : currentReport ? 'রিপোর্ট আপডেট' : 'নতুন রিপোর্ট'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {currentReport ? (
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70">
              <FormattedReport text={currentReport.content} />
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <Sparkles className="w-10 h-10 mx-auto text-purple-300 animate-pulse" />
              <p className="text-sm font-medium text-slate-600">এখনো কোনো AI রিপোর্ট তৈরি করা হয়নি।</p>
              <p className="text-xs max-w-sm mx-auto text-slate-400">
                উপরের &quot;নতুন রিপোর্ট&quot; বাটনে ক্লিক করলে আপনার আয়-ব্যয়ের ওপর ভিত্তি করে বাংলায় পূর্ণাঙ্গ আর্থিক মূল্যায়ন ও বাস্তবসম্মত পরামর্শ তৈরি হবে।
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            সর্বশেষ ডেটা থেকে স্বয়ংক্রিয়ভাবে হিসাব করা হয়েছে
          </span>
          <span>টাকা-পয়সা AI ইন্টেলিজেন্স</span>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Human-readable report age ────────────────────────────────────────
function getReportAge(createdAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'এইমাত্র তৈরি হয়েছে';
  if (diffMins < 60) return `${diffMins} মিনিট আগে`;
  if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
  return `${diffDays} দিন আগে`;
}
