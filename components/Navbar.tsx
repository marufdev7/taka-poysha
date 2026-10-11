'use client';

import React from 'react';
import {
  Wallet,
  Users,
  User,
  PlusCircle,
  Globe,
  ChevronDown,
  Sparkles,
  Bot,
} from 'lucide-react';

interface NavbarProps {
  users: Array<{ id: string; name: string; email: string; avatarUrl: string | null }>;
  currentUser: { id: string; name: string; email: string; avatarUrl: string | null };
  onSwitchUser: (userId: string) => void;
  isFamilyView: boolean;
  setIsFamilyView: (val: boolean) => void;
  useBengaliDigits: boolean;
  setUseBengaliDigits: (val: boolean) => void;
  onOpenAddModal: () => void;
  onOpenAiModal: () => void;
  onOpenAiChat?: () => void;
  onResetData: () => void;
  onOpenEditProfile: () => void;
}

export function Navbar({
  users,
  currentUser,
  onSwitchUser,
  isFamilyView,
  setIsFamilyView,
  useBengaliDigits,
  setUseBengaliDigits,
  onOpenAddModal,
  onOpenAiModal,
  onOpenAiChat,
  onResetData,
  onOpenEditProfile,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight">
                  টাকা-পয়সা
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">পারিবারিক ও ব্যক্তিগত আর্থিক হিসাব</p>
            </div>
          </div>

          {/* Dual View Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setIsFamilyView(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                !isFamilyView
                  ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ব্যক্তিগত ভিউ</span>
            </button>
            <button
              onClick={() => setIsFamilyView(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                isFamilyView
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>পারিবারিক ভিউ</span>
            </button>
          </div>

          {/* Actions & User Switcher */}
          <div className="flex items-center gap-2">
            {/* AI Report Button */}
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm hover:from-purple-600 hover:to-indigo-700 transition cursor-pointer"
              title="এআই আর্থিক রিপোর্ট"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:inline">AI রিপোর্ট</span>
            </button>

            {/* AI Chat Assistant Button */}
            {onOpenAiChat && (
              <button
                onClick={onOpenAiChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer"
                title="AI আর্থিক সহকারী চ্যাট"
              >
                <Bot className="w-4 h-4" />
                <span className="hidden md:inline">AI চ্যাট</span>
              </button>
            )}

            {/* Digits Toggle (Bangla / English numbers) */}
            <button
              onClick={() => setUseBengaliDigits(!useBengaliDigits)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="বাংলা/ইংরেজি সংখ্যা পরিবর্তন"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{useBengaliDigits ? '১২৩৪' : '1234'}</span>
            </button>

            {/* User Switcher Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs sm:text-sm font-medium text-slate-700 hidden lg:inline">
                  {currentUser.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* User Switch Dropdown Menu */}
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 hidden group-hover:block hover:block z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  মেম্বার পরিবর্তন করুন
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSwitchUser(u.id)}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center gap-2 hover:bg-slate-50 transition ${
                      u.id === currentUser.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {u.name}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1 space-y-0.5">
                  <button
                    onClick={onOpenEditProfile}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition font-medium"
                  >
                    <span>✏️ নাম ও পরিবার পরিবর্তন</span>
                  </button>
                  <button
                    onClick={onResetData}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition font-medium"
                  >
                    <span>🗑️ সব ডাটা মুছুন (রিসেট)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>এন্ট্রি যোগ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
