'use client';

const stats = [
  { value: '32%',   label: 'Churn Reduction',    sub: 'Average improvement', ghost: '32'  },
  { value: '1.2B+', label: 'Data Signals',        sub: 'Signals processed',   ghost: '1.2' },
  { value: '$4.5M', label: 'Revenue Saved',        sub: 'Total client ARR',    ghost: '4.5' },
  { value: '98.4%', label: 'Prediction Accuracy', sub: 'Verified models',     ghost: '98'  },
];

export default function StatsBanner() {
  return (
    <section
      className="relative z-10 grid grid-cols-2 md:grid-cols-4"
      style={{ background: '#0C0C0C', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)' }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="relative overflow-hidden text-center py-9 cursor-default group"
          style={{ borderRight: '1px solid rgba(255,255,255,.08)' }}
        >
          {/* Ghost bg number */}
          <div
            className="absolute right-[-6px] bottom-[-8px] font-display font-bold leading-none pointer-events-none select-none"
            style={{ fontSize: 76, color: 'rgba(255,255,255,.025)' }}
          >
            {stat.ghost}
          </div>

          <p
            className="font-display font-bold tracking-[-0.04em] leading-none mb-1.5 transition-all duration-300 group-hover:scale-105 group-hover:opacity-80 inline-block"
            style={{ fontSize: 40, color: '#F7F6F3' }}
          >
            {stat.value}
          </p>
          <p
            className="font-display text-[10px] font-semibold tracking-[.08em] uppercase mb-1 transition-colors duration-300"
            style={{ color: 'rgba(247,246,243,.45)' }}
          >
            {stat.label}
          </p>
          <p
            className="text-[11px] transition-colors duration-300"
            style={{ color: 'rgba(247,246,243,.25)' }}
          >
            {stat.sub}
          </p>
        </div>
      ))}
    </section>
  );
}