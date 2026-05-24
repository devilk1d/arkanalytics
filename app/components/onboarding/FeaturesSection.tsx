'use client';

import { useEffect, useRef } from 'react';

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
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return ref;
}

/** Animated sparkline drawn on scroll */
function SparkViz() {
  const lineRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('go'); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      className="mt-5 rounded-[9px] p-3.5"
      style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}
    >
      <svg width="100%" height="42" viewBox="0 0 420 42" preserveAspectRatio="none" className="overflow-visible block">
        <path
          className="sp-fill"
          d="M0,42 L0,30 C40,26 65,14 95,16 C125,18 148,6 178,4 C208,2 232,12 262,8 C292,4 322,0 352,2 C382,4 406,6 420,5 L420,42Z"
        />
        <path
          ref={lineRef}
          className="sp-line"
          d="M0,30 C40,26 65,14 95,16 C125,18 148,6 178,4 C208,2 232,12 262,8 C292,4 322,0 352,2 C382,4 406,6 420,5"
        />
      </svg>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: 'var(--t3)' }}>30d ago</span>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--g)' }}>↓ Avg risk –12%</span>
        <span className="text-[10px]" style={{ color: 'var(--t3)' }}>Today</span>
      </div>
    </div>
  );
}

/** Segment bars animate width on scroll */
function SegViz() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.querySelectorAll<HTMLElement>('[data-w]').forEach((bar, i) => {
            setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, i * 100);
          });
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="mt-5 rounded-[9px] p-3.5 space-y-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}>
      {[
        { label: 'Champions', w: 72 },
        { label: 'At Risk', w: 18 },
        { label: 'Dormant', w: 10 },
      ].map((b) => (
        <div key={b.label} className="flex items-center gap-2.5">
          <span className="text-[11px] w-[68px] flex-shrink-0" style={{ color: 'var(--t3)' }}>{b.label}</span>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--b2)' }}>
            <div
              data-w={b.w}
              className="h-full rounded-full"
              style={{ width: 0, background: 'var(--t)', transition: 'width 1.3s cubic-bezier(.22,1,.36,1)' }}
            />
          </div>
          <span className="font-display text-[11px] font-semibold w-7 text-right" style={{ color: 'var(--t)' }}>{b.w}%</span>
        </div>
      ))}
    </div>
  );
}

