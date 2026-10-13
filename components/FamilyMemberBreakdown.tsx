'use client';

import React, { useState } from 'react';
import { Users2, ArrowUpCircle, ArrowDownCircle, Trash2, X } from 'lucide-react';
import { formatBDT } from '@/lib/utils';

interface Member {
  role: string;
  user: { id: string; name: string; avatarUrl: string | null; email: string };
}

interface Transaction {
  userId: string;
  type: string;
  amount: number;
}

interface FamilyMemberBreakdownProps {
  members: Member[];
  transactions: Transaction[];
  useBengaliDigits: boolean;
  householdId: string;
  onRefresh: () => void;
}

export function FamilyMemberBreakdown({
  members,
  transactions,
  useBengaliDigits,
  householdId,
  onRefresh,
}: FamilyMemberBreakdownProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [memberPin, setMemberPin] = useState('1234');
  const [loading, setLoading] = useState(false);

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`আপনি কি "${name}"-কে পরিবার থেকে মুছে ফেলতে চান?`)) return;
    try {
      const res = await fetch(`/api/household/member?userId=${userId}&householdId=${householdId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'সদস্য মুছতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || memberPin.trim().length < 4) {
      alert('সদস্যের নাম ও কমপক্ষে ৪ সংখ্যার পিন দিন');
      return;
    }
    setLoading(true);
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
      if (res.ok) {
        setMemberName('');
        setMemberPin('1234');
        setShowAddMember(false);
        onRefresh();
      } else {
        alert('সদস্য যোগ করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            পারিবারিক সদস্যদের অবদান (Member Contributions)
          </h3>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
        >
          <span>+ নতুন সদস্য</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => {
          const userTransactions = transactions.filter((t) => t.userId === m.user.id);
          const memberIncome = userTransactions
            .filter((t) => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);
          const memberExpense = userTransactions
            .filter((t) => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);
          const memberNet = memberIncome - memberExpense;

          return (
            <div
              key={m.user.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {m.user.avatarUrl ? (
                    <img
                      src={m.user.avatarUrl}
                      alt={m.user.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {m.user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">{m.user.name}</h4>
                    <span className="text-[11px] text-slate-400 capitalize">
                      ভূমিকা: {m.role === 'ADMIN' ? 'পরিবার প্রধান (Admin)' : 'সদস্য (Member)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">ব্যালেন্স অবশেষ</div>
                    <div
                      className={`font-bold text-sm ${
                        memberNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatBDT(memberNet, { useBengaliDigits })}
                    </div>
                  </div>

                  {members.length > 1 && (
                    <button
                      onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="সদস্য মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Income vs Expense Mini Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>আয়: </span>
                  <span className="font-semibold text-slate-900">
                    {formatBDT(memberIncome, { useBengaliDigits })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <ArrowDownCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>ব্যয়: </span>
                  <span className="font-semibold text-slate-900">
                    {formatBDT(memberExpense, { useBengaliDigits })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-start justify-center pt-14 sm:pt-20 p-4 overflow-y-auto animate-backdrop-fade"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddMember(false);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-modal-pop origin-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-800">পরিবারের নতুন সদস্য যুক্ত করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-indigo-500"
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
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-indigo-500 bg-white"
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
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-indigo-500 font-mono tracking-widest"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 সদস্য তার নামের পাশে এই পিন দিয়ে অ্যাকাউন্টে লগইন করতে পারবেন।
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'যোগ হচ্ছে...' : 'যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
