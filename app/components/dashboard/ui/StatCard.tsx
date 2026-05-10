import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeSuffix?: string;
  changePositive?: boolean;
  icon?: ReactNode;
  iconColor?: string;
  accentColor?: string;
  iconBg?: string;           // legacy Tailwind class support (AnalyticsPage)
  sparkData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64, h = 28;
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatCard({
  label, value, change, changeSuffix = 'vs last month', changePositive = true,
  icon, iconColor = '#3b82f6', accentColor = '#3b82f6', iconBg, sparkData,
}: StatCardProps) {
  return (
    <div className="bg-[var(--surf)] border border-[var(--b)] rounded-2xl p-5 transition-all duration-300 hover:shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg || ''}`}
          style={iconBg ? {} : { background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
        >
          {icon}
        </div>
        {sparkData && sparkData.length > 1 && (
          <MiniSparkline data={sparkData} color={accentColor} />
        )}
      </div>

      <div className="text-[10px] font-semibold text-[var(--t3)] uppercase tracking-[0.08em] mb-1.5">{label}</div>
      <div className="font-display text-3xl font-black text-[var(--t)] leading-none tracking-tight mb-2.5">{value}</div>

      {change && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--b)]">
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{
              background: `color-mix(in srgb, ${changePositive ? 'var(--g)' : 'var(--r)'} 10%, transparent)`,
              color: changePositive ? 'var(--g)' : 'var(--r)',
            }}
          >
            {changePositive ? '↑' : '↓'} {change}
          </span>
          <span className="text-[10px] font-medium text-[var(--t3)]">{changeSuffix}</span>
        </div>
      )}
    </div>
  );
}
