'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Trash2,
  Calendar,
  Lock,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  CalendarDays,
  Clock,
  Printer,
  FileDown,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import { exportTransactionsToPdf } from '@/lib/pdfExport';
import {
  formatBDT,
  formatDate,
  formatDateTime,
  formatMonthBengali,
  getLocalDateString,
  toBengaliNumerals,
} from '@/lib/utils';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  note: string | null;
  visibility: string;
  user: { id: string; name: string };
  account: { name: string; userId?: string; user?: { id: string; name: string } };
  toAccount: { name: string; userId?: string; user?: { id: string; name: string } } | null;
  category: { name: string; color: string | null } | null;
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  createdAt?: string | Date;
}

interface TransactionListProps {
  transactions: Transaction[];
  useBengaliDigits: boolean;
  onRefresh: () => void;
  isFamilyView: boolean;
  currentUserId: string;
  onOpenAddModal?: () => void;
  onEditTransaction?: (transaction: any) => void;
}

export function TransactionList({
  transactions,
  useBengaliDigits,
  onRefresh,
  isFamilyView,
  currentUserId,
  onOpenAddModal,
  onEditTransaction,
}: TransactionListProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Privacy check on all transactions
  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const isIncomingTransfer =
        t.type === 'TRANSFER' &&
        ((t.toAccount && (t.toAccount.userId === currentUserId || (t.toAccount as any).user?.id === currentUserId)) ||
          (t as any).toAccountId && (t as any).toAccount?.userId === currentUserId);

      if (!isFamilyView) {
        if (t.user.id !== currentUserId && !isIncomingTransfer) return false;
      } else {
        if (t.visibility === 'PRIVATE' && t.user.id !== currentUserId && !isIncomingTransfer) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, isFamilyView, currentUserId]);

  // Per-month spending and income statistics summary (প্রতি মাসের খরচের সার্বিক হিসাব)
  const { monthsSummary, allExpenses, allIncome } = useMemo(() => {
    const map = new Map<string, { expense: number; income: number; count: number }>();
    let totalExp = 0;
    let totalInc = 0;

    visibleTransactions.forEach((t) => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const current = map.get(key) || { expense: 0, income: 0, count: 0 };
      if (t.type === 'EXPENSE') {
        current.expense += t.amount;
        totalExp += t.amount;
      }
      if (t.type === 'INCOME') {
        current.income += t.amount;
        totalInc += t.amount;
      }
      current.count += 1;
      map.set(key, current);
    });

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(currentMonthKey)) {
      map.set(currentMonthKey, { expense: 0, income: 0, count: 0 });
    }

    const list = Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({
        key,
        label: formatMonthBengali(key, { useBengaliDigits }),
        isCurrent: key === currentMonthKey,
        ...data,
      }));

    return { monthsSummary: list, allExpenses: totalExp, allIncome: totalInc };
  }, [visibleTransactions, useBengaliDigits]);

  // Filter transactions by selected month, type, and search
  const filtered = useMemo(() => {
    return visibleTransactions.filter((t) => {
      // Month filter
      if (selectedMonth !== 'ALL') {
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonth) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNote = t.note?.toLowerCase().includes(q);
        const matchCat = t.category?.name.toLowerCase().includes(q);
        const matchAcc = t.account.name.toLowerCase().includes(q);
        const matchAmount = t.amount.toString().includes(q);
        return matchNote || matchCat || matchAcc || matchAmount;
      }

      return true;
    });
  }, [visibleTransactions, selectedMonth, typeFilter, search]);

  // Financial stats for the current view
  const viewExpense = useMemo(() => {
    return filtered
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  const viewIncome = useMemo(() => {
    return filtered
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filtered]);

  const viewNet = viewIncome - viewExpense;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান? ওয়ালেট ব্যালেন্স স্বয়ংক্রিয়ভাবে পূর্বের অবস্থায় ফিরে যাবে।'
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const exportPDF = async () => {
    setDownloadingPdf(true);
    try {
      await exportTransactionsToPdf({
        transactions: filtered,
        selectedMonth,
        totalIncome: viewIncome,
        totalExpense: viewExpense,
        isFamilyView,
        useBengaliDigits,
      });
    } catch (err) {
      console.error(err);
      alert('PDF ফাইল ডাউনলোড করতে সমস্যা হয়েছে');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      {/* Header, Month Selector & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-base sm:text-lg">
              লেনদেন খতিয়ান ও মাসিক হিসাব
            </h2>
            {selectedMonth !== 'ALL' && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {formatMonthBengali(selectedMonth, { useBengaliDigits })}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {selectedMonth === 'ALL'
              ? 'সকল মাসের সার্বিক খতিয়ান'
              : `${formatMonthBengali(selectedMonth, { useBengaliDigits })} মাসের খরচের খতিয়ান`}
            {' • '}মোট {useBengaliDigits ? toBengaliNumerals(filtered.length) : filtered.length} টি লেনদেন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="ALL">সব মাস একত্রে</option>
              {monthsSummary.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} {m.isCurrent ? '(চলতি মাস)' : ''} - খরচ: ৳ {m.expense}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="খাত বা নোট খুঁজুন..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500 bg-slate-50"
            />
          </div>

          {/* Direct Download PDF Button */}
          <button
            onClick={exportPDF}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 transition cursor-pointer disabled:opacity-50"
            title="PDF ফাইল সরাসরি ডাউনলোড করুন (কোনো প্রিন্ট অপশন আসবে না)"
          >
            {downloadingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 text-rose-600 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{downloadingPdf ? 'ডাউনলোড হচ্ছে...' : 'PDF ডাউনলোড'}</span>
          </button>

          {/* Optional Quick Add Button */}
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন লেনদেন</span>
            </button>
          )}
        </div>
      </div>

      {/* Per-Month Spending Carousel / Quick Select (প্রতি মাসে কত খরচ হয়েছে) */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>প্রতি মাসের খরচের সার্বিক চিত্র (মাস নির্বাচন করুন):</span>
          </span>
          {selectedMonth !== 'ALL' && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('ALL');
                setPage(1);
              }}
              className="text-[11px] text-emerald-600 hover:underline cursor-pointer font-semibold"
            >
              সব মাস দেখুন
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {/* All Months Card */}
          <button
            type="button"
            onClick={() => {
              setSelectedMonth('ALL');
              setPage(1);
            }}
            className={`p-3 rounded-2xl border text-left shrink-0 transition min-w-[150px] cursor-pointer ${
              selectedMonth === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`text-[11px] font-bold ${
                selectedMonth === 'ALL' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              সব মাস একত্রে
            </div>
            <div className="text-sm font-extrabold mt-1">
              খরচ: {formatBDT(allExpenses, { useBengaliDigits })}
            </div>
            <div
              className={`text-[10px] mt-0.5 ${
                selectedMonth === 'ALL' ? 'text-slate-300' : 'text-slate-400'
              }`}
            >
              মোট আয়: {formatBDT(allIncome, { useBengaliDigits })}
            </div>
          </button>

          {/* Individual Months Cards */}
          {monthsSummary.map((m) => {
            const isSelected = selectedMonth === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setSelectedMonth(m.key);
                  setPage(1);
                }}
                className={`p-3 rounded-2xl border text-left shrink-0 transition min-w-[155px] cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected ? 'text-emerald-100' : 'text-slate-600'
                    }`}
                  >
                    {m.label}
                  </span>
                  {m.isCurrent && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      চলতি মাস
                    </span>
                  )}
                </div>
                <div
                  className={`text-sm font-extrabold mt-1 ${
                    isSelected ? 'text-white' : 'text-rose-600'
                  }`}
                >
                  খরচ: {formatBDT(m.expense, { useBengaliDigits })}
                </div>
                <div
                  className={`text-[10px] mt-0.5 flex items-center justify-between gap-1 ${
                    isSelected ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  <span>আয়: {formatBDT(m.income, { useBengaliDigits })}</span>
                  <span>{useBengaliDigits ? toBengaliNumerals(m.count) : m.count}টি</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Financial Summary Cards for Selected Period (নির্বাচিত মাসের আয়-ব্যয় সামারি) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Expense in Period */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/80 to-pink-50/40 border border-rose-100/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>
                {selectedMonth === 'ALL'
                  ? 'সর্বমোট খরচ'
                  : `${formatMonthBengali(selectedMonth, { useBengaliDigits })} এর মোট খরচ`}
              </span>
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
              ব্যয়
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-600 mt-1">
            {formatBDT(viewExpense, { useBengaliDigits })}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">
            {selectedMonth === 'ALL'
              ? 'সকল মাসের সম্মিলিত খরচ'
              : 'নির্বাচিত মাসে পরিশোধিত সকল খরচের সমষ্টি'}
          </div>
        </div>

        {/* Total Income in Period */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>
                {selectedMonth === 'ALL'
                  ? 'সর্বমোট আয়'
                  : `${formatMonthBengali(selectedMonth, { useBengaliDigits })} এর মোট আয়`}
              </span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
              উপার্জন
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-1">
            {formatBDT(viewIncome, { useBengaliDigits })}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">
            {selectedMonth === 'ALL'
              ? 'সকল মাসের সম্মিলিত আয়'
              : 'নির্বাচিত মাসে প্রাপ্ত সকল আয়ের সমষ্টি'}
          </div>
        </div>

        {/* Net Savings in Period */}
        <div
          className={`p-3.5 rounded-2xl border shadow-2xs ${
            viewNet >= 0
              ? 'bg-gradient-to-br from-indigo-50/80 to-blue-50/40 border-indigo-100/90'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold mb-1 ${
              viewNet >= 0 ? 'text-indigo-700' : 'text-red-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              <span>নিট স্থিতি (সঞ্চয়/ঘাটতি)</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                viewNet >= 0
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-red-200 text-red-800'
              }`}
            >
              {viewNet >= 0 ? 'সঞ্চয়' : 'ঘাটতি'}
            </span>
          </div>
          <div
            className={`text-lg sm:text-xl font-extrabold mt-1 ${
              viewNet >= 0 ? 'text-indigo-950' : 'text-red-700'
            }`}
          >
            {formatBDT(Math.abs(viewNet), { useBengaliDigits })}
          </div>
          <div
            className={`text-[11px] mt-0.5 ${
              viewNet >= 0 ? 'text-indigo-600/80' : 'text-red-600/80 font-semibold'
            }`}
          >
            {viewNet >= 0 ? 'আয় থেকে খরচের পর অবশিষ্ট রয়েছে' : 'আয়ের চেয়ে বেশি খরচ হয়েছে'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 text-xs">
        <button
          onClick={() => {
            setTypeFilter('ALL');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
            typeFilter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          সব লেনদেন
        </button>
        <button
          onClick={() => {
            setTypeFilter('INCOME');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
            typeFilter === 'INCOME'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          শুধু আয়
        </button>
        <button
          onClick={() => {
            setTypeFilter('EXPENSE');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
            typeFilter === 'EXPENSE'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          শুধু ব্যয়
        </button>
        <button
          onClick={() => {
            setTypeFilter('TRANSFER');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${
            typeFilter === 'TRANSFER'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          স্থানান্তর (Transfer)
        </button>
      </div>

      {/* Transactions Table/List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          এই ফিল্টারে কোনো লেনদেন পাওয়া যায়নি।
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {paginated.map((t) => {
            const isIncome = t.type === 'INCOME';
            const isExpense = t.type === 'EXPENSE';
            const isTransfer = t.type === 'TRANSFER';

            const toAccountUserId = t.toAccount?.userId || (t.toAccount as any)?.user?.id;
            const fromAccountUserId = (t.account as any)?.userId || t.user?.id;

            const isIncomingTransfer =
              isTransfer && toAccountUserId === currentUserId && fromAccountUserId !== currentUserId;
            const isOutgoingTransfer =
              isTransfer &&
              fromAccountUserId === currentUserId &&
              toAccountUserId &&
              toAccountUserId !== currentUserId;

            const canModify = t.user.id === currentUserId;

            return (
              <div
                key={t.id}
                className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition group"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome || isIncomingTransfer
                        ? 'bg-emerald-50 text-emerald-600'
                        : isExpense || isOutgoingTransfer
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {(isIncome || isIncomingTransfer) && <ArrowDownLeft className="w-5 h-5" />}
                    {(isExpense || isOutgoingTransfer) && <ArrowUpRight className="w-5 h-5" />}
                    {isTransfer && !isIncomingTransfer && !isOutgoingTransfer && (
                      <ArrowRightLeft className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="font-semibold text-slate-800 text-sm truncate">
                        {isIncomingTransfer
                          ? `স্থানান্তরিত প্রাপ্তি: ${t.account.name} (${t.user.name}) → ${t.toAccount?.name || 'আমার ওয়ালেট'}`
                          : isOutgoingTransfer
                          ? `পারিবারিক স্থানান্তর: ${t.account.name} → ${t.toAccount?.name || 'ওয়ালেট'} (${(t.toAccount as any)?.user?.name || 'প্রাপক'})`
                          : isTransfer
                          ? `স্থানান্তর: ${t.account.name}${isFamilyView && t.user?.name ? ` (${t.user.name})` : ''} → ${t.toAccount?.name || 'ওয়ালেট'}${isFamilyView && (t.toAccount as any)?.user?.name ? ` (${(t.toAccount as any).user.name})` : ''}`
                          : t.category?.name || 'সাধারণ'}
                      </span>

                      {/* Badges */}
                      {isIncomingTransfer ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium shrink-0">
                          পারিবারিক প্রাপ্তি
                        </span>
                      ) : isOutgoingTransfer ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-medium shrink-0">
                          পারিবারিক স্থানান্তর
                        </span>
                      ) : null}

                      {/* Privacy Badge */}
                      {t.visibility === 'PRIVATE' ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200/60 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          ব্যক্তিগত
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded shrink-0">
                          <Users className="w-2.5 h-2.5" />
                          পরিবার
                        </span>
                      )}
                    </div>

                    {/* Date, Exact Time, Account & Note Details */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span className="font-medium text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatDateTime(t.date, t.createdAt, { useBengaliDigits })}</span>
                      </span>
                      <span>•</span>
                      <span>{t.account.name}</span>
                      {isFamilyView && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 font-medium">{t.user.name}</span>
                        </>
                      )}
                      {t.note && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 truncate max-w-xs">{t.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions (Edit & Delete) */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div
                    className={`font-bold text-sm sm:text-base ${
                      isIncome || isIncomingTransfer
                        ? 'text-emerald-600'
                        : isExpense || isOutgoingTransfer
                        ? 'text-rose-600'
                        : 'text-indigo-600'
                    }`}
                  >
                    {isIncome || isIncomingTransfer
                      ? '+'
                      : isExpense || isOutgoingTransfer
                      ? '-'
                      : '⇄'}{' '}
                    {formatBDT(t.amount, { useBengaliDigits })}
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                      {onEditTransaction && (
                        <button
                          onClick={() => onEditTransaction(t)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="সম্পাদনা / পরিবর্তন করুন"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > pageSize && (
        <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            মোট{' '}
            <span className="font-semibold text-slate-800">
              {useBengaliDigits ? toBengaliNumerals(filtered.length) : filtered.length}
            </span>{' '}
            টি লেনদেন | পৃষ্ঠা{' '}
            <span className="font-semibold text-slate-800">
              {useBengaliDigits ? toBengaliNumerals(currentPage) : currentPage}
            </span>{' '}
            এর{' '}
            <span className="font-semibold text-slate-800">
              {useBengaliDigits ? toBengaliNumerals(totalPages) : totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>পূর্ববর্তী</span>
            </button>

            <div className="px-3 py-1 font-semibold text-slate-700 bg-slate-100 rounded-lg">
              {useBengaliDigits ? toBengaliNumerals(currentPage) : currentPage} /{' '}
              {useBengaliDigits ? toBengaliNumerals(totalPages) : totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-medium flex items-center gap-1 transition"
            >
              <span>পরবর্তী</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
