import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeSuffix?: string;
  changePositive?: boolean;
  changeNeutral?: boolean;   // grey, no arrow — for informational text
  icon?: ReactNode;          // kept for API compat, not rendered
  iconColor?: string;        // kept for API compat
  accentColor?: string;      // kept for API compat
  iconBg?: string;           // kept for API compat
  sparkData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 56, h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const fill = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const fillPath = `M0,${h} L${fill.join(' L')} L${w},${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible opacity-80">
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${color.replace(/[^a-zA-Z0-9]/g, '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  change,
  changeSuffix = 'vs last month',
  changePositive = true,
  changeNeutral = false,
  sparkData,
  accentColor = '#3b82f6',
}: StatCardProps) {
  const changeColor = changeNeutral
    ? 'var(--t3)'
    : changePositive
    ? 'var(--s)'
    : 'var(--d)';

  const arrow = changeNeutral ? '' : changePositive ? '↑ ' : '↓ ';

  return (
    <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-sm">

      {/* ── Top row: label + optional sparkline ── */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] font-mono leading-snug">
          {label}
        </p>
        {sparkData && sparkData.length > 1 && (
          <MiniSparkline data={sparkData} color={accentColor} />
        )}
      </div>

      {/* ── Value ── */}
      <p className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight">
        {value}
      </p>

      {/* ── Change / context row ── */}
      {change ? (
        <p
          className="text-[11px] font-mono"
          style={{ color: changeColor }}
        >
          {arrow}{change} {changeSuffix}
        </p>
      ) : (
        <span /> /* spacer so flex justify-between keeps value vertically centred */
      )}
    </div>
  );
}
