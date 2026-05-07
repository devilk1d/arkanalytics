'use client';

import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import {
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
  Text,
} from 'react-aria-components/Toast';

type AppToastVariant = 'success' | 'error' | 'info' | 'warning';

type AppToastContent = {
  title: string;
  description?: string;
  variant?: AppToastVariant;
};

type AppToastOptions = {
  timeout?: number;
  onClose?: () => void;
};

const variantClassMap: Record<AppToastVariant, string> = {
  success: 'border-emerald-500/20 bg-zinc-950/95 text-white ring-1 ring-white/10',
  error: 'border-red-500/20 bg-zinc-950/95 text-white ring-1 ring-white/10',
  info: 'border-zinc-700/50 bg-zinc-950/95 text-white ring-1 ring-white/10',
  warning: 'border-amber-500/20 bg-zinc-950/95 text-white ring-1 ring-white/10',
};

const IconMap: Record<AppToastVariant, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export const appToastQueue = new ToastQueue<AppToastContent>({
  maxVisibleToasts: 4,
  wrapUpdate(fn) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        flushSync(fn);
      });
      return;
    }
    fn();
  },
});

function enqueue(content: AppToastContent, options?: AppToastOptions) {
  return appToastQueue.add(
    {
      ...content,
      variant: content.variant ?? 'info',
    },
    {
      timeout: options?.timeout ?? 5000,
      onClose: options?.onClose,
    },
  );
}

export function toastSuccess(title: string, description?: string) {
  return enqueue({ title, description, variant: 'success' });
}

export function toastError(title: string, description?: string) {
  return enqueue({ title, description, variant: 'error' });
}

export function toastInfo(title: string, description?: string) {
  return enqueue({ title, description, variant: 'info' });
}

export function toastWarning(title: string, description?: string) {
  return enqueue({ title, description, variant: 'warning' });
}

export function AppToastRegion() {
  return (
    <ToastRegion
      queue={appToastQueue}
      className="fixed top-6 right-6 z-70 flex w-[min(92vw,20rem)] flex-col gap-3 outline-none"
    >
      {({ toast }) => {
        const variant = toast.content.variant ?? 'info';

        return (
          <Toast
            toast={toast}
            style={{ viewTransitionName: toast.key } as CSSProperties}
            className={`group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md ${variantClassMap[variant]}`}
          >
            {/* Subtle glow effect */}
            <div className={`absolute -left-12 -top-12 h-24 w-24 rounded-full blur-[40px] opacity-20 ${
              variant === 'success' ? 'bg-emerald-500' :
              variant === 'error' ? 'bg-red-500' :
              variant === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />

            <div className="shrink-0">
              {IconMap[variant]}
            </div>

            <ToastContent className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text slot="title" className="text-sm font-bold tracking-tight text-white/95">
                {toast.content.title}
              </Text>
              {toast.content.description ? (
                <Text slot="description" className="text-[12px] font-medium leading-relaxed text-zinc-400">
                  {toast.content.description}
                </Text>
              ) : null}
            </ToastContent>
            <button
              slot="close"
              aria-label="Dismiss notification"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/5 text-zinc-500 transition-all hover:bg-white/10 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Toast>
        );
      }}
    </ToastRegion>
  );
}
