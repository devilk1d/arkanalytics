'use client';

import { ReactNode, useState } from 'react';
import Modal from './Modal';
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
    <Modal open={isOpen} onClose={onClose} title={title} subtitle={description} width="sm">
      {children && <div className="mb-4">{children}</div>}
      <p className="text-sm text-gray-600 mb-6">{description}</p>
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
    </Modal>
  );
}
