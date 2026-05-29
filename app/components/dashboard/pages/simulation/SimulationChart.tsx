'use client';

import { useEffect, useState } from 'react';
import type { SimData } from './types';

interface Props {
  simData:      SimData;
  horizonWeeks: number;
  compareData?: SimData | null;
}

export default function SimulationChart({ simData, horizonWeeks, compareData }: Props) {
  const [animate, setAnimate] = useState(0);

  // Re-trigger animation when data changes
  useEffect(() => {
    setAnimate(0);
    const t = setTimeout(() => {
      setAnimate(1);
    }, 50);
    return () => clearTimeout(t);
  }, [simData, compareData]);

  const w = 760, h = 240;
  const pad = { l: 38, r: 16, t: 14, b: 26 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const baselinePts = simData.baseline || [];
  const scenarioPts = simData.projection || [];
  const comparePts = compareData?.baseline || [];

  const allVal = [
    ...baselinePts.map(p => p.prob),
    ...scenarioPts.map(p => p.prob),
    ...comparePts.map(p => p.prob),
  ];

  if (allVal.length === 0) {
    return (
      <div className="chart-placeholder">
        <div className="text-xs text-[var(--t3)] font-mono uppercase tracking-[0.1em]">
          No trajectory data available
        </div>
      </div>
    );
  }

  const minY = Math.max(0, Math.floor(Math.min(...allVal) - 6));
  const maxY = Math.min(100, Math.ceil(Math.max(...allVal) + 6));

  const sx = (week: number) => pad.l + ((week - 1) / Math.max(1, horizonWeeks - 1)) * innerW;
  const sy = (val: number) => pad.t + innerH - ((val - minY) / (maxY - minY || 1)) * innerH;

  const pathOf = (pts: { week: number; prob: number }[]) => 
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.week)},${sy(p.prob)}`).join(' ');
  
  const areaOf = (pts: { week: number; prob: number }[]) => 
    pts.length ? `${pathOf(pts)} L${sx(pts[pts.length - 1].week)},${pad.t + innerH} L${sx(pts[0].week)},${pad.t + innerH} Z` : '';

  // x ticks
  const tickCount = horizonWeeks <= 8 ? horizonWeeks : 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((horizonWeeks * i) / tickCount) || 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(minY + t * (maxY - minY)));
  const fmt = (week: number) => horizonWeeks > 16 ? `M${Math.max(1, Math.round(week / 4))}` : `W${week}`;

  // line-drawing offset: 1 = invisible, 0 = fully drawn
  const drawOff = 1 - Math.max(0, Math.min(1, animate));

  const lineStyle = (color: string, dashed = false) => ({
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeDasharray: dashed ? '5 4' : '1',
    strokeDashoffset: drawOff,
    pathLength: 1,
    transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)',
  });

  const areaStyle = (color: string, op: number) => ({
    fill: color,
    opacity: op * animate,
    transition: 'opacity .6s ease',
  });

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* y grid + labels */}
      {yTicks.map((v, i) => {
        const y = sy(v);
        return (
          <g key={i}>
            <line 
              x1={pad.l} 
              x2={w - pad.r} 
              y1={y} 
              y2={y} 
              stroke="var(--b)" 
              strokeDasharray={i === 0 ? '' : '2 4'} 
            />
            <text 
              x={pad.l - 6} 
              y={y + 3} 
              fontSize="9" 
              fill="var(--t4)" 
              fontFamily="var(--font-mono)" 
              textAnchor="end"
            >
              {v}%
            </text>
          </g>
        );
      })}
      {ticks.map((wk, i) => (
        <text 
          key={i} 
          x={sx(wk)} 
          y={h - 8} 
          fontSize="9" 
          fill="var(--t4)" 
          fontFamily="var(--font-mono)" 
          textAnchor="middle"
        >
          {fmt(wk)}
        </text>
      ))}

      {/* compare baseline (drawn first, behind) */}
      {comparePts.length > 1 && (
        <>
          <path d={areaOf(comparePts)} style={areaStyle('var(--info)', 0.05)} />
          <path d={pathOf(comparePts)} pathLength="1" style={{ ...lineStyle('var(--info)'), strokeWidth: 1.5 }} />
        </>
      )}

      {/* baseline (primary customer) */}
      {baselinePts.length > 1 && (
        <>
          <path d={areaOf(baselinePts)} style={areaStyle('var(--danger)', 0.06)} />
          <path d={pathOf(baselinePts)} pathLength="1" style={lineStyle('var(--danger)')} />
        </>
      )}

      {/* scenario overlay (dashed) */}
      {scenarioPts.length > 1 && (
        <>
          <path d={areaOf(scenarioPts)} style={areaStyle('var(--accent)', 0.08)} />
          <path d={pathOf(scenarioPts)} pathLength="1" style={lineStyle('var(--accent)', true)} />
        </>
      )}

      {/* end-point dots (only after animation is done) */}
      {animate >= 0.99 && baselinePts.length > 0 && (
        <circle 
          cx={sx(baselinePts[baselinePts.length - 1].week)} 
          cy={sy(baselinePts[baselinePts.length - 1].prob)} 
          r="3.5" 
          fill="var(--bg)" 
          stroke="var(--danger)" 
          strokeWidth="1.5" 
        />
      )}
      {animate >= 0.99 && scenarioPts.length > 0 && (
        <circle 
          cx={sx(scenarioPts[scenarioPts.length - 1].week)} 
          cy={sy(scenarioPts[scenarioPts.length - 1].prob)} 
          r="3.5" 
          fill="var(--bg)" 
          stroke="var(--accent)" 
          strokeWidth="1.5" 
        />
      )}
      {animate >= 0.99 && comparePts.length > 0 && (
        <circle 
          cx={sx(comparePts[comparePts.length - 1].week)} 
          cy={sy(comparePts[comparePts.length - 1].prob)} 
          r="3" 
          fill="var(--bg)" 
          stroke="var(--info)" 
          strokeWidth="1.5" 
        />
      )}
    </svg>
  );
}