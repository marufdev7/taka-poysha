'use client';

import React, { useState } from 'react';
import {
  HandCoins,
  Plus,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Calendar,
  AlertCircle,
  Wallet,
  X,
} from 'lucide-react';
import { formatBDT, formatDate } from '@/lib/utils';

interface Debt {
  id: string;
  personName: string;
  type: string; // 'RECEIVABLE' or 'PAYABLE'
  amount: number;
  dueDate: string | Date;
  status: string; // 'PENDING' or 'SETTLED'
  note: string | null;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface DebtsTrackerProps {
  debts: Debt[];
  accounts?: Account[];
  useBengaliDigits: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
}

export function DebtsTracker({
  debts,
  accounts = [],
  useBengaliDigits,
  onRefresh,
  onOpenAddModal,
}: DebtsTrackerProps) {
  const [filter, setFilter] = useState<'PENDING' | 'RECEIVABLE' | 'PAYABLE' | 'SETTLED'>('PENDING');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Totals for pending debts
  const totalReceivable = debts
    .filter((d) => d.type === 'RECEIVABLE' && d.status === 'PENDING')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalPayable = debts
    .filter((d) => d.type === 'PAYABLE' && d.status === 'PENDING')
    .reduce((sum, d) => sum + d.amount, 0);

  // Filtered list
  const filtered = debts.filter((d) => {
    if (filter === 'PENDING') return d.status === 'PENDING';
    if (filter === 'SETTLED') return d.status === 'SETTLED';
    if (filter === 'RECEIVABLE') return d.type === 'RECEIVABLE' && d.status === 'PENDING';
    if (filter === 'PAYABLE') return d.type === 'PAYABLE' && d.status === 'PENDING';
    return true;
  });

  const handleInitiateSettle = (debt: Debt) => {
    if (debt.status === 'PENDING') {
      setSettlingDebt(debt);
      setSelectedAccountId(accounts[0]?.id || '');
    } else {
      if (confirm('আপনি কি এই পরিশোধ বাতিল করে পুনরায় বাকি করতে চান? এতে ওয়ালেট ব্যালেন্স সমন্বয় ফিরে আসবে।')) {
        handleUnsettle(debt.id);
      }
    }
  };

  const handleUnsettle = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'PENDING',
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmSettle = async () => {
    if (!settlingDebt) return;
    setActionLoadingId(settlingDebt.id);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: settlingDebt.id,
          status: 'SETTLED',
          accountId: selectedAccountId || undefined,
        }),
      });
      if (res.ok) {
        setSettlingDebt(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ধারের তথ্য মুছে ফেলতে চান?')) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/debts?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getDaysDiffText = (dueDateStr: string | Date, status: string) => {
    if (status === 'SETTLED') return { text: 'পরিশোধ সম্পন্ন', color: 'text-slate-400 bg-slate-100' };

    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: '⚠️ আজকেই পরিশোধের দিন!', color: 'text-amber-700 bg-amber-100 font-bold animate-pulse' };
    } else if (diffDays < 0) {
      return { text: `🚨 ${Math.abs(diffDays)} দিন অতিবাহিত!`, color: 'text-rose-700 bg-rose-100 font-bold' };
    } else {
      return { text: `⏳ ${diffDays} দিন বাকি`, color: 'text-indigo-700 bg-indigo-50 font-medium' };
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-slate-800 text-base">
              ধার ও দেনা-পাওনা ট্র্যাকার (Debts & Loans)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            নির্ধারিত তারিখে নোটিফিকেশন রিমাইন্ডার এবং পরিশোধ করলে ওয়ালেট ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>নতুন ধার/পাওনা যোগ</span>
        </button>
      </div>

      {/* Summary Stat Bars */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 font-medium block">
              আমি মোট পাব (পাওনা)
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-800">
              {formatBDT(totalReceivable, { useBengaliDigits })}
            </span>
          </div>
          <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-700 font-medium block">
              আমাকে মোট দিতে হবে (দেনা)
            </span>
            <span className="text-base sm:text-lg font-bold text-rose-800">
              {formatBDT(totalPayable, { useBengaliDigits })}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-rose-600" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 text-xs border-b border-slate-100">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            filter === 'PENDING' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          বাকি আছে (Pending)
        </button>
        <button
          onClick={() => setFilter('RECEIVABLE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            filter === 'RECEIVABLE' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          আমি পাব
        </button>
        <button
          onClick={() => setFilter('PAYABLE')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            filter === 'PAYABLE' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          আমাকে দিতে হবে
        </button>
        <button
          onClick={() => setFilter('SETTLED')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            filter === 'SETTLED' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          পরিশোধিত (Settled)
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          কোনো ধারের হিসাব নেই। &quot;+ নতুন ধার/পাওনা যোগ&quot; বাটনে ক্লিক করে হিসাব রাখুন।
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((d) => {
            const isReceivable = d.type === 'RECEIVABLE';
            const daysBadge = getDaysDiffText(d.dueDate, d.status);

            return (
              <div
                key={d.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isReceivable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isReceivable ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{d.personName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${daysBadge.color}`}>
                        {daysBadge.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3" />
                        তারিখ: {formatDate(d.dueDate)}
                      </span>
                      {d.note && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-xs">{d.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div
                    className={`font-bold text-sm sm:text-base ${
                      isReceivable ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatBDT(d.amount, { useBengaliDigits })}
                  </div>

                  <button
                    onClick={() => handleInitiateSettle(d)}
                    disabled={actionLoadingId === d.id}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      d.status === 'SETTLED'
                        ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={d.status === 'SETTLED' ? 'পুনরায় বকেয়া করুন' : 'পরিশোধ হিসেবে চিহ্নিত করুন'}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {d.status === 'SETTLED' ? 'পরিশোধিত' : 'পরিশোধ'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={actionLoadingId === d.id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settle Debt Confirmation & Wallet Modal */}
      {settlingDebt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    settlingDebt.type === 'PAYABLE'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {settlingDebt.type === 'PAYABLE'
                    ? 'ধার পরিশোধ ও ব্যালেন্স কর্তন'
                    : 'পাওনা টাকা গ্রহণ ও ব্যালেন্সে জমা'}
                </h3>
              </div>
              <button
                onClick={() => setSettlingDebt(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-4 space-y-2.5 border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ব্যক্তির নাম:</span>
                <span className="font-semibold text-slate-800">{settlingDebt.personName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">টাকার পরিমাণ:</span>
                <span className="font-extrabold text-base text-slate-900">
                  {formatBDT(settlingDebt.amount, { useBengaliDigits })}
                </span>
              </div>
              <div className="text-xs pt-2 border-t border-slate-200">
                {settlingDebt.type === 'PAYABLE' ? (
                  <span className="text-rose-600 font-medium leading-relaxed block">
                    ⚠️ সতর্কবার্তা: এই দেনা পরিশোধ করলে আপনার নির্বাচিত ওয়ালেট থেকে <strong>{formatBDT(settlingDebt.amount, { useBengaliDigits })}</strong> স্বয়ংক্রিয়ভাবে মাইনাস (কর্তন) হবে।
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium leading-relaxed block">
                    ℹ️ এই পাওনা টাকা আদায় করলে আপনার নির্বাচিত ওয়ালেটে <strong>{formatBDT(settlingDebt.amount, { useBengaliDigits })}</strong> জমা (ব্যালেন্স বৃদ্ধি) হবে।
                  </span>
                )}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {settlingDebt.type === 'PAYABLE'
                  ? 'কোন ওয়ালেট থেকে টাকা পরিশোধ করবেন?'
                  : 'কোন ওয়ালেটে টাকা জমা করবেন?'}
              </label>
              {accounts && accounts.length > 0 ? (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-200 rounded-xl bg-white focus:outline-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (বর্তমান ব্যালেন্স: {formatBDT(acc.balance, { useBengaliDigits })})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-400">ডিফল্ট ক্যাশ একাউন্ট ব্যবহার করা হবে</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSettlingDebt(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={actionLoadingId === settlingDebt.id}
                className={`flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl shadow-md transition disabled:opacity-50 ${
                  settlingDebt.type === 'PAYABLE'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {actionLoadingId === settlingDebt.id ? 'প্রসেসিং...' : 'পরিশোধ নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
