'use client';

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  prefix?: string;
  className?: string;
}

export default function Select({ value, onChange, options, prefix, className = '' }: SelectProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {prefix && (
        <svg className="absolute left-3 text-gray-500 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none bg-white border border-gray-200 rounded-xl py-2 pr-8 text-sm font-medium text-gray-700 cursor-pointer outline-none hover:border-gray-300 transition-colors focus:border-black ${prefix ? 'pl-8' : 'pl-3'}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="absolute right-2.5 pointer-events-none text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
