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
        className={`relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-200 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
        }`}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-black">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading || isSubmitting}
            className="h-8 w-8 rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
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
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || isSubmitting}
              variant={isDangerous ? 'danger' : 'primary'}
              size="sm"
            >
              {isLoading || isSubmitting ? 'Loading…' : actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
