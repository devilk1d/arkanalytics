'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

const problems = [
  {
    num: '01',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
    title: 'Hard to track behavior',
    desc: "Data scattered across CRM, billing, support, and NPS — no unified view of customer health until it's too late.",
    bars: [
      { label: 'CRM',     w: 45 },
      { label: 'Billing', w: 22 },
      { label: 'Support', w: 18 },
      { label: 'NPS',     w: 15 },
    ],
  },
  {
    num: '02',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'High churn, low insights',
    desc: 'Customers silently disengage for weeks before cancelling. Without early signals, every intervention arrives too late.',
    bars: [
      { label: 'Week 1', w: 12  },
      { label: 'Week 3', w: 38  },
      { label: 'Week 6', w: 71  },
      { label: 'Cancel', w: 100 },
    ],
  },
  {
    num: '03',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Siloed collaboration',
    desc: "Sales, support, and product work in isolation. By the time it's flagged, three teams have independently missed the same signal.",
    bars: [
      { label: 'CS Team',  w: 60 },
      { label: 'Sales',    w: 40 },
      { label: 'Product',  w: 25 },
      { label: 'Aligned',  w: 8  },
    ],
  },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('on'); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function ProblemsSection() {
  const { theme } = useTheme();
  const hdrRef   = useScrollReveal();
  const tableRef = useScrollReveal();
  const solveRef = useScrollReveal();

  const solveIsLight = theme === 'dark';

  return (
    <section id="problems" className="py-24 px-6 relative z-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div ref={hdrRef} className="rv grid grid-cols-1 lg:grid-cols-2 gap-14 mb-14">
          <div>
            <p
              className="font-display text-[11px] font-medium tracking-[.12em] uppercase flex items-center gap-2.5 mb-4"
              style={{ color: 'var(--t3)' }}
            >
              <span className="inline-block w-4 h-px" style={{ background: 'var(--t3)' }} />
              Problems
            </p>
            <h2
              className="font-display font-bold tracking-[-0.034em] leading-[1.03]"
              style={{ fontSize: 'clamp(30px,3.2vw,46px)', color: 'var(--t)' }}
            >
              Why retention teams<br />always fall behind
            </h2>
          </div>
          <p
            className="text-[15px] leading-[1.72] lg:self-end"
            style={{ color: 'var(--t2)', maxWidth: '420px' }}
          >
            The signals are there. You just can't see them fast enough — until it's already too late.
          </p>
        </div>

        {/* Editorial table */}
        <div
          ref={tableRef}
          className="rv border rounded-[14px] overflow-hidden"
          style={{ borderColor: 'var(--b2)' }}
        >
          {problems.map((p, idx) => (
            <div
              key={p.num}
              className="flex flex-col md:grid border-b last:border-b-0 transition-colors duration-200 cursor-default hover:bg-black/02"
              style={{
                gridTemplateColumns: '56px 1fr 200px',
                borderColor: 'var(--b2)',
              }}
            >
              {/* Number */}
              <div
                className="px-6 pt-9 pb-4 md:pb-0 font-display text-[11px] font-bold tracking-[.07em] flex items-start"
                style={{ color: 'var(--t3)' }}
              >
                {p.num}
              </div>

              {/* Icon + title + desc */}
              <div
                className="px-8 py-9 border-t md:border-t-0 md:border-l md:border-r"
                style={{ borderColor: 'var(--b2)' }}
              >
                <div
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center mb-4"
                  style={{
                    border: '1px solid var(--b2)',
                    background: 'var(--bg1)',
                    color: 'var(--t2)',
                  }}
                >
                  {p.icon}
                </div>
                <p
                  className="font-display text-[17px] font-semibold tracking-[-0.02em] mb-2"
                  style={{ color: 'var(--t)' }}
                >
                  {p.title}
                </p>
                <p className="text-[13px] leading-[1.68]" style={{ color: 'var(--t2)' }}>
                  {p.desc}
                </p>
              </div>

              {/* Mini bars — hidden on small mobile, visible from md up */}
              <div className="hidden md:flex px-6 py-9 flex-col justify-center gap-2.5 bg-black/[0.01]">
                {p.bars.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-[10.5px] w-14 shrink-0" style={{ color: 'var(--t3)' }}>
                      {b.label}
                    </span>
                    <div
                      className="flex-1 h-0.75 rounded-full overflow-hidden"
                      style={{ background: 'var(--b2)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${b.w}%`, background: 'var(--t)', transition: 'width 1.2s cubic-bezier(.22,1,.36,1)' }}
                      />
                    </div>
                    <span
                      className="font-display text-[10.5px] font-semibold w-7 text-right"
                      style={{ color: 'var(--t)' }}
                    >
                      {b.w}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Solve block */}
        <div
          ref={solveRef}
          className="rv mt-3 rounded-[14px] px-10 py-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-7 relative overflow-hidden"
          style={{
            background: solveIsLight ? '#FFFFFF' : '#0C0C0C',
            border: `1px solid ${solveIsLight ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.08)'}`,
          }}
        >
          {/* Deco arc */}
          <div
            className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
            style={{
              borderLeft: `1px solid ${solveIsLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'}`,
              borderBottom: `1px solid ${solveIsLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'}`,
              borderBottomLeftRadius: '140px',
            }}
          />
          <div>
            <p
              className="font-display text-[20px] font-bold tracking-[-0.02em]"
              style={{ color: solveIsLight ? '#0C0C0C' : 'var(--inv-t)' }}
            >
              Arkanalytics solves all three
            </p>
            <p
              className="text-[13px] mt-1.5 leading-relaxed"
              style={{ color: solveIsLight ? '#5C5C58' : 'rgba(247,246,243,.5)', maxWidth: '300px' }}
            >
              One platform. Complete visibility. Proactive retention — before churn happens.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {['At-risk identification', 'Proactive action', 'Shared context'].map((item) => (
              <div
                key={item}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium"
                style={{
                  border: `1px solid ${solveIsLight ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.13)'}`,
                  background: solveIsLight ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.06)',
                  color: solveIsLight ? '#0C0C0C' : 'var(--inv-t)',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={solveIsLight ? '#15803D' : '#22C55E'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}