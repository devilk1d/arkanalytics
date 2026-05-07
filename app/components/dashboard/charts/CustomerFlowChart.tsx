'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Tabs from '../ui/Tabs';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
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
        <h3 className="text-sm font-bold text-black">Customer Flow</h3>
        <Tabs
          tabs={[{ label: 'Month', value: 'Month' }, { label: 'Year', value: 'Year' }]}
          active={period}
          onChange={setPeriod}
          variant="pill"
        />
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={chartData} margin={{ top: 8, right: 14, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line type="monotone" dataKey="new" name="New Customers" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }} />
          <Line type="monotone" dataKey="churned" name="Lost Customers" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /><span className="text-xs text-gray-500">New Customers</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /><span className="text-xs text-gray-500">Lost Customers</span></div>
      </div>
    </div>
  );
}
