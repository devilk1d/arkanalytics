'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1">{d.name}</p>
        <p style={{ color: d.payload.color }} className="opacity-90 font-black">{d.value.toLocaleString('en-US')} customers</p>
        <p className="opacity-60">{d.payload.pct}% of total</p>
      </div>
    );
  }
  return null;
};

export default function DonutChart({ data }: { data?: any[] }) {
  const chartData = data && data.length > 0 ? data : [];
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  // Add percentage to each entry for tooltip
  const enriched = chartData.map(d => ({
    ...d,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <h3 className="text-[13px] font-bold text-[var(--t)]">Distribution</h3>
        <p className="text-[11px] text-[var(--t3)] mt-0.5">By plan type</p>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <div className="relative shrink-0">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={enriched} cx="50%" cy="50%"
                innerRadius={40} outerRadius={62}
                dataKey="value" stroke="none"
                paddingAngle={2}
              >
                {enriched.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-[var(--t3)] font-semibold uppercase tracking-wider">Total</span>
            <span className="font-display text-lg font-black text-[var(--t)] leading-tight">
              {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          {enriched.map(d => (
            <div key={d.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-[var(--t2)] font-medium truncate">{d.name}</span>
                </div>
                <span className="text-[11px] font-black text-[var(--t)] ml-2">{d.pct}%</span>
              </div>
              <div className="h-1 bg-[var(--bg1)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
