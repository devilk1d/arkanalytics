'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Scroll-reveal hook (same as FeaturesSection) ────────────────────────── */
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
      { threshold: 0.07 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return ref;
}

/* ── Animated churn trajectory chart ────────────────────────────────────── */
function TrajectoryViz() {
  const pathRef   = useRef<SVGPathElement>(null);
  const scenRef   = useRef<SVGPathElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="rounded-[10px] p-3" style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}>
      {/* chart header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold" style={{ color: 'var(--t2)' }}>Churn Trajectory</span>
        <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          <span className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 12, height: 2, background: '#ef4444', borderRadius: 1 }} />
            Baseline
          </span>
          <span className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 12, height: 2, backgroundImage: 'repeating-linear-gradient(90deg,#22c55e 0,#22c55e 4px,transparent 4px,transparent 7px)', borderRadius: 1 }} />
            Scenario
          </span>
        </div>
      </div>
      <svg width="100%" height="68" viewBox="0 0 300 68" preserveAspectRatio="none" className="overflow-visible block">
        <defs>
          <linearGradient id="sim-grad-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sim-grad-s" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* baseline fill */}
        <path
          d="M0,68 L0,18 C30,17 60,15 90,14 C120,13 150,16 180,19 C210,22 240,20 270,17 C285,15 295,14 300,13 L300,68Z"
          fill="url(#sim-grad-b)"
          style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 0.2s' }}
        />
        {/* baseline line */}
        <path
          ref={pathRef}
          d="M0,18 C30,17 60,15 90,14 C120,13 150,16 180,19 C210,22 240,20 270,17 C285,15 295,14 300,13"
          fill="none" stroke="#ef4444" strokeWidth="2"
          strokeDasharray="320" strokeDashoffset={active ? 0 : 320}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1) 0.1s' }}
        />
        {/* scenario fill */}
        <path
          d="M0,68 L0,18 C40,24 80,36 120,44 C160,52 200,55 240,57 C260,58 280,58 300,59 L300,68Z"
          fill="url(#sim-grad-s)"
          style={{ opacity: active ? 1 : 0, transition: 'opacity 0.8s ease 0.6s' }}
        />
        {/* scenario line */}
        <path
          ref={scenRef}
          d="M0,18 C40,24 80,36 120,44 C160,52 200,55 240,57 C260,58 280,58 300,59"
          fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3"
          strokeDashoffset={active ? 0 : 320}
          style={{
            strokeDasharray: active ? '4 3' : '320',
            opacity: active ? 1 : 0,
            transition: 'opacity 0.6s ease 0.8s',
          }}
        />
        {/* Week labels */}
        {['W0','W3','W6','W9','W12'].map((w, i) => (
          <text key={w} x={i * 75} y={68} textAnchor="middle"
            style={{ fontSize: '7px', fill: 'var(--t4)', fontFamily: 'monospace' }}>{w}</text>
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px]" style={{ color: 'var(--t3)', fontFamily: 'monospace' }}>87% → 87%</span>
        <span className="text-[9px] font-semibold" style={{ color: '#22c55e', fontFamily: 'monospace' }}>↓ –35pp with scenario</span>
      </div>
    </div>
  );
}

/* ── Mini agent cards ────────────────────────────────────────────────────── */
const AGENTS = [
  { short: 'RA', name: 'Risk Analyst',      color: '#ef4444', line: 'Churn drivers spiking on billing delay & low adoption.' },
  { short: 'CS', name: 'Customer Success',  color: '#3b82f6', line: 'Re-engage with dedicated CSM this week.' },
  { short: 'FN', name: 'Finance Analyst',   color: '#f59e0b', line: '$31K revenue exposed — ROI of 60-day discount: 4.2×.' },
  { short: 'PM', name: 'Product Manager',   color: '#8b5cf6', line: 'Feature adoption gap: onboarding sprint needed.' },
];

