'use client';

import { ReactNode, useEffect, useState } from 'react';
import Button from './Button';

interface ActionConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actionLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => Promise<void>;
  children?: ReactNode;
}

export default function ActionConfirmation({
  isOpen,
  onClose,
  title,
  description,
  actionLabel = 'Confirm',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  children,
}: ActionConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, isOpen, isSubmitting, onClose]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-80 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-black/45" onClick={isLoading || isSubmitting ? undefined : onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl transition-all duration-200 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
        }`}
        style={{ background: 'var(--surf)', border: '1px solid var(--b2)' }}
      >
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--b)' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--t)' }}>{title}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--t3)' }}>{description}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading || isSubmitting}
            className="h-8 w-8 rounded-full transition disabled:opacity-50"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Close confirmation"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          {children && <div className="mb-4">{children}</div>}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading || isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ color: 'var(--t2)', border: '1px solid var(--b2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading || isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing…
                </>
              ) : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
