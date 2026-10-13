'use client';

import React, { useState } from 'react';
import { X, HandCoins, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { getLocalDateString } from '@/lib/utils';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  householdId: string;
}

export function AddDebtModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  householdId,
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
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-modal-pop"
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
            <span>আমি পাব (পাওনা)</span>
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
            <span>আমাকে দিতে হবে (দেনা)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ব্যক্তির নাম *
            </label>
            <input
              type="text"
              placeholder={type === 'RECEIVABLE' ? 'কে টাকা ফেরত দেবে? (যেমন: আসিফ)' : 'কাকে টাকা দিতে হবে? (যেমন: করিম ভাই)'}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
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
              placeholder="০.০০"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-base font-bold px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>টাকা পরিশোধ / পাওয়ার তারিখ (Due Date) *</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              এই তারিখ আসলে অ্যাপ স্বয়ংক্রিয়ভাবে আপনাকে পপ-আপ রিমাইন্ডার দেবে।
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              নোট / কারণ (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: জরুরি চিকিৎসার জন্য ধার নিয়েছিল"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
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
              className={`flex-1 py-2.5 text-xs font-semibold text-white rounded-xl shadow-md transition disabled:opacity-50 ${
                type === 'RECEIVABLE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
              }`}
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
