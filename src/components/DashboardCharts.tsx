'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, PieChart as PieChartIcon, ArrowRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = ['#FFE566', '#4169FF', '#B8F28B', '#FF7B72', '#E8E5D8', '#6B8CFF'];

interface DashboardChartsProps {
  monthlyTrends: any[];
  categoryDistribution: any[];
}

export default function DashboardCharts({
  monthlyTrends,
  categoryDistribution,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly Borrowing Trends Bar Chart */}
      <div className="lg:col-span-2 bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#4169FF]" />
            <h3 className="font-extrabold text-base uppercase tracking-tight text-black">
              Monthly Borrowing Volume
            </h3>
          </div>
          <span className="text-xs font-mono font-bold bg-[#FFE566] text-black px-2 py-0.5 border border-black rounded">
            Last 6 Months
          </span>
        </div>
        <div className="h-64 w-full">
          {monthlyTrends && monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <XAxis dataKey="month" stroke="#000" fontSize={12} fontWeight={700} />
                <YAxis stroke="#000" fontSize={12} fontWeight={700} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF5',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '3px 3px 0px #000',
                    fontWeight: 'bold',
                  }}
                />
                <Bar dataKey="count" fill="#4169FF" stroke="#000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-mono text-xs font-bold text-black/60">
              No borrowing activity recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Category Distribution Pie Chart */}
      <div className="bg-white border-[3px] border-black rounded-lg p-5 shadow-[5px_5px_0px_#000]">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-[#FF7B72]" />
            <h3 className="font-extrabold text-base uppercase tracking-tight text-black">
              Catalog by Genre
            </h3>
          </div>
          <Link
            href="/categories"
            className="text-xs font-mono font-bold text-black hover:underline flex items-center gap-0.5"
          >
            All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="h-64 w-full flex items-center justify-center">
          {categoryDistribution && categoryDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={35}
                  dataKey="value"
                  nameKey="name"
                  stroke="#000"
                  strokeWidth={2}
                  label={(entry) => entry.name}
                >
                  {categoryDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF5',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    boxShadow: '3px 3px 0px #000',
                    fontWeight: 'bold',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="font-mono text-xs font-bold text-black/60 text-center">
              No category data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
