'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import Tabs from '../ui/Tabs';

const data = {
  Day: [
    { date: 'May 5', retention: 320, churn: 110 },
    { date: 'May 6', retention: 340, churn: 130 },
    { date: 'May 7', retention: 330, churn: 120 },
    { date: 'May 8', retention: 360, churn: 140 },
    { date: 'May 9', retention: 276, churn: 160 },
    { date: 'May 10', retention: 310, churn: 130 },
    { date: 'May 11', retention: 290, churn: 120 },
    { date: 'May 12', retention: 305, churn: 115 },
    { date: 'May 13', retention: 315, churn: 105 },
    { date: 'May 14', retention: 295, churn: 100 },
  ],
  Week: [
    { date: 'W1', retention: 1200, churn: 420 },
    { date: 'W2', retention: 1350, churn: 380 },
    { date: 'W3', retention: 1280, churn: 450 },
    { date: 'W4', retention: 1420, churn: 390 },
  ],
  Month: [
    { date: 'Jan', retention: 5200, churn: 1800 },
    { date: 'Feb', retention: 5500, churn: 1600 },
    { date: 'Mar', retention: 5800, churn: 1900 },
    { date: 'Apr', retention: 6100, churn: 1700 },
    { date: 'May', retention: 6400, churn: 1500 },
  ],
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="font-bold text-white mb-1">{payload[0]?.value}</p>
        <p className="text-gray-400">{label}</p>
      </div>
    );
  }
  return null;
};

export default function ChurnTrendChart() {
  const [period, setPeriod] = useState('Day');
  const chartData = data[period as keyof typeof data];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-black">Churn Trend</h3>
        <Tabs
          tabs={[{ label: 'Day', value: 'Day' }, { label: 'Week', value: 'Week' }, { label: 'Month', value: 'Month' }]}
          active={period}
          onChange={setPeriod}
          variant="pill"
        />
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Line type="monotone" dataKey="retention" stroke="#22c55e" strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: '#22c55e', stroke: 'white', strokeWidth: 2 }} />
          <Line type="monotone" dataKey="churn" stroke="#eab308" strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: '#eab308', stroke: 'white', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /><span className="text-xs text-gray-500">Retention</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /><span className="text-xs text-gray-500">Churn</span></div>
      </div>
    </div>
  );
}
