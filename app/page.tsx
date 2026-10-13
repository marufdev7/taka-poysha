'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatCards } from '@/components/StatCards';
import { WalletsBar } from '@/components/WalletsBar';
import { BudgetProgress } from '@/components/BudgetProgress';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { FamilyMemberBreakdown } from '@/components/FamilyMemberBreakdown';
import { TransactionList } from '@/components/TransactionList';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { AiReportModal } from '@/components/AiReportModal';
import { EditProfileModal } from '@/components/EditProfileModal';
import { OnboardingSetup } from '@/components/OnboardingSetup';
import { AddMemberModal } from '@/components/AddMemberModal';
import { DebtsTracker } from '@/components/DebtsTracker';
import { DebtReminderPopup } from '@/components/DebtReminderPopup';
import { AddDebtModal } from '@/components/AddDebtModal';
import { DailyAndIncomeBreakdown } from '@/components/DailyAndIncomeBreakdown';
import { FinancialCalendar } from '@/components/FinancialCalendar';
import { RecentTransactionsPreview } from '@/components/RecentTransactionsPreview';
import { AiChatbot } from '@/components/AiChatbot';
import { AuthGate } from '@/components/AuthGate';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Users, Copy, Check, Sparkles, LayoutDashboard, Receipt, HandCoins, BarChart3, CalendarDays, UserPlus } from 'lucide-react';
import { isSameDay, toBengaliNumerals } from '@/lib/utils';
import {
  checkShouldTriggerAutoPopup,
  markAutoPopupShown,
  markSkipForToday,
} from '@/lib/autoExpensePopup';

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [isFamilyView, setIsFamilyView] = useState(false);
  const [useBengaliDigits, setUseBengaliDigits] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'transactions' | 'debts' | 'analytics'>('dashboard');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalDefaultDate, setAddModalDefaultDate] = useState<string | undefined>(undefined);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Auto Expense Popup State (twice a day)
  const [autoPopupSlot, setAutoPopupSlot] = useState<number | null>(null);

  // Check saved session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('auth_user_id');
      if (savedId) {
        setAuthUserId(savedId);
        setActiveUserId(savedId);
      }
      setAuthChecked(true);
    }
  }, []);

  const fetchData = useCallback(async (userId?: string) => {
    const targetUserId =
      userId ||
      authUserId ||
      (typeof window !== 'undefined' ? localStorage.getItem('auth_user_id') : null);

    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      const url = `/api/data?userId=${targetUserId}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.authenticated === false || !json.currentUser) {
          setAuthUserId(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_user_id');
          }
          setData(null);
        } else {
          setData(json);
          setActiveUserId(json.currentUser.id);
        }
      } else {
        setAuthUserId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_user_id');
        }
        setData(null);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (authChecked && authUserId) {
      fetchData(authUserId);
    } else if (authChecked && !authUserId) {
      setLoading(false);
    }
  }, [authChecked, authUserId, fetchData]);

  // Check and trigger 2-times-a-day auto expense popup
  useEffect(() => {
    if (loading || !data || data.isNewUser || !data.currentUser) return;

    // Check if debt reminder popup is already due/shown to avoid overlapping modals
    const hasDueDebtsReminder = (data.debts || []).some((d: any) => {
      if (d.status !== 'PENDING') return false;
      const due = new Date(d.dueDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return due <= today;
    }) && (typeof window !== 'undefined' ? !sessionStorage.getItem('debt_reminder_dismissed') : false);

    if (hasDueDebtsReminder) {
      // Avoid overlapping with debt reminder
      return;
    }

    const { shouldTrigger, slot } = checkShouldTriggerAutoPopup();
    if (shouldTrigger && slot) {
      // 1-second slight delay for smooth page rendering
      const timer = setTimeout(() => {
        setAutoPopupSlot(slot);
        setIsAddModalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, data]);

  const handleOpenManualAddModal = () => {
    setAddModalDefaultDate(undefined);
    setEditingTransaction(null);
    setAutoPopupSlot(null);
    setIsAddModalOpen(true);
  };

  const handleOpenAddModalForDate = (dateStr?: string) => {
    setAddModalDefaultDate(dateStr);
    setEditingTransaction(null);
    setAutoPopupSlot(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditTransactionModal = (tx: any) => {
    setAddModalDefaultDate(undefined);
    setEditingTransaction(tx);
    setAutoPopupSlot(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (autoPopupSlot) {
      markAutoPopupShown(autoPopupSlot as 1 | 2);
      setAutoPopupSlot(null);
    }
    setAddModalDefaultDate(undefined);
    setEditingTransaction(null);
    setIsAddModalOpen(false);
  };

  const handleSuccessAddModal = () => {
    if (autoPopupSlot) {
      markAutoPopupShown(autoPopupSlot as 1 | 2);
      setAutoPopupSlot(null);
    }
    setAddModalDefaultDate(undefined);
    setEditingTransaction(null);
    setIsAddModalOpen(false);
    fetchData(activeUserId);
  };

  const handleSkipAutoPopupToday = () => {
    markSkipForToday();
    setAutoPopupSlot(null);
    setIsAddModalOpen(false);
  };

  const handleSwitchUser = (userId: string) => {
    setActiveUserId(userId);
    fetchData(userId);
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleReset = async () => {
    if (!confirm('সতর্কতা: আপনি কি সমস্ত লেনদেন এবং ব্যালেন্স মুছে সম্পূর্ণ নতুন (০) থেকে শুরু করতে চান?')) {
      return;
    }
    const adminPin = prompt('নিরাপত্তা যাচাই: রিসেট নিশ্চিত করতে আপনার অ্যাডমিন সিকিউরিটি পিন (PIN) লিখুন:');
    if (!adminPin || !adminPin.trim()) {
      alert('পিন প্রদান না করায় রিসেট বাতিল করা হয়েছে।');
      return;
    }

    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUserId, adminPin: adminPin.trim() }),
      });
      const result = await res.json();
      if (res.ok) {
        alert(result.message || 'সকল হিসাব সফলভাবে রিসেট করা হয়েছে।');
        fetchData(activeUserId);
      } else {
        alert(result.error || 'রিসেট সম্পন্ন করা যায়নি।');
      }
    } catch {
      alert('সার্ভার এরর! পুনরায় চেষ্টা করুন।');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('auth_user_name');
    }
    setAuthUserId(null);
    setData(null);
  };

  if (!authChecked || (authUserId && loading)) {
    return <LoadingScreen />;
  }

  // If not authenticated or not logged in, show AuthGate (Lock screen)
  if (!authUserId || !data?.currentUser || data?.authenticated === false) {
    return (
      <AuthGate
        onLoginSuccess={(userId) => {
          setAuthUserId(userId);
          setActiveUserId(userId);
          setLoading(true);
          fetchData(userId);
        }}
      />
    );
  }

  // If there are no users, show the fresh clean Onboarding setup screen
  if (data?.isNewUser) {
    return <OnboardingSetup onSuccess={() => fetchData(authUserId)} />;
  }

  const { currentUser, users, household, accounts, categories, budgets, transactions, debts = [], aiReports } =
    data;

  // Check if current user is the main member / admin of the household
  const currentMember = household?.members?.find((m: any) => m.userId === currentUser.id);
  const isHouseholdAdmin = currentMember?.role === 'ADMIN' || currentUser?.role === 'ADMIN';

  // Filter transactions based on active view:
  // If Personal View: Only current user's transactions
  // If Family View: All FAMILY transactions + current user's PRIVATE transactions
  const visibleTransactions = transactions.filter((t: any) => {
    if (!isFamilyView) {
      return t.userId === currentUser.id;
    }
    return t.visibility === 'FAMILY' || t.userId === currentUser.id;
  });

  // Calculate today's stats
  const today = new Date();
  const todayTransactions = visibleTransactions.filter((t: any) => {
    return isSameDay(t.date, today);
  });

  const todayExpense = todayTransactions
    .filter((t: any) => t.type === 'EXPENSE')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const todayIncome = todayTransactions
    .filter((t: any) => t.type === 'INCOME')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  // Calculate stats for current month vs prev month
  const currentMonthTransactions = visibleTransactions.filter((t: any) => {
    const d = new Date(t.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthTransactions = visibleTransactions.filter((t: any) => {
    const d = new Date(t.date);
    return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear();
  });

  const totalIncome = currentMonthTransactions
    .filter((t: any) => t.type === 'INCOME')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const prevIncome = prevMonthTransactions
    .filter((t: any) => t.type === 'INCOME')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpense = currentMonthTransactions
    .filter((t: any) => t.type === 'EXPENSE')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const prevExpense = prevMonthTransactions
    .filter((t: any) => t.type === 'EXPENSE')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Navbar */}
      <Navbar
        users={users}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        isFamilyView={isFamilyView}
        setIsFamilyView={setIsFamilyView}
        useBengaliDigits={useBengaliDigits}
        setUseBengaliDigits={setUseBengaliDigits}
        onOpenAddModal={handleOpenManualAddModal}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenAiChat={() => setIsAiChatOpen(true)}
        onResetData={handleReset}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Welcome / Household Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-5 sm:p-7 text-white shadow-lg shadow-emerald-700/10 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                {isFamilyView ? '👨‍👩‍👧‍👦 ফ্যামিলি মোড' : '👤 ব্যক্তিগত মোড'}
              </span>
              <span className="text-xs text-emerald-100">অক্টোবর ২০২৬</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isFamilyView ? `${household?.name || 'পরিবার'}` : `${currentUser.name}`} এর আয়-ব্যয় ট্র্যাকার
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
              {isFamilyView
                ? 'পরিবারের সকল সদস্যদের সমন্বিত হিসাব ও সঞ্চয়ের চিত্র'
                : 'আপনার একান্ত ব্যক্তিগত সকল আয় ও ব্যয়ের হিসাব'}
            </p>
          </div>

          {household && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              {/* Family Head / Admin Quick Add Member Button */}
              {isFamilyView && isHouseholdAdmin && (
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl bg-white text-emerald-850 hover:bg-emerald-50 text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/15 hover:shadow-lg transition-all duration-200 active:scale-95 shrink-0 text-emerald-900 cursor-pointer"
                  title="পরিবারে নতুন সদস্য যুক্ত করুন"
                >
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>+ নতুন সদস্য যোগ করুন</span>
                </button>
              )}

              {/* Family Invite Code Badge */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/20 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] sm:text-[11px] text-emerald-100 font-medium leading-none">ফ্যামিলি ইনভাইট কোড</div>
                  <div className="text-xs sm:text-sm font-bold font-mono tracking-wider mt-0.5">
                    {household.inviteCode}
                  </div>
                </div>
                <button
                  onClick={() => copyInviteCode(household.inviteCode)}
                  className="p-1.5 sm:p-2 rounded-xl bg-white/20 hover:bg-white/30 transition text-white shrink-0 cursor-pointer"
                  title="কোড কপি করুন"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar border-b border-slate-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out active:scale-95 shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>ওভারভিউ ড্যাশবোর্ড</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out active:scale-95 shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>আয়-ব্যয় ক্যালেন্ডার</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out active:scale-95 shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>সকল লেনদেন খতিয়ান</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'transactions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {useBengaliDigits ? toBengaliNumerals(visibleTransactions.length) : visibleTransactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out active:scale-95 shrink-0 ${
              activeTab === 'debts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <HandCoins className="w-4 h-4" />
            <span>দেনা-পাওনা ট্র্যাকার</span>
            {debts.filter((d: any) => d.status === 'PENDING').length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  activeTab === 'debts' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {useBengaliDigits
                  ? toBengaliNumerals(debts.filter((d: any) => d.status === 'PENDING').length)
                  : debts.filter((d: any) => d.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out active:scale-95 shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>অ্যানালিটিক্স ও বাজেট</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-tab-enter">
            {/* 1. Core Financial Stat Cards (Today's Expense & Monthly Overview) */}
            <StatCards
              todayExpense={todayExpense}
              todayIncome={todayIncome}
              totalIncome={totalIncome}
              prevIncome={prevIncome}
              totalExpense={totalExpense}
              prevExpense={prevExpense}
              useBengaliDigits={useBengaliDigits}
              isFamilyView={isFamilyView}
              totalMonthlyBudget={budgets.reduce((sum: number, b: any) => sum + b.limitAmount, 0)}
            />

            {/* 2. Wallets & Account Balances */}
            <WalletsBar
              accounts={accounts}
              useBengaliDigits={useBengaliDigits}
              onRefresh={() => fetchData(activeUserId)}
              currentUser={currentUser}
              isFamilyView={isFamilyView}
            />

            {/* 3. Daily Spending History & Income/Business Profit Breakdown */}
            <DailyAndIncomeBreakdown
              transactions={visibleTransactions}
              useBengaliDigits={useBengaliDigits}
              onNavigateToCalendar={() => {
                setActiveTab('calendar');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* 4. Compact Recent Transactions (Latest 5 items, keeps page tidy!) */}
            <RecentTransactionsPreview
              transactions={visibleTransactions}
              useBengaliDigits={useBengaliDigits}
              onViewAll={() => {
                setActiveTab('transactions');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onEditTransaction={handleOpenEditTransactionModal}
            />

            {/* 5. Debts & Loans Summary */}
            <DebtsTracker
              debts={debts}
              accounts={accounts.filter((a: any) => a.userId === currentUser.id)}
              useBengaliDigits={useBengaliDigits}
              onRefresh={() => fetchData(activeUserId)}
              onOpenAddModal={() => setIsAddDebtModalOpen(true)}
            />

            {/* 6. Monthly Category Budgets & Limits */}
            <BudgetProgress
              budgets={budgets}
              categories={categories}
              transactions={currentMonthTransactions}
              householdId={household?.id || ''}
              useBengaliDigits={useBengaliDigits}
              onRefresh={() => fetchData(activeUserId)}
              monthlyIncome={totalIncome}
            />

            {/* 7. Family Member Breakdown (Shown in Family View) */}
            {isFamilyView && household?.members && (
              <FamilyMemberBreakdown
                members={household.members}
                transactions={currentMonthTransactions}
                useBengaliDigits={useBengaliDigits}
                householdId={household.id}
                onRefresh={() => fetchData(activeUserId)}
                isAdmin={isHouseholdAdmin}
                currentUserId={currentUser.id}
                onOpenAddMember={() => setIsAddMemberOpen(true)}
              />
            )}
          </div>
        )}

        {/* TAB 2: FINANCIAL CALENDAR (DEDICATED FULL VIEW) */}
        {activeTab === 'calendar' && (
          <div className="animate-tab-enter">
            <FinancialCalendar
              transactions={visibleTransactions}
              useBengaliDigits={useBengaliDigits}
              onAddTransaction={handleOpenAddModalForDate}
              onEditTransaction={handleOpenEditTransactionModal}
              onRefresh={() => fetchData(activeUserId)}
            />
          </div>
        )}

        {/* TAB 3: TRANSACTIONS HISTORY (DEDICATED SEPARATE VIEW) */}
        {activeTab === 'transactions' && (
          <div className="animate-tab-enter">
            <TransactionList
              transactions={visibleTransactions}
              useBengaliDigits={useBengaliDigits}
              onRefresh={() => fetchData(activeUserId)}
              isFamilyView={isFamilyView}
              currentUserId={currentUser.id}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onEditTransaction={handleOpenEditTransactionModal}
            />
          </div>
        )}

        {/* TAB 4: DEBTS & LOANS (DEDICATED SEPARATE VIEW) */}
        {activeTab === 'debts' && (
          <div className="animate-tab-enter">
            <DebtsTracker
              debts={debts}
              accounts={accounts.filter((a: any) => a.userId === currentUser.id)}
              useBengaliDigits={useBengaliDigits}
              onRefresh={() => fetchData(activeUserId)}
              onOpenAddModal={() => setIsAddDebtModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 5: ANALYTICS & BUDGET (DEDICATED VIEW) */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-tab-enter">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <span>অ্যানালিটিক্স ও বাজেট চার্ট</span>
                </h2>
                <p className="text-xs text-slate-500">মাসিক আয়-ব্যয়ের বিশ্লেষণ ও সঞ্চয়ের গ্রাফ</p>
              </div>
            </div>

            <AnalyticsCharts
              transactions={visibleTransactions}
              useBengaliDigits={useBengaliDigits}
            />

            <BudgetProgress
              budgets={budgets}
              categories={categories}
              transactions={currentMonthTransactions}
              householdId={household?.id || ''}
              useBengaliDigits={useBengaliDigits}
              onRefresh={() => fetchData(activeUserId)}
              monthlyIncome={totalIncome}
            />
          </div>
        )}
      </main>

      {/* Pop-up Due Date Alert */}
      <DebtReminderPopup
        debts={debts}
        accounts={accounts.filter((a: any) => a.userId === currentUser.id)}
        useBengaliDigits={useBengaliDigits}
        onRefresh={() => fetchData(activeUserId)}
      />

      {/* Floating Mobile Add Button */}
      <div className="fixed bottom-5 right-4 sm:hidden z-30">
        <button
          onClick={handleOpenManualAddModal}
          className="w-12 h-12 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/40 flex items-center justify-center font-bold text-2xl hover:scale-105 active:scale-95 transition cursor-pointer"
          title="নতুন লেনদেন যোগ করুন"
        >
          +
        </button>
      </div>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSuccess={handleSuccessAddModal}
        userId={currentUser.id}
        householdId={household?.id || ''}
        categories={categories}
        accounts={accounts.filter((a: any) => a.userId === currentUser.id)}
        isAutoPopup={Boolean(autoPopupSlot)}
        autoPopupSlot={autoPopupSlot}
        onSkipToday={handleSkipAutoPopupToday}
        transactionToEdit={editingTransaction}
        defaultDate={addModalDefaultDate}
      />

      {/* Add Debt / Loan Modal */}
      <AddDebtModal
        isOpen={isAddDebtModalOpen}
        onClose={() => setIsAddDebtModalOpen(false)}
        onSuccess={() => fetchData(activeUserId)}
        userId={currentUser.id}
        householdId={household?.id || ''}
      />

      {/* AI Report Modal */}
      <AiReportModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        householdId={household?.id || ''}
        userId={currentUser.id}
        isFamilyView={isFamilyView}
        aiReports={aiReports}
        onRefresh={() => fetchData(activeUserId)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        household={household}
        onSuccess={() => fetchData(activeUserId)}
      />

      {/* Add Family Member Modal (Admin only) */}
      {household && (
        <AddMemberModal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          householdId={household.id}
          onRefresh={() => fetchData(activeUserId)}
        />
      )}

      {/* AI Financial Chatbot Assistant */}
      <AiChatbot
        householdId={household?.id || ''}
        userId={currentUser?.id || ''}
        isFamilyView={isFamilyView}
        isOpen={isAiChatOpen}
        onToggle={() => setIsAiChatOpen(!isAiChatOpen)}
      />
    </div>
  );
}
