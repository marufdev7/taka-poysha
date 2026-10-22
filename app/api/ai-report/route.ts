import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/session';
import { cleanLatex } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// ─── Helper: Build real-time summary from LIVE DB data ────────────────────────
async function buildLiveSummary(
  householdId: string | null,
  userId: string,
  month: string,
  isFamilyView: boolean
) {
  const [yearStr, monthStr] = month.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonthIndex = parseInt(monthStr, 10) - 1;

  const prevMonthDate = new Date(currentYear, currentMonthIndex - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonthIndex = prevMonthDate.getMonth();

  // Date ranges
  const startOfCurrentMonth = new Date(currentYear, currentMonthIndex, 1);
  const endOfCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0, 23, 59, 59, 999);

  const startOfPrevMonth = new Date(prevYear, prevMonthIndex, 1);
  const endOfPrevMonth = new Date(prevYear, prevMonthIndex + 1, 0, 23, 59, 59, 999);

  // Query filter — match the data route's logic exactly:
  // Family view → all transactions in the household
  // Personal view → only this user's transactions
  const baseWhere = isFamilyView && householdId
    ? { householdId }
    : { userId };

  const [currentTransactions, prevTransactions, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        ...baseWhere,
        date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
      },
      include: { category: true, user: true },
      orderBy: { date: 'desc' },
    }),
    prisma.transaction.findMany({
      where: {
        ...baseWhere,
        date: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      include: { category: true },
    }),
    prisma.account.findMany({
      where: isFamilyView && householdId
        ? { user: { memberships: { some: { householdId } } } }
        : { userId },
    }),
  ]);

  // ── Income calculations ──
  const totalIncome = currentTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevTotalIncome = prevTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeGrowthPct = prevTotalIncome > 0
    ? Number((((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(2))
    : 0;

  // ── Expense calculations ──
  const totalExpense = currentTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const prevTotalExpense = prevTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseGrowthPct = prevTotalExpense > 0
    ? Number((((totalExpense - prevTotalExpense) / prevTotalExpense) * 100).toFixed(2))
    : 0;

  const netSavings = totalIncome - totalExpense;
  const savingsRatePct = totalIncome > 0
    ? Number(((netSavings / totalIncome) * 100).toFixed(2))
    : 0;

  // ── Category aggregation ──
  const categoryExpenseMap = new Map<string, { name: string; amount: number; prev: number }>();

  for (const t of currentTransactions) {
    if (t.type === 'EXPENSE' && t.category) {
      const catName = t.category.name;
      const current = categoryExpenseMap.get(catName) || { name: catName, amount: 0, prev: 0 };
      current.amount += t.amount;
      categoryExpenseMap.set(catName, current);
    }
  }

  for (const t of prevTransactions) {
    if (t.type === 'EXPENSE' && t.category) {
      const catName = t.category.name;
      const current = categoryExpenseMap.get(catName) || { name: catName, amount: 0, prev: 0 };
      current.prev += t.amount;
      categoryExpenseMap.set(catName, current);
    }
  }

  const expenseByCategory = Array.from(categoryExpenseMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  // ── Fixed vs Variable Expenses ──
  const fixedKeywords = ['ভাড়া', 'ভাড়া', 'বিল', 'bill', 'rent', 'বিদ্যুৎ', 'গ্যাস', 'পানি', 'ইন্টারনেট', 'ওয়াইফাই', 'বুয়া', 'টিউশন'];
  const fixedExpenses = expenseByCategory.filter((c) =>
    fixedKeywords.some((kw) => c.name.toLowerCase().includes(kw))
  );
  const variableExpenses = expenseByCategory.filter(
    (c) => !fixedKeywords.some((kw) => c.name.toLowerCase().includes(kw))
  );

  // ── Daily breakdown for current month ──
  const dailyMap = new Map<string, number>();
  for (const t of currentTransactions) {
    if (t.type === 'EXPENSE') {
      const dayKey = t.date.toISOString().split('T')[0];
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + t.amount);
    }
  }
  const dailyBreakdown = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  // ── Today's expense ──
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayExpense = dailyMap.get(todayKey) || 0;

  // ── Days elapsed, total days, days remaining ──
  const totalDaysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const isCurrentMonth = now.getFullYear() === currentYear && now.getMonth() === currentMonthIndex;
  const daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : totalDaysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(0, totalDaysInMonth - now.getDate()) : 0;
  const dailyAvgExpense = totalExpense > 0 ? Number((totalExpense / daysElapsed).toFixed(2)) : 0;

  // ── Wallets Total Balance & Projections ──
  const totalWalletBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const projectedRemainingExpense = Math.round(daysRemaining * dailyAvgExpense);
  const projectedDeficitOrSurplus = totalWalletBalance - projectedRemainingExpense;

  // ── Top 5 expenses ──
  const topExpenses = currentTransactions
    .filter((t) => t.type === 'EXPENSE')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => ({
      date: t.date.toISOString().split('T')[0],
      category: t.category?.name || 'সাধারণ',
      amount: t.amount,
      note: t.note || '',
      by: t.user.name,
    }));

  // ── Total transaction counts ──
  const totalTransactions = currentTransactions.length;
  const incomeCount = currentTransactions.filter((t) => t.type === 'INCOME').length;
  const expenseCount = currentTransactions.filter((t) => t.type === 'EXPENSE').length;

  return {
    month,
    generatedAt: new Date().toISOString(),
    currency: 'BDT',
    viewType: isFamilyView ? 'Family' : 'Personal',
    totalTransactions,
    incomeCount,
    expenseCount,
    total_days_in_month: totalDaysInMonth,
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    income: {
      total: totalIncome,
      prev_month: prevTotalIncome,
      growth_pct: incomeGrowthPct,
    },
    expense: {
      total: totalExpense,
      prev_month: prevTotalExpense,
      growth_pct: expenseGrowthPct,
    },
    net_savings: netSavings,
    savings_rate_pct: savingsRatePct,
    daily_avg_expense: dailyAvgExpense,
    today_expense: todayExpense,
    total_wallet_balance: totalWalletBalance,
    projected_remaining_expense: projectedRemainingExpense,
    projected_deficit_or_surplus: projectedDeficitOrSurplus,
    expense_by_category: expenseByCategory,
    fixed_expenses: fixedExpenses,
    variable_expenses: variableExpenses,
    daily_breakdown: dailyBreakdown,
    top_expenses: topExpenses,
  };
}

// ─── GET: Fetch LIVE summary (always fresh, never cached) ─────────────────────
export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ।' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId') || auth.householdId || null;
    const userId = searchParams.get('userId') || auth.userId;
    const isFamilyView = searchParams.get('isFamilyView') !== 'false';

    // Always use current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const summary = await buildLiveSummary(householdId, userId, month, isFamilyView);

    // Also fetch the latest saved AI report for this month (if any)
    const latestReport = await prisma.aiReport.findFirst({
      where: {
        month,
        ...(isFamilyView && householdId ? { householdId } : { userId }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      summary,
      latestReport: latestReport || null,
    });
  } catch (error: any) {
    console.error('Error fetching live summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── AI Generation helpers ────────────────────────────────────────────────────

async function generateWithGemini(apiKey: string, summaryJSON: any) {
  const prompt = `তুমি একজন অত্যন্ত অভিজ্ঞ পেশাদার আর্থিক উপদেষ্টা (Senior Personal Financial Advisor)। নিচে ব্যবহারকারীর চলতি মাসের সর্বশেষ আর্থিক হিসাবের নির্ভুল Summary JSON দেওয়া হলো:
\`\`\`json
${JSON.stringify(summaryJSON, null, 2)}
\`\`\`

নির্দেশনা:
১. এই তথ্যের ওপর ভিত্তি করে বাংলায় একটি আকর্ষণীয়, বাস্তবসম্মত, সুস্পষ্ট ও গোছানো আর্থিক মূল্যায়ন রিপোর্ট লেখো।
২. কোনো কাল্পনিক বা মনগড়া সংখ্যা বানাবে না, শুধুমাত্র প্রদত্ত JSON এ থাকা নির্ভুল সংখ্যাগুলোই বিশ্লেষণ করবে।
৩. বিশেষ সতর্কতা: বাসা ভাড়া বা ইউটিলিটি বিলের মতো স্থির খরচে ১০% কমানোর মতো অবাস্তব পরামর্শ কখনোই দেবে না। বরং পরিবর্তনশীল খরচ (খাবার, নাশতা, যাতায়াত, শপিং, বিনোদন) নিয়ন্ত্রণে ব্যবহারিক টিপস দেবে।
৪. চলতি মাসের অতিক্রান্ত দিন (${summaryJSON.days_elapsed} দিন), বাকি দিন (${summaryJSON.days_remaining} দিন) এবং বর্তমান ওয়ালেট ব্যালেন্সের (৳ ${summaryJSON.total_wallet_balance}) সঙ্গে বাকি দিনের আনুমানিক খরচের (৳ ${summaryJSON.projected_remaining_expense}) বাস্তব পরিস্থিতি বিশ্লেষণ করবে।
৫. রিপোর্টে থাকবে:
   - 📊 সামগ্রিক আর্থিক স্বাস্থ্য ও সঞ্চয়ের হারের মূল্যায়ন
   - 🔍 খাতের খরচ বিশ্লেষণ (স্থির খরচ বনাম পরিবর্তনশীল খরচের পার্থক্য)
   - ⚠️ অবশিষ্ট দিনগুলোর জন্য আর্থিক সতর্কতা ও ব্যালেন্স স্থিতি
   - 💡 ব্যয় নিয়ন্ত্রণ ও মাস সামলানোর ৩-৪টি বাস্তবসম্মত পদক্ষেপ
৬. সুন্দর মার্কডাউন ফরম্যাটে পেশাদারভাবে উপস্থাপন করো।
৭. অতি জরুরি: কখনোই LaTeX বা গণিতের কোড ফরম্যাট (যেমন: $$, \\text{...}, \\mathbf{...}) ব্যবহার করবে না। সমীকরণ বা গণিত বোঝাতে সাধারণ বাংলা টেক্সট ও সহজ চিহ্ন ব্যবহার করবে (যেমন: '৳ ৯,০০০ (আয়) - ৳ ৭,০০০ (খরচ) = ৳ ২,০০০')।
৮. সম্ভাষণ ও শিষ্টাচার (Greetings): কখনোই 'নমস্কার' বলবে না। সম্ভাষণ জানাতে হলে সর্বদা 'আসসালামু আলাইকুম' বা সরাসরি প্রফেশনাল শিরোনাম দিয়ে শুরু করবে।`;

  // Reliable model cascade prioritizing available quota models
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemma-4-31b-it',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { text, model };
        }
      } else {
        const errText = await res.text();
        console.warn(`Gemini ${model} returned ${res.status}:`, errText.slice(0, 120));
      }
    } catch (err: any) {
      console.warn(`Gemini ${model} report call failed:`, err?.message || err);
    }
  }

  throw new Error('All Gemini models failed');
}

