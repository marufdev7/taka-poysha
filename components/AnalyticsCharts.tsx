'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
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
import { formatBDT, toBengaliNumerals } from '@/lib/utils';

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

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
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

  const totalExpense = pieData.reduce((sum, item) => sum + item.value, 0);

  // Group by month for Income vs Expense Bar Chart
  const monthlyMap = new Map<string, { month: string; income: number; expense: number }>();

  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = BENGALI_MONTHS[d.getMonth()] || `${d.getMonth() + 1} মাস`;

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

  // Sort months chronologically ascending (left to right)
  const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
  const barData = sortedMonthKeys.map((key) => monthlyMap.get(key)!);

  // Smooth active sector renderer for Pie Chart (no dark box, subtle scale)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g style={{ outline: 'none' }}>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 4}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ outline: 'none', filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.12))' }}
        />
      </g>
    );
  };

  // Custom stylish tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const val = Number(data.value || 0);
      const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : '0';
      const formattedPct = useBengaliDigits ? toBengaliNumerals(pct) : pct;

      return (
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/10 pointer-events-none transition-all duration-150">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: data.payload?.fill || data.color }}
            />
            <span className="font-semibold text-slate-100">{data.name}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 font-mono">
            <span className="text-emerald-400 font-bold text-sm">
              {formatBDT(val, { useBengaliDigits })}
            </span>
            <span className="text-slate-300 text-[11px] font-sans font-medium">
              ({formattedPct}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom stylish tooltip for Bar Chart (shows ONLY the specific hovered bar, not both)
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const isIncome = item.dataKey === 'income';
      const title = isIncome ? 'মোট আয়' : 'মোট ব্যয়';
      const amount = Number(item.value || 0);
      const month = label || item.payload?.month;

      return (
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/10 pointer-events-none transition-all duration-150">
          <div className="text-[11px] text-slate-400 font-medium mb-1 flex items-center justify-between gap-3">
            <span>{month}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                isIncome
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: isIncome ? '#10b981' : '#ef4444' }}
            />
            <span
              className={`font-mono font-bold text-sm ${
                isIncome ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatBDT(amount, { useBengaliDigits })}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Global style injection to eliminate SVG/Recharts focus outlines and dark boxes on click/selection */}
      <style>{`
        .recharts-pie-sector:focus,
        .recharts-pie-sector:active,
        .recharts-sector:focus,
        .recharts-sector:active,
        .recharts-surface:focus,
        .recharts-wrapper:focus,
        .recharts-layer:focus,
        .recharts-bar-rectangle:focus,
        .recharts-bar-rectangle:active,
        svg:focus,
        path:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>

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
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  activeShape={renderActiveShape}
                  animationDuration={500}
                  style={{ outline: 'none' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      style={{ outline: 'none' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomPieTooltip />}
                  wrapperStyle={{ outline: 'none', pointerEvents: 'none', zIndex: 50 }}
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
                style={{ outline: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(val: number) =>
                    useBengaliDigits ? toBengaliNumerals(val) : String(val)
                  }
                />
                <Tooltip
                  shared={false}
                  content={<CustomBarTooltip />}
                  cursor={{ fill: 'rgba(241, 245, 249, 0.5)', radius: 6 }}
                  wrapperStyle={{ outline: 'none', pointerEvents: 'none', zIndex: 50 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(value) => (value === 'income' ? 'মোট আয়' : 'মোট ব্যয়')}
                />
                <Bar
                  dataKey="income"
                  name="income"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  animationDuration={500}
                  style={{ outline: 'none' }}
                />
                <Bar
                  dataKey="expense"
                  name="expense"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  animationDuration={500}
                  style={{ outline: 'none' }}
                />
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
