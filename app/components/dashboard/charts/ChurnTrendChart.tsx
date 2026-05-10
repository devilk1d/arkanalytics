'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2.5 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1" style={{ color: d.payload.color }}>{d.payload.name}</p>
        <p className="opacity-80">Customers: <span className="font-black text-[var(--inv-t)]">{d.value?.toLocaleString('en-US')}</span></p>
        <p className="opacity-60 mt-0.5">{d.payload.pct}% of total</p>
      </div>
    );
  }
  return null;
};

export default function ChurnTrendChart({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [];
  const total = chartData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const enriched = chartData.map(d => ({ ...d, pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0' }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--t)]">Risk Level Distribution</h3>
          <p className="text-[11px] text-[var(--t3)] mt-0.5">Customer churn risk breakdown</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-[var(--t3)] uppercase tracking-wider">Total</p>
          <p className="text-sm font-black text-[var(--t)]">{total.toLocaleString('en-US')}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={enriched} margin={{ top: 4, right: 0, bottom: 0, left: -16 }} barSize={48}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--b)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg1)', radius: 6 }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {enriched.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 flex-wrap">
        {enriched.map((d: any) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2 rounded-full aspect-square" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-[var(--t2)] font-medium">{d.name}</span>
            <span className="text-[11px] font-bold text-[var(--t)]">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
