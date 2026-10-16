'use client';

import React, { useState } from 'react';
import { Users2, ArrowUpCircle, ArrowDownCircle, Trash2, UserPlus, X } from 'lucide-react';
import { formatBDT } from '@/lib/utils';
import { AddMemberModal } from '@/components/AddMemberModal';

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
  isAdmin?: boolean;
  currentUserId?: string;
  onOpenAddMember?: () => void;
}

export function FamilyMemberBreakdown({
  members,
  transactions,
  useBengaliDigits,
  householdId,
  onRefresh,
  isAdmin = false,
  currentUserId,
  onOpenAddMember,
}: FamilyMemberBreakdownProps) {
  const [internalShowModal, setInternalShowModal] = useState(false);

  // Inline Add Member State
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [memberPin, setMemberPin] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleToggleAdd = () => {
    setShowInlineAdd(!showInlineAdd);
    setError(null);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberPin || memberPin.trim().length < 4) {
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
        setShowInlineAdd(false);
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
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            পারিবারিক সদস্যদের অবদান (Member Contributions)
          </h3>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleToggleAdd}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer shadow-xs ${
              showInlineAdd
                ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/20'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
            title="নতুন সদস্য যুক্ত করুন"
          >
            <UserPlus className={`w-3.5 h-3.5 transition-transform duration-300 ${showInlineAdd ? 'rotate-45' : ''}`} />
            <span>{showInlineAdd ? 'ফর্ম বন্ধ করুন' : '+ নতুন সদস্য'}</span>
          </button>
        )}
      </div>

      {/* Inline Add Member Form (Accordion motion, smooth open & close) */}
      <div className={`inline-collapse-wrapper ${showInlineAdd ? 'open mb-4' : ''}`}>
        <div className="inline-collapse-content">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 border border-indigo-200/90 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-100/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-800">
                    পরিবারে নতুন সদস্য যুক্ত করুন
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    পরিবারের সদস্যের নাম এবং প্রোফাইল লগইন পিন নির্ধারণ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInlineAdd(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-indigo-100/60 rounded-lg transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সদস্যের নাম *
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: বাবা, মা, ভাই, তানভীর..."
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ভূমিকা (Role)
                  </label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-indigo-500 font-medium"
                  >
                    <option value="MEMBER">সাধারণ সদস্য (Member)</option>
                    <option value="ADMIN">পরিবার প্রধান (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    লগইন পিন (PIN) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="৪ সংখ্যার পিন (ডিফল্ট: 1234)"
                    value={memberPin}
                    onChange={(e) => setMemberPin(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-indigo-500 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={() => setShowInlineAdd(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading || !memberName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {loading ? 'যুক্ত হচ্ছে...' : 'সদস্য যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
          const isCurrentUser = currentUserId === m.user.id;

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
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm text-slate-800">{m.user.name}</h4>
                      {isCurrentUser && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 font-medium">
                          আপনি
                        </span>
                      )}
                    </div>
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

                  {isAdmin && !isCurrentUser && members.length > 1 && (
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

              {/* Income vs Expense row */}
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

      {/* Fallback Add Member Modal if opened from external trigger */}
      <AddMemberModal
        isOpen={internalShowModal}
        onClose={() => setInternalShowModal(false)}
        householdId={householdId}
        onRefresh={onRefresh}
      />
    </div>
  );
}
