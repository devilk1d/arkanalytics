'use client';

import { useState, useEffect, memo, useId } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2.5 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1" style={{ color: d.payload.color }}>{d.payload.name}</p>
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="opacity-70">Customers</span>
          <span className="font-black text-[var(--inv-t)]">{d.value?.toLocaleString('en-US')}</span>
        </div>
        <div className="flex items-center justify-between gap-4 mt-0.5">
          <span className="opacity-70">Weight</span>
          <span className="font-black text-[var(--inv-t)]">{d.payload.pct}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const ChurnTrendChart = ({ data }: { data?: any[] }) => {
  const [isMounted, setIsMounted] = useState(false);
  const gradLowId = useId();
  const gradMedId = useId();
  const gradHighId = useId();
  
  useEffect(() => setIsMounted(true), []);

  const chartData = data && data.length > 0 ? data : [];
  const total = chartData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const enriched = chartData.map(d => ({ ...d, pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0' }));

  if (!isMounted) return <div className="h-full min-h-[190px]" />;

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

      <div className="flex-1 min-h-[190px] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={350}>
          <BarChart data={enriched} margin={{ top: 10, right: 0, bottom: 0, left: 0 }} barSize={54}>
            <defs>
              <linearGradient id={gradLowId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
              </linearGradient>
              <linearGradient id={gradMedId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.8}/>
              </linearGradient>
              <linearGradient id={gradHighId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="var(--b)" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg1)', radius: 8, opacity: 0.4 }} />
            <Bar dataKey="value" radius={[8, 8, 2, 2]}>
              {enriched.map((entry: any, index: number) => {
                const gradId = entry.name.toLowerCase().includes('low') ? `url(#${gradLowId})` : 
                              entry.name.toLowerCase().includes('med') ? `url(#${gradMedId})` : `url(#${gradHighId})`;
                return <Cell key={`cell-${index}`} fill={gradId} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-4 flex-wrap">
        {enriched.map((d: any) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] font-bold text-[var(--t2)] uppercase tracking-wider">{d.name}</span>
            <span className="text-[11px] font-black text-[var(--t)] opacity-60">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(ChurnTrendChart);
