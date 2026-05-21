'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type FilterDropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

interface FilterDropdownProps {
  label?: string;
  placeholder?: string;
  options: FilterDropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function FilterDropdown({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  disabled = false,
  className = '',
  size = 'sm',
  showIcon = true,
}: FilterDropdownProps) {
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

    if (open) {
      document.addEventListener('mousedown', onDocumentClick);
      document.addEventListener('keydown', onEscape);

      return () => {
        document.removeEventListener('mousedown', onDocumentClick);
        document.removeEventListener('keydown', onEscape);
      };
    }
  }, [open]);

  const selectOption = (optionValue: string) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return {
          button: 'h-7 px-2 text-[10px]',
          icon: 'w-3 h-3',
          item: 'px-2.5 py-1.5 text-[10px]',
          itemIcon: 'w-3 h-3'
        };
      case 'sm':
        return {
          button: 'h-8 px-2.5 text-[11px]',
          icon: 'w-4 h-4',
          item: 'px-3 py-2 text-[11px]',
          itemIcon: 'w-4 h-4'
        };
      case 'md':
        return {
          button: 'h-10 px-3 text-sm',
          icon: 'w-4 h-4',
          item: 'px-4 py-2.5 text-sm',
          itemIcon: 'w-4 h-4'
        };
      case 'lg':
        return {
          button: 'h-12 px-4 text-base',
          icon: 'w-5 h-5',
          item: 'px-4 py-3 text-base',
          itemIcon: 'w-5 h-5'
        };
      default:
        return {
          button: 'h-8 px-2.5 text-[11px]',
          icon: 'w-4 h-4',
          item: 'px-3 py-2 text-[11px]',
          itemIcon: 'w-4 h-4'
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <div ref={rootRef} className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label className="text-xs font-semibold tracking-widest uppercase text-[var(--t3)]">
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
          className={`
            w-full rounded-lg border-2 border-transparent transition-all duration-200
            flex items-center justify-between text-left
            disabled:cursor-not-allowed disabled:opacity-60
            hover:border-[var(--b2)]
            ${sizeStyles.button}
            ${open ? 'border-[var(--t)] bg-[var(--bg2)]' : 'bg-[var(--bg1)] border-[var(--b)]'}
          `}
          style={{
            color: selectedOption ? 'var(--t)' : 'var(--t3)',
          }}
        >
          <span className="truncate font-medium">
            {selectedOption?.label ?? placeholder}
          </span>
          {showIcon && (
            <svg
              className={`shrink-0 text-[var(--t3)] transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              } ${sizeStyles.icon}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {open && (
          <div
            className={`
              absolute left-0 right-0 top-[calc(100%+6px)] z-50
              rounded-lg overflow-hidden
              border border-[var(--b2)]
              bg-[var(--surf)]
              shadow-lg
            `}
            style={{
              backdropFilter: 'blur(4px)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            }}
          >
            <div className="max-h-72 overflow-y-auto py-1">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => selectOption(option.value)}
                    className={`
                      w-full text-left transition-colors duration-150
                      ${sizeStyles.item}
                      ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--bg2)]'}
                      ${active ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--t)]'}
                    `}
                    role="option"
                    aria-selected={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
