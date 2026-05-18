'use client';

type BadgeVariant = 'low' | 'med' | 'high' | 'active' | 'invited' | 'ready' | 'pending' | 'scheduled' | 'cleaned' | 'raw' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  loading?: boolean;
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

export default function Badge({ label, variant = 'default', className = '', loading = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]} ${className}`}>
      {loading ? (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-2.5 w-2.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (variant === 'ready' || variant === 'active' || variant === 'cleaned') ? (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
      ) : null}
      {label}
    </span>
  );
}
