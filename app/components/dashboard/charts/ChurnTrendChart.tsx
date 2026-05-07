'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="font-bold mb-1">{payload[0]?.payload?.name}</p>
        <p style={{ color: payload[0]?.payload?.color }}>Count: {payload[0]?.value}</p>
      </div>
    );
  }
  return null;
};

export default function ChurnTrendChart({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-black">Risk Level</h3>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -14 }} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /><span className="text-xs text-gray-500">Low Risk</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /><span className="text-xs text-gray-500">Medium Risk</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /><span className="text-xs text-gray-500">High Risk</span></div>
      </div>
    </div>
  );
}
