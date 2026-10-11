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
}

export function WalletsBar({
  accounts,
  useBengaliDigits,
  onRefresh,
  currentUser,
  isFamilyView,
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
          householdId: accounts[0]?.id ? 'default' : '',
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
            onClick={() => setShowTransferModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
            <span>টাকা ট্রান্সফার</span>
          </button>
          <button
            onClick={() => setShowAddWalletModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন ওয়ালেট</span>
          </button>
        </div>
      </div>

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

      {/* Edit Wallet Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-800 mb-3">ওয়ালেট তথ্য পরিবর্তন করুন</h3>
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

      {/* Add Wallet Modal */}
      {showAddWalletModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-800 mb-3">নতুন ওয়ালেট তৈরি করুন</h3>
            <form onSubmit={handleCreateWallet} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ওয়ালেটের নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: সিটি ব্যাংক, নগদ, পকেট ক্যাশ"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ওয়ালেট টাইপ</label>
                <select
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
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
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  বর্তমান ব্যালেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="number"
                  placeholder="০.০০"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWalletModal(false)}
                  className="flex-1 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'তৈরি হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <span>ওয়ালেট থেকে ওয়ালেটে ফান্ড স্থানান্তর</span>
            </h3>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">কোন একাউন্ট থেকে?</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                  required
                >
                  <option value="">নির্বাচন করুন</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatBDT(a.balance, { useBengaliDigits })})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">কোন একাউন্টে জমা হবে?</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                  required
                >
                  <option value="">নির্বাচন করুন</option>
                  {accounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatBDT(a.balance, { useBengaliDigits })})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  placeholder="যেমন: ৫০০০"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: এটিএম থেকে ক্যাশ উত্তোলন"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'স্থানান্তর হচ্ছে...' : 'স্থানান্তর করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
