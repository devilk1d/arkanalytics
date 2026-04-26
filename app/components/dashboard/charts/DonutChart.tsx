'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Starter',      value: 4500, color: '#60a5fa' },
  { name: 'Professional', value: 3800, color: '#34d399' },
  { name: 'Enterprise',   value: 4700, color: '#a78bfa' },
];

export default function DonutChart() {
  return (
    <div>
      <h3 className="text-sm font-bold text-black mb-1">Customer Distribution</h3>
      <p className="text-xs text-gray-400 mb-3">By Plan Type</p>

      <div className="flex items-center gap-4">
        <div className="relative">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={55}
                dataKey="value" stroke="none">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-400">Total</span>
            <span className="text-sm font-black text-black">13,000</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-gray-600">{d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
