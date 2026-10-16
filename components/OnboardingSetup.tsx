'use client';

import React, { useState } from 'react';
import { Wallet, Sparkles, ArrowRight, ShieldCheck, Plus } from 'lucide-react';

interface OnboardingSetupProps {
  onSuccess: () => void;
}

export function OnboardingSetup({ onSuccess }: OnboardingSetupProps) {
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [wallets, setWallets] = useState([
    { name: 'ক্যাশ (Cash)', type: 'CASH', balance: 0, checked: true },
    { name: 'bKash', type: 'BKASH', balance: 0, checked: true },
    { name: 'ব্যাংক একাউন্ট', type: 'BANK', balance: 0, checked: true },
    { name: 'নগদ (Nagad)', type: 'NAGAD', balance: 0, checked: false },
  ]);
  const [loading, setLoading] = useState(false);

  const toggleWallet = (idx: number) => {
    setWallets((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, checked: !w.checked } : w))
    );
  };

  const handleWalletBalanceChange = (idx: number, val: string) => {
    setWallets((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, balance: parseFloat(val) || 0 } : w))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('দয়া করে আপনার নাম লিখুন');
      return;
    }

    setLoading(true);
    try {
      const selectedWallets = wallets
        .filter((w) => w.checked)
        .map((w) => ({ name: w.name, type: w.type, balance: w.balance }));

      const res = await fetch('/api/user/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          householdName: householdName.trim() || `${name.trim()} এর পরিবার`,
          wallets: selectedWallets,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || 'সেটআপ ব্যর্থ হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200/80">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/20">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-['Hind_Siliguri',sans-serif]">
            টাকা-পয়সা ট্র্যাকার সেটআপ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            আপনার নিজের নাম দিয়ে অ্যাকাউন্ট তৈরি করে ম্যানুয়ালি হিসাব রাখা শুরু করুন
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              আপনার নাম (Your Name) *
            </label>
            <input
              type="text"
              placeholder="যেমন: মারুফ আহমেদ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500 focus:border-emerald-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              পরিবারের নাম (Family / Household Name)
            </label>
            <input
              type="text"
              placeholder="যেমন: আমাদের পরিবার"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500 focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              ঐচ্ছিক — খালি রাখলে আপনার নামে পরিবার তৈরি হবে
            </span>
          </div>

          {/* Wallets selection */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              আপনার প্রাথমিক ওয়ালেটসমূহ ও প্রারম্ভিক ব্যালেন্স (ঐচ্ছিক)
            </label>
            <div className="space-y-2">
              {wallets.map((w, idx) => (
                <div
                  key={w.name}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    w.checked ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 flex-1">
                    <input
                      type="checkbox"
                      checked={w.checked}
                      onChange={() => toggleWallet(idx)}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                    />
                    <span>{w.name}</span>
                  </label>

                  {w.checked && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">৳</span>
                      <input
                        type="number"
                        placeholder="০"
                        value={w.balance || ''}
                        onChange={(e) => handleWalletBalanceChange(idx, e.target.value)}
                        className="w-20 text-xs px-2 py-1 border border-slate-200 rounded-lg text-right focus:outline-emerald-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{loading ? 'সেটআপ হচ্ছে...' : 'হিসাব শুরু করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 text-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>সম্পূর্ণ প্রাইভেট ও অফলাইন-রেডি লোকাল ডাটাবেস</span>
          </div>
        </form>
      </div>
    </div>
  );
}
