import { ReactNode } from 'react';
import Card from './Card';

interface SegmentStatCardProps {
  label: string;
  value: string;
  percentage: string;
  avgMrr: string;
  totalMrr: string;
  icon: ReactNode;
  iconBgClass: string;
  metricColorClass: string;
  className?: string;
}

export default function SegmentStatCard({
  label,
  value,
  percentage,
  avgMrr,
  totalMrr,
  icon,
  iconBgClass,
  metricColorClass,
  className = '',
}: SegmentStatCardProps) {
  return (
    <Card className={`h-full ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconBgClass}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <p className="text-5xl font-black text-black leading-none tracking-tight">{value}</p>
        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-900">
          {percentage}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-400">
        Avg MRR: <span className={`font-semibold ${metricColorClass}`}>{avgMrr}</span>
        {'   '}
        Total MRR: <span className={`font-semibold ${metricColorClass}`}>{totalMrr}</span>
      </p>
    </Card>
  );
}