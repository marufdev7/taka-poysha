import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatBDT, formatMonthBengali, toBengaliNumerals } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function callGemini(apiKey: string, prompt: string, history: Array<{ role: string; content: string }>) {
  const contents: any[] = [];

  // Add recent history (up to last 6 messages)
  const recentHistory = history.slice(-6);
  for (const h of recentHistory) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    });
  }

  // Add current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Gemini API error [${res.status}]:`, errorBody);
    throw new Error(`Gemini API error: ${errorBody}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message = '',
      history = [],
      userId,
      householdId,
      isFamilyView = true,
    } = body;

    if (!message.trim()) {
      return NextResponse.json({ reply: 'দয়া করে আপনার আর্থিক প্রশ্নটি লিখুন।' });
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();

    const currentMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(currentYear, currentMonthIndex - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonthIndex = prevMonthDate.getMonth();
    const prevMonthKey = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}`;

    // Date ranges
    const startOfCurrentMonth = new Date(currentYear, currentMonthIndex, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0, 23, 59, 59);

    const startOfPrevMonth = new Date(prevYear, prevMonthIndex, 1);
    const endOfPrevMonth = new Date(prevYear, prevMonthIndex + 1, 0, 23, 59, 59);

    const startOfToday = new Date(currentYear, currentMonthIndex, today.getDate(), 0, 0, 0);
    const endOfToday = new Date(currentYear, currentMonthIndex, today.getDate(), 23, 59, 59);

    const baseWhere = isFamilyView
      ? householdId
        ? { householdId, visibility: 'FAMILY' }
        : { visibility: 'FAMILY' }
      : { userId };

    // Fetch transactions, budgets, debts, accounts
    const [currentTransactions, prevTransactions, todayTransactions, budgets, debts, accounts] =
      await Promise.all([
        prisma.transaction.findMany({
          where: {
            ...baseWhere,
            date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
          },
          include: { category: true, user: true, account: true },
          orderBy: { date: 'desc' },
        }),
        prisma.transaction.findMany({
          where: {
            ...baseWhere,
            date: { gte: startOfPrevMonth, lte: endOfPrevMonth },
          },
          include: { category: true },
        }),
        prisma.transaction.findMany({
          where: {
            ...baseWhere,
            date: { gte: startOfToday, lte: endOfToday },
          },
          include: { category: true },
        }),
        householdId
          ? prisma.budget.findMany({
              where: { householdId, month: currentMonthKey },
              include: { category: true },
            })
          : [],
        prisma.debt.findMany({
          where: {
            OR: [
              { userId: userId || undefined },
              { householdId: householdId || undefined },
            ],
          },
        }),
        householdId && isFamilyView
          ? prisma.account.findMany({
              where: {
                user: {
                  memberships: {
                    some: { householdId },
                  },
                },
              },
            })
          : userId
          ? prisma.account.findMany({ where: { userId } })
          : prisma.account.findMany(),
      ]);

    // Financial Metrics Calculation
    const currentIncome = currentTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const prevIncome = prevTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentExpense = currentTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const prevExpense = prevTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentNetSavings = currentIncome - currentExpense;
    const prevNetSavings = prevIncome - prevExpense;

    const savingsRate =
      currentIncome > 0 ? Math.round((currentNetSavings / currentIncome) * 100) : 0;

    const expenseGrowthPct =
      prevExpense > 0
        ? Math.round(((currentExpense - prevExpense) / prevExpense) * 100)
        : 0;

    const incomeGrowthPct =
      prevIncome > 0
        ? Math.round(((currentIncome - prevIncome) / prevIncome) * 100)
        : 0;

    // Categories breakdown
    const catMap = new Map<string, number>();
    for (const t of currentTransactions) {
      if (t.type === 'EXPENSE' && t.category) {
        catMap.set(t.category.name, (catMap.get(t.category.name) || 0) + t.amount);
      }
    }
    const sortedCategories = Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        pct: currentExpense > 0 ? Math.round((amount / currentExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Today's total
    const todayExpense = todayTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Debts summary
    const pendingDebts = debts.filter((d) => d.status === 'PENDING');
    const totalReceivable = pendingDebts
      .filter((d) => d.type === 'RECEIVABLE')
      .reduce((sum, d) => sum + d.amount, 0);
    const totalPayable = pendingDebts
      .filter((d) => d.type === 'PAYABLE')
      .reduce((sum, d) => sum + d.amount, 0);

    // Wallets total
    const totalWalletBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    // Detailed day-by-day and itemized transactions
    const dailyBreakdown: Record<string, { date: string; dayOfMonth: number; income: number; expense: number; count: number; items: any[] }> = {};
    const allTransactionsList = currentTransactions.map((t) => {
      const d = new Date(t.date);
      const dayOfMonth = d.getDate();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = {
          date: dateKey,
          dayOfMonth,
          income: 0,
          expense: 0,
          count: 0,
          items: [],
        };
      }

      if (t.type === 'INCOME') dailyBreakdown[dateKey].income += t.amount;
      if (t.type === 'EXPENSE') dailyBreakdown[dateKey].expense += t.amount;
      dailyBreakdown[dateKey].count += 1;
      dailyBreakdown[dateKey].items.push({
        type: t.type,
        amount: t.amount,
        category: t.category?.name || 'সাধারণ',
        note: t.note || '',
        account: t.account?.name || '',
      });

      return {
        date: dateKey,
        dayOfMonth,
        type: t.type,
        amount: t.amount,
        category: t.category?.name || 'সাধারণ',
        note: t.note || '',
        account: t.account?.name || '',
        by: t.user?.name || '',
      };
    });

    // AI Context Object
    const financialContext = {
      viewMode: isFamilyView ? 'পারিবারিক' : 'ব্যক্তিগত',
      currentMonth: formatMonthBengali(currentMonthKey),
      prevMonth: formatMonthBengali(prevMonthKey),
      current: {
        income: currentIncome,
        expense: currentExpense,
        netSavings: currentNetSavings,
        savingsRate: `${savingsRate}%`,
        transactionCount: currentTransactions.length,
      },
      previous: {
        income: prevIncome,
        expense: prevExpense,
        netSavings: prevNetSavings,
        transactionCount: prevTransactions.length,
      },
      comparison: {
        expenseDiff: currentExpense - prevExpense,
        expenseGrowthPct: `${expenseGrowthPct}%`,
        incomeDiff: currentIncome - prevIncome,
        incomeGrowthPct: `${incomeGrowthPct}%`,
      },
      topCategories: sortedCategories.slice(0, 5),
      today: {
        expense: todayExpense,
        count: todayTransactions.length,
      },
      dailyBreakdown,
      allTransactionsList,
      debts: {
        receivable: totalReceivable,
        payable: totalPayable,
        pendingCount: pendingDebts.length,
      },
      wallets: {
        totalBalance: totalWalletBalance,
        accounts: accounts.map((a) => ({ name: a.name, balance: a.balance })),
      },
      budgets: budgets.map((b) => {
        const spent = catMap.get(b.category.name) || 0;
        return {
          category: b.category.name,
          limit: b.limitAmount,
          spent,
          percentUsed: Math.round((spent / b.limitAmount) * 100),
        };
      }),
    };

    // Try Gemini API if key is present
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const systemPrompt = `তুমি "টাকা-পয়সা AI আর্থিক সহকারী" (Personal Financial AI Assistant)। ব্যবহারকারীর চলতি মাসের (${financialContext.currentMonth}) সকল আর্থিক তথ্য, দৈনিক হিসাব (dailyBreakdown) এবং প্রতিটি লেনদেনের তালিকা (allTransactionsList) নিচে দেওয়া হলো:
\`\`\`json
${JSON.stringify(financialContext, null, 2)}
\`\`\`

ব্যবহারকারীর প্রশ্ন: "${message}"

বিশেষ নির্দেশনা:
১. ব্যবহারকারী যদি নির্দিষ্ট কোনো তারিখের হিসাব চায় (যেমন: "৯ তারিখের হিসাব", "9 tarikher hisab", "গতকাল", "আজকে", ইত্যাদি), তবে "dailyBreakdown" বা "allTransactionsList" থেকে ওই নির্দিষ্ট তারিখের মোট আয়, মোট ব্যয় এবং কী কী জিনিস কেনাকাটা বা খরচ হয়েছে তার বিস্তারিত তালিকা স্পষ্টভাবে বলো।
২. ব্যবহারকারী যদি কোনো নির্দিষ্ট খাত (যেমন "বাড়ি ভাড়া", "খালার বিল", "খাবার") বা নির্দিষ্ট ব্যক্তির খরচের কথা জানতে চায়, তা তালিকা থেকে খুঁজে সঠিক পরিমাণ বলো।
৩. ব্যবহারকারী যদি গত মাস বনাম চলতি মাসের তুলনা চায়, তবে দুই মাসের আয়, ব্যয় ও সঞ্চয়ের পার্থক্য স্পষ্টভাবে তুলে ধরো।
৪. ব্যবহারকারী বাংলা বা বাংলিশ (যেমন "goto mash", "9 tarikher hisab", "koto taka khoroch hoice") যেভাবেই লিখুক, প্রশ্ন বুঝে শুদ্ধ ও চমৎকার বাংলায় সঠিক উত্তর দাও।
৫. কোনো মনগড়া বা কাল্পনিক সংখ্যা বলবে না; প্রদত্ত আসল ডেটা থেকেই উত্তর দেবে।
৬. উত্তর স্পষ্ট, তথ্যবহুল এবং ইমোজি ও বুলেট পয়েন্ট দিয়ে সুন্দরভাবে উপস্থাপন করো।`;

        const reply = await callGemini(geminiKey, systemPrompt, history);
        if (reply) {
          return NextResponse.json({ reply, model: 'Gemini 3.8 Flash' });
        }
      } catch (err) {
        console.warn('Gemini chat call failed, falling back to local engine:', err);
      }
    }

    // Built-in Smart Local Bengali Financial Engine (Deterministic & 100% Reliable Fallback)
    const q = message.toLowerCase();
    let reply = '';

    // 0. Date-Specific Query Detection (e.g. "9 tarikh", "9 tarikher hisab", "৯ তারিখ", "gotokal", etc.)
    const dateMatch =
      q.match(/(\d{1,2})\s*(?:তারিখ|tarikh|tarikher|th)/i) ||
      q.match(/(৯|৮|৭|৬|৫|৪|৩|২|১|০)+\s*তারিখ/);

    let targetDay: number | null = null;
    if (dateMatch) {
      const dayRaw = dateMatch[1]
        .replace(/০/g, '0')
        .replace(/১/g, '1')
        .replace(/২/g, '2')
        .replace(/৩/g, '3')
        .replace(/৪/g, '4')
        .replace(/৫/g, '5')
        .replace(/৬/g, '6')
        .replace(/৭/g, '7')
        .replace(/৮/g, '8')
        .replace(/৯/g, '9');
      targetDay = parseInt(dayRaw, 10);
    } else if (q.includes('গতকাল') || q.includes('gotokal') || q.includes('yesterday')) {
      targetDay = today.getDate() - 1;
    }

    if (targetDay !== null) {
      const matchingTx = currentTransactions.filter(
        (t) => new Date(t.date).getDate() === targetDay
      );

      if (matchingTx.length > 0) {
        const dayIncome = matchingTx
          .filter((t) => t.type === 'INCOME')
          .reduce((s, t) => s + t.amount, 0);
        const dayExpense = matchingTx
          .filter((t) => t.type === 'EXPENSE')
          .reduce((s, t) => s + t.amount, 0);

        const itemsList = matchingTx
          .map((t) => {
            const sign = t.type === 'INCOME' ? '🟢 আয়' : '🔴 ব্যয়';
            const noteText = t.note ? ` (নোট: "${t.note}")` : '';
            return `• ${sign}: **${formatBDT(t.amount)}** — ${t.category?.name || 'সাধারণ'}${noteText}`;
          })
          .join('\n');

        reply = `### 📅 ${targetDay} অক্টোবরের আর্থিক হিসাব

• **মোট ব্যয়:** **${formatBDT(dayExpense)}**
• **মোট আয়:** **${formatBDT(dayIncome)}**
• **মোট লেনদেন:** ${matchingTx.length} টি

**খরচ ও আয়ের বিস্তারিত তালিকা:**
${itemsList}`;
      } else {
        reply = `${targetDay} অক্টোবরে কোনো লেনদেনের তথ্য পাওয়া যায়নি। এই তারিখে কোনো খরচ বা আয় রেকর্ড করা হয়নি।`;
      }
    }
    // 1. Comparison between last month and this month
    else if (
      !q.includes('na') &&
      !q.includes('না') &&
      (q.includes('তুলনা') ||
        q.includes('compare') ||
        q.includes('গত মাস') ||
        q.includes('last month') ||
        q.includes('পূর্বের মাস') ||
        q.includes('আগের মাস'))
    ) {
      const expChangeText =
        expenseGrowthPct > 0
          ? `⚠️ গত মাসের চেয়ে **৳ ${formatBDT(
              Math.abs(currentExpense - prevExpense),
              { showSymbol: false }
            )} (${expenseGrowthPct}%) খরচ বৃদ্ধি** পেয়েছে।`
          : expenseGrowthPct < 0
          ? `👏 গত মাসের চেয়ে **৳ ${formatBDT(
              Math.abs(currentExpense - prevExpense),
              { showSymbol: false }
            )} (${Math.abs(expenseGrowthPct)}%) খরচ হ্রাস** পেয়েছে (ব্যয় নিয়ন্ত্রণে আছে)।`
          : `গত মাসের সমান খরচ হয়েছে।`;

      const incChangeText =
        incomeGrowthPct > 0
          ? `গত মাসের চেয়ে আয় **${incomeGrowthPct}% বেড়েছে**।`
          : incomeGrowthPct < 0
          ? `গত মাসের চেয়ে আয় **${Math.abs(incomeGrowthPct)}% কমেছে**।`
          : `আয় অপরিবর্তিত রয়েছে।`;

      reply = `### 📊 ${financialContext.currentMonth} বনাম ${financialContext.prevMonth} এর তুলনামূলক বিশ্লেষণ

• **আয় (Income):**
  - চলতি মাস (${financialContext.currentMonth}): **${formatBDT(currentIncome)}**
  - গত মাস (${financialContext.prevMonth}): **${formatBDT(prevIncome)}**
  - পর্যালোচনা: ${incChangeText}

• **ব্যয় (Expense):**
  - চলতি মাস (${financialContext.currentMonth}): **${formatBDT(currentExpense)}**
  - গত মাস (${financialContext.prevMonth}): **${formatBDT(prevExpense)}**
  - পর্যালোচনা: ${expChangeText}

• **নিট সঞ্চয় (Net Savings):**
  - চলতি মাসে বর্তমান সঞ্চয়: **${formatBDT(currentNetSavings)}** (সঞ্চয়ের হার: **${savingsRate}%**)
  - গত মাসের সঞ্চয় ছিল: **${formatBDT(prevNetSavings)}**

💡 **উপদেশ:** ${
        currentExpense > currentIncome
          ? 'চলতি মাসে ব্যয়ের পরিমাণ আয়কে অতিক্রম করেছে। অপ্রয়োজনীয় খরচ অবিলম্বে নিয়ন্ত্রণ করার পরামর্শ দেওয়া হলো।'
          : savingsRate >= 20
          ? 'আপনার সঞ্চয়ের হার অত্যন্ত চমৎকার (২০%-এর বেশি)। এই ধারা বজায় রাখুন!'
          : 'সঞ্চয়ের হার অন্তত ২০%-এ উন্নীত করতে শীর্ষ ব্যয়ের খাতগুলোতে বাজেট সীমা নির্ধারণ করুন।'
      }`;
    }
    // 2. Top Expenses / Category Breakdown
    else if (
      q.includes('খাত') ||
      q.includes('বেশি খরচ') ||
      q.includes('কোথায় খরচ') ||
      q.includes('category') ||
      q.includes('শীর্ষ') ||
      q.includes('khoroch')
    ) {
      if (sortedCategories.length === 0) {
        reply = `চলতি মাসে এখনও কোনো ব্যয়ের রেকর্ড যুক্ত করা হয়নি। নতুন ব্যয় এন্ট্রি করলে সাথে সাথে শীর্ষ খাতের তালিকা পাওয়া যাবে।`;
      } else {
        const topList = sortedCategories
          .slice(0, 4)
          .map(
            (c, i) =>
              `${i + 1}. **${c.name}**: ${formatBDT(c.amount)} (মোট খরচের **${c.pct}%**)`
          )
          .join('\n');

        reply = `### 🔍 চলতি মাসে (${financialContext.currentMonth}) শীর্ষ ব্যয়ের খাতসমূহ:

${topList}

💡 **পর্যবেক্ষণ:** সবচেয়ে বেশি টাকা খরচ হয়েছে **"${sortedCategories[0]?.name}"** খাতে (মোট ${formatBDT(
          sortedCategories[0]?.amount || 0
        )})। এই খাতে সতর্ক দৃষ্টি রাখা প্রয়োজন।`;
      }
    }
    // 3. Savings & Advice
    else if (
      q.includes('সঞ্চয়') ||
      q.includes('সঞ্চয়') ||
      q.includes('জমানো') ||
      q.includes('পরামর্শ') ||
      q.includes('advice') ||
      q.includes('savings') ||
      q.includes('টিপস')
    ) {
      const topCat = sortedCategories[0]?.name || 'বাজার ও কেনাকাটা';
      reply = `### 💡 সঞ্চয় বৃদ্ধি ও আর্থিক স্বাস্থ্য পরামর্শ

• **বর্তমান সঞ্চয় স্থিতি:** **${formatBDT(currentNetSavings)}** (আয়ের **${savingsRate}%**)
• **প্রস্তাবিত ৩টি কৌশল:**
  1. **"${topCat}" খাতে বাজেট সীমা:** এই খাতে খরচ সবচেয়ে বেশি হচ্ছে। আগামী মাসের জন্য এতে সর্বোচ্চ সীমা বেঁধে দিন।
  2. **৫০-৩০-২০ নিয়ম:** আয়ের ৫০% মৌলিক প্রয়োজন, ৩০% অন্যান্য প্রয়োজন এবং অন্তত ২০% বাধ্যতামূলক সঞ্চয়ে স্থানান্তর করুন।
  3. **জরুরি তহবিল তৈরি:** যেকোনো আকস্মিক পরিস্থিতি সামাল দিতে কমপক্ষে ৩ মাসের খরচের সমান অর্থ আলাদা তহবিলে রাখুন।`;
    }
    // 4. Budget & Limit Checks
    else if (q.includes('বাজেট') || q.includes('সীমা') || q.includes('budget') || q.includes('limit')) {
      if (financialContext.budgets.length === 0) {
        reply = `চলতি মাসের জন্য এখনও কোনো ক্যাটাগরি বাজেট বা সীমা নির্ধারণ করা হয়নি। ড্যাশবোর্ডের "মাসিক বাজেট ও সীমা ট্র্যাকিং" সেকশন থেকে যেকোনো খাতের জন্য বাজেট সেট করতে পারেন।`;
      } else {
        const budgetList = financialContext.budgets
          .map((b) => {
            const status =
              b.percentUsed >= 100
                ? '🚨 সীমা অতিক্রান্ত!'
                : b.percentUsed >= 80
                ? '⚠️ সতর্কবার্তা (৮০% পার)'
                : '✅ স্বাভাবিক';
            return `• **${b.category}**: বাজেট ৳${b.limit} | খরচ ৳${b.spent} (${b.percentUsed}%) — ${status}`;
          })
          .join('\n');

        reply = `### 🎯 চলতি মাসের ক্যাটাগরি বাজেট অবস্থা:\n\n${budgetList}`;
      }
    }
    // 5. Debts & Loans
    else if (
      q.includes('দেনা') ||
      q.includes('পাওনা') ||
      q.includes('ধার') ||
      q.includes('বাকি') ||
      q.includes('debt') ||
      q.includes('loan')
    ) {
      reply = `### 🤝 ধার ও দেনা-পাওনার সার্বিক অবস্থা

• **আমি মোট পাব (পাওনা):** **${formatBDT(totalReceivable)}**
• **আমার মোট দেনা (পরিশোধ করতে হবে):** **${formatBDT(totalPayable)}**
• **অনিষ্পন্ন লেনদেন:** **${pendingDebts.length} টি**

💡 পাওনা টাকা দ্রুত সংগ্রহের তাগাদা দিন এবং দেনা নির্ধারিত তারিখের মধ্যে পরিশোধের জন্য রিমাইন্ডার সেট করে রাখুন।`;
    }
    // 6. Today's Spending
    else if (q.includes('আজকে') || q.includes('আজকের') || q.includes('today')) {
      reply = `### 📅 আজকের খরচের হিসাব (${new Date().toLocaleDateString('bn-BD')}):

• আজকের মোট ব্যয়: **${formatBDT(todayExpense)}**
• আজকের মোট লেনদেন: **${todayTransactions.length} টি**

${
  todayTransactions.length > 0
    ? todayTransactions
        .map((t) => `• ${t.category?.name || 'সাধারণ'}: ${formatBDT(t.amount)} (${t.note || '-'})`)
        .join('\n')
    : 'আজকে এখন পর্যন্ত কোনো নতুন খরচ রেকর্ড করা হয়নি।'
}`;
    }
    // 7. Wallet & Account Balances
    else if (
      q.includes('ব্যালেন্স') ||
      q.includes('ওয়ালেট') ||
      q.includes('একাউন্ট') ||
      q.includes('টাকা কত') ||
      q.includes('balance') ||
      q.includes('bank')
    ) {
      const accList = accounts
        .map((a) => `• **${a.name}**: ${formatBDT(a.balance)}`)
        .join('\n');

      reply = `### 💳 আপনার অ্যাকাউন্ট ও ওয়ালেট ব্যালেন্স:

${accList || 'কোনো অ্যাকাউন্ট যুক্ত নেই।'}

• **সর্বমোট স্থিতি:** **${formatBDT(totalWalletBalance)}**`;
    }
    // 8. General Financial Overview / Fallback
    else {
      reply = `স্বাগতম! আমি আপনার **টাকা-পয়সা AI আর্থিক সহকারী** 🤖।

চলতি মাসের (${financialContext.currentMonth}) সংক্ষিপ্ত চিত্র:
• মোট আয়: **${formatBDT(currentIncome)}**
• মোট ব্যয়: **${formatBDT(currentExpense)}**
• বর্তমান সঞ্চয়: **${formatBDT(currentNetSavings)}** (${savingsRate}%)

আপনি আমাকে সরাসরি প্রশ্ন করতে পারেন, যেমন:
- *"গত মাসের সাথে এই মাসের আয়-ব্যয় তুলনা করো"*
- *"৯ তারিখের খরচের হিসাব দাও"*
- *"কোন খাতে সবচেয়ে বেশি খরচ হয়েছে?"*
- *"সঞ্চয় বাড়ানোর পরামর্শ দাও"*
- *"আজকে আমার মোট কত খরচ হলো?"*`;
    }

    return NextResponse.json({ reply, model: 'Local Financial Engine' });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { error: error.message || 'চ্যাট প্রসেস করতে ব্যর্থ হয়েছে' },
      { status: 500 }
    );
  }
}
