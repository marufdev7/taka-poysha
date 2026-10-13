'use client';

import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  ArrowRight,
  Plus,
  Lock,
  Pencil,
} from 'lucide-react';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  note: string | null;
  visibility: string;
  category: { id: string; name: string } | null;
  account: { id: string; name: string; userId?: string };
  toAccount: { id: string; name: string; userId?: string } | null;
  user: { id: string; name: string };
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  [key: string]: any;
}

interface RecentTransactionsPreviewProps {
  transactions: Transaction[];
  useBengaliDigits: boolean;
  currentUserId?: string;
  isFamilyView?: boolean;
  onViewAll: () => void;
  onOpenAddModal: () => void;
  onEditTransaction?: (transaction: any) => void;
}

export function RecentTransactionsPreview({
  transactions,
  useBengaliDigits,
  currentUserId,
  isFamilyView = false,
  onViewAll,
  onOpenAddModal,
  onEditTransaction,
}: RecentTransactionsPreviewProps) {
  const recent = transactions.slice(0, 5);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base flex items-center gap-2">
              <span>সাম্প্রতিক লেনদেনসমূহ</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                সর্বশেষ ৫টি
              </span>
            </h2>
            <p className="text-xs text-slate-400">ড্যাশবোর্ড সংক্ষেপ (বিস্তারিত দেখতে নিচে ক্লিক করুন)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ নতুন লেনদেন</span>
          </button>

          <button
            onClick={onViewAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
          >
            <span>সকল লেনদেন ({transactions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      {recent.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          <p className="mb-2">এখনও কোনো লেনদেনের তথ্য নেই।</p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
          >
            প্রথম লেনদেন যোগ করুন
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recent.map((t) => {
            const isIncome = t.type === 'INCOME';
            const isExpense = t.type === 'EXPENSE';
            const isTransfer = t.type === 'TRANSFER';

            const toAccountUserId = (t.toAccount as any)?.userId || (t.toAccount as any)?.user?.id;
            const fromAccountUserId = (t.account as any)?.userId || t.user?.id;

            const isIncomingTransfer =
              isTransfer && currentUserId && toAccountUserId === currentUserId && fromAccountUserId !== currentUserId;
            const isOutgoingTransfer =
              isTransfer &&
              currentUserId &&
              fromAccountUserId === currentUserId &&
              toAccountUserId &&
              toAccountUserId !== currentUserId;

            return (
              <div
                key={t.id}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition group"
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome || isIncomingTransfer
                        ? 'bg-emerald-50 text-emerald-600'
                        : isExpense || isOutgoingTransfer
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {(isIncome || isIncomingTransfer) && <ArrowDownLeft className="w-4 h-4" />}
                    {(isExpense || isOutgoingTransfer) && <ArrowUpRight className="w-4 h-4" />}
                    {isTransfer && !isIncomingTransfer && !isOutgoingTransfer && (
                      <ArrowRightLeft className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm truncate">
                        {isIncomingTransfer
                          ? `স্থানান্তরিত প্রাপ্তি: ${t.account.name} (${t.user.name}) → ${t.toAccount?.name || 'আমার ওয়ালেট'}`
                          : isOutgoingTransfer
                          ? `পারিবারিক স্থানান্তর: ${t.account.name} → ${t.toAccount?.name || 'ওয়ালেট'}`
                          : isTransfer
                          ? `স্থানান্তর: ${t.account.name} → ${t.toAccount?.name || 'ওয়ালেট'}`
                          : t.category?.name || 'সাধারণ'}
                      </span>
                      {isIncomingTransfer && (
                        <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium shrink-0">
                          প্রাপ্তি
                        </span>
                      )}
                      {t.visibility === 'PRIVATE' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200/60 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          ব্যক্তিগত
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{t.account.name}</span>
                      <span>•</span>
                      <span>{formatDateTime(t.date, (t as any).createdAt, { useBengaliDigits })}</span>
                      {t.note && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px] sm:max-w-xs">{t.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Edit */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`font-bold text-sm sm:text-base text-right ${
                      isIncome || isIncomingTransfer
                        ? 'text-emerald-600'
                        : isExpense || isOutgoingTransfer
                        ? 'text-rose-600'
                        : 'text-indigo-600'
                    }`}
                  >
                    {isIncome || isIncomingTransfer
                      ? '+ '
                      : isExpense || isOutgoingTransfer
                      ? '- '
                      : '⇄ '}
                    {formatBDT(t.amount, { useBengaliDigits })}
                  </div>

                  {onEditTransaction && (
                    <button
                      onClick={() => onEditTransaction(t)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="সম্পাদনা করুন"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom CTA to view full list */}
      {transactions.length > 5 && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
          <button
            onClick={onViewAll}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <span>সম্পূর্ণ লেনদেন খতিয়ান দেখুন (আরও {transactions.length - 5} টি লেনদেন বাকি আছে)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
