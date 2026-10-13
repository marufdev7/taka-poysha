'use client';

import React, { useState } from 'react';
import { Users2, X, ShieldCheck } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  onRefresh: () => void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  householdId,
  onRefresh,
}: AddMemberModalProps) {
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [memberPin, setMemberPin] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || memberPin.trim().length < 4) {
      setError('অনুগ্রহ করে সদস্যের নাম এবং কমপক্ষে ৪ সংখ্যার সিকিউরিটি পিন দিন');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/household/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: memberName.trim(),
          role: memberRole,
          pin: memberPin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMemberName('');
        setMemberPin('1234');
        onClose();
        onRefresh();
      } else {
        setError(data.error || 'সদস্য যুক্ত করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      console.error('Add member error:', err);
      setError('সার্ভার কানেকশনে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-start justify-center pt-14 sm:pt-20 p-4 overflow-y-auto animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-modal-pop origin-top"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 leading-tight">
                পরিবারের নতুন সদস্য যুক্ত করুন
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                শুধুমাত্র পরিবার প্রধান (Admin) নতুন সদস্য যোগ করতে পারেন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAddMember} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              সদস্যের নাম *
            </label>
            <input
              type="text"
              placeholder="যেমন: বাবা, মা, তাসনিম, ফারহান"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500 text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              ভূমিকা (Role)
            </label>
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-white text-slate-800"
            >
              <option value="MEMBER">নিয়মিত সদস্য (আয়-ব্যয় এন্ট্রি করতে পারবে)</option>
              <option value="VIEW_ONLY">শুধু দেখতে পারবে (View Only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              লগইন সিকিউরিটি পিন (কমপক্ষে ৪ সংখ্যা) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="যেমন: 1234"
              value={memberPin}
              onChange={(e) => setMemberPin(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-emerald-500 font-mono tracking-widest text-slate-800"
              required
            />
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>সদস্য তার নামের পাশে এই পিন দিয়ে অ্যাকাউন্টে লগইন করতে পারবেন।</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-700"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'যোগ হচ্ছে...' : 'যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
