'use client';

import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  Lock,
  Users,
  Sparkles,
} from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  householdId: string;
  categories: Category[];
  accounts: Account[];
  isAutoPopup?: boolean;
  autoPopupSlot?: number | null;
  onSkipToday?: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  householdId,
  categories,
  accounts,
  isAutoPopup = false,
  autoPopupSlot = null,
  onSkipToday,
}: AddTransactionModalProps) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [date, setDate] = useState(() => getLocalDateString());
  const [time, setTime] = useState(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState<'FAMILY' | 'PRIVATE'>('FAMILY');
  const [loading, setLoading] = useState(false);

  // Custom Category State
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Auto-popup defaults to EXPENSE
  React.useEffect(() => {
    if (isOpen && isAutoPopup) {
      setType('EXPENSE');
    }
  }, [isOpen, isAutoPopup]);

  // Handle Escape key dismiss
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: newCatName,
          type: type === 'TRANSFER' ? 'EXPENSE' : type,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewCatName('');
        setShowAddCategory(false);
        setCategoryId(created.id);
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;
    if (type !== 'TRANSFER' && !categoryId) {
      alert('দয়া করে ক্যাটাগরি নির্বাচন করুন');
      return;
    }
    if (type === 'TRANSFER' && (!toAccountId || accountId === toAccountId)) {
      alert('সঠিক ওয়ালেট নির্বাচন করুন');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          householdId,
          accountId,
          toAccountId: type === 'TRANSFER' ? toAccountId : null,
          categoryId: type === 'TRANSFER' ? null : categoryId,
          type,
          amount: parseFloat(amount),
          date: time ? `${date}T${time}:00` : date,
          note,
          visibility,
        }),
      });

      if (res.ok) {
        setAmount('');
        setNote('');
        setDate(getLocalDateString());
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('লেনদেন যোগ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Auto Popup Notice */}
        {isAutoPopup && (
          <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300/80 rounded-2xl flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-amber-950">আজকের খরচ এন্ট্রি রিমাইন্ডার</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                  {autoPopupSlot === 1 ? '১ম বার' : '২য় বার'} • দিনে ২ বার
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 mt-0.5 leading-relaxed">
                সারাদিনের টুকটাক খরচগুলো চটপট লিখে রাখুন, যাতে কোনো হিসাব বাদ না যায়!
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">
            {isAutoPopup ? 'আজকের খরচ এন্ট্রি' : 'নতুন লেনদেন এন্ট্রি'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              type === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>ব্যয় (Expense)</span>
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              type === 'INCOME'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>আয় (Income)</span>
          </button>
          <button
            type="button"
            onClick={() => setType('TRANSFER')}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition ${
              type === 'TRANSFER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>স্থানান্তর</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              টাকার পরিমাণ (BDT) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">৳</span>
              <input
                type="number"
                placeholder="০.০০"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-lg font-bold pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
                required
                autoFocus
              />
            </div>
            {/* Quick amount chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {quickAmounts.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setAmount(q.toString())}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium shrink-0 transition"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Category (if not transfer) */}
          {type !== 'TRANSFER' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">খাত / ক্যাটাগরি *</label>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="text-[11px] text-emerald-600 font-semibold hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  নতুন খাত
                </button>
              </div>

              {showAddCategory ? (
                <div className="flex gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                  <input
                    type="text"
                    placeholder="নতুন খাতের নাম..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    যোগ
                  </button>
                </div>
              ) : null}

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
                required
              >
                <option value="">ক্যাটাগরি নির্বাচন করুন</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Account/Wallet */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {type === 'TRANSFER' ? 'কোন একাউন্ট থেকে কাটবে?' : 'ওয়ালেট / একাউন্ট *'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (৳ {a.balance})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account for Transfer */}
          {type === 'TRANSFER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                কোন একাউন্টে জমা হবে? *
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
                required
              >
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (৳ {a.balance})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date, Time & Privacy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">তারিখ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">সময়</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs sm:text-sm px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                প্রাইভেসি
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full text-xs sm:text-sm px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white"
              >
                <option value="FAMILY">পরিবার দেখবে</option>
                <option value="PRIVATE">শুধু আমি দেখব</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              নোট / বিবরণ (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: কারওয়ান বাজার থেকে মাছ কেনা"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-700"
            >
              {isAutoPopup ? 'এখন না / পরে লিখব' : 'বাতিল'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-xl shadow-md transition disabled:opacity-50 ${
                type === 'EXPENSE'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : type === 'INCOME'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>

          {isAutoPopup && onSkipToday && (
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={onSkipToday}
                className="text-xs text-slate-400 hover:text-slate-600 underline transition cursor-pointer"
              >
                আজকের মতো আর এই পপ-আপ দেখাবেন না
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
