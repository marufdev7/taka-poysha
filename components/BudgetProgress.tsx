'use client';

import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, Plus, CheckCircle2, TrendingDown, X, Wallet, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { formatBDT, toBengaliNumerals } from '@/lib/utils';

interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
  month: string;
  category: { id: string; name: string };
}

interface BudgetProgressProps {
  budgets: Budget[];
  categories: Array<{ id: string; name: string; type: string }>;
  transactions: Array<{
    categoryId: string | null;
    type: string;
    amount: number;
    date: string | Date;
  }>;
  householdId: string;
  useBengaliDigits: boolean;
  onRefresh: () => void;
  monthlyIncome?: number;
}

export function BudgetProgress({
  budgets,
  categories,
  transactions,
  householdId,
  useBengaliDigits,
  onRefresh,
  monthlyIncome,
}: BudgetProgressProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New Category State
  const [localCategories, setLocalCategories] = useState(categories);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const expenseCategories = localCategories.filter((c) => c.type === 'EXPENSE');

  const getSpentAmount = (catId: string) => {
    return transactions
      .filter((t) => t.categoryId === catId && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // 0. Monthly Income (মাসিক মোট আয়)
  const calculatedIncomeFromTx = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const effectiveMonthlyIncome =
    typeof monthlyIncome === 'number' ? monthlyIncome : calculatedIncomeFromTx;

  // 1. Total Monthly Budget (মোট মাসিক বাজেট)
  const totalMonthlyBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);

  // 2. Total Monthly Expenses across ALL categories (চলতি মাসের সর্বমোট ব্যয় / আমার মাসিক মোট ব্যয়)
  const totalMonthlyExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  // 3. Total Spent on Budgeted Categories (বাজেটভুক্ত খাতে খরচ)
  const totalSpentOnBudgets = budgets.reduce((sum, b) => sum + getSpentAmount(b.categoryId), 0);

  // 4. Unbudgeted expenses (অবাজেটভুক্ত খরচ)
  const unbudgetedExpenses = Math.max(0, totalMonthlyExpenses - totalSpentOnBudgets);

  // 5. Harmonized Remaining Budget against total monthly expenses
  const remainingBudget = totalMonthlyBudget - totalMonthlyExpenses;
  const isOverallExceeded = totalMonthlyExpenses > totalMonthlyBudget && totalMonthlyBudget > 0;
  const overallPercentage =
    totalMonthlyBudget > 0
      ? Math.min(Math.round((totalMonthlyExpenses / totalMonthlyBudget) * 100), 100)
      : 0;

  // 6. Expense categories that have spending this month but NO budget set yet
  const unbudgetedCategoriesWithSpending = expenseCategories
    .filter((cat) => !budgets.some((b) => b.categoryId === cat.id))
    .map((cat) => ({
      ...cat,
      spent: getSpentAmount(cat.id),
    }))
    .filter((cat) => cat.spent > 0);

  // 7. Budget vs Income Warning Calculations (বাজেট মাসিক আয়ের চেয়ে বেশি কিনা)
  const isBudgetOverIncome =
    effectiveMonthlyIncome > 0 && totalMonthlyBudget > effectiveMonthlyIncome;
  const budgetOverIncomeAmount = totalMonthlyBudget - effectiveMonthlyIncome;
  const budgetToIncomePercentage =
    effectiveMonthlyIncome > 0
      ? Math.round((totalMonthlyBudget / effectiveMonthlyIncome) * 100)
      : 0;

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setAddingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: newCatName.trim(),
          type: 'EXPENSE',
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setLocalCategories((prev) => [...prev, created]);
        setSelectedCatId(created.id);
        setNewCatName('');
        setShowAddCategory(false);
        onRefresh();
      } else {
        alert('ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleOpenAddModal = () => {
    if (showModal && !editingBudget) {
      setShowModal(false);
    } else {
      setEditingBudget(null);
      setSelectedCatId('');
      setLimitAmount('');
      setShowAddCategory(false);
      setShowModal(true);
    }
  };

  const handleOpenEditModal = (b: Budget) => {
    setEditingBudget(b);
    setSelectedCatId(b.categoryId);
    setLimitAmount(b.limitAmount.toString());
    setShowAddCategory(false);
    setShowModal(true);
  };

  const handleDeleteBudget = async () => {
    if (!editingBudget) return;
    if (!confirm(`আপনি কি "${editingBudget.category.name}" খাতের বাজেট সীমা মুছে ফেলতে চান?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/budgets?id=${editingBudget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setShowModal(false);
        setEditingBudget(null);
        setSelectedCatId('');
        setLimitAmount('');
        onRefresh();
      } else {
        alert('বাজেট মুছতে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !limitAmount) return;
    setLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          categoryId: selectedCatId,
          month: currentMonthStr,
          limitAmount: parseFloat(limitAmount),
        }),
      });
      if (res.ok) {
        setSelectedCatId('');
        setLimitAmount('');
        setEditingBudget(null);
        setShowModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Escape key for modal
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditingBudget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              মাসিক বাজেট ও সীমা ট্র্যাকিং
            </h2>
            <p className="text-xs text-slate-400">প্রতিটি খাতের পরিকল্পিত সীমা ও খরচের বিশ্লেষণ</p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition self-start sm:self-auto cursor-pointer shadow-xs ${
            showModal && !editingBudget
              ? 'bg-indigo-700 text-white ring-2 ring-indigo-400/30'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
          }`}
        >
          <Plus className={`w-4 h-4 transition-transform ${showModal && !editingBudget ? 'rotate-45' : ''}`} />
          <span>{showModal && !editingBudget ? 'ফর্ম বন্ধ করুন' : 'বাজেট সেট করুন'}</span>
        </button>
      </div>

      {/* WARNING BANNER: Budget Exceeds Monthly Income (বাজেট আয়ের চেয়ে বেশি হলে সতর্কতা) */}
      {isBudgetOverIncome && (
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50/70 to-amber-50 border-2 border-amber-300/90 text-amber-950 shadow-xs flex items-start gap-3.5 animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-rose-950 flex items-center gap-1.5">
                <span>সতর্কতা: পরিকল্পিত বাজেট মাসিক আয়ের চেয়ে বেশি!</span>
              </h3>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full">
                অতিরিক্ত ঘাটতি: {formatBDT(budgetOverIncomeAmount, { useBengaliDigits })}
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              চলতি মাসের নির্ধারিত মোট বাজেট <strong className="font-bold text-slate-900">{formatBDT(totalMonthlyBudget, { useBengaliDigits })}</strong>, কিন্তু আপনার মাসিক মোট আয় <strong className="font-bold text-slate-900">{formatBDT(effectiveMonthlyIncome, { useBengaliDigits })}</strong> (বাজেট আয়ের <span className="font-bold text-rose-700">{useBengaliDigits ? toBengaliNumerals(budgetToIncomePercentage) : budgetToIncomePercentage}%</span> ধরা হয়েছে)। আয়ের চেয়ে বেশি ব্যয় পরিকল্পনা করলে মাস শেষে আর্থিক সংকট বা ঋণের ঝুঁকি তৈরি হতে পারে।
            </p>
            <div className="mt-2 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5 bg-amber-100/80 px-2.5 py-1 rounded-lg w-fit border border-amber-200/60">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>পরামর্শ: অপ্রয়োজনীয় ব্যয়ের খাতগুলোর বাজেট কিছুটা কমিয়ে আয়ের ({formatBDT(effectiveMonthlyIncome, { useBengaliDigits })}) সমান বা ভেতরে রাখুন।</span>
            </div>
          </div>
        </div>
      )}

      {/* OVERALL BUDGET & SPENT SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Total Monthly Budget */}
        <div
          className={`p-3.5 rounded-2xl border shadow-2xs transition ${
            isBudgetOverIncome
              ? 'bg-gradient-to-br from-amber-50/90 to-rose-50/40 border-amber-300'
              : 'bg-gradient-to-br from-indigo-50/80 to-blue-50/40 border-indigo-100/90'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className={`flex items-center gap-1.5 ${isBudgetOverIncome ? 'text-amber-800' : 'text-indigo-700'}`}>
              <Target className={`w-4 h-4 ${isBudgetOverIncome ? 'text-amber-600' : 'text-indigo-600'}`} />
              মোট মাসিক বাজেট
            </span>
            {isBudgetOverIncome ? (
              <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                আয়ের চেয়ে বেশি!
              </span>
            ) : (
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                {useBengaliDigits ? toBengaliNumerals(budgets.length) : budgets.length} টি খাত
              </span>
            )}
          </div>
          <div className={`text-lg sm:text-xl font-extrabold mt-1 ${isBudgetOverIncome ? 'text-rose-950' : 'text-indigo-950'}`}>
            {formatBDT(totalMonthlyBudget, { useBengaliDigits })}
          </div>
          <div className={`text-[11px] mt-0.5 ${isBudgetOverIncome ? 'text-rose-700 font-semibold' : 'text-indigo-600/80'}`}>
            {effectiveMonthlyIncome > 0
              ? `মাসিক আয়: ${formatBDT(effectiveMonthlyIncome, { useBengaliDigits })} (আয়ের ${useBengaliDigits ? toBengaliNumerals(budgetToIncomePercentage) : budgetToIncomePercentage}%)`
              : 'নির্ধারিত সকল খাতের মোট লক্ষ্যমাত্রা'}
          </div>
        </div>

        {/* Total Spent on Categories (আমার মাসিক মোট ব্যয়ের সাথে শতভাগ সমন্বিত) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/80 to-pink-50/40 border border-rose-100/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              মোট খরচ হয়েছে
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                isOverallExceeded
                  ? 'bg-rose-200 text-rose-800'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {totalMonthlyBudget > 0
                ? `${useBengaliDigits ? toBengaliNumerals(Math.round((totalMonthlyExpenses / totalMonthlyBudget) * 100)) : Math.round((totalMonthlyExpenses / totalMonthlyBudget) * 100)}%`
                : '০%'}
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-600 mt-1">
            {formatBDT(totalMonthlyExpenses, { useBengaliDigits })}
          </div>
          <div className="text-[11px] text-rose-600/90 mt-0.5">
            {unbudgetedExpenses > 0 ? (
              <span>
                বাজেটভুক্ত: {formatBDT(totalSpentOnBudgets, { useBengaliDigits })} • অবাজেটভুক্ত: {formatBDT(unbudgetedExpenses, { useBengaliDigits })}
              </span>
            ) : (
              <span>আমার মাসিক মোট ব্যয়ের সাথে শতভাগ সমন্বিত</span>
            )}
          </div>
        </div>

        {/* Remaining / Over Budget */}
        <div
          className={`p-3.5 rounded-2xl border shadow-2xs ${
            isOverallExceeded
              ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
              : 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-100/90'
          }`}
        >
          <div
            className={`flex items-center justify-between text-xs font-semibold mb-1 ${
              isOverallExceeded ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {isOverallExceeded ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              {isOverallExceeded ? 'বাজেট অতিরিক্ত খরচ' : 'অবশিষ্ট বাজেট'}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                isOverallExceeded
                  ? 'bg-red-200 text-red-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isOverallExceeded ? 'সতর্কতা' : 'নিরাপদ'}
            </span>
          </div>
          <div
            className={`text-lg sm:text-xl font-extrabold mt-1 ${
              isOverallExceeded ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {formatBDT(Math.abs(remainingBudget), { useBengaliDigits })}
          </div>
          <div
            className={`text-[11px] mt-0.5 ${
              isOverallExceeded ? 'text-red-600/80 font-semibold' : 'text-emerald-600/80'
            }`}
          >
            {isOverallExceeded
              ? 'মোট বাজেটের চেয়ে অতিরিক্ত ব্যয় হয়েছে'
              : totalMonthlyBudget > 0
              ? unbudgetedExpenses > 0
                ? `বাজেটভুক্ত খাতে বাকি: ${formatBDT(totalMonthlyBudget - totalSpentOnBudgets, { useBengaliDigits })}`
                : 'খরচের জন্য এখনও বাকি আছে'
              : 'বাজেট সেট করা হয়নি'}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      {totalMonthlyBudget > 0 && (
        <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>সামগ্রিক বাজেট ব্যবহার</span>
              {unbudgetedExpenses > 0 && (
                <span className="text-[10px] text-slate-500 font-normal">
                  (বাজেটভুক্ত: {formatBDT(totalSpentOnBudgets, { useBengaliDigits })} + অবাজেটভুক্ত: {formatBDT(unbudgetedExpenses, { useBengaliDigits })})
                </span>
              )}
            </span>
            <span
              className={`font-bold ${
                isOverallExceeded
                  ? 'text-rose-600'
                  : overallPercentage >= 80
                  ? 'text-amber-600'
                  : 'text-indigo-600'
              }`}
            >
              {useBengaliDigits
                ? toBengaliNumerals(Math.round((totalMonthlyExpenses / totalMonthlyBudget) * 100))
                : Math.round((totalMonthlyExpenses / totalMonthlyBudget) * 100)}
              % খরচ সম্পন্ন
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                isOverallExceeded
                  ? 'bg-rose-500'
                  : overallPercentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{
                width: `${Math.min(100, Math.round((totalMonthlyExpenses / totalMonthlyBudget) * 100))}%`,
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 mt-2.5 gap-1">
            <span className="flex items-center gap-1">
              <span>মাসিক মোট ব্যয় (আমার মোট খরচ):</span>
              <strong className="text-slate-800 font-bold">{formatBDT(totalMonthlyExpenses, { useBengaliDigits })}</strong>
            </span>
            {effectiveMonthlyIncome > 0 && (
              <span
                className={`font-semibold flex items-center gap-1 ${
                  isBudgetOverIncome ? 'text-rose-600 font-bold' : 'text-slate-600'
                }`}
              >
                {isBudgetOverIncome && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                <span>
                  বাজেট/আয় অনুপাত: {useBengaliDigits ? toBengaliNumerals(budgetToIncomePercentage) : budgetToIncomePercentage}%
                  {isBudgetOverIncome && ' (আয়ের চেয়ে বেশি!)'}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Unbudgeted Categories Notice & Quick Action */}
      {unbudgetedCategoriesWithSpending.length > 0 && (
        <div className="mb-5 p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-amber-900">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1 sm:mt-0" />
            <div>
              <span className="font-bold">
                {useBengaliDigits ? toBengaliNumerals(unbudgetedCategoriesWithSpending.length) : unbudgetedCategoriesWithSpending.length} টি ব্যয়ের খাতে
              </span>{' '}
              খরচ হয়েছে কিন্তু এখনও বাজেট সীমা সেট করা হয়নি (মোট অবাজেটভুক্ত খরচ: <strong>{formatBDT(unbudgetedExpenses, { useBengaliDigits })}</strong>)।
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {unbudgetedCategoriesWithSpending.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setEditingBudget(null);
                  setSelectedCatId(cat.id);
                  setLimitAmount('');
                  setShowModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100/70 text-indigo-700 font-bold text-[11px] border border-amber-200/90 shadow-2xs transition cursor-pointer flex items-center gap-1"
                title={`${cat.name} খাতের বাজেট সীমা নির্ধারণ করতে ক্লিক করুন`}
              >
                <span>{cat.name} ({formatBDT(cat.spent, { useBengaliDigits })})</span>
                <Plus className="w-3 h-3 text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inline Set / Edit Budget Form (No full-screen modal) */}
      {showModal && (
        <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/90 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 mb-3.5">
            <div>
              <h3 className="font-bold text-base text-slate-800">
                {editingBudget ? 'বাজেট সীমা পরিবর্তন (এডিট)' : 'ক্যাটাগরি বাজেট নির্ধারণ'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {editingBudget
                  ? `"${editingBudget.category.name}" খাতের মাসিক বাজেট সীমা আপডেট করুন`
                  : 'নতুন খাতের জন্য মাসিক বাজেট সীমা নির্ধারণ করুন'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingBudget(null);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-indigo-100 transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveBudget} className="space-y-3.5">
            {/* Category Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">ব্যয়ের খাত *</label>
                {!editingBudget && (
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>নতুন খাত যোগ</span>
                  </button>
                )}
              </div>

              {/* Inline Add Category Form */}
              {!editingBudget && showAddCategory && (
                <div className="p-2.5 bg-white border border-indigo-200/80 rounded-xl mb-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                    নতুন ব্যয়ের খাতের নাম:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="যেমন: ইন্টারনেট বিল, শপিং..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 border border-indigo-200 rounded-lg bg-white focus:outline-indigo-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={addingCategory || !newCatName.trim()}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {addingCategory ? 'যোগ হচ্ছে...' : 'যোগ'}
                    </button>
                  </div>
                </div>
              )}

              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-indigo-500 bg-white"
                required
                disabled={Boolean(editingBudget)}
              >
                <option value="">খাত নির্বাচন করুন</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {editingBudget && (
                <p className="text-[10px] text-slate-400 mt-1">খাতের নাম অপরিবর্তনীয়, নিচের বক্স থেকে নতুন সীমা লিখুন</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                মাসিক বাজেট সীমা (টাকা) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  placeholder="যেমন: ২০০০০"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="w-full text-sm font-bold pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-indigo-500 bg-white"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Live Warning if budget exceeds monthly income */}
            {(() => {
              const numLimit = parseFloat(limitAmount) || 0;
              const currentCategoryBudget = editingBudget
                ? editingBudget.limitAmount
                : (budgets.find((b) => b.categoryId === selectedCatId)?.limitAmount || 0);
              const projectedTotalBudget = totalMonthlyBudget - currentCategoryBudget + numLimit;
              const isModalBudgetOverIncome =
                effectiveMonthlyIncome > 0 &&
                numLimit > 0 &&
                projectedTotalBudget > effectiveMonthlyIncome;
              const modalOverAmount = projectedTotalBudget - effectiveMonthlyIncome;

              if (!isModalBudgetOverIncome) return null;

              return (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <span>সতর্কতা: মোট বাজেট মাসিক আয়কে ছাড়িয়ে যাবে!</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      এই পরিমাণ নির্ধারণ করলে মোট বাজেট হবে <strong>{formatBDT(projectedTotalBudget, { useBengaliDigits })}</strong>, যা আপনার মাসিক আয় ({formatBDT(effectiveMonthlyIncome, { useBengaliDigits })})-এর চেয়ে <strong>{formatBDT(modalOverAmount, { useBengaliDigits })}</strong> বেশি।
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-2 pt-2">
              {editingBudget && (
                <button
                  type="button"
                  onClick={handleDeleteBudget}
                  disabled={deleting}
                  className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                  title="এই বাজেট সীমা মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingBudget(null);
                }}
                className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-700 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading || deleting}
                className="flex-1 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : editingBudget ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Individual Category Budgets */}
      {budgets.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          কোনো বাজেট সেট করা নেই। &quot;বাজেট সেট করুন&quot; বাটনে ক্লিক করে মাসিক লক্ষ্যমাত্রা ঠিক করুন।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {budgets.map((b) => {
            const spent = getSpentAmount(b.categoryId);
            const percentage = Math.min(Math.round((spent / b.limitAmount) * 100), 100);
            const isExceeded = spent > b.limitAmount;
            const isWarning = percentage >= 80 && !isExceeded;

            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition relative group ${
                  isExceeded
                    ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/60'
                    : isWarning
                    ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/60'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50/90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                      {b.category.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(b)}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      title="বাজেট সীমা পরিবর্তন (এডিট)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isExceeded ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      সীমা ছাড়াচ্ছে!
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">
                      {useBengaliDigits ? toBengaliNumerals(percentage) : percentage}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2.5 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span>ব্যয়: <strong className="text-slate-700">{formatBDT(spent, { useBengaliDigits })}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(b)}
                    className="text-xs hover:text-indigo-600 transition cursor-pointer"
                    title="বাজেট সীমা পরিবর্তন করতে ক্লিক করুন"
                  >
                    সীমা: <strong className="text-slate-700 hover:text-indigo-600 font-semibold">{formatBDT(b.limitAmount, { useBengaliDigits })}</strong>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
