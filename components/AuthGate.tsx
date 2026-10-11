'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  KeyRound,
  UserCheck,
  UserPlus,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatarUrl: string | null;
  hasPin: boolean;
  role: string;
}

interface AuthGateProps {
  onLoginSuccess: (userId: string) => void;
}

export function AuthGate({ onLoginSuccess }: AuthGateProps) {
  const [mode, setMode] = useState<'select' | 'pin' | 'invite'>('select');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [householdName, setHouseholdName] = useState<string>('আমাদের পরিবার');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Invite code form state
  const [inviteCode, setInviteCode] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPin, setNewMemberPin] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Fetch available profiles for login
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        if (data.householdName) {
          setHouseholdName(data.householdName);
        }
        // If there is only 1 profile and no others, pre-select it directly
        if (data.profiles && data.profiles.length === 1) {
          setSelectedProfile(data.profiles[0]);
          setMode('pin');
        }
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setPin('');
    setError(null);
    setMode('pin');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || pin.length < 4) {
      setError('কমপক্ষে ৪ সংখ্যার পিন প্রদান করুন');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedProfile.id,
          pin: pin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save auth to localStorage
        localStorage.setItem('auth_user_id', data.user.id);
        localStorage.setItem('auth_user_name', data.user.name);
        onLoginSuccess(data.user.id);
      } else {
        setError(data.error || 'ভুল পিন! অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('সার্ভার কানেকশনে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWithInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !newMemberName.trim() || newMemberPin.length < 4) {
      setError('অনুগ্রহ করে সকল তথ্য ও কমপক্ষে ৪ সংখ্যার পিন দিন');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          name: newMemberName.trim(),
          pin: newMemberPin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setInviteSuccess(data.message);
        localStorage.setItem('auth_user_id', data.user.id);
        localStorage.setItem('auth_user_name', data.user.name);
        setTimeout(() => {
          onLoginSuccess(data.user.id);
        }, 1200);
      } else {
        setError(data.error || 'ইনভিটেশন কোডটি সঠিক নয়।');
      }
    } catch (err) {
      console.error('Join error:', err);
      setError('সার্ভার কানেকশনে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center text-white mb-3 shadow-inner border border-white/30">
            <Wallet className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">টাকা-পয়সা</h1>
          <p className="text-xs text-emerald-100 mt-1 font-medium">
            {householdName} • ব্যক্তিগত ও পারিবারিক আর্থিক সুরক্ষা
          </p>
        </div>

        {/* Tab switchers: Member Login vs Invite Code */}
        <div className="grid grid-cols-2 p-2 bg-slate-100/80 border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => {
              setMode(profiles.length === 1 ? 'pin' : 'select');
              setError(null);
            }}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode !== 'invite'
                ? 'bg-white text-emerald-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>সদস্য লগইন</span>
          </button>
          <button
            onClick={() => {
              setMode('invite');
              setError(null);
            }}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'invite'
                ? 'bg-white text-emerald-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ইনভিটেশন কোড</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>নিরাপত্তা সিস্টেম প্রস্তুত হচ্ছে...</span>
            </div>
          ) : mode === 'select' ? (
            /* Mode 1: Select Profile */
            <div className="space-y-4">
              <div className="text-center mb-5">
                <h2 className="text-base font-bold text-slate-800">আপনার প্রোফাইল বেছে নিন</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ড্যাশবোর্ডে প্রবেশ করতে আপনার নামের ওপর চাপ দিন
                </p>
              </div>

              <div className="space-y-2.5">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          p.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700 transition">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.role === 'ADMIN' ? '👑 অ্যাডমিন' : '👤 পরিবারের সদস্য'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>

              {profiles.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  কোনো প্রোফাইল পাওয়া যায়নি। ইনভিটেশন কোড দিয়ে যোগ দিন।
                </div>
              )}
            </div>
          ) : mode === 'pin' && selectedProfile ? (
            /* Mode 2: Enter PIN */
            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center font-bold text-base mb-2">
                  {selectedProfile.avatarUrl ? (
                    <img
                      src={selectedProfile.avatarUrl}
                      alt={selectedProfile.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    selectedProfile.name.charAt(0)
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-800">{selectedProfile.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedProfile.hasPin
                    ? 'আপনার গোপন ৪-সংখ্যার পিন প্রদান করুন'
                    : '🛡️ প্রথমবার লগইন: আপনার জন্য একটি নতুন ৪-সংখ্যার পিন সেট করুন'}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {selectedProfile.hasPin ? 'সিকিউরিটি পিন (PIN)' : 'নতুন পিন সেট করুন (New PIN)'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center tracking-widest text-xl font-bold px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!selectedProfile.hasPin && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    💡 এই পিনটি মনে রাখবেন। পরবর্তীতে প্রতিবার এই পিন দিয়ে লগইন করতে হবে।
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || pin.length < 4}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{selectedProfile.hasPin ? 'প্রবেশ করুন' : 'পিন সেট করে প্রবেশ করুন'}</span>
                  </>
                )}
              </button>

              {profiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('select');
                    setError(null);
                  }}
                  className="w-full text-center text-xs text-slate-500 hover:text-emerald-700 transition cursor-pointer pt-1"
                >
                  ← অন্য সদস্য নির্বাচন করুন
                </button>
              )}
            </form>
          ) : (
            /* Mode 3: Join with Invite Code */
            <form onSubmit={handleJoinWithInvite} className="space-y-4">
              <div className="text-center mb-3">
                <h2 className="text-base font-bold text-slate-800">ইনভিটেশন কোড দিয়ে যোগ দিন</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  অ্যাডমিনের কাছ থেকে পাওয়া কোড ও আপনার নাম দিয়ে যুক্ত হন
                </p>
              </div>

              {inviteSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  <span className="font-semibold">{inviteSuccess}</span>
                  <span className="text-slate-500">ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...</span>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      পারিবারিক ইনভিটেশন কোড *
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="যেমন: HASAN-2026 বা FAM-XXXX"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 uppercase tracking-wider font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      আপনার নাম (Member Name) *
                    </label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="আপনার নাম লিখুন..."
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      আপনার সিকিউরিটি পিন সেট করুন (৪ সংখ্যা) *
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={newMemberPin}
                      onChange={(e) => setNewMemberPin(e.target.value)}
                      placeholder="••••"
                      className="w-full text-center tracking-widest text-lg font-bold px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !inviteCode.trim() || !newMemberName.trim() || newMemberPin.length < 4}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>যুক্ত করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>পরিবারে যুক্ত হন</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Privacy Guarantee Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>আপনার পরিবারের আর্থিক হিসাব সম্পূর্ণ সুরক্ষিত ও প্রাইভেট।</span>
          </div>
        </div>
      </div>
    </div>
  );
}
