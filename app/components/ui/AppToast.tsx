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
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  error: 'border-red-300 bg-red-50 text-red-900',
  info: 'border-slate-300 bg-white text-slate-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
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
      className="fixed bottom-4 right-4 z-70 flex w-[min(92vw,26rem)] flex-col-reverse gap-3 outline-none"
    >
      {({ toast }) => {
        const variant = toast.content.variant ?? 'info';

        return (
          <Toast
            toast={toast}
            style={{ viewTransitionName: toast.key } as CSSProperties}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-md backdrop-blur-sm ${variantClassMap[variant]}`}
          >
            <ToastContent className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text slot="title" className="text-sm font-semibold leading-tight">
                {toast.content.title}
              </Text>
              {toast.content.description ? (
                <Text slot="description" className="text-xs leading-snug opacity-85">
                  {toast.content.description}
                </Text>
              ) : null}
            </ToastContent>
            <button
              slot="close"
              aria-label="Dismiss notification"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-base leading-none opacity-70 transition hover:opacity-100"
            >
              ×
            </button>
          </Toast>
        );
      }}
    </ToastRegion>
  );
}