async function generateWithClaude(apiKey: string, summaryJSON: any) {
  const prompt = `তুমি একজন অভিজ্ঞ পারিবারিক আর্থিক উপদেষ্টা। নিচে সর্বশেষ আর্থিক হিসাবের JSON দেওয়া হলো:
\`\`\`json
${JSON.stringify(summaryJSON, null, 2)}
\`\`\`

নির্দেশনা:
১. বাংলায় আকর্ষণীয় আর্থিক মূল্যায়ন রিপোর্ট লেখো।
২. কোনো কাল্পনিক সংখ্যা বানাবে না। বাসা ভাড়া কমানোর মতো অবাস্তব কথা বলবে না।
৩. রিপোর্টে থাকবে:
   - 📊 সারসংক্ষেপ ও সঞ্চয়ের হারের মূল্যায়ন
   - 🔍 খাতের খরচ বিশ্লেষণ (স্থির বনাম পরিবর্তনশীল)
   - 📅 অবশিষ্ট দিনের ঘাটতি/উদ্বৃত্ত বিশ্লেষণ
   - 💡 ব্যয় নিয়ন্ত্রণের বাস্তবসম্মত পরামর্শ
৪. সুন্দর মার্কডাউন ফরম্যাটে।`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Claude error:', errText);
    throw new Error('Claude API call failed');
  }

  const data = await res.json();
  return data.content?.[0]?.text;
}

