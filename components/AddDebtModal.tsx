'use client';

import React, { useState, useEffect } from 'react';
import { X, HandCoins, ArrowUpRight, ArrowDownLeft, Calendar, Wallet } from 'lucide-react';
import { getLocalDateString, formatBDT } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  householdId: string;
  accounts?: Account[];
  useBengaliDigits?: boolean;
}

export function AddDebtModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  householdId,
  accounts = [],
  useBengaliDigits = false,
}: AddDebtModalProps) {
  const [type, setType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getLocalDateString(d);
  });
  const [note, setNote] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper: Cash account first sorting
  const sortAccountsWithCashFirst = React.useCallback(
    <T extends { name: string; type?: string }>(list: T[]): T[] => {
      return [...list].sort((a, b) => {
        const aIsCash =
          a.type === 'CASH' ||
          a.name.includes('ক্যাশ') ||
          a.name.toLowerCase().includes('cash');
        const bIsCash =
          b.type === 'CASH' ||
          b.name.includes('ক্যাশ') ||
          b.name.toLowerCase().includes('cash');
        if (aIsCash && !bIsCash) return -1;
        if (!aIsCash && bIsCash) return 1;
        return 0;
      });
    },
    []
  );

  const sortedAccounts = React.useMemo(() => {
    return sortAccountsWithCashFirst(accounts);
  }, [accounts, sortAccountsWithCashFirst]);

  useEffect(() => {
    if (sortedAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(sortedAccounts[0].id);
    }
  }, [sortedAccounts, selectedAccountId]);

  if (!isOpen) return null;

  const currentSelectedAccount = sortedAccounts.find((a) => a.id === selectedAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount || !dueDate) return;

    setLoading(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          householdId,
          accountId: selectedAccountId || sortedAccounts[0]?.id,
          personName: personName.trim(),
          type,
          amount: parseFloat(amount),
          dueDate,
          note,
        }),
      });

      if (res.ok) {
        setPersonName('');
        setAmount('');
        setNote('');
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDueDate(getLocalDateString(d));
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-16 p-4 overflow-y-auto animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-modal-pop my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-slate-800">
              ধার / দেনা-পাওনা এন্ট্রি
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('RECEIVABLE')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              type === 'RECEIVABLE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>আমি ধার দিয়েছি (পাওনা)</span>
          </button>
          <button
            type="button"
            onClick={() => setType('PAYABLE')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              type === 'PAYABLE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>আমি ধার নিয়েছি (দেনা)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {/* Wallet Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                {type === 'RECEIVABLE'
                  ? 'টাকা কোন ওয়ালেট থেকে দিয়েছেন? *'
                  : 'টাকা কোন ওয়ালেটে জমা করবেন? *'}
              </span>
              {currentSelectedAccount && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ব্যালেন্স: {formatBDT(currentSelectedAccount.balance, { useBengaliDigits })}
                </span>
              )}
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs font-medium text-slate-800"
              required
            >
              {sortedAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — ব্যালেন্স: {formatBDT(acc.balance, { useBengaliDigits })}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {type === 'RECEIVABLE' ? (
                <span className="text-amber-700 font-medium">
                  💡 ধার দিলে এই ওয়ালেট থেকে টাকা তাৎক্ষণিকভাবে কমে যাবে এবং মোট ব্যালেন্স সমন্বয় হবে।
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">
                  💡 ধার নিলে এই ওয়ালেটে টাকা তাৎক্ষণিকভাবে বৃদ্ধি পাবে এবং দেনা হিসেবে যুক্ত থাকবে।
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ব্যক্তির নাম *
            </label>
            <input
              type="text"
              placeholder={type === 'RECEIVABLE' ? 'কাকে ধার দিয়েছেন? (যেমন: আসিফ, সুমন)' : 'কার কাছ থেকে ধার নিয়েছেন? (যেমন: করিম ভাই)'}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              টাকার পরিমাণ (৳) *
            </label>
            <input
              type="number"
              placeholder="যেমন: ৫০০ বা ১০০০"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-base font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500"
              required
              min="1"
              step="any"
            />
            {/* Quick Suggestion Pills */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">কুইক সিলেক্ট:</span>
              {[500, 1000, 2000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-md transition shadow-2xs"
                >
                  +৳{formatBDT(amt, { useBengaliDigits })}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>টাকা পরিশোধ / পাওয়ার প্রত্যাশিত তারিখ *</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              এই তারিখ আসলে অ্যাপ স্বয়ংক্রিয়ভাবে আপনাকে মনে করিয়ে দেবে।
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              নোট বা কারণ (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: জরুরি প্রয়োজনে সাহায্য / বাজার খরচের জন্য"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition disabled:opacity-50 ${
                type === 'RECEIVABLE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
              }`}
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'ধার এন্ট্রি নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
