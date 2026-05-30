'use client';

import { useState, useEffect, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
        <p className="font-bold mb-1 opacity-70 uppercase tracking-widest text-[8px]">{d.name}</p>
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="font-black text-[var(--inv-t)] text-xs">{d.value.toLocaleString('en-US')}</span>
          <span className="font-bold" style={{ color: d.payload.color }}>{d.payload.pct}%</span>
        </div>
      </div>
    );
  }
  return null;
};

const DonutChart = ({ data }: { data?: any[] }) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const chartData = data && data.length > 0 ? data : [];
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  const enriched = chartData.map(d => ({
    ...d,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }));

  if (!isMounted) return <div className="h-full min-h-[140px]" />;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-[13px] font-bold text-[var(--t)]">Distribution</h3>
        <p className="text-[11px] text-[var(--t3)] mt-0.5 font-medium">Customer split by plan type</p>
      </div>

      <div className="flex items-center gap-6 flex-1 overflow-hidden">
        <div className="relative shrink-0 w-[170px] h-[170px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={350}>
            <PieChart>
              <Pie
                data={enriched} cx="50%" cy="50%"
                innerRadius={55} 
                outerRadius={80}
                dataKey="value" 
                stroke="none"
                paddingAngle={4}
                cornerRadius={5}
                animationBegin={0}
                animationDuration={1200}
              >
                {enriched.map((entry, i) => (
                  <Cell 
                     key={i} 
                     fill={entry.color} 
                     style={{ filter: `drop-shadow(0px 2px 4px ${entry.color}33)` }} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
            <span className="text-[9px] text-[var(--t4)] font-bold uppercase tracking-widest">Total</span>
            <span className="text-2xl font-black text-[var(--t)] leading-tight">
              {total.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1 min-w-0 pr-2">
          {enriched.map(d => (
            <div key={d.name} className="group">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-[var(--t2)] font-bold uppercase tracking-wider truncate">{d.name}</span>
                </div>
                <span className="text-[11px] font-black text-[var(--t)] ml-2 opacity-60">{d.pct}%</span>
              </div>
              <div className="h-1 bg-[var(--bg1)] rounded-full overflow-hidden border border-black/[0.03]">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${d.pct}%`, 
                    backgroundColor: d.color,
                    boxShadow: `0 0 8px ${d.color}44`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(DonutChart);
