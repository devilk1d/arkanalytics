'use client';

import { useId } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { SimData } from './types';

interface Props {
  simData:      SimData;
  horizonWeeks: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--t)] text-[var(--inv-t)] rounded-xl px-3 py-2 text-[10px] shadow-2xl border border-[var(--b3)] backdrop-blur-md opacity-95">
      <p className="font-bold mb-1 font-mono">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((p: any) => p.value != null && (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 opacity-80">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span>{p.name}</span>
            </span>
            <span className="font-black">{p.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SimulationChart({ simData, horizonWeeks }: Props) {
  const baseId = useId();
  const scenId = useId();

  const baselinePts = simData.baseline   || [];
  const scenarioPts = simData.projection || [];

  const fmt = (week: number) => {
    if (week === 0) return 'W0';
    return horizonWeeks > 16 ? `M${Math.max(1, Math.round(week / 4))}` : `W${week}`;
  };

  // Linearly interpolate a set of known points to fill every integer week 0..horizonWeeks
  function interpolatePoints(pts: { week: number; prob: number }[]): Record<number, number> {
    if (!pts.length) return {};
    const sorted = [...pts].sort((a, b) => a.week - b.week);
    const out: Record<number, number> = {};
    for (const pt of sorted) out[pt.week] = pt.prob;
    for (let w = 0; w <= horizonWeeks; w++) {
      if (out[w] !== undefined) continue;
      const before = sorted.filter(p => p.week < w).at(-1);
      const after  = sorted.find(p => p.week > w);
      if (before && after) {
        const t = (w - before.week) / (after.week - before.week);
        out[w] = +(before.prob + t * (after.prob - before.prob)).toFixed(2);
      } else if (before) {
        out[w] = before.prob;
      } else if (after) {
        out[w] = after.prob;
      }
    }
    return out;
  }

  const baseInterp = interpolatePoints(baselinePts);
  const scenInterp = scenarioPts.length >= 2 ? interpolatePoints(scenarioPts) : {};
  const hasScen    = Object.keys(scenInterp).length > 0;

  // Build unified week-keyed data array starting at week 0
  const chartData = Array.from({ length: horizonWeeks + 1 }, (_, i) => {
    const week = i;
    return {
      week:     fmt(week),
      baseline: baseInterp[week] ?? null,
      scenario: hasScen ? (scenInterp[week] ?? null) : null,
    };
  });

  const hasData = baselinePts.length > 0;
  if (!hasData) {
    return (
      <div className="chart-placeholder">
        <div className="text-xs text-[var(--t3)] font-mono uppercase tracking-[0.1em]">
          No trajectory data available
        </div>
      </div>
    );
  }

  const allProbs = [
    ...baselinePts.map(p => p.prob),
    ...scenarioPts.map(p => p.prob),
  ];
  const rawMin = Math.min(...allProbs);
  const rawMax = Math.max(...allProbs);
  const domMin = Math.max(0,   Math.floor(rawMin / 5) * 5 - 5);
  const domMax = Math.min(100, Math.ceil(rawMax  / 5) * 5 + 5);

  // X-axis: every week ≤12w, every 2w ≤24w, every 4w longer
  const xStep = horizonWeeks <= 12 ? 1 : horizonWeeks <= 24 ? 2 : 4;
  const xTicks = Array.from(
    { length: Math.floor(horizonWeeks / xStep) + 1 },
    (_, i) => fmt(Math.min(i * xStep, horizonWeeks))
  );

  // Y-axis: explicit ticks every 5 or 10 points
  const yStep = (domMax - domMin) > 40 ? 10 : 5;
  const yTicks = Array.from(
    { length: Math.floor((domMax - domMin) / yStep) + 1 },
    (_, i) => domMin + i * yStep
  ).filter(v => v >= 0 && v <= 100);

  return (
    <div style={{ flex: 1, minHeight: 180, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%" debounce={100}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={baseId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--danger)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id={scenId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 4" stroke="var(--b)" vertical={false} opacity={0.6} />

          <XAxis
            dataKey="week"
            ticks={xTicks}
            tick={{ fontSize: 9, fill: 'var(--t4)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            domain={[domMin, domMax]}
            ticks={yTicks}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 9, fill: 'var(--t4)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--b)', strokeWidth: 1 }} />

          {/* Baseline */}
          <Area
            type="monotone"
            dataKey="baseline"
            name="Baseline"
            stroke="var(--danger)"
            strokeWidth={2}
            fill={`url(#${baseId})`}
            dot={false}
            connectNulls
            isAnimationActive
            animationDuration={900}
            activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--danger)' }}
          />

          {/* Scenario overlay (dashed) */}
          {hasScen && (
            <Area
              type="monotone"
              dataKey="scenario"
              name="Scenario"
              stroke="var(--accent)"
              strokeWidth={1.75}
              strokeDasharray="5 4"
              fill={`url(#${scenId})`}
              dot={false}
              connectNulls
              isAnimationActive
              animationDuration={900}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
