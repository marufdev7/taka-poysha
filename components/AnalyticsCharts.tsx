'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { formatBDT } from '@/lib/utils';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string | Date;
  category: { name: string; color: string | null } | null;
}

interface AnalyticsChartsProps {
  transactions: Transaction[];
  useBengaliDigits: boolean;
}

const COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
];

export function AnalyticsCharts({
  transactions,
  useBengaliDigits,
}: AnalyticsChartsProps) {
  // Aggregate expenses by category
  const categoryMap = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      const cat = t.category?.name || 'অন্যান্য';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
    });

  const pieData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Group by month for Income vs Expense Bar Chart
  const monthlyMap = new Map<string, { month: string; income: number; expense: number }>();

  transactions.forEach((t) => {
    const d = new Date(t.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName =
      d.getMonth() === 8 ? 'সেপ্টেম্বর' : d.getMonth() === 9 ? 'অক্টোবর' : `${d.getMonth() + 1} মাস`;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { month: monthName, income: 0, expense: 0 });
    }
    const item = monthlyMap.get(monthKey)!;
    if (t.type === 'INCOME') {
      item.income += t.amount;
    } else if (t.type === 'EXPENSE') {
      item.expense += t.amount;
    }
  });

  const barData = Array.from(monthlyMap.values()).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* 1. Category-wise Expense Pie Chart */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-5 h-5 text-rose-500" />
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            খাতভিত্তিক খরচের বিশ্লেষণ (Expense Breakdown)
          </h3>
        </div>

        {pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            এই মাসে খরচের কোনো তথ্য নেই
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [
                    formatBDT(val, { useBengaliDigits }),
                    'পরিমাণ',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          {pieData.slice(0, 6).map((item, idx) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="truncate">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Income vs Expense Comparison Bar Chart */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
            আয় বনাম ব্যয় তুলনা (মাসভিত্তিক)
          </h3>
        </div>

        {barData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            তুলনা করার মতো যথেষ্ট তথ্য নেই
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  formatter={(val: number) => [
                    formatBDT(val, { useBengaliDigits }),
                    '',
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(value) => (value === 'income' ? 'মোট আয়' : 'মোট ব্যয়')}
                />
                <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="pt-2 text-xs text-slate-400 text-center border-t border-slate-100">
          প্রতি মাসের সঞ্চয়ের লক্ষ্যমাত্রা পর্যবেক্ষণ করুন
        </div>
      </div>
    </div>
  );
}
