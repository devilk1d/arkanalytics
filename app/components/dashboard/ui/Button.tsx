'use client';

import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  type?: ButtonType;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-black text-white hover:bg-zinc-800 border border-black',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
  ghost:     'bg-transparent text-gray-600 hover:text-black hover:bg-gray-50 border border-transparent',
  danger:    'bg-red-500 text-white hover:bg-red-600 border border-red-500',
  blue:      'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  isLoading = false,
  icon,
  type = 'button',
}: ButtonProps) {
  const isActuallyDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isActuallyDisabled}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200
        active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon && (
        <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