function ThreadViz() {
  const msgs = [
    { av: 'CS', msg: 'CUST-4821 hit score 78 — escalate?', right: false },
    { av: 'AM', msg: 'On it — calling now.', right: true },
    { av: 'CS', msg: 'SHAP: billing delay is #1 factor.', right: false },
  ];
  return (
    <div className="mt-5 rounded-[9px] p-3.5 space-y-2" style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}>
      {msgs.map(({ av, msg, right }) => (
        <div key={msg} className={`flex items-start gap-2 ${right ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
            style={{ background: 'var(--bg2)', color: 'var(--t2)' }}
          >
            {av}
          </div>
          <div
            className="text-[11px] leading-relaxed px-2.5 py-1.5 rounded-[7px]"
            style={right
              ? { background: 'var(--t)', color: 'var(--inv-t)', borderRadius: '7px 7px 2px 7px' }
              : { background: 'var(--surf)', border: '1px solid var(--b)', color: 'var(--t2)', borderRadius: '7px 7px 7px 2px' }
            }
          >
            {msg}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionViz() {
  return (
    <div className="mt-5 space-y-2">
      {[
        {
          title: 'Schedule call', sub: 'CUST-4821 · Score 78',
          badge: 'High', bStyle: { background: 'rgba(185,28,28,.1)', color: '#B91C1C' },
          icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
        },
        {
          title: 'Send 20% offer', sub: 'CUST-3302 · Score 61',
          badge: 'Med', bStyle: { background: 'rgba(180,83,9,.1)', color: '#B45309' },
          icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /></svg>,
        },
      ].map(({ title, sub, badge, bStyle, icon }) => (
        <div
          key={title}
          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2.5"
          style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}
        >
          <div className="w-[25px] h-[25px] rounded-[6px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--t)' }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-medium" style={{ color: 'var(--t)' }}>{title}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>{sub}</div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={bStyle}>{badge}</span>
        </div>
      ))}
    </div>
  );
}

function AccViz() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {[
        { val: '90%', lbl: 'Accuracy' },
        { val: '+32%', lbl: 'Uplift' },
        { val: '1.2B', lbl: 'Signals/day' },
        { val: '$4.5M', lbl: 'ARR Saved' },
      ].map(({ val, lbl }) => (
        <div
          key={lbl}
          className="rounded-[8px] p-3"
          style={{ background: 'var(--bg)', border: '1px solid var(--b)' }}
        >
          <div className="font-display font-bold tracking-[-0.03em] leading-none" style={{ fontSize: '21px', color: 'var(--t)' }}>{val}</div>
          <div className="text-[10px] mt-1 uppercase tracking-[.04em] font-medium" style={{ color: 'var(--t3)' }}>{lbl}</div>
        </div>
      ))}
    </div>
  );
}

export default function FeaturesSection() {
  const hdrRef = useScrollReveal();
  const r1 = useScrollReveal(0);
  const r2 = useScrollReveal(80);
  const r3 = useScrollReveal(160);
  const r4 = useScrollReveal(240);
  const r5 = useScrollReveal(320);

  const BcTag = ({ t }: { t: string }) => (
    <span className="block text-[10px] font-semibold tracking-[.09em] uppercase mb-3.5" style={{ color: 'var(--t3)' }}>{t}</span>
  );
  const BcTitle = ({ t }: { t: string }) => (
    <p className="font-display text-[16.5px] font-bold tracking-[-0.02em] mb-2" style={{ color: 'var(--t)' }}>{t}</p>
  );
  const BcBody = ({ t }: { t: string }) => (
    <p className="text-[13px] leading-[1.65]" style={{ color: 'var(--t2)' }}>{t}</p>
  );

  return (
    <section id="features" className="py-24 px-6 relative z-10" style={{ background: 'var(--bg1)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div ref={hdrRef} className="rv grid grid-cols-1 lg:grid-cols-2 gap-14 mb-16">
          <div>
            <p className="font-display text-[11px] font-medium tracking-[.12em] uppercase flex items-center gap-2.5 mb-4" style={{ color: 'var(--t3)' }}>
              <span className="inline-block w-4 h-px" style={{ background: 'var(--t3)' }} />
              Features
            </p>
            <h2 className="font-display font-bold tracking-[-0.034em] leading-[1.03]" style={{ fontSize: 'clamp(30px,3.2vw,46px)', color: 'var(--t)' }}>
              Four capabilities.<br />One platform.
            </h2>
          </div>
          <p className="text-[15px] leading-[1.72] lg:self-end" style={{ color: 'var(--t2)', maxWidth: '420px' }}>
            Each module is powerful alone. Together, they give your CS team complete intelligence to act before churn starts.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

          {/* F-01 Churn — spans 2 cols */}
          <div ref={r1} className="rv bc md:col-span-2">
            <BcTag t="F-01 · Churn Prediction" />
            <BcTitle t="AI risk scores — fully explained." />
            <BcBody t="Our model delivers per-customer 0–100 risk scores with SHAP explanations. Know exactly why someone is at risk, not just that they are." />
            <SparkViz />
          </div>

          {/* F-02 Segmentation */}
          <div ref={r2} className="rv bc">
            <BcTag t="F-02 · Customer Segmentation" />
            <BcTitle t="Auto behavioral clustering." />
            <BcBody t="Group customers by behavior, usage, and health scores automatically. Know which cohorts need your attention most." />
            <SegViz />
          </div>

          {/* F-03 Team Chat */}
          <div ref={r3} className="rv bc">
            <BcTag t="F-03 · Team Chat & Collaboration" />
            <BcTitle t="Shared context, zero silos." />
            <BcBody t="Built-in chat to discuss and take action on customer insights directly. Risk data surfaces right in the thread." />
            <ThreadViz />
          </div>

          {/* F-04 Retention Actions */}
          <div ref={r4} className="rv bc">
            <BcTag t="F-04 · Retention Actions" />
            <BcTitle t="Right action, right time." />
            <BcBody t="Automated workflows to engage at-risk customers at exactly the right moment with the right message." />
            <ActionViz />
          </div>

          {/* F-05 Model Performance */}
          <div ref={r5} className="rv bc">
            <BcTag t="F-05 · Model Performance" />
            <BcTitle t="Enterprise-grade accuracy." />
            <BcBody t="Verified across 2,000+ production teams worldwide." />
            <AccViz />
          </div>

        </div>
      </div>
    </section>
  );
}