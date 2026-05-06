'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type AuthDropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

interface AuthDropdownProps {
  label?: string;
  placeholder?: string;
  options: AuthDropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'filter' | 'compact';
}

export default function AuthDropdown({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  disabled = false,
  className = '',
  variant = 'default',
}: AuthDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const selectOption = (optionValue: string) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  const getButtonStyles = () => {
    const base = "w-full bg-gray-100 rounded-2xl px-4 text-sm text-black border-2 border-transparent transition-all duration-200 focus:border-black focus:bg-white flex items-center justify-between transition-all duration-200 text-left disabled:cursor-not-allowed disabled:opacity-60";
    if (variant === 'filter') return `${base} py-2 px-4 gap-3 bg-gray-50 rounded-xl hover:border-gray-200`;
    if (variant === 'compact') return `${base} py-1.5 px-2.5 gap-1.5 bg-gray-50 rounded-lg text-xs hover:border-gray-200`;
    return `${base} py-3.5 gap-4`;
  };

  return (
    <div ref={rootRef} className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label className="text-xs font-semibold tracking-widest uppercase text-gray-500">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={getButtonStyles()}
        >
          <span className={`truncate ${selectedOption ? 'text-black' : 'text-gray-400'}`}>
            {selectedOption?.label ?? placeholder}
          </span>
          <svg
            width={variant === 'compact' ? "12" : "16"}
            height={variant === 'compact' ? "12" : "16"}
            viewBox="0 0 24 24"
            fill="none"
            className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open ? (
          <div className={`absolute left-0 right-0 ${variant === 'compact' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+10px)]'} z-50 rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden`}>
            <div className="max-h-64 overflow-auto py-2">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => selectOption(option.value)}
                    className={`w-full ${variant === 'compact' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} text-left transition-colors duration-150 ${
                      active
                        ? 'bg-black text-white'
                        : 'text-black hover:bg-gray-100'
                    } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    role="option"
                    aria-selected={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