function AgentThread({ active }: { active: boolean }) {
  return (
    <div className="space-y-2">
      {AGENTS.map((a, i) => (
        <div
          key={a.short}
          className="flex items-start gap-2 rounded-[7px] px-2.5 py-2"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--b)',
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0)' : 'translateY(6px)',
            transition: `opacity 0.4s ease ${0.15 + i * 0.1}s, transform 0.4s ease ${0.15 + i * 0.1}s`,
          }}
        >
          <div
            className="w-[20px] h-[20px] rounded-[5px] flex items-center justify-center text-[8px] font-bold flex-shrink-0"
            style={{ background: a.color, color: '#fff' }}
          >
            {a.short}
          </div>
          <div className="min-w-0">
            <div className="text-[9.5px] font-semibold" style={{ color: 'var(--t)', lineHeight: 1.2 }}>{a.name}</div>
            <div className="text-[9px] mt-0.5 leading-relaxed" style={{ color: 'var(--t3)' }}>{a.line}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Playbook action items ────────────────────────────────────────────────── */
const PLAYBOOK = [
  { n: '01', text: 'Assign dedicated CSM for 60-day retention sprint' },
  { n: '02', text: 'Offer 20% discount on annual contract upgrade' },
  { n: '03', text: 'Run feature activation workshop this week' },
  { n: '04', text: 'Resolve billing delay — set up auto-billing' },
];

function PlaybookViz({ active }: { active: boolean }) {
  return (
    <div className="space-y-1.5">
      {PLAYBOOK.map((p, i) => (
        <div
          key={p.n}
          className="flex items-baseline gap-2.5 rounded-[7px] px-3 py-2"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--b)',
            opacity: active ? 1 : 0,
            transform: active ? 'translateY(0)' : 'translateY(4px)',
            transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
          }}
        >
          <span className="text-[10px] font-mono font-bold flex-shrink-0" style={{ color: 'var(--t3)' }}>{p.n}</span>
          <span className="text-[10.5px]" style={{ color: 'var(--t2)' }}>{p.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Full mock cockpit preview ────────────────────────────────────────────── */
function CockpitMock() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [tab, setTab] = useState<'agents' | 'playbook'>('agents');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const statCells = [
    { label: 'Churn Score', val: '87', foot: 'Current risk', color: '#ef4444' },
    { label: 'After Scenario', val: '52', foot: 'With intervention', color: '#22c55e' },
    { label: 'Score Change', val: '–35pp', foot: 'Scenario vs no action', color: '#22c55e' },
    { label: 'Revenue at Risk', val: '$31K', foot: '12-month estimate', color: 'var(--t2)' },
  ];

  return (
    <div
      ref={ref}
      className="rounded-[14px] overflow-hidden"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--b2)',
        boxShadow: '0 24px 60px rgba(0,0,0,.15)',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5" style={{ borderBottom: '1px solid var(--b)', background: 'var(--bg1)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        <span className="ml-3 text-[9px] font-mono" style={{ color: 'var(--t3)' }}>
          RUN #001 / WHAT-IF SIMULATION
        </span>
        <span className="ml-auto flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          STREAMING
        </span>
      </div>

      {/* hero band mini */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--b)', background: 'var(--bg1)' }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'var(--t3)' }}>Customer</div>
        <div className="font-display font-bold tracking-tight" style={{ fontSize: '20px', color: 'var(--t)', lineHeight: 1 }}>C-0179</div>
        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono" style={{ color: 'var(--t3)' }}>
          <span>Pro Plan</span><span>·</span><span>Annual</span><span>·</span>
          <span style={{
            padding: '1px 6px', borderRadius: 4,
            background: 'rgba(239,68,68,.1)', color: '#ef4444', fontWeight: 700
          }}>HIGH RISK</span>
        </div>
      </div>

      {/* stat strip mini */}
      <div className="grid grid-cols-4" style={{ borderBottom: '1px solid var(--b)' }}>
        {statCells.map((s, i) => (
          <div
            key={s.label}
            className="px-3 py-2"
            style={{
              borderRight: i < 3 ? '1px solid var(--b)' : 'none',
              position: 'relative',
              opacity: active ? 1 : 0,
              transition: `opacity 0.5s ease ${0.2 + i * 0.08}s`,
            }}
          >
            {i === 0 && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 2, background: '#ef4444', borderRadius: '0 0 2px 0' }} />
            )}
            {i === 1 && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 2, background: '#22c55e', borderRadius: '0 0 2px 0' }} />
            )}
            <div className="text-[8.5px] font-mono uppercase tracking-wide mb-1" style={{ color: 'var(--t3)' }}>{s.label}</div>
            <div className="font-display font-bold" style={{ fontSize: '15px', color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div className="text-[8px] mt-0.5" style={{ color: 'var(--t4)' }}>{s.foot}</div>
          </div>
        ))}
      </div>

      {/* main content */}
      <div className="grid grid-cols-5" style={{ borderBottom: '1px solid var(--b)' }}>
        {/* chart */}
        <div className="col-span-3 p-3" style={{ borderRight: '1px solid var(--b)' }}>
          <TrajectoryViz />
        </div>
        {/* right panel tabs */}
        <div className="col-span-2 flex flex-col">
          <div className="flex" style={{ borderBottom: '1px solid var(--b)' }}>
            {(['agents', 'playbook'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 text-[9px] font-mono uppercase tracking-wider transition-colors"
                style={{
                  color: tab === t ? 'var(--t)' : 'var(--t3)',
                  borderBottom: tab === t ? '2px solid var(--t)' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {t === 'agents' ? 'AI Agents' : 'Playbook'}
              </button>
            ))}
          </div>
          {/* fixed height so switching tabs doesn't resize the cockpit */}
          <div className="p-2.5 overflow-hidden" style={{ height: 172 }}>
            <div style={{ display: tab === 'agents' ? 'block' : 'none' }}>
              <AgentThread active={active} />
            </div>
            <div style={{ display: tab === 'playbook' ? 'block' : 'none' }}>
              <PlaybookViz active={active} />
            </div>
          </div>
        </div>
      </div>

      {/* scenario input bar */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: 'var(--bg1)' }}>
        <span className="text-[9px] font-mono" style={{ color: 'var(--t4)' }}>✦</span>
        <div className="flex-1 text-[10px] font-mono px-2.5 py-1.5 rounded-[6px]" style={{ background: 'var(--bg)', border: '1px solid var(--b)', color: 'var(--t3)' }}>
          e.g. Offer 60-day discount + dedicated CSM…
        </div>
        <button className="px-3 py-1.5 rounded-[6px] text-[9px] font-semibold" style={{ background: 'var(--t)', color: 'var(--inv-t)' }}>
          Run
        </button>
      </div>
    </div>
  );
}

