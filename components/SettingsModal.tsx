'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Globe,
  Users,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { toBengaliNumerals } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string; email: string };
  household: { id: string; name: string; inviteCode: string } | null;
  useBengaliDigits: boolean;
  onToggleBengaliDigits: (val: boolean) => void;
  onOpenEditProfile: () => void;
  onResetData: () => void;
  isHouseholdAdmin?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  household,
  useBengaliDigits,
  onToggleBengaliDigits,
  onOpenEditProfile,
  onResetData,
  isHouseholdAdmin = true,
}: SettingsModalProps) {
  const [copiedInvite, setCopiedInvite] = useState(false);

  if (!isOpen) return null;

  const handleCopyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-modal-pop my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-600 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-800">
                অ্যাপ সেটিংস ও ডাটা ব্যবস্থাপনা
              </h3>
              <p className="text-xs text-slate-500">
                সিস্টেম প্রেফারেন্স ও হিসাব নিয়ন্ত্রণ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Section 1: Display & Language Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              ডিসপ্লে ও ভাষা প্রেফারেন্স
            </h4>

            {/* Bengali Digits Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div>
                <div className="font-semibold text-xs sm:text-sm text-slate-800">
                  বাংলা সংখ্যা পদ্ধতি (Bengali Numerals)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  টাকা ও সংখ্যার জন্য বাংলা অঙ্ক ({toBengaliNumerals('১২৩৪')}) ব্যবহার করুন
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleBengaliDigits(!useBengaliDigits)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useBengaliDigits ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    useBengaliDigits ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Household & Invite */}
          {household && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                পরিবার ও কোড
              </h4>

              <div className="p-3.5 bg-teal-50/60 border border-teal-200/70 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-teal-900">
                    ফ্যামিলি ইনভাইট কোড (Invite Code)
                  </div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-teal-800 tracking-wider mt-0.5">
                    {household.inviteCode}
                  </div>
                  <div className="text-[10px] text-teal-600/90 mt-0.5">
                    এই কোড শেয়ার করে পরিবারের নতুন সদস্য যুক্ত হতে পারবে
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyInvite(household.inviteCode)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 shrink-0"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Profile Management */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              প্রোফাইল তথ্য
            </h4>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {currentUser.email || 'ব্যক্তিগত অ্যাকাউন্ট'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditProfile();
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                ✏️ প্রোফাইল পরিবর্তন
              </button>
            </div>
          </div>

          {/* Section 4: Danger Zone / Data Reset */}
          <div className="pt-2">
            <div className="border border-rose-200 bg-rose-50/70 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs sm:text-sm font-bold text-rose-800">
                  বিপজ্জনক এলাকা (Danger Zone)
                </h4>
              </div>
              <p className="text-xs text-rose-700/90 leading-relaxed mb-3.5">
                সতর্কতা: সমস্ত আয়, ব্যয়, দেনা-পাওনা এবং হিসাবের ডাটা স্থায়ীভাবে মুছে সম্পূর্ণ নতুন করে শুরু করতে চান? এই কাজ পূর্বাবস্থায় ফিরিয়ে আনা যাবে না এবং নিশ্চিত হতে অ্যাডমিন সিকিউরিটি পিন (PIN) প্রয়োজন হবে।
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetData();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 active:scale-95 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>সব ডাটা মুছুন (রিসেট ডাটা)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
