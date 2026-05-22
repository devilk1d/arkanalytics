'use client';

import toast, { Toaster } from 'react-hot-toast';
import type { Toast as ToastType } from 'react-hot-toast';

type AppToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';

const IconMap: Record<Exclude<AppToastVariant, 'loading'>, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-500 animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

interface ToastItemProps {
  t: ToastType;
  title: string;
  description?: string;
  variant: AppToastVariant;
}

function ToastItem({ t, title, description, variant }: ToastItemProps) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[min(92vw,20rem)] transition-all duration-300 ${
        t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--b2)',
        color: 'var(--t)',
      }}
    >
      <div className="shrink-0">
        {variant === 'loading' ? <SpinnerIcon /> : IconMap[variant]}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-bold tracking-tight" style={{ color: 'var(--t)' }}>
          {title}
        </p>
        {description ? (
          <p className="text-[12px] font-medium leading-relaxed" style={{ color: 'var(--t3)' }}>
            {description}
          </p>
        ) : null}
      </div>

      {variant !== 'loading' && (
        <button
          onClick={() => toast.dismiss(t.id)}
          aria-label="Dismiss notification"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all hover:opacity-70"
          style={{ color: 'var(--t3)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function enqueue(
  title: string,
  description: string | undefined,
  variant: AppToastVariant,
  options?: { id?: string; duration?: number },
) {
  toast.custom(
    (t) => <ToastItem t={t} title={title} description={description} variant={variant} />,
    {
      id: options?.id,
      duration: options?.duration ?? (variant === 'loading' ? Infinity : 5000),
    },
  );
}

export function toastSuccess(title: string, description?: string, options?: { id?: string }) {
  enqueue(title, description, 'success', options);
}

export function toastError(title: string, description?: string, options?: { id?: string }) {
  enqueue(title, description, 'error', options);
}

export function toastInfo(title: string, description?: string, options?: { id?: string }) {
  enqueue(title, description, 'info', options);
}

export function toastWarning(title: string, description?: string, options?: { id?: string }) {
  enqueue(title, description, 'warning', options);
}

/** Shows a persistent loading toast and returns its ID so it can be replaced later. */
export function toastLoading(title: string, description?: string): string {
  const id = `toast-loading-${Date.now()}`;
  enqueue(title, description, 'loading', { id });
  return id;
}

export function AppToastRegion() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{ top: 24, right: 24 }}
      gutter={12}
    />
  );
}
