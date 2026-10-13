'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Pencil,
  Trash2,
  Wallet,
  User as UserIcon,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  formatBDT,
  formatDate,
  formatDateTime,
  toBengaliNumerals,
  toLocalDateKey,
  isSameDay,
  formatMonthBengali,
} from '@/lib/utils';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  note: string | null;
  visibility: string;
  user?: { id: string; name: string };
  account?: { name: string };
  category?: { name: string; color: string | null } | null;
  [key: string]: any;
}

interface FinancialCalendarProps {
  transactions: Transaction[];
  useBengaliDigits: boolean;
  onAddTransaction: (dateStr?: string) => void;
  onEditTransaction: (transaction: any) => void;
  onRefresh: () => void;
}

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const WEEKDAYS = [
  { bn: 'রবি', en: 'Sun' },
  { bn: 'সোম', en: 'Mon' },
  { bn: 'মঙ্গল', en: 'Tue' },
  { bn: 'বুধ', en: 'Wed' },
  { bn: 'বৃহস্পতি', en: 'Thu' },
  { bn: 'শুক্র', en: 'Fri', isWeekend: true },
  { bn: 'শনি', en: 'Sat', isWeekend: true },
];

export function FinancialCalendar({
  transactions,
  useBengaliDigits,
  onAddTransaction,
  onEditTransaction,
  onRefresh,
}: FinancialCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => toLocalDateKey(today), [today]);

  // Current viewed month & year
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Selected date for viewing daily transactions
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayDateStr);
  };

  // Group all transactions by date key (YYYY-MM-DD)
  const transactionsByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        income: number;
        expense: number;
        items: Transaction[];
      }
    >();

    for (const t of transactions) {
      const dateKey = toLocalDateKey(t.date);
      if (!map.has(dateKey)) {
        map.set(dateKey, { income: 0, expense: 0, items: [] });
      }
      const dayData = map.get(dateKey)!;
      if (t.type === 'INCOME') {
        dayData.income += t.amount;
      } else if (t.type === 'EXPENSE') {
        dayData.expense += t.amount;
      }
      dayData.items.push(t);
    }

    return map;
  }, [transactions]);

  // Days calculation for the viewed month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 for Sunday
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      income: number;
      expense: number;
      transactionCount: number;
      isToday: boolean;
    } | null> = [];

    // Empty padding slots for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = transactionsByDate.get(dateStr) || { income: 0, expense: 0, items: [] };

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        income: dayData.income,
        expense: dayData.expense,
        transactionCount: dayData.items.length,
        isToday: dateStr === todayDateStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, transactionsByDate, todayDateStr]);

  // Monthly summary stats for viewed month
  const monthlyStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let activeDaysCount = 0;

    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = transactionsByDate.get(dateStr);
      if (dayData && (dayData.income > 0 || dayData.expense > 0)) {
        totalIncome += dayData.income;
        totalExpense += dayData.expense;
        activeDaysCount++;
      }
    }

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      activeDaysCount,
    };
  }, [currentYear, currentMonth, transactionsByDate]);

  // Selected date data
  const selectedDayData = useMemo(() => {
    const data = transactionsByDate.get(selectedDateStr) || {
      income: 0,
      expense: 0,
      items: [],
    };

    // Sort items by time descending
    const sortedItems = [...data.items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      ...data,
      items: sortedItems,
    };
  }, [selectedDateStr, transactionsByDate]);

  // Delete transaction handler
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?')) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`মুছে ফেলা যায়নি: ${err.error || 'সার্ভার এরর'}`);
      }
    } catch (err: any) {
      alert(`মুছে ফেলা যায়নি: ${err?.message || 'সমস্যা হয়েছে'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Formatted selected date title in Bengali
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDateStr) return '';
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    const weekdayNames = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const weekday = weekdayNames[dateObj.getDay()];
    const monthName = BENGALI_MONTHS[m - 1];
    const dayStr = useBengaliDigits ? toBengaliNumerals(d) : d;
    const yearStr = useBengaliDigits ? toBengaliNumerals(y) : y;

    return `${dayStr} ${monthName}, ${yearStr} (${weekday})`;
  }, [selectedDateStr, useBengaliDigits]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                আয়-ব্যয় ক্যালেন্ডার (Financial Calendar)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              যেকোনো মাস ও নির্দিষ্ট তারিখের দৈনন্দিন আয়-ব্যয়ের পুঙ্খানুপুঙ্খ খতিয়ান
            </p>
          </div>

          {/* Month / Year Navigator Controls */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition"
                title="পূর্ববর্তী মাস"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Dropdown */}
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-xs sm:text-sm text-slate-800 px-2 py-1 outline-none cursor-pointer"
              >
                {BENGALI_MONTHS.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-xs sm:text-sm text-slate-800 px-2 py-1 outline-none cursor-pointer border-l border-slate-200"
              >
                {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 3 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {useBengaliDigits ? toBengaliNumerals(yr) : yr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition"
                title="পরবর্তী মাস"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Today Button */}
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>চলতি মাস ও আজ</span>
            </button>
          </div>
        </div>

        {/* 2. Monthly Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          {/* Total Income */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-800 mb-1">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                মোট আয়
              </span>
              <span className="text-[10px] bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-700 font-bold">
                {BENGALI_MONTHS[currentMonth]}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-700">
              {formatBDT(monthlyStats.totalIncome, { useBengaliDigits })}
            </div>
          </div>

          {/* Total Expense */}
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
            <div className="flex items-center justify-between text-xs font-medium text-rose-800 mb-1">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                মোট ব্যয়
              </span>
              <span className="text-[10px] bg-rose-100/80 px-1.5 py-0.5 rounded text-rose-700 font-bold">
                {BENGALI_MONTHS[currentMonth]}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-700">
              {formatBDT(monthlyStats.totalExpense, { useBengaliDigits })}
            </div>
          </div>

          {/* Net Savings / Balance */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
            <div className="flex items-center justify-between text-xs font-medium text-blue-800 mb-1">
              <span>নিট সঞ্চয় / ব্যালেন্স</span>
              <span className="text-[10px] bg-blue-100/80 px-1.5 py-0.5 rounded text-blue-700 font-bold">
                অবস্থা
              </span>
            </div>
            <div
              className={`text-base sm:text-lg font-bold ${
                monthlyStats.netSavings >= 0 ? 'text-blue-700' : 'text-amber-700'
              }`}
            >
              {formatBDT(monthlyStats.netSavings, { useBengaliDigits })}
            </div>
          </div>

          {/* Active Days */}
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
            <div className="flex items-center justify-between text-xs font-medium text-purple-800 mb-1">
              <span>সক্রিয় লেনদেনের দিন</span>
              <span className="text-[10px] bg-purple-100/80 px-1.5 py-0.5 rounded text-purple-700 font-bold">
                দিনলিপি
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-purple-700">
              {useBengaliDigits
                ? toBengaliNumerals(monthlyStats.activeDaysCount)
                : monthlyStats.activeDaysCount}{' '}
              দিন
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid & Selected Date Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (Takes 7 or 8 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-1.5">
              <span>
                {BENGALI_MONTHS[currentMonth]}{' '}
                {useBengaliDigits ? toBengaliNumerals(currentYear) : currentYear}
              </span>
              <span className="text-xs font-normal text-slate-400">
                (তারিখে ক্লিক করে বিস্তারিত দেখুন)
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              🟢 আয় • 🔴 ব্যয়
            </span>
          </div>

          {/* Weekday Header Row */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-500">
            {WEEKDAYS.map((w, idx) => (
              <div
                key={idx}
                className={`py-2 rounded-lg ${
                  w.isWeekend ? 'bg-amber-50/60 text-amber-800' : 'bg-slate-50 text-slate-700'
                }`}
              >
                <span className="hidden sm:inline">{w.bn}</span>
                <span className="sm:hidden">{w.bn.slice(0, 2)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-16 sm:h-22 rounded-xl bg-slate-50/40 border border-transparent"
                  />
                );
              }

              const isSelected = cell.dateStr === selectedDateStr;
              const hasActivity = cell.income > 0 || cell.expense > 0;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`h-16 sm:h-22 p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none text-left relative ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-400/50 bg-emerald-50/40 shadow-xs scale-[1.02] z-10'
                      : cell.isToday
                      ? 'border-blue-400 bg-blue-50/30'
                      : hasActivity
                      ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      : 'border-slate-100 bg-white/70 hover:bg-slate-50 text-slate-400'
                  }`}
                >
                  {/* Date Number & Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isSelected
                          ? 'text-emerald-800'
                          : cell.isToday
                          ? 'text-blue-700'
                          : hasActivity
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {useBengaliDigits
                        ? toBengaliNumerals(cell.dayNumber)
                        : cell.dayNumber}
                    </span>

                    {cell.isToday && (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded-full bg-blue-100 text-blue-700">
                        আজ
                      </span>
                    )}
                  </div>

                  {/* Income & Expense Badges */}
                  <div className="space-y-0.5 sm:space-y-1">
                    {cell.income > 0 && (
                      <div className="text-[9px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 sm:bg-emerald-100/70 px-1 py-0.2 rounded truncate">
                        <span className="hidden sm:inline">+</span>
                        {formatBDT(cell.income, {
                          useBengaliDigits,
                          showSymbol: false,
                        })}
                      </div>
                    )}

                    {cell.expense > 0 && (
                      <div className="text-[9px] sm:text-[11px] font-bold text-rose-600 bg-rose-50 sm:bg-rose-100/70 px-1 py-0.2 rounded truncate">
                        <span className="hidden sm:inline">-</span>
                        {formatBDT(cell.expense, {
                          useBengaliDigits,
                          showSymbol: false,
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dot indicator if both exist or count */}
                  {cell.transactionCount > 0 && (
                    <div className="flex items-center gap-1 self-end sm:hidden">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>ক্যালেন্ডারের যেকোনো দিনে ক্লিক করে লেনদেন দেখুন বা যোগ করুন</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> আয়
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> ব্যয়
              </span>
            </div>
          </div>
        </div>

        {/* Selected Date Inspector Panel (Takes 5 or 4 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {/* Header of Inspector */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">
                নির্বাচিত দিনের বিবরণ
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {selectedDateFormatted}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => onAddTransaction(selectedDateStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
              title="এই তারিখে নতুন লেনদেন যোগ করুন"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>যোগ করুন</span>
            </button>
          </div>

          {/* Daily Quick Financial Card */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="text-[10px] text-slate-500 font-medium">মোট আয়</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-600 truncate">
                {formatBDT(selectedDayData.income, { useBengaliDigits })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">মোট ব্যয়</div>
              <div className="text-xs sm:text-sm font-bold text-rose-600 truncate">
                {formatBDT(selectedDayData.expense, { useBengaliDigits })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium">নিট ব্যালেন্স</div>
              <div
                className={`text-xs sm:text-sm font-bold truncate ${
                  selectedDayData.income - selectedDayData.expense >= 0
                    ? 'text-blue-600'
                    : 'text-amber-600'
                }`}
              >
                {formatBDT(selectedDayData.income - selectedDayData.expense, {
                  useBengaliDigits,
                })}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                লেনদেনের তালিকা (
                {useBengaliDigits
                  ? toBengaliNumerals(selectedDayData.items.length)
                  : selectedDayData.items.length}
                টি)
              </span>
            </div>

            {selectedDayData.items.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  এই তারিখে কোনো লেনদেন নেই
                </p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  আপনি চাইলে এই নির্দিষ্ট তারিখে নতুন আয় বা ব্যয়ের তথ্য যোগ করতে পারেন।
                </p>
                <button
                  type="button"
                  onClick={() => onAddTransaction(selectedDateStr)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>এই তারিখে খরচ বা আয় যোগ করুন</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {selectedDayData.items.map((t) => {
                  const isIncome = t.type === 'INCOME';
                  const isTransfer = t.type === 'TRANSFER';

                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isIncome
                              ? 'bg-emerald-100 text-emerald-700'
                              : isTransfer
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                              {t.category?.name || (isTransfer ? 'ট্রান্সফার' : 'সাধারণ')}
                            </span>
                            {t.visibility === 'PRIVATE' && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-medium">
                                ব্যক্তিগত
                              </span>
                            )}
                          </div>

                          {t.note && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              "{t.note}"
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {t.account?.name && (
                              <span className="flex items-center gap-0.5">
                                <Wallet className="w-2.5 h-2.5" />
                                {t.account.name}
                              </span>
                            )}
                            {t.user?.name && (
                              <span className="flex items-center gap-0.5">
                                <UserIcon className="w-2.5 h-2.5" />
                                {t.user.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`font-bold text-xs sm:text-sm ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatBDT(t.amount, { useBengaliDigits })}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(t)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition"
                            title="সম্পাদনা করুন"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === t.id}
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition disabled:opacity-50"
                            title="মুছে ফেলুন"
                          >
                            {deletingId === t.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
