'use client';

import React, { useState } from 'react';
import { Users2, ArrowUpCircle, ArrowDownCircle, Trash2, UserPlus } from 'lucide-react';
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

  const handleTriggerAdd = () => {
    if (onOpenAddMember) {
      onOpenAddMember();
    } else {
      setInternalShowModal(true);
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
            onClick={handleTriggerAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition active:scale-95"
            title="নতুন সদস্য যুক্ত করুন"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ নতুন সদস্য</span>
          </button>
        )}
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

      {/* Internal Add Member Modal fallback */}
      <AddMemberModal
        isOpen={internalShowModal}
        onClose={() => setInternalShowModal(false)}
        householdId={householdId}
        onRefresh={onRefresh}
      />
    </div>
  );
}
