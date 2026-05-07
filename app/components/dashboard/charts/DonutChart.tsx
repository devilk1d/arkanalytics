'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function DonutChart({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [];
  
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div>
      <h3 className="text-sm font-bold text-black mb-1">Customer Distribution</h3>
      <p className="text-xs text-gray-400 mb-3">By Plan Type</p>

      <div className="flex items-center gap-4">
        <div className="relative">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={55}
                dataKey="value" stroke="none">
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-gray-400">Total</span>
            <span className="text-sm font-black text-black">{total.toLocaleString('en-US')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {chartData.map(d => (
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
