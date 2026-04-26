'use client';

type BadgeVariant = 'low' | 'med' | 'high' | 'active' | 'invited' | 'ready' | 'pending' | 'scheduled' | 'cleaned' | 'raw' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  low:       'bg-green-100 text-green-700 border border-green-200',
  med:       'bg-yellow-100 text-yellow-700 border border-yellow-200',
  high:      'bg-red-100 text-red-700 border border-red-200',
  active:    'bg-green-100 text-green-700 border border-green-200',
  invited:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  ready:     'bg-green-100 text-green-700 border border-green-200',
  pending:   'bg-gray-100 text-gray-500 border border-gray-200',
  scheduled: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  cleaned:   'bg-green-100 text-green-700 border border-green-200',
  raw:       'bg-yellow-100 text-yellow-700 border border-yellow-200',
  default:   'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]} ${className}`}>
      {variant === 'ready' || variant === 'active' || variant === 'cleaned' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
      ) : null}
      {label}
    </span>
  );
}
