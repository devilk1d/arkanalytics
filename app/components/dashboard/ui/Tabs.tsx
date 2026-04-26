'use client';

interface Tab { label: string; value: string; }

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (v: string) => void;
  variant?: 'pill' | 'underline' | 'segment';
}

export default function Tabs({ tabs, active, onChange, variant = 'pill' }: TabsProps) {
  if (variant === 'segment') {
    return (
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200
              ${active === t.value ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div className="flex border-b border-gray-100">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all duration-200 relative
              ${active === t.value ? 'text-black' : 'text-gray-400 hover:text-gray-700'}`}
          >
            {t.label}
            {active === t.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // pill (default)
  return (
    <div className="flex gap-1">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200
            ${active === t.value ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
