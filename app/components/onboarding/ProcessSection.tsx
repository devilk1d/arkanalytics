'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

const steps = [
  {
    num: '01',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
    title: 'Connect your data',
    desc: 'Integrate with your CRM, payment processors, and existing data stack in minutes.',
  },
  {
    num: '02',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
    title: 'Analyze behavior',
    desc: 'Our AI engine scans for patterns and identifies high-risk customers automatically.',
  },
  {
    num: '03',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: 'Take Action',
    desc: 'Deploy targeted retention campaigns and bridge the gap with unified team context.',
  },
];

function useScrollReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add('on'), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return ref;
}

export default function ProcessSection() {
  const { theme } = useTheme();
  const hdrRef = useScrollReveal();

  return (
    <section id="process" className="py-24 px-6 relative z-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div ref={hdrRef} className="rv grid grid-cols-1 lg:grid-cols-2 gap-14 mb-16">
          <div>
            <p
              className="font-display text-[11px] font-medium tracking-[.12em] uppercase flex items-center gap-2.5 mb-4"
              style={{ color: 'var(--t3)' }}
            >
              <span className="inline-block w-4 h-px" style={{ background: 'var(--t3)' }} />
              Method
            </p>
            <h2
              className="font-display font-bold tracking-[-0.034em] leading-[1.03]"
              style={{ fontSize: 'clamp(30px,3.2vw,46px)', color: 'var(--t)' }}
            >
              The Arka Method
            </h2>
          </div>
          <p className="text-[15px] leading-[1.72] lg:self-end" style={{ color: 'var(--t2)', maxWidth: '420px' }}>
            Scale your retention efforts in three simple steps. From raw data to actionable intelligence in under 72 hours.
          </p>
        </div>

        {/* Steps grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 rounded-[14px] overflow-hidden"
          style={{ border: '1px solid var(--b2)' }}
        >
          {steps.map((step, i) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const ref = useScrollReveal(i * 80);
            return (
              <div
                key={step.num}
                ref={ref}
                className={`rv relative px-9 py-11 transition-all duration-300 cursor-default
                  ${i < 2 ? 'border-b md:border-b-0 md:border-r' : ''}`}
                style={{
                  borderColor: 'var(--b2)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {/* Header: Number & Icon */}
                <div className="flex items-start justify-between mb-8">
                  <p
                    className="font-display font-bold leading-none tracking-[-0.04em] select-none"
                    style={{ fontSize: 84, color: 'var(--b3)' }}
                  >
                    {step.num}
                  </p>
                  
                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center relative z-10 shrink-0"
                    style={{ background: 'var(--t)', color: theme === 'dark' ? '#0C0C0C' : '#FFFFFF' }}
                  >
                    {step.icon}
                  </div>
                </div>

                <p
                  className="font-display text-[19px] font-bold tracking-[-0.022em] mb-2.5"
                  style={{ color: 'var(--t)' }}
                >
                  {step.title}
                </p>
                <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--t2)', maxWidth: '230px' }}>
                  {step.desc}
                </p>

                {/* Arrow connector badge */}
                {i < 2 && (
                  <div
                    className="hidden md:flex absolute -right-2.75 top-1/2 -translate-y-1/2 z-20 w-5.5 h-5.5 items-center justify-center rounded-full text-[14px]"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--b2)',
                      color: 'var(--t3)',
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}