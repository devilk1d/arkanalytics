'use client';

import { useState } from 'react';

interface AuthInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  hint?: string;
  readOnly?: boolean;
  prefilled?: boolean;
  rightAction?: React.ReactNode;
}

export default function AuthInput({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  hint,
  readOnly = false,
  prefilled = false,
  rightAction,
}: AuthInputProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-widest uppercase text-gray-500">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-sm text-black placeholder-gray-400
            border-2 border-transparent outline-none transition-all duration-200
            focus:border-black focus:bg-white
            ${readOnly || prefilled ? 'text-black font-medium' : ''}
            ${isPassword ? 'pr-12' : ''}
            ${rightAction ? 'pr-20' : ''}
          "
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors duration-200"
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
        {rightAction && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightAction}</div>
        )}
      </div>
      {hint && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}
