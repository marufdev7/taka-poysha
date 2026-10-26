'use client';

import React, { useState, useEffect } from 'react';
import {
  BellRing,
  X,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarDays,
  Wallet,
  Check,
} from 'lucide-react';
import { formatBDT, formatDate, getLocalDateString } from '@/lib/utils';

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

  // Reschedule Date state
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [rescheduleLoadingId, setRescheduleLoadingId] = useState<string | null>(null);

  // Settle with custom payment date state
  const [settlePanelId, setSettlePanelId] = useState<string | null>(null);
  const [settleDate, setSettleDate] = useState<string>(() => getLocalDateString(new Date()));
  const [settleAccountId, setSettleAccountId] = useState<string>('');

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

  useEffect(() => {
    if (accounts.length > 0 && !settleAccountId) {
      setSettleAccountId(accounts[0].id);
    }
  }, [accounts, settleAccountId]);

  if (!isOpen || dueDebts.length === 0) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('debt_reminder_dismissed', 'true');
    setIsOpen(false);
  };

  const handleOpenReschedule = (debt: Debt) => {
    if (editingDateId === debt.id) {
      setEditingDateId(null);
    } else {
      setEditingDateId(debt.id);
      setSettlePanelId(null);
      // Default to next week from today
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setNewDueDate(getLocalDateString(nextWeek));
    }
  };

  const handleQuickAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNewDueDate(getLocalDateString(d));
  };

  const handleSaveReschedule = async (debtId: string) => {
    if (!newDueDate) return;
    setRescheduleLoadingId(debtId);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: debtId,
          dueDate: newDueDate,
        }),
      });
      if (res.ok) {
        setEditingDateId(null);
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'তারিখ পরিবর্তন করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setRescheduleLoadingId(null);
    }
  };

  const handleOpenSettlePanel = (debt: Debt) => {
    if (settlePanelId === debt.id) {
      setSettlePanelId(null);
    } else {
      setSettlePanelId(debt.id);
      setEditingDateId(null);
      setSettleDate(getLocalDateString(new Date()));
    }
  };

  const handleConfirmSettle = async (debtId: string) => {
    setSettlingId(debtId);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: debtId,
          status: 'SETTLED',
          accountId: settleAccountId || accounts[0]?.id || undefined,
          settleDate: settleDate || undefined,
        }),
      });
      if (res.ok) {
        setSettlePanelId(null);
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'পরিশোধ সম্পন্ন করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-start justify-center pt-8 sm:pt-14 p-4 overflow-y-auto animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-amber-200 animate-modal-pop my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="divide-y divide-slate-100 max-h-[65vh] overflow-y-auto my-3 pr-1">
          {dueDebts.map((d) => {
            const isReceivable = d.type === 'RECEIVABLE';
            const due = new Date(d.dueDate);
            const isOverdue = due < new Date(new Date().setHours(0, 0, 0, 0));
            const isEditingThisDate = editingDateId === d.id;
            const isSettlingThis = settlePanelId === d.id;

            return (
              <div key={d.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
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
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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

                    <div className="flex items-center gap-1.5">
                      {/* Reschedule Date Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenReschedule(d)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border transition ${
                          isEditingThisDate
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                        title="পরিশোধের তারিখ পরিবর্তন করে নতুন তারিখ দিন"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{isEditingThisDate ? 'বন্ধ' : 'তারিখ পরিবর্তন'}</span>
                      </button>

                      {/* Settle Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenSettlePanel(d)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                          isSettlingThis
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="পরিশোধ সম্পন্ন করুন (তারিখ সহ)"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isSettlingThis ? 'বন্ধ' : 'পরিশোধ'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Reschedule Date Card */}
                {isEditingThisDate && (
                  <div className="mt-2.5 p-3 sm:p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs space-y-2.5 animate-dropdown-reveal">
                    <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-amber-900">
                          পরিশোধের নতুন নির্ধারিত তারিখ দিন
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-700">বর্তমান: {formatDate(d.dueDate)}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        নতুন তারিখ নির্বাচন করুন:
                      </label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full text-xs font-medium px-2.5 py-1.5 border border-amber-300 rounded-xl bg-white focus:outline-emerald-500"
                      />
                    </div>

                    {/* Quick Day Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-amber-800 font-semibold">সহজে বাছুন:</span>
                      {[
                        { label: '+৩ দিন', days: 3 },
                        { label: '+৭ দিন (১ সপ্তাহ)', days: 7 },
                        { label: '+১৫ দিন', days: 15 },
                        { label: '+১ মাস', days: 30 },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => handleQuickAddDays(chip.days)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition active:scale-95"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDateId(null)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg transition"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveReschedule(d.id)}
                        disabled={rescheduleLoadingId === d.id || !newDueDate}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{rescheduleLoadingId === d.id ? 'আপডেট হচ্ছে...' : 'নতুন তারিখ সংরক্ষণ'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Settle with Custom Date Card */}
                {isSettlingThis && (
                  <div className="mt-2.5 p-3 sm:p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs space-y-2.5 animate-dropdown-reveal">
                    <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/70">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-900">
                          {isReceivable ? 'পাওনা টাকা গ্রহণ সম্পন্ন' : 'দেনা পরিশোধ সম্পন্ন'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        {formatBDT(d.amount, { useBengaliDigits })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          পরিশোধের তারিখ (Payment Date)
                        </label>
                        <input
                          type="date"
                          value={settleDate}
                          onChange={(e) => setSettleDate(e.target.value)}
                          className="w-full text-xs font-medium px-2.5 py-1.5 border border-emerald-300 rounded-xl bg-white focus:outline-emerald-500"
                        />
                      </div>

                      {accounts.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            ওয়ালেট নির্বাচন
                          </label>
                          <select
                            value={settleAccountId}
                            onChange={(e) => setSettleAccountId(e.target.value)}
                            className="w-full text-xs font-medium px-2.5 py-1.5 border border-emerald-300 rounded-xl bg-white focus:outline-emerald-500"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSettlePanelId(null)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg transition"
                      >
                        বাতিল
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmSettle(d.id)}
                        disabled={settlingId === d.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{settlingId === d.id ? 'পরিশোধ হচ্ছে...' : 'পরিশোধ নিশ্চিত করুন'}</span>
                      </button>
                    </div>
                  </div>
                )}
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