/* ── Feature bullet ──────────────────────────────────────────────────────── */
function Bullet({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--bg1)', border: '1px solid var(--b)' }}>
        {icon}
      </div>
      <div>
        <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: 'var(--t)' }}>{title}</div>
        <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--t2)' }}>{body}</div>
      </div>
    </div>
  );
}

/* ── Main section ─────────────────────────────────────────────────────────── */
export default function SimulationSection() {
  const hdrRef    = useScrollReveal(0);
  const leftRef   = useScrollReveal(80);
  const rightRef  = useScrollReveal(0);
  const statsRef  = useScrollReveal(160);

  return (
    <section
      id="simulation"
      className="py-28 px-6 relative z-10 overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* subtle radial glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: '70vw', height: '70vw', maxWidth: 900, maxHeight: 900,
          borderRadius: '50%', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(99,102,241,.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div ref={hdrRef} className="rv text-center mb-16">
          <p className="font-display text-[11px] font-medium tracking-[.12em] uppercase flex items-center justify-center gap-2.5 mb-4" style={{ color: 'var(--t3)' }}>
            <span className="inline-block w-4 h-px" style={{ background: 'var(--t3)' }} />
            What-If Simulation
            <span className="inline-block w-4 h-px" style={{ background: 'var(--t3)' }} />
          </p>
          <h2
            className="font-display font-bold tracking-[-0.034em] leading-[1.06] mb-5"
            style={{ fontSize: 'clamp(28px,3.2vw,48px)', color: 'var(--t)' }}
          >
            Ask &ldquo;what if&rdquo;<br />before it&apos;s too late.
          </h2>
          <p className="mx-auto text-[15px] leading-[1.72]" style={{ color: 'var(--t2)', maxWidth: 520 }}>
            Run intervention scenarios on any customer before committing. Four AI agents debate the best move — then the system tells you exactly what to do.
          </p>
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* LEFT — explanation */}
          <div ref={leftRef} className="rv flex flex-col gap-8">

            {/* tag */}
            <span className="inline-block text-[10px] font-semibold tracking-[.09em] uppercase w-fit px-2.5 py-1 rounded-full" style={{ background: 'var(--bg1)', border: '1px solid var(--b)', color: 'var(--t3)' }}>
              F-06 · Simulation Engine
            </span>

            <div className="flex flex-col gap-6">
              <Bullet
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                }
                title="Live churn trajectory"
                body="See the exact churn curve forecast for any customer across 2-week to 1-year horizons. Baseline vs. scenario, side by side."
              />
              <Bullet
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                }
                title="4-agent AI debate"
                body="Risk Analyst, Customer Success, Finance Analyst, and Product Manager each bring a unique lens. The team reaches consensus in seconds."
              />
              <Bullet
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                    <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>
                  </svg>
                }
                title="What-if scenarios"
                body="Type any intervention — discount, CSM outreach, feature training. The AI models the impact and updates the trajectory instantly."
              />
              <Bullet
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                }
                title="Saved history & replay"
                body="Every simulation run saves automatically. Revisit, compare, and continue any past session without losing context."
              />
            </div>

            {/* mini stat strip */}
            <div ref={statsRef} className="rv grid grid-cols-3 gap-2 mt-2">
              {[
                { val: '< 8s', lbl: 'Time to full analysis' },
                { val: '4 AI', lbl: 'Specialist agents' },
                { val: '∞', lbl: 'Scenarios per customer' },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="rounded-[10px] p-3.5 text-center" style={{ background: 'var(--bg1)', border: '1px solid var(--b)' }}>
                  <div className="font-display font-bold tracking-tight" style={{ fontSize: '22px', color: 'var(--t)', lineHeight: 1 }}>{val}</div>
                  <div className="text-[10px] mt-1.5 leading-tight font-medium" style={{ color: 'var(--t3)' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — mock cockpit */}
          <div ref={rightRef} className="rv">
            <CockpitMock />
            {/* caption */}
            <p className="text-center text-[11px] mt-3" style={{ color: 'var(--t4)' }}>
              Interactive simulation cockpit — streams 4-agent analysis in real time
            </p>
          </div>
        </div>

        {/* Bottom feature strip */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                  <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              ),
              title: 'Real-time streaming',
              body: 'Agent insights stream token by token — no waiting for the full response.',
            },
            {
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              ),
              title: 'Action Playbook',
              body: 'AI generates ranked intervention options. One click runs the scenario.',
            },
            {
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              ),
              title: 'Q&A chat',
              body: 'Ask anything about the customer mid-simulation. Grounded in live data.',
            },
            {
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--t2)' }}>
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
              ),
              title: 'Segment migration',
              body: 'See how interventions shift segment probability — before you act.',
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-[12px] p-4"
              style={{ background: 'var(--bg1)', border: '1px solid var(--b)' }}
            >
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center mb-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}
              >
                {icon}
              </div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--t)' }}>{title}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: 'var(--t2)' }}>{body}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
