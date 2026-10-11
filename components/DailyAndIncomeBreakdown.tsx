'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  Laptop,
  Coins,
  Calendar,
  Layers,
  ArrowRight,
  Receipt,
  CalendarDays,
  CalendarCheck,
  TrendingDown,
} from 'lucide-react';
import { formatBDT, formatDate, toBengaliNumerals, toLocalDateKey, isSameDay } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  note: string | null;
  category: { id: string; name: string } | null;
}

interface DailyAndIncomeBreakdownProps {
  transactions: Transaction[];
  useBengaliDigits: boolean;
}

export function DailyAndIncomeBreakdown({
  transactions,
  useBengaliDigits,
}: DailyAndIncomeBreakdownProps) {
  const [spendingView, setSpendingView] = useState<'daily' | 'monthly'>('daily');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Calculate Income Breakdown by Category (Salary, Business Profit, Freelance, Other)
  const incomeTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return t.type === 'INCOME' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  let salaryTotal = 0;
  let businessTotal = 0;
  let freelanceTotal = 0;
  let otherIncomeTotal = 0;

  incomeTransactions.forEach((t) => {
    const catName = (t.category?.name || '').toLowerCase();
    if (catName.includes('বেতন') || catName.includes('salary') || catName.includes('চাকরি')) {
      salaryTotal += t.amount;
    } else if (
      catName.includes('ব্যবসা') ||
      catName.includes('business') ||
      catName.includes('লাভ') ||
      catName.includes('profit')
    ) {
      businessTotal += t.amount;
    } else if (
      catName.includes('ফ্রিল্যান্স') ||
      catName.includes('freelance') ||
      catName.includes('প্রজেক্ট')
    ) {
      freelanceTotal += t.amount;
    } else {
      otherIncomeTotal += t.amount;
    }
  });

  const totalMonthlyIncome = salaryTotal + businessTotal + freelanceTotal + otherIncomeTotal;

  // 2. Expenses Analysis (Daily & Monthly)
  const expenseTransactions = transactions.filter((t) => t.type === 'EXPENSE');

  // Today's expense (Daily)
  const todayExpenses = expenseTransactions.filter((t) => isSameDay(t.date, now));
  const todayExpenseTotal = todayExpenses.reduce((sum, t) => sum + t.amount, 0);

  // This Month's expense (Monthly)
  const currentMonthExpenses = expenseTransactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentMonthExpenseTotal = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Daily Average for this month
  const daysPassedThisMonth = Math.max(1, now.getDate());
  const dailyAverageThisMonth = currentMonthExpenseTotal / daysPassedThisMonth;

  // Daily expenses map
  const dailyExpenseMap = new Map<string, { dateStr: string; displayDate: string; total: number; count: number }>();

  expenseTransactions.forEach((t) => {
    const dateKey = toLocalDateKey(t.date);

    if (!dailyExpenseMap.has(dateKey)) {
      dailyExpenseMap.set(dateKey, {
        dateStr: dateKey,
        displayDate: formatDate(t.date),
        total: 0,
        count: 0,
      });
    }

    const item = dailyExpenseMap.get(dateKey)!;
    item.total += t.amount;
    item.count += 1;
  });

  const dailyExpensesList = Array.from(dailyExpenseMap.values()).sort(
    (a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime()
  );

  // Monthly expenses map
  const bengaliMonthNames = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const monthlyExpenseMap = new Map<
    string,
    { monthKey: string; displayMonth: string; total: number; count: number; daysInMonth: number }
  >();

  expenseTransactions.forEach((t) => {
    const d = new Date(t.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyExpenseMap.has(monthKey)) {
      const monthName = bengaliMonthNames[d.getMonth()] || '';
      const yearStr = useBengaliDigits ? toBengaliNumerals(d.getFullYear()) : d.getFullYear();
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      monthlyExpenseMap.set(monthKey, {
        monthKey,
        displayMonth: `${monthName} ${yearStr}`,
        total: 0,
        count: 0,
        daysInMonth,
      });
    }
    const item = monthlyExpenseMap.get(monthKey)!;
    item.total += t.amount;
    item.count += 1;
  });

  const monthlyExpensesList = Array.from(monthlyExpenseMap.values()).sort(
    (a, b) => b.monthKey.localeCompare(a.monthKey)
  );

  // Format data for 7-day daily chart
  const recent7DaysChartData = Array.from(dailyExpenseMap.values())
    .sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime())
    .slice(-7)
    .map((item) => {
      const d = new Date(item.dateStr);
      return {
        day: `${d.getDate()}/${d.getMonth() + 1}`,
        total: item.total,
      };
    });

  // Format data for Monthly chart
  const monthlyChartData = Array.from(monthlyExpenseMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-6)
    .map((item) => ({
      month: item.displayMonth.split(' ')[0],
      total: item.total,
    }));

  const isToday = (dateKey: string) => {
    return dateKey === toLocalDateKey(new Date());
  };

  const isYesterday = (dateKey: string) => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return dateKey === toLocalDateKey(yest);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* CARD 1: আয়ের উৎস ও ব্যবসার লাভ বিশ্লেষণ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  আয়ের উৎস ও ব্যবসার লাভ বিশ্লেষণ
                </h3>
                <p className="text-xs text-slate-400">বেতন, ব্যবসা ও অন্যান্য আয়ের সুস্পষ্ট হিসাব</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              মোট আয়: {formatBDT(totalMonthlyIncome, { useBengaliDigits })}
            </span>
          </div>

          <div className="space-y-3.5 mt-2">
            {/* 1. বেতন (Salary) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    চাকরির মূল বেতন (Salary)
                  </span>
                </div>
                <span className="font-bold text-sm sm:text-base text-emerald-700">
                  {formatBDT(salaryTotal, { useBengaliDigits })}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${totalMonthlyIncome > 0 ? (salaryTotal / totalMonthlyIncome) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>মোট আয়ের অংশ</span>
                <span>
                  {useBengaliDigits
                    ? toBengaliNumerals(
                        totalMonthlyIncome > 0
                          ? Math.round((salaryTotal / totalMonthlyIncome) * 100)
                          : 0
                      )
                    : totalMonthlyIncome > 0
                    ? Math.round((salaryTotal / totalMonthlyIncome) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* 2. ব্যবসার লাভ (Business Profit) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    ব্যবসা থেকে লাভ / আয় (Business Profit)
                  </span>
                </div>
                <span className="font-bold text-sm sm:text-base text-indigo-700">
                  {formatBDT(businessTotal, { useBengaliDigits })}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${totalMonthlyIncome > 0 ? (businessTotal / totalMonthlyIncome) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>মোট আয়ের অংশ</span>
                <span>
                  {useBengaliDigits
                    ? toBengaliNumerals(
                        totalMonthlyIncome > 0
                          ? Math.round((businessTotal / totalMonthlyIncome) * 100)
                          : 0
                      )
                    : totalMonthlyIncome > 0
                    ? Math.round((businessTotal / totalMonthlyIncome) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* 3. ফ্রিল্যান্সিং (Freelancing) */}
            {freelanceTotal > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      ফ্রিল্যান্সিং ও অনলাইন প্রজেক্ট
                    </span>
                  </div>
                  <span className="font-bold text-sm sm:text-base text-cyan-700">
                    {formatBDT(freelanceTotal, { useBengaliDigits })}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(freelanceTotal / totalMonthlyIncome) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 4. অন্যান্য আয় (Other Income) */}
            {otherIncomeTotal > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800">
                      অন্যান্য উৎস থেকে আয়
                    </span>
                  </div>
                  <span className="font-bold text-sm sm:text-base text-purple-700">
                    {formatBDT(otherIncomeTotal, { useBengaliDigits })}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(otherIncomeTotal / totalMonthlyIncome) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center pt-3 border-t border-slate-100 mt-4 text-xs text-slate-400">
          আয়ের খাত অনুযায়ী স্বয়ংক্রিয়ভাবে আলাদা করে হিসেব রাখা হচ্ছে
        </div>
      </div>

      {/* CARD 2: প্রতিদিন ও মাসিক খরচের হিসেব (Daily & Monthly Spending) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  প্রতিদিনের খরচের হিসেব (Daily Spending)
                </h3>
                <p className="text-xs text-slate-400">দৈনিক ও মাসিক খরচের সমন্বিত হিসাব</p>
              </div>
            </div>

            {/* Daily / Monthly Toggle Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSpendingView('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  spendingView === 'daily'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>দৈনিক হিসাব</span>
              </button>
              <button
                type="button"
                onClick={() => setSpendingView('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  spendingView === 'monthly'
                    ? 'bg-white text-rose-600 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>মাসিক হিসাব</span>
              </button>
            </div>
          </div>

          {/* Dual Quick Summary Cards: Daily & Monthly */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {/* Daily Summary Box */}
            <div
              onClick={() => setSpendingView('daily')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                spendingView === 'daily'
                  ? 'bg-rose-50/70 border-rose-200 ring-1 ring-rose-200'
                  : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span className="flex items-center gap-1 text-rose-700">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  আজকের খরচ (Daily)
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
                  {useBengaliDigits ? toBengaliNumerals(todayExpenses.length) : todayExpenses.length} টি
                </span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-rose-600">
                {formatBDT(todayExpenseTotal, { useBengaliDigits })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {todayExpenses.length > 0 ? 'আজ সারাদিনে ব্যয়' : 'আজ এখনো কোনো ব্যয় নেই'}
              </div>
            </div>

            {/* Monthly Summary Box */}
            <div
              onClick={() => setSpendingView('monthly')}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                spendingView === 'monthly'
                  ? 'bg-rose-50/70 border-rose-200 ring-1 ring-rose-200'
                  : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span className="flex items-center gap-1 text-slate-700">
                  <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                  এই মাসের মোট (Monthly)
                </span>
                <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                  {bengaliMonthNames[currentMonth]}
                </span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-slate-800">
                {formatBDT(currentMonthExpenseTotal, { useBengaliDigits })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                দৈনিক গড়: {formatBDT(dailyAverageThisMonth, { useBengaliDigits })}
              </div>
            </div>
          </div>

          {/* VIEW 1: DAILY VIEW */}
          {spendingView === 'daily' && (
            <>
              {/* Mini 7-day bar chart */}
              {recent7DaysChartData.length > 0 && (
                <div className="h-28 w-full mb-3 pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recent7DaysChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip
                        formatter={(val: number) => [formatBDT(val, { useBengaliDigits }), 'দৈনিক খরচ']}
                      />
                      <Bar dataKey="total" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Daily logs list */}
              {dailyExpensesList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  এখনো খরচের কোনো এন্ট্রি নেই।
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {dailyExpensesList.map((item) => {
                    const today = isToday(item.dateStr);
                    const yest = isYesterday(item.dateStr);

                    return (
                      <div
                        key={item.dateStr}
                        className={`p-3 rounded-xl border flex items-center justify-between transition ${
                          today
                            ? 'border-rose-200 bg-rose-50/50'
                            : yest
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-slate-100 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs sm:text-sm text-slate-800">
                                {item.displayDate}
                              </span>
                              {today && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                                  আজকের খরচ
                                </span>
                              )}
                              {yest && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">
                                  গতকাল
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {useBengaliDigits ? toBengaliNumerals(item.count) : item.count} টি এন্ট্রি
                            </span>
                          </div>
                        </div>

                        <div className="font-bold text-sm sm:text-base text-rose-600">
                          {formatBDT(item.total, { useBengaliDigits })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* VIEW 2: MONTHLY VIEW */}
          {spendingView === 'monthly' && (
            <>
              {/* Monthly bar chart */}
              {monthlyChartData.length > 0 && (
                <div className="h-28 w-full mb-3 pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip
                        formatter={(val: number) => [formatBDT(val, { useBengaliDigits }), 'মাসিক খরচ']}
                      />
                      <Bar dataKey="total" fill="#e11d48" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly logs list */}
              {monthlyExpensesList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  এখনো কোনো মাসের খরচের এন্ট্রি নেই।
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {monthlyExpensesList.map((mItem) => {
                    const isCurrent =
                      mItem.monthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    const daysCount = isCurrent ? Math.max(1, now.getDate()) : mItem.daysInMonth;
                    const dailyAvg = mItem.total / daysCount;

                    return (
                      <div
                        key={mItem.monthKey}
                        className={`p-3 rounded-xl border flex items-center justify-between transition ${
                          isCurrent ? 'border-rose-200 bg-rose-50/50' : 'border-slate-100 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                            <CalendarDays className="w-3.5 h-3.5 text-rose-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs sm:text-sm text-slate-800">
                                {mItem.displayMonth}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                                  চলতি মাস
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>
                                {useBengaliDigits ? toBengaliNumerals(mItem.count) : mItem.count} টি এন্ট্রি
                              </span>
                              <span>•</span>
                              <span>
                                দৈনিক গড়: {formatBDT(dailyAvg, { useBengaliDigits })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="font-bold text-sm sm:text-base text-rose-700">
                          {formatBDT(mItem.total, { useBengaliDigits })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center pt-3 border-t border-slate-100 mt-3 text-xs text-slate-400">
          {spendingView === 'daily'
            ? 'প্রতিদিনের ব্যয়ের তথ্য স্বয়ংক্রিয়ভাবে তারিখ মিলিয়ে সংকলিত হয়'
            : 'প্রতি মাসের ব্যয়ের তথ্য এবং দৈনিক গড়ের সার্বিক হিসাব'}
        </div>
      </div>
    </div>
  );
}
