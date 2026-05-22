'use client';

type BadgeVariant =
  | 'low' | 'med' | 'high'
  | 'active' | 'invited'
  | 'ready' | 'pending' | 'error'
  | 'scheduled' | 'cleaned' | 'raw'
  | 'pdf' | 'csv' | 'xlsx'
  | 'plan'
  | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
  loading?: boolean;
}

/* ─── Color token per variant ─── */
const variantColor: Record<BadgeVariant, string> = {
  low:       'var(--s)',
  med:       'var(--o)',
  high:      'var(--r)',
  active:    'var(--s)',
  invited:   'var(--n)',
  ready:     'var(--s)',
  pending:   'var(--o)',
  error:     'var(--r)',
  scheduled: 'var(--p)',
  cleaned:   'var(--s)',
  raw:       'var(--n)',
  pdf:       'var(--r)',
  csv:       'var(--s)',
  xlsx:      'var(--p)',
  plan:      'var(--n)',
  default:   'var(--t3)',
};

/* variants whose dot pulses (in-progress states) */
const pulseVariants = new Set<BadgeVariant>(['pending', 'loading' as any]);

export default function Badge({ label, variant = 'default', className = '', loading = false }: BadgeProps) {
  const color = variantColor[variant];
  const pulse = pulseVariants.has(variant);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 13%, var(--bg1))`,
        border:     `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        color,
      }}
    >
      {loading ? (
        /* spinner replaces dot when loading */
        <svg
          className="animate-spin shrink-0"
          width="8" height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}
