'use client';

type BadgeVariant = 'low' | 'med' | 'high' | 'active' | 'invited' | 'ready' | 'pending' | 'scheduled' | 'cleaned' | 'raw' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  low:       'bg-emerald-50 text-[var(--s)] border border-emerald-100',
  med:       'bg-amber-50 text-[var(--w)] border border-amber-100',
  high:      'bg-rose-50 text-[var(--d)] border border-rose-100',
  active:    'bg-indigo-50 text-[var(--p)] border border-indigo-100',
  invited:   'bg-zinc-50 text-[var(--n)] border border-zinc-200',
  ready:     'bg-indigo-50 text-[var(--p)] border border-indigo-100',
  pending:   'bg-zinc-50 text-[var(--n)] border border-zinc-200',
  scheduled: 'bg-zinc-50 text-[var(--n)] border border-zinc-200',
  cleaned:   'bg-indigo-50 text-[var(--p)] border border-indigo-100',
  raw:       'bg-zinc-50 text-[var(--n)] border border-zinc-200',
  default:   'bg-[var(--bg1)] text-[var(--t3)] border border-[var(--b)]',
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