// ─── POST: Generate NEW AI Report (always uses fresh live data) ───────────────
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।' }, { status: 401 });
    }

    const body = await request.json();
    const { householdId, userId, isFamilyView = true } = body;

    const effectiveUserId = userId || auth.userId;
    const effectiveHouseholdId = householdId || auth.householdId || null;

    // Always use current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Build LIVE summary from current DB state
    const summaryJSON = await buildLiveSummary(
      effectiveHouseholdId,
      effectiveUserId,
      month,
      isFamilyView
    );

    // AI Model Selection & Generation
    let aiContent = '';
    let aiModelUsed = 'Built-in Smart Rule Engine (Local)';

    const geminiKey = process.env.GEMINI_API_KEY || '';
    const claudeKey = process.env.ANTHROPIC_API_KEY;

    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const res = await generateWithGemini(geminiKey, summaryJSON);
        if (res && res.text) {
          aiContent = res.text;
          aiModelUsed = `Google Gemini (${res.model})`;
        }
      } catch (e) {
        console.warn('Fallback to local engine after Gemini failure:', e);
      }
    } else if (claudeKey && claudeKey.trim() !== '') {
      try {
        aiContent = await generateWithClaude(claudeKey, summaryJSON);
        aiModelUsed = 'Anthropic Claude 3.5 Sonnet';
      } catch (e) {
        console.warn('Fallback to local engine after Claude failure:', e);
      }
    }

    // Default Fallback deterministic engine if no API key or AI call fails
    if (!aiContent) {
      if (summaryJSON.totalTransactions === 0) {
        aiContent = `### 📊 ${month} মাসের রিপোর্ট\n\nবর্তমানে এই মাসে কোনো লেনদেনের তথ্য নেই। আপনি আপনার আয় ও ব্যয়ের তথ্য এন্ট্রি করলে সাথে সাথে AI এর বিশদ বিশ্লেষণ দেখতে পাবেন।`;
      } else {
        const {
          income,
          expense,
          net_savings,
          savings_rate_pct,
          daily_avg_expense,
          today_expense,
          days_elapsed,
          days_remaining,
          total_wallet_balance,
          projected_remaining_expense,
          projected_deficit_or_surplus,
          fixed_expenses,
          variable_expenses,
        } = summaryJSON;

        const topFixed = fixed_expenses[0];
        const topVariable = variable_expenses[0] || { name: 'খাবার ও দৈনন্দিন কেনাকাটা', amount: 0 };
        const isDeficit = projected_deficit_or_surplus < 0;

        aiContent = `### 📊 ${month} মাসের আর্থিক মূল্যায়ন ও বিশদ বিশ্লেষণ

> **ব্যবহৃত মডেল:** ${aiModelUsed}

**১. আর্থিক সারসংক্ষেপ ও সঞ্চয়ের হার:**
- মোট আয়: **৳ ${income.total.toLocaleString('en-IN')}**
- মোট ব্যয়: **৳ ${expense.total.toLocaleString('en-IN')}**
- বর্তমান নিট সঞ্চয়: **৳ ${net_savings.toLocaleString('en-IN')}** (সঞ্চয়ের হার: **${savings_rate_pct}%**)
- অতিবাহিত দিন: **${days_elapsed} দিন** • দৈনিক গড় ব্যয়: **৳ ${daily_avg_expense.toLocaleString('en-IN')}**
- আজকের খরচ: **৳ ${today_expense.toLocaleString('en-IN')}** • মোট বর্তমান ওয়ালেট স্থিতি: **৳ ${total_wallet_balance.toLocaleString('en-IN')}**

**২. খরচের খাতওয়ারী পর্যবেক্ষণ (স্থির বনাম পরিবর্তনশীল):**
${topFixed ? `- **স্থির ব্যয়:** "${topFixed.name}" খাতে মোট **৳ ${topFixed.amount.toLocaleString('en-IN')}** খরচ হয়েছে। এটি অপরিবর্তনশীল ও মৌলিক দায়।` : ''}
- **প্রধান পরিবর্তনশীল ব্যয়:** "${topVariable.name}" খাতে মোট **৳ ${topVariable.amount.toLocaleString('en-IN')}** খরচ হয়েছে। ব্যয় সংকোচনের সুযোগ মূলত এই ধরনের খাতেই থাকে।
${
  expense.growth_pct > 0
    ? `- ⚠️ গত মাসের তুলনায় সামগ্রিক ব্যয় ${expense.growth_pct}% বৃদ্ধি পেয়েছে।`
    : expense.prev_month > 0
    ? `- 👏 ব্যয় নিয়ন্ত্রণে রয়েছে (গত মাসের চেয়ে ${Math.abs(expense.growth_pct)}% কম)।`
    : `- 📝 গত মাসের তুলনামূলক তথ্য এখনো সংরক্ষিত নেই।`
}

**৩. চলতি মাসের অবশিষ্ট দিন (${days_remaining} দিন) ও ব্যালেন্স পর্যালোচনা:**
- বাকি ${days_remaining} দিনে দৈনিক গড় খরচের ধারা অব্যাহত থাকলে আনুমানিক **৳ ${projected_remaining_expense.toLocaleString('en-IN')}** প্রয়োজন হবে।
${
  isDeficit
    ? `- ⚠️ **সতর্কতা:** বর্তমান ওয়ালেট স্থিতি (৳ ${total_wallet_balance.toLocaleString('en-IN')}) বিবেচনায় অবশিষ্ট দিনগুলো পার করতে প্রায় **৳ ${Math.abs(projected_deficit_or_surplus).toLocaleString('en-IN')} ঘাটতি** হতে পারে।`
    : `- ✅ বর্তমান ওয়ালেট ব্যালেন্স দিয়ে মাসের অবশিষ্ট দিনগুলো সামলানো সম্ভব।`
}

**৪. বাস্তবসম্মত সঞ্চয় ও ব্যয় নিয়ন্ত্রণের পরামর্শ:**
1. **"${topVariable.name}" ও দৈনন্দিন হাতখরচে নিয়ন্ত্রণ:** অবশিষ্ট দিনগুলোতে বাইরে খাওয়া, নাশতা ও অপ্রয়োজনীয় কেনাকাটা পুরোপুরি বন্ধ রেখে ঘরোয়া খরচে সীমিত থাকুন।
2. **দৈনিক নতুন খরচ সিলিং:** বাকি দিনগুলোতে দৈনিক খরচ **৳ ${days_remaining > 0 ? Math.floor(total_wallet_balance / days_remaining) : 0}** এর মধ্যে রাখার চেষ্টা করুন।
3. **আগে সঞ্চয় নীতি:** পরবর্তী মাস থেকে আয় প্রাপ্তির সাথে সাথেই অন্তত ১০%-১৫% আলাদা ওয়ালেটে বা ডিপিএসে সরিয়ে রাখুন, যাতে মাস শেষে এমন টানাটানি না হয়।`;
      }
    }

    // Sanitize any remaining LaTeX math artifacts
    aiContent = cleanLatex(aiContent);

    // Delete old reports for this month (keep only the latest)
    await prisma.aiReport.deleteMany({
      where: {
        month,
        ...(isFamilyView && effectiveHouseholdId ? { householdId: effectiveHouseholdId } : { userId: effectiveUserId }),
      },
    });

    // Save fresh report in DB
    const savedReport = await prisma.aiReport.create({
      data: {
        householdId: isFamilyView && effectiveHouseholdId ? effectiveHouseholdId : null,
        userId: isFamilyView ? null : effectiveUserId,
        month,
        summaryData: JSON.stringify(summaryJSON, null, 2),
        content: aiContent,
      },
    });

    return NextResponse.json({
      report: savedReport,
      summary: summaryJSON,
      model: aiModelUsed,
    });
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
