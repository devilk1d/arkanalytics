'use client';

type BadgeVariant = 'low' | 'med' | 'high' | 'active' | 'invited' | 'ready' | 'pending' | 'scheduled' | 'cleaned' | 'raw' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  loading?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  low:       'bg-[var(--s-bg)] text-[var(--s)] border border-[var(--s-b)]',
  med:       'bg-[var(--w-bg)] text-[var(--w)] border border-[var(--w-b)]',
  high:      'bg-[var(--d-bg)] text-[var(--d)] border border-[var(--d-b)]',
  active:    'bg-[var(--p-bg)] text-[var(--p)] border border-[var(--p-b)]',
  invited:   'bg-[var(--n-bg)] text-[var(--n)] border border-[var(--n-b)]',
  ready:     'bg-[var(--p-bg)] text-[var(--p)] border border-[var(--p-b)]',
  pending:   'bg-[var(--n-bg)] text-[var(--n)] border border-[var(--n-b)]',
  scheduled: 'bg-[var(--n-bg)] text-[var(--n)] border border-[var(--n-b)]',
  cleaned:   'bg-[var(--p-bg)] text-[var(--p)] border border-[var(--p-b)]',
  raw:       'bg-[var(--n-bg)] text-[var(--n)] border border-[var(--n-b)]',
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
