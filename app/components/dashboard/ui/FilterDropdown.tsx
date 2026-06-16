'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

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

/* ─── Portal list ─── */
function DropdownPortal({
  anchorRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;

    const update = () => {
      setRect(anchorRef.current?.getBoundingClientRect() ?? null);
    };

    update();

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef]);

  if (!rect) return null;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
    ...(openUp
      ? { bottom: window.innerHeight - rect.top + 6 }
      : { top: rect.bottom + 6 }),
  };

  return createPortal(
    <div style={style}>{children}</div>,
    document.body
  );
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
  const rootRef  = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // keep open when clicking inside the root wrapper
      if (rootRef.current?.contains(target)) return;
      // also keep open when clicking inside the portal list
      const portal = document.getElementById('fd-portal-list');
      if (portal?.contains(target)) return;
      close();
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, close]);

  const selectOption = (optionValue: string) => {
    onChange?.(optionValue);
    close();
  };

  const sizeStyles = (() => {
    switch (size) {
      case 'xs': return { button: 'h-7 px-2 text-[10px]',    icon: 'w-3 h-3', item: 'px-2.5 py-1.5 text-[10px]' };
      case 'sm': return { button: 'h-8 px-2.5 text-[11px]',  icon: 'w-4 h-4', item: 'px-3 py-2 text-[11px]' };
      case 'md': return { button: 'h-10 px-3 text-sm',        icon: 'w-4 h-4', item: 'px-4 py-2.5 text-sm' };
      case 'lg': return { button: 'h-12 px-4 text-base',      icon: 'w-5 h-5', item: 'px-4 py-3 text-base' };
      default:   return { button: 'h-8 px-2.5 text-[11px]',  icon: 'w-4 h-4', item: 'px-3 py-2 text-[11px]' };
    }
  })();

  return (
    <div ref={rootRef} className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[11px] font-bold text-[var(--t3)] uppercase tracking-[0.08em] font-mono">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={[
            'w-full rounded-lg border-2 transition-all duration-200',
            'flex items-center justify-between text-left',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'hover:border-[var(--b2)]',
            sizeStyles.button,
            open
              ? 'border-[var(--t)] bg-[var(--bg2)]'
              : 'bg-[var(--bg1)] border-[var(--b)]',
          ].join(' ')}
          style={{ color: selectedOption ? 'var(--t)' : 'var(--t3)' }}
        >
          <span className="truncate font-medium">
            {selectedOption?.label ?? placeholder}
          </span>
          {showIcon && (
            <svg
              className={`shrink-0 text-[var(--t3)] transition-transform duration-200 ${open ? 'rotate-180' : ''} ${sizeStyles.icon}`}
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
          <DropdownPortal anchorRef={btnRef}>
            <div
              id="fd-portal-list"
              className="rounded-lg overflow-hidden border border-[var(--b2)] bg-[var(--surf)] shadow-lg"
              style={{
                backdropFilter: 'blur(4px)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              }}
            >
              <div className="max-h-64 overflow-y-auto py-1">
                {options.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => selectOption(option.value)}
                      className={[
                        'w-full text-left transition-colors duration-150',
                        sizeStyles.item,
                        option.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-[var(--bg2)]',
                        active
                          ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                          : 'text-[var(--t)]',
                      ].join(' ')}
                      role="option"
                      aria-selected={active}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </DropdownPortal>
        )}
      </div>
    </div>
  );
}
