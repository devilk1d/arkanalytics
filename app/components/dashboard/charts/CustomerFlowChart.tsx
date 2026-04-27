'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Tabs from '../ui/Tabs';

const data = [
  { month: 'Jan', new: 240, churned: 180 },
  { month: 'Feb', new: 290, churned: 130 },
  { month: 'Mar', new: 380, churned: 210 },
  { month: 'Apr', new: 160, churned: 90 },
  { month: 'May', new: 420, churned: 170 },
  { month: 'Jun', new: 480, churned: 140 },
  { month: 'Jul', new: 200, churned: 110 },
  { month: 'Aug', new: 310, churned: 150 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CustomerFlowChart() {
  const [period, setPeriod] = useState('Month');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-black">Customer Flow</h3>
        <Tabs
          tabs={[{ label: 'Day', value: 'Day' }, { label: 'Week', value: 'Week' }, { label: 'Month', value: 'Month' }]}
          active={period}
          onChange={setPeriod}
          variant="pill"
        />
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }} barSize={11} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="new" fill="#93c5fd" radius={[4, 4, 0, 0]} name="New Customers" />
          <Bar dataKey="churned" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Churned" />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-300 inline-block" /><span className="text-xs text-gray-500">New Customers</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /><span className="text-xs text-gray-500">Churned</span></div>
      </div>
    </div>
  );
}
