'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Sparkles, ShieldCheck, Coins } from 'lucide-react';

interface LoadingScreenProps {
  customMessage?: string;
  subMessage?: string;
}

const FINANCE_TIPS = [
  '🔒 আপনার ব্যক্তিগত ও পারিবারিক খতিয়ান প্রস্তুত হচ্ছে...',
  '📊 দৈনিক আয় ও ব্যয়ের হিসাব প্রস্তুত হচ্ছে...',
  '💡 সঞ্চয়ই ভবিষ্যতের শক্তি — প্রতিটি পয়সার সঠিক হিসাব রাখুন',
  '✨ স্মার্ট বাজেট ও দেনা-পাওনা সিঙ্ক করা হচ্ছে...',
  '🚀 কিছুক্ষণের মধ্যেই আপনার ড্যাশবোর্ড লোড হচ্ছে...',
];

export function LoadingScreen({ customMessage, subMessage }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (customMessage) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % FINANCE_TIPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [customMessage]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-['Hind_Siliguri',sans-serif]">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-aura-breath" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full px-6 py-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl animate-modal-pop">
        {/* Animated Brand Graphic with Floating Taka Coin */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Radar Ring */}
          <div className="absolute inset-0 -m-2 rounded-3xl bg-emerald-500/20 animate-radar-ring pointer-events-none" />

          {/* Main Wallet Box */}
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-2xl animate-coin-glow border border-emerald-400/40">
            <Wallet className="w-10 h-10 sm:w-11 sm:h-11 text-white drop-shadow-md" />
          </div>

          {/* Floating Golden Taka Coin Badge */}
          <div
            className="absolute -top-2.5 -right-3 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-amber-950 font-black text-sm flex items-center justify-center shadow-lg border border-yellow-200/90 animate-coin-float"
            title="টাকা"
          >
            ৳
          </div>

          {/* Floating Sparkle Micro-badge */}
          <div className="absolute -bottom-1.5 -left-2 w-6 h-6 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-emerald-400/40 shadow-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Brand Title */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold tracking-wide uppercase">
            <Coins className="w-3 h-3" />
            <span>স্মার্ট ফিন্যান্স</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
            টাকা-পয়সা
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            ব্যক্তিগত ও পারিবারিক আয়-ব্যয় খতিয়ান
          </p>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-52 sm:w-60 h-1.5 bg-slate-800/90 rounded-full overflow-hidden relative mb-4 border border-slate-700/50 shadow-inner">
          <div className="w-24 h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 rounded-full animate-shimmer-wave blur-[0.5px]" />
        </div>

        {/* Dynamic Rotating Message */}
        <div className="min-h-[2.5rem] flex items-center justify-center px-2">
          <p
            key={customMessage || tipIndex}
            className="text-xs sm:text-sm font-medium text-emerald-400/90 animate-fade-in transition-all duration-300"
          >
            {customMessage || FINANCE_TIPS[tipIndex]}
          </p>
        </div>

        {subMessage && (
          <p className="text-[11px] text-slate-400 mt-1">{subMessage}</p>
        )}

        {/* Security & Privacy Badge */}
        <div className="mt-5 pt-4 border-t border-slate-800/60 w-full flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 font-medium shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>সুরক্ষিত ও প্রাইভেট হিসাব</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LoadingScreen;
