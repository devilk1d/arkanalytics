'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Tabs from '../ui/Tabs';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="opacity-90">
            {p.name}: <span className="font-black text-[var(--inv-t)]">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CustomerFlowChart({ data }: { data?: any }) {
  const [period, setPeriod] = useState('Month');
  
  // If no data or empty, use a placeholder or empty state
  const chartData = data && data[period.toLowerCase()] ? data[period.toLowerCase()] : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-[var(--t)]">Customer Flow</h3>
        <Tabs
          tabs={[{ label: 'Month', value: 'Month' }, { label: 'Year', value: 'Year' }]}
          active={period}
          onChange={setPeriod}
          variant="pill"
        />
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={chartData} margin={{ top: 8, right: 14, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--b)" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line type="monotone" dataKey="new" name="New" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#10b981', stroke: 'var(--inv-t)', strokeWidth: 2 }} />
          <Line type="monotone" dataKey="churned" name="Lost" stroke="var(--o)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--o)', stroke: 'var(--inv-t)', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-2 rounded-full aspect-square bg-emerald-500 inline-block" /><span className="text-[11px] font-medium text-[var(--t2)] font-sans">New</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 rounded-full aspect-square bg-[var(--o)] inline-block" /><span className="text-[11px] font-medium text-[var(--t2)] font-sans">Lost</span></div>
      </div>
    </div>
  );
}
