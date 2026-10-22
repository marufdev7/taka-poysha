'use client';

import React, { useState, useEffect } from 'react';
import {
  HandCoins,
  Plus,
  CheckCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Calendar,
  Wallet,
  X,
  FileText,
} from 'lucide-react';
import { formatBDT, formatDate, getLocalDateString } from '@/lib/utils';

interface Debt {
  id: string;
  personName: string;
  type: string; // 'RECEIVABLE' or 'PAYABLE'
  amount: number;
  dueDate: string | Date;
  status: string; // 'PENDING' or 'SETTLED'
  note: string | null;
  accountId?: string | null;
  account?: { id: string; name: string; type: string } | null;
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
  onOpenAddModal?: () => void;
  userId?: string;
  householdId?: string;
}

export function DebtsTracker({
  debts,
  accounts = [],
  useBengaliDigits,
  onRefresh,
  onOpenAddModal,
  userId,
  householdId,
}: DebtsTrackerProps) {
  const [filter, setFilter] = useState<'PENDING' | 'RECEIVABLE' | 'PAYABLE' | 'SETTLED'>('PENDING');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Inline Debt Settlement State (No full screen modal)
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null);
  const [settleType, setSettleType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [settleCustomAmount, setSettleCustomAmount] = useState<string>('');
  const [settleAccountId, setSettleAccountId] = useState<string>('');
  const [settleNote, setSettleNote] = useState<string>('');

  // Inline Add Debt State (No full screen modal)
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [addPersonName, setAddPersonName] = useState('');
  const [addType, setAddType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [addAmount, setAddAmount] = useState('');
  const [addDueDate, setAddDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getLocalDateString(d);
  });
  const [addAccountId, setAddAccountId] = useState('');
  const [addNote, setAddNote] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Cash first sorting
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
    if (sortedAccounts.length > 0 && !addAccountId) {
      setAddAccountId(sortedAccounts[0].id);
    }
  }, [sortedAccounts, addAccountId]);

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
      if (settlingDebtId === debt.id) {
        setSettlingDebtId(null);
      } else {
        setSettlingDebtId(debt.id);
        setSettleType('FULL');
        setSettleCustomAmount(String(debt.amount));
        setSettleNote('');
        const defaultAcc = debt.accountId && sortedAccounts.find((a) => a.id === debt.accountId)
          ? debt.accountId
          : (sortedAccounts[0]?.id || '');
        setSettleAccountId(defaultAcc);
      }
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

  const handleConfirmSettle = async (debt: Debt) => {
    const payload: any = {
      id: debt.id,
      accountId: settleAccountId || undefined,
      settleNote: settleNote.trim() || undefined,
    };

    if (settleType === 'PARTIAL') {
      const val = parseFloat(settleCustomAmount);
      if (isNaN(val) || val <= 0) {
        alert('সঠিক পরিশোধের পরিমাণ লিখুন');
        return;
      }
      if (val > debt.amount) {
        alert(`পরিশোধের পরিমাণ মোট বকেয়ার (৳${debt.amount}) চেয়ে বেশি হতে পারে না`);
        return;
      }
      payload.settleAmount = val;
    } else {
      payload.status = 'SETTLED';
    }

    setActionLoadingId(debt.id);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSettlingDebtId(null);
        setSettleCustomAmount('');
        setSettleNote('');
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'পরিশোধ সম্পন্ন করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPersonName.trim() || !addAmount || !addDueDate) return;

    if (!userId || !householdId) {
      if (onOpenAddModal) onOpenAddModal();
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          householdId,
          accountId: addAccountId || sortedAccounts[0]?.id,
          personName: addPersonName.trim(),
          type: addType,
          amount: parseFloat(addAmount),
          dueDate: addDueDate,
          note: addNote,
        }),
      });

      if (res.ok) {
        setAddPersonName('');
        setAddAmount('');
        setAddNote('');
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setAddDueDate(getLocalDateString(d));
        setShowInlineAdd(false);
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setIsSubmittingAdd(false);
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
        if (settlingDebtId === id) setSettlingDebtId(null);
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
            নির্ধারিত তারিখে রিমাইন্ডার এবং পরিশোধ করলে ওয়ালেট ব্যালেন্স সরাসরি ইনলাইনে সমন্বয় হবে
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (userId && householdId) {
              setShowInlineAdd(!showInlineAdd);
            } else if (onOpenAddModal) {
              onOpenAddModal();
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 active:scale-95 cursor-pointer shadow-xs ${
            showInlineAdd
              ? 'bg-amber-600 text-white ring-2 ring-amber-400/30'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          <Plus className={`w-3.5 h-3.5 transition-transform duration-300 ${showInlineAdd ? 'rotate-45' : ''}`} />
          <span>{showInlineAdd ? 'ফর্ম বন্ধ করুন' : 'নতুন ধার/পাওনা যোগ'}</span>
        </button>
      </div>

      {/* Inline Add Debt Form (Collapsible accordion, smooth open & close) */}
      <div className={`inline-collapse-wrapper ${showInlineAdd ? 'open mb-5' : ''}`}>
        <div className="inline-collapse-content">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200/90 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <HandCoins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800">
                  নতুন ধার অথবা দেনা-পাওনা এন্ট্রি
                </h3>
                <p className="text-[11px] text-slate-500">
                  টাকা ধার দিলে বা নিলে ওয়ালেট নির্বাচন করে সহজে হিসাব রাখুন
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInlineAdd(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 rounded-lg transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateDebt} className="space-y-3.5">
            {/* Type selector toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAddType('RECEIVABLE')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  addType === 'RECEIVABLE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>আমি টাকা পাব (পাওনা / Lending)</span>
              </button>

              <button
                type="button"
                onClick={() => setAddType('PAYABLE')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  addType === 'PAYABLE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>আমাকে টাকা দিতে হবে (দেনা / Borrowing)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্যক্তির নাম *
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রহিম সাহেব, বন্ধু শাকিল..."
                  value={addPersonName}
                  onChange={(e) => setAddPersonName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-amber-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  টাকার পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  placeholder="যেমন: ৫০০ বা ১০০০"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-amber-500 bg-white"
                  required
                  min="1"
                  step="any"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  পরিশোধের শেষ তারিখ *
                </label>
                <input
                  type="date"
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-amber-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  {addType === 'RECEIVABLE'
                    ? 'কোন ওয়ালেট থেকে টাকা ধার দিলেন?'
                    : 'কোন ওয়ালেটে টাকা ধার নিলেন?'}
                </label>
                {sortedAccounts && sortedAccounts.length > 0 ? (
                  <select
                    value={addAccountId}
                    onChange={(e) => setAddAccountId(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-amber-500 bg-white font-medium"
                  >
                    {sortedAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (ব্যালেন্স: {formatBDT(acc.balance, { useBengaliDigits })})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-slate-400 py-2">ডিফল্ট ক্যাশ একাউন্ট যুক্ত হবে</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                নোট বা মন্তব্য (ঐচ্ছিক)
              </label>
              <input
                type="text"
                placeholder="যেমন: জরুরি প্রয়োজনে সাহায্য..."
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-amber-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowInlineAdd(false)}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdd || !addPersonName.trim() || !addAmount}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingAdd ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      </div>
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 text-xs border-b border-slate-100 no-scrollbar">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
            filter === 'PENDING' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          বাকি আছে (Pending)
        </button>
        <button
          onClick={() => setFilter('RECEIVABLE')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
            filter === 'RECEIVABLE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          আমি পাব
        </button>
        <button
          onClick={() => setFilter('PAYABLE')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
            filter === 'PAYABLE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          আমাকে দিতে হবে
        </button>
        <button
          onClick={() => setFilter('SETTLED')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
            filter === 'SETTLED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          পরিশোধিত (Settled)
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs animate-tab-enter">
          কোনো ধারের হিসাব নেই। &quot;+ নতুন ধার/পাওনা যোগ&quot; বাটনে ক্লিক করে হিসাব রাখুন।
        </div>
      ) : (
        <div key={filter} className="divide-y divide-slate-100 animate-tab-enter">
          {filtered.map((d) => {
            const isReceivable = d.type === 'RECEIVABLE';
            const daysBadge = getDaysDiffText(d.dueDate, d.status);
            const isSettlingThis = settlingDebtId === d.id;

            return (
              <div key={d.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 py-1.5 rounded-xl transition group">
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
                        {d.account && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              <Wallet className="w-3 h-3 text-emerald-600" />
                              {d.account.name}
                            </span>
                          </>
                        )}
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
                      type="button"
                      onClick={() => handleInitiateSettle(d)}
                      disabled={actionLoadingId === d.id}
                      className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer ${
                        d.status === 'SETTLED'
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          : isSettlingThis
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={d.status === 'SETTLED' ? 'পুনরায় বকেয়া করুন' : 'পরিশোধ হিসেবে চিহ্নিত করুন'}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {d.status === 'SETTLED' ? 'পরিশোধিত' : isSettlingThis ? 'বন্ধ করুন' : 'পরিশোধ'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      disabled={actionLoadingId === d.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Debt Settlement Form (Accordion motion, smooth open & close) */}
                <div className={`inline-collapse-wrapper ${isSettlingThis ? 'open mt-2.5' : ''}`}>
                  <div className="inline-collapse-content">
                    <div className="mx-2 p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isReceivable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          {isReceivable
                            ? 'পাওনা টাকা গ্রহণ ও ওয়ালেটে জমা'
                            : 'ধার পরিশোধ ও ওয়ালেট থেকে কর্তন'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettlingDebtId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 rounded-lg transition cursor-pointer"
                        title="বাতিল করুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Settlement Type Toggle (Full vs Partial) */}
                    <div className="flex p-1 bg-white border border-amber-200/90 rounded-xl gap-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSettleType('FULL');
                          setSettleCustomAmount(String(d.amount));
                        }}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
                          settleType === 'FULL'
                            ? isReceivable
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        ✓ সম্পূর্ণ পরিশোধ ({formatBDT(d.amount, { useBengaliDigits })})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSettleType('PARTIAL');
                          if (!settleCustomAmount || parseFloat(settleCustomAmount) >= d.amount) {
                            setSettleCustomAmount(String(Math.round(d.amount / 2)));
                          }
                        }}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
                          settleType === 'PARTIAL'
                            ? isReceivable
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        ✂️ আংশিক পরিশোধ (Partial)
                      </button>
                    </div>

                    {/* Full Settlement Notice (Smooth Animated Accordion) */}
                    <div className={`inline-collapse-wrapper ${settleType === 'FULL' ? 'open' : ''}`}>
                      <div className="inline-collapse-content">
                        <div className="text-xs bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                          {isReceivable ? (
                            <p className="text-emerald-700 font-medium leading-relaxed">
                              ℹ️ {d.personName}-এর থেকে পুরো <strong>{formatBDT(d.amount, { useBengaliDigits })}</strong> ফেরত পেলে এটি আপনার নির্বাচিত ওয়ালেটে জমা হবে এবং ধারটি সম্পূর্ণ &apos;পরিশোধিত&apos; তালিকায় যাবে।
                            </p>
                          ) : (
                            <p className="text-rose-700 font-medium leading-relaxed">
                              ⚠️ {d.personName}-কে সম্পূর্ণ <strong>{formatBDT(d.amount, { useBengaliDigits })}</strong> পরিশোধ করলে আপনার নির্বাচিত ওয়ালেট থেকে এই পরিমাণ টাকা স্বয়ংক্রিয়ভাবে কর্তন হবে এবং দেনাটি পরিশোধিত হবে।
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Partial Settlement Form (Smooth Animated Accordion) */}
                    <div className={`inline-collapse-wrapper ${settleType === 'PARTIAL' ? 'open' : ''}`}>
                      <div className="inline-collapse-content">
                        <div className="space-y-2.5 bg-white/95 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-slate-700">
                              আংশিক পরিশোধের পরিমাণ (টাকা) *
                            </label>
                            <span className="text-[10px] text-slate-400">
                              মোট বকেয়া: {formatBDT(d.amount, { useBengaliDigits })}
                            </span>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">৳</span>
                            <input
                              type="number"
                              placeholder="যেমন: ৫০০"
                              value={settleCustomAmount}
                              onChange={(e) => setSettleCustomAmount(e.target.value)}
                              max={d.amount}
                              min={1}
                              className="w-full text-sm font-bold pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
                            />
                          </div>

                          {/* Quick Percentage Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { label: '২৫%', pct: 0.25 },
                              { label: '৫০%', pct: 0.5 },
                              { label: '৭৫%', pct: 0.75 },
                            ].map((chip) => {
                              const val = Math.round(d.amount * chip.pct);
                              return (
                                <button
                                  key={chip.label}
                                  type="button"
                                  onClick={() => setSettleCustomAmount(String(val))}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition cursor-pointer active:scale-95"
                                >
                                  {chip.label} ({formatBDT(val, { useBengaliDigits })})
                                </button>
                              );
                            })}
                          </div>

                          {/* Live calculation feedback */}
                          {(() => {
                            const val = parseFloat(settleCustomAmount) || 0;
                            const remaining = Math.max(0, d.amount - val);
                            const isOver = val > d.amount;
                            return (
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                {isOver ? (
                                  <span className="text-rose-600 font-bold text-[11px]">
                                    ⚠️ বকেয়ার চেয়ে বেশি (৳{d.amount}) পরিশোধ সম্ভব নয়
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-slate-600">
                                      এখন পরিশোধ: <strong className="text-slate-800">{formatBDT(val, { useBengaliDigits })}</strong>
                                    </span>
                                    <span className="text-amber-800 font-semibold">
                                      বাকি থাকবে: <strong className="text-rose-600 font-bold">{formatBDT(remaining, { useBengaliDigits })}</strong>
                                    </span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {isReceivable
                          ? 'কোন ওয়ালেটে টাকা ফেরত জমা করবেন?'
                          : 'কোন ওয়ালেট থেকে টাকা পরিশোধ করবেন?'}
                      </label>
                      {sortedAccounts && sortedAccounts.length > 0 ? (
                        <select
                          value={settleAccountId}
                          onChange={(e) => setSettleAccountId(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-emerald-500 font-medium"
                        >
                          {sortedAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} (বর্তমান ব্যালেন্স: {formatBDT(acc.balance, { useBengaliDigits })})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-400">ডিফল্ট ক্যাশ একাউন্ট ব্যবহার করা হবে</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        পরিশোধের নোট / বিবরণ (ঐচ্ছিক)
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: আংশিক পরিশোধ, বাকি সামনের সপ্তাহে দেবে"
                        value={settleNote}
                        onChange={(e) => setSettleNote(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSettlingDebtId(null)}
                        className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      >
                        বাতিল
                      </button>
                      {(() => {
                        const numVal =
                          settleType === 'PARTIAL' ? parseFloat(settleCustomAmount) || 0 : d.amount;
                        const isInvalid =
                          settleType === 'PARTIAL' && (numVal <= 0 || numVal > d.amount);
                        return (
                          <button
                            type="button"
                            onClick={() => handleConfirmSettle(d)}
                            disabled={actionLoadingId === d.id || isInvalid}
                            className={`flex-1 py-2 px-3 text-xs font-bold text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer ${
                              !isReceivable
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {actionLoadingId === d.id
                              ? 'প্রসেসিং...'
                              : settleType === 'PARTIAL'
                              ? `${formatBDT(numVal, { useBengaliDigits })} আংশিক পরিশোধ নিশ্চিত করুন`
                              : 'সম্পূর্ণ পরিশোধ নিশ্চিত করুন'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
