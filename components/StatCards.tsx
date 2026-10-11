'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
  CalendarDays,
} from 'lucide-react';
import { formatBDT, toBengaliNumerals } from '@/lib/utils';

interface StatCardsProps {
  todayExpense: number;
  todayIncome: number;
  totalIncome: number;
  prevIncome: number;
  totalExpense: number;
  prevExpense: number;
  useBengaliDigits: boolean;
  isFamilyView: boolean;
  totalMonthlyBudget?: number;
}

export function StatCards({
  todayExpense,
  todayIncome,
  totalIncome,
  prevIncome,
  totalExpense,
  prevExpense,
  useBengaliDigits,
  isFamilyView,
  totalMonthlyBudget,
}: StatCardsProps) {
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

  const incomeGrowth =
    prevIncome > 0 ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1) : null;
  const expenseGrowth =
    prevExpense > 0 ? (((totalExpense - prevExpense) / prevExpense) * 100).toFixed(1) : null;

  const formatPercent = (val: string | number) => {
    return useBengaliDigits ? toBengaliNumerals(val) : val;
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Highlight: Today's Expense & Income Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Today's Expense */}
        <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-rose-500/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-rose-100 text-xs sm:text-sm font-semibold mb-1">
              <CalendarCheck className="w-4 h-4" />
              <span>আজকের মোট খরচ (Today&apos;s Expense)</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {formatBDT(todayExpense, { useBengaliDigits })}
            </div>
            <p className="text-[11px] text-rose-100 mt-1">প্রতিদিন স্বয়ংক্রিয়ভাবে লাইভ আপডেট হয়</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Today's Income */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs sm:text-sm font-semibold mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>আজকের মোট আয় (Today&apos;s Income)</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {formatBDT(todayIncome, { useBengaliDigits })}
            </div>
            <p className="text-[11px] text-emerald-100 mt-1">আজকে অর্জিত আয় ও প্রাপ্তি</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Monthly Aggregate Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Monthly Total Expense */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              {isFamilyView ? 'পারিবারিক মাসিক ব্যয়' : 'আমার মাসিক মোট ব্যয়'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">
            {formatBDT(totalExpense, { useBengaliDigits })}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
            {expenseGrowth !== null ? (
              <span
                className={`inline-flex items-center font-medium ${
                  parseFloat(expenseGrowth) > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {parseFloat(expenseGrowth) > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                )}
                {formatPercent(Math.abs(parseFloat(expenseGrowth)))}% গত মাসের তুলনায়
              </span>
            ) : (
              <span className="text-slate-400">বর্তমান মাস</span>
            )}

            {typeof totalMonthlyBudget === 'number' && totalMonthlyBudget > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  totalExpense > totalMonthlyBudget
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
                title="মাসিক বাজেটের সাথে সমন্বয়"
              >
                বাজেট: {formatPercent(Math.round((totalExpense / totalMonthlyBudget) * 100))}%
              </span>
            )}
          </div>
        </div>

        {/* 2. Monthly Total Income */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-500">
              {isFamilyView ? 'পারিবারিক মাসিক আয়' : 'আমার মাসিক মোট আয়'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight">
            {formatBDT(totalIncome, { useBengaliDigits })}
          </div>
          <div className="mt-2 flex items-center text-xs">
            {incomeGrowth !== null ? (
              <span
                className={`inline-flex items-center font-medium ${
                  parseFloat(incomeGrowth) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {parseFloat(incomeGrowth) >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                )}
                {formatPercent(Math.abs(parseFloat(incomeGrowth)))}% গত মাসের তুলনায়
              </span>
            ) : (
              <span className="text-slate-400">বর্তমান মাস</span>
            )}
          </div>
        </div>

        {/* 3. Net Savings */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-500">চলতি মাসের সঞ্চয় (Net Savings)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-2xl font-bold tracking-tight ${
              netSavings >= 0 ? 'text-blue-600' : 'text-rose-600'
            }`}
          >
            {formatBDT(netSavings, { useBengaliDigits })}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {netSavings >= 0 ? 'এই মাসের আয় থেকে খরচ বাদ দিয়ে উদ্বৃত্ত 🎉' : 'এই মাসে আয়ের চেয়ে খরচ বেশি (ঘাটতি) ⚠️'}
          </div>
        </div>

        {/* 4. Savings Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-500">সঞ্চয়ের হার</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-purple-700 tracking-tight">
            {formatPercent(savingsRate)}%
          </div>
          <div className="mt-2 text-xs text-slate-500">
            লক্ষ্যমাত্রা: ২০% বা তদূর্ধ্ব
          </div>
        </div>
      </div>
    </div>
  );
}
