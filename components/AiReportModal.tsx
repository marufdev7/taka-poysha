'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, FileText, CheckCircle2, FileDown } from 'lucide-react';
import { formatMonthBengali } from '@/lib/utils';
import { exportAiReportToPdf } from '@/lib/pdfExport';

interface AiReport {
  id: string;
  month: string;
  summaryData: string;
  content: string;
  createdAt: string | Date;
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
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');
}

function FormattedReport({ text }: { text: string }) {
  const lines = text.split('\n');

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
  const [currentReport, setCurrentReport] = useState<AiReport | null>(aiReports[0] || null);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (aiReports && aiReports.length > 0) {
      setCurrentReport(aiReports[0]);
    }
  }, [aiReports]);

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
      alert('PDF ফাইল ডাউনলোড করতে সমস্যা হয়েছে');
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
          month: currentMonthKey,
          isFamilyView,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentReport(data.report);
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
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

        {/* Action & Info Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-3 shrink-0 bg-purple-50/70 p-3 rounded-2xl border border-purple-100/70">
          <div className="flex items-center gap-2 text-purple-900">
            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="text-xs font-semibold">
              স্বয়ংক্রিয় আর্থিক মূল্যায়ন ও বিশেষজ্ঞ সঞ্চয় পরামর্শ
            </span>
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
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'বিশ্লেষণ হচ্ছে...' : 'নতুন রিপোর্ট'}</span>
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
              <p className="text-sm font-medium text-slate-600">এখনো কোনো AI রিপোর্ট তৈরি করা হয়নি।</p>
              <p className="text-xs max-w-sm mx-auto text-slate-400">
                উপরের &quot;নতুন রিপোর্ট তৈরি করুন&quot; বাটনে ক্লিক করলে আপনার আয়-ব্যয়ের ওপর ভিত্তি করে বাংলায় পূর্ণাঙ্গ আর্থিক মূল্যায়ন ও বাস্তবসম্মত পরামর্শ তৈরি হবে।
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            হিসাব-নিকাশ অ্যালগরিদম দ্বারা নির্ভুলভাবে প্রস্তুতকৃত
          </span>
          <span>টাকা-পয়সা AI ইন্টেলিজেন্স</span>
        </div>
      </div>
    </div>
  );
}
