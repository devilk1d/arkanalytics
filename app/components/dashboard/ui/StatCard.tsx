import { ReactNode } from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeSuffix?: string;
  changePositive?: boolean;
  icon?: ReactNode;
  iconBg?: string;
}

export default function StatCard({ label, value, change, changeSuffix = 'vs last month', changePositive = true, icon, iconBg = 'bg-blue-50' }: StatCardProps) {
  return (
    <Card className="flex-1 min-w-0">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-5xl font-black text-black mb-2 leading-none tracking-tight">{value}</p>
      {change && (
        <p className={`text-base font-medium ${changePositive ? 'text-green-600' : 'text-red-500'}`}>
          {change}{' '}
          <span className="text-gray-400 font-normal">{changeSuffix}</span>
        </p>
      )}
    </Card>
  );
}
