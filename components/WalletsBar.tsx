'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Smartphone,
  Landmark,
  Plus,
  ArrowRightLeft,
  Banknote,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import { formatBDT } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  user: { name: string; id: string };
}

interface WalletsBarProps {
  accounts: Account[];
  useBengaliDigits: boolean;
  onRefresh: () => void;
  currentUser: { id: string; name: string };
  isFamilyView: boolean;
  householdId?: string;
}

export function WalletsBar({
  accounts,
  useBengaliDigits,
  onRefresh,
  currentUser,
  isFamilyView,
  householdId,
}: WalletsBarProps) {
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // New Wallet form state
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('CASH');
  const [initialBalance, setInitialBalance] = useState('');

  // Transfer form state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Cash first sorting helper
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

  const handleToggleTransfer = () => {
    if (!showTransferModal) {
      setShowAddWalletModal(false);
      setShowTransferModal(true);
      const myAccounts = sortedAccounts.filter((a) => a.user.id === currentUser.id);
      const defaultFrom = myAccounts[0]?.id || sortedAccounts[0]?.id || '';
      const defaultTo =
        sortedAccounts.find((a) => a.id !== defaultFrom)?.id || '';
      if (!fromAccountId) setFromAccountId(defaultFrom);
      if (!toAccountId) setToAccountId(defaultTo);
    } else {
      setShowTransferModal(false);
    }
  };

  const handleToggleAddWallet = () => {
    if (!showAddWalletModal) {
      setShowTransferModal(false);
      setShowAddWalletModal(true);
    } else {
      setShowAddWalletModal(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}" ওয়ালেটটি মুছে ফেলতে চান?`)) return;
    setDeletingAccountId(id);
    try {
      const res = await fetch(`/api/accounts?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'ওয়ালেট মুছতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccount.id,
          name: editName.trim(),
          balance: parseFloat(editBalance) || 0,
        }),
      });
      if (res.ok) {
        setEditingAccount(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWalletIcon = (type: string, name: string = '') => {
    const t = type.toUpperCase();
    const n = name.toLowerCase();

    if (t === 'BKASH' || n.includes('bkash') || n.includes('বিকাশ')) {
      return <Smartphone className="w-4 h-4 text-pink-600" />;
    }
    if (t === 'NAGAD' || n.includes('nagad') || n.includes('নগদ')) {
      return <Smartphone className="w-4 h-4 text-orange-600" />;
    }
    if (t === 'ROCKET' || n.includes('rocket') || n.includes('রকেট')) {
      return <Smartphone className="w-4 h-4 text-purple-600" />;
    }
    if (t === 'BANK' || n.includes('dbbl') || n.includes('bank') || n.includes('ব্যাংক')) {
      return <Landmark className="w-4 h-4 text-blue-600" />;
    }
    return <Banknote className="w-4 h-4 text-emerald-600" />;
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName) return;
    setLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: walletName,
          type: walletType,
          balance: parseFloat(initialBalance) || 0,
        }),
      });
      if (res.ok) {
        setWalletName('');
        setInitialBalance('');
        setShowAddWalletModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !transferAmount || fromAccountId === toAccountId) {
      alert('সঠিক ওয়ালেট ও পরিমাণ নির্বাচন করুন');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          householdId: householdId || undefined,
          accountId: fromAccountId,
          toAccountId,
          type: 'TRANSFER',
          amount: parseFloat(transferAmount),
          date: new Date(),
          note: transferNote || 'ওয়ালেট টু ওয়ালেট ফান্ড স্থানান্তর',
          visibility: 'FAMILY',
        }),
      });
      if (res.ok) {
        setTransferAmount('');
        setTransferNote('');
        setShowTransferModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts based on view
  const visibleAccounts = isFamilyView
    ? accounts
    : accounts.filter((a) => a.user.id === currentUser.id);

  // Total balance across all visible wallets
  const totalBalance = visibleAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base">
              ওয়ালেট ও একাউন্ট ব্যালেন্স
            </h2>
          </div>

          {/* Quick Total Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800">
            <span className="text-xs font-semibold text-emerald-700">মোট স্থিতি:</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-800">
              {formatBDT(totalBalance, { useBengaliDigits })}
            </span>
          </div>

          <span className="text-xs text-slate-400">({visibleAccounts.length} টি একাউন্ট)</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleToggleTransfer}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              showTransferModal
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400/20 shadow-xs'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
            <span>টাকা ট্রান্সফার</span>
          </button>
          <button
            onClick={handleToggleAddWallet}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              showAddWalletModal
                ? 'border-emerald-400 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400/20 shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন ওয়ালেট</span>
          </button>
        </div>
      </div>

      {/* Inline Transfer Form */}
      {showTransferModal && (
        <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 border border-indigo-200/90 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800">
                  ওয়ালেট টু ওয়ালেট ফান্ড স্থানান্তর
                </h3>
                <p className="text-[11px] text-slate-500">
                  এক ওয়ালেট (যেমন: ক্যাশ বা ব্যাংক) থেকে অন্য ওয়ালেটে টাকা সরান
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleTransfer} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  কোন একাউন্ট থেকে? (টাকা প্রেরক)
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setFromAccountId(newFrom);
                    if (newFrom === toAccountId) {
                      const next = sortedAccounts.find((a) => a.id !== newFrom);
                      if (next) setToAccountId(next.id);
                    }
                  }}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium text-slate-800"
                  required
                >
                  <option value="">ওয়ালেট নির্বাচন করুন</option>
                  {sortedAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — ব্যালেন্স: {formatBDT(a.balance, { useBengaliDigits })} {isFamilyView && a.user ? `(${a.user.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  কোন একাউন্টে জমা হবে? (টাকা প্রাপক)
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium text-slate-800"
                  required
                >
                  <option value="">ওয়ালেট নির্বাচন করুন</option>
                  {sortedAccounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — ব্যালেন্স: {formatBDT(a.balance, { useBengaliDigits })} {isFamilyView && a.user ? `(${a.user.name})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  টাকার পরিমাণ (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                  <input
                    type="number"
                    placeholder="যেমন: ৫০০ বা ১০০০"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-bold text-slate-900"
                    required
                    min="1"
                    step="any"
                  />
                </div>
                {/* Quick Amount Suggestion Pills */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">কুইক সিলেক্ট:</span>
                  {[100, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTransferAmount(amt.toString())}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-md transition shadow-2xs"
                    >
                      +৳{formatBDT(amt, { useBengaliDigits })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নোট বা বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: এটিএম থেকে ক্যাশ উত্তোলন / বিকাশ ক্যাশআউট"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100/80">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{loading ? 'স্থানান্তর হচ্ছে...' : 'স্থানান্তর সম্পন্ন করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Add Wallet Form */}
      {showAddWalletModal && (
        <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 border border-emerald-200/90 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800">
                  নতুন ওয়ালেট বা একাউন্ট যোগ করুন
                </h3>
                <p className="text-[11px] text-slate-500">
                  বিকাশ, নগদ, রকেট, ব্যাংক একাউন্ট বা ক্যাশ যুক্ত করুন
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddWalletModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium">কুইক প্রিসেট:</span>
            {[
              { name: 'ক্যাশ (Cash)', type: 'CASH' },
              { name: 'বিকাশ (bKash)', type: 'BKASH' },
              { name: 'নগদ (Nagad)', type: 'NAGAD' },
              { name: 'রকেট (Rocket)', type: 'ROCKET' },
              { name: 'ব্যাংক একাউন্ট', type: 'BANK' },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setWalletName(preset.name);
                  setWalletType(preset.type);
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-md transition shadow-2xs"
              >
                +{preset.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateWallet} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ওয়ালেটের নাম
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ক্যাশ, বিকাশ, সিটি ব্যাংক"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs font-medium text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ওয়ালেট টাইপ
                </label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs font-medium text-slate-800"
                >
                  <option value="CASH">ক্যাশ (Cash)</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ (Nagad)</option>
                  <option value="ROCKET">রকেট (Rocket)</option>
                  <option value="BANK">ব্যাংক একাউন্ট (Bank / DBBL)</option>
                  <option value="OTHER">অন্যান্য</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বর্তমান ব্যালেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="number"
                  placeholder="০.০০"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition shadow-2xs font-bold text-slate-800"
                  step="any"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-100/80">
              <button
                type="button"
                onClick={() => setShowAddWalletModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{loading ? 'তৈরি হচ্ছে...' : 'ওয়ালেট সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prominent Total Balance Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <span>{isFamilyView ? 'সর্বমোট পারিবারিক স্থিতি (Total Balance)' : 'আপনার সর্বমোট বর্তমান ব্যালেন্স'}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatBDT(totalBalance, { useBengaliDigits })}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200/80 self-start sm:self-center flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>সকল ওয়ালেট (ক্যাশ, বিকাশ, ব্যাংক ও নগদ) মিলিয়ে মোট সংরক্ষিত টাকা</span>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {visibleAccounts.map((acc) => (
          <div
            key={acc.id}
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition relative group"
          >
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-xs text-slate-600 font-medium truncate flex-1 min-w-0" title={acc.name}>
                {acc.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {/* Actions: visible on mobile, hover on desktop */}
                <button
                  onClick={() => {
                    setEditingAccount(acc);
                    setEditName(acc.name);
                    setEditBalance(acc.balance.toString());
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  title="এডিট করুন"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteAccount(acc.id, acc.name)}
                  disabled={deletingAccountId === acc.id}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="p-1 rounded-md bg-white border border-slate-100 shadow-2xs">
                  {getWalletIcon(acc.type, acc.name)}
                </div>
              </div>
            </div>
            <div className="font-bold text-slate-900 text-sm sm:text-base">
              {formatBDT(acc.balance, { useBengaliDigits })}
            </div>
            {isFamilyView && (
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                মালিক: {acc.user.name}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Wallet Modal (Top-aligned, click outside or X to close) */}
      {editingAccount && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingAccount(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-slate-800">ওয়ালেট তথ্য পরিবর্তন করুন</h3>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ওয়ালেটের নাম</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ব্যালেন্স (৳)</label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
                  required
                  step="any"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
