'use client';

import React, { useState, useEffect } from 'react';
import { BellRing, X, CheckCircle, Calendar, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { formatBDT, formatDate } from '@/lib/utils';

interface Debt {
  id: string;
  personName: string;
  type: string; // 'RECEIVABLE' or 'PAYABLE'
  amount: number;
  dueDate: string | Date;
  status: string;
  note: string | null;
}

interface DebtReminderPopupProps {
  debts: Debt[];
  accounts?: Array<{ id: string; name: string; balance: number; type: string }>;
  useBengaliDigits: boolean;
  onRefresh: () => void;
}

export function DebtReminderPopup({
  debts,
  accounts = [],
  useBengaliDigits,
  onRefresh,
}: DebtReminderPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  // Check for debts that are due today or overdue and still PENDING
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dueDebts = debts.filter((d) => {
    if (d.status !== 'PENDING') return false;
    const due = new Date(d.dueDate);
    return due <= today;
  });

  useEffect(() => {
    if (dueDebts.length > 0) {
      // Check if user already dismissed it this session
      const dismissed = sessionStorage.getItem('debt_reminder_dismissed');
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [dueDebts.length]);

  if (!isOpen || dueDebts.length === 0) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('debt_reminder_dismissed', 'true');
    setIsOpen(false);
  };

  const handleSettle = async (id: string) => {
    setSettlingId(id);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'SETTLED',
          accountId: accounts[0]?.id || undefined,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800 flex items-center gap-1.5">
                <span>আজকের দেনা-পাওনা রিমাইন্ডার!</span>
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  {dueDebts.length} টি বাকি
                </span>
              </h3>
              <p className="text-xs text-slate-500">টাকা দেওয়া বা পাওয়ার নির্ধারিত তারিখ চলে এসেছে</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Due Debts List */}
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-3 pr-1">
          {dueDebts.map((d) => {
            const isReceivable = d.type === 'RECEIVABLE';
            const due = new Date(d.dueDate);
            const isOverdue = due < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isReceivable
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isReceivable ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm truncate">
                        {d.personName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isReceivable
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isReceivable ? 'পাওনা (আপনি পাবেন)' : 'দেনা (আপনাকে দিতে হবে)'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-amber-700">
                        <Calendar className="w-3 h-3" />
                        {isOverdue ? 'তারিখ অতিবাহিত:' : 'নির্ধারিত তারিখ:'} {formatDate(d.dueDate)}
                      </span>
                      {d.note && <span className="text-slate-400">• {d.note}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span
                    className={`font-bold text-sm sm:text-base ${
                      isReceivable ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatBDT(d.amount, { useBengaliDigits })}
                  </span>

                  <button
                    onClick={() => handleSettle(d.id)}
                    disabled={settlingId === d.id}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>পরিশোধ সম্পন্ন</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">প্রতিদিন লগইনে তারিখ মিলিয়ে স্বয়ংক্রিয়ভাবে দেখাবে</span>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            পরে মনে করিয়ে দিন
          </button>
        </div>
      </div>
    </div>
  );
}
