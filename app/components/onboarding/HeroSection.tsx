'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/* ── Word-swap cycling text ── */
const WORDS = ['Know More.', 'Lose Less.', 'Faster Action.', 'Zero Guessing.'];

function WordSwap() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 280);
    }, 2600);
    return () => clearInterval(iv);
  }, []);

  return (
    <span
      className="inline font-display"
      style={{
        color: 'var(--t3)',
        fontWeight: 300,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity .28s ease, transform .28s ease',
        display: 'inline',
      }}
    >
      {WORDS[idx]}
    </span>
  );
}

/* ── Floating metric chip ── */
function MetricChip({ label, value, delta, deltaColor, style }: {
  label: string; value: string; delta: string; deltaColor: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute opacity-0 hidden lg:block"
      style={{
        background: 'var(--surf)',
        border: '1px solid var(--b2)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,.08)',
        animation: 'fadeInUp 0.6s ease forwards, chipfloat 4s ease-in-out infinite',
        animationFillMode: 'forwards, none',
        zIndex: 5,
        ...style,
      }}
    >
      <div style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '3px', fontWeight: 500, letterSpacing: '.04em' }}>{label}</div>
      <div className="font-display" style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--t)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', fontWeight: 500, marginTop: '2px', color: deltaColor }}>{delta}</div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="min-h-screen relative z-10 overflow-hidden flex items-center px-6"
      style={{ paddingTop: '56px' }}
    >
      {/* Container matching other sections: max-w-7xl mx-auto, NO extra px */}
      <div className="max-w-7xl mx-auto w-full relative">
        {/* Two-column layout: text left, visuals right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

          {/* ─── LEFT: Text Content ─── */}
          <div className="flex flex-col items-start" style={{ zIndex: 2 }}>

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full mb-10 opacity-0 animate-fade-in-up"
              style={{
                padding: '5px 14px 5px 6px',
                border: '1px solid var(--b2)',
                background: 'var(--bg1)',
                fontSize: '12px',
                color: 'var(--t2)',
                animationDelay: '0.08s',
                animationFillMode: 'forwards',
              }}
            >
              <div
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                style={{ background: 'var(--t)', color: 'var(--inv-t)', fontSize: '10px' }}
              >
                ✦
              </div>
              <span className="font-display font-medium tracking-wide" style={{ color: 'var(--t2)', fontSize: '11.5px' }}>
                Predict Early, Retain Better
              </span>
            </div>

            {/* Headline — WordSwap inline */}
            <h1
              className="font-display font-bold mb-8 opacity-0 animate-fade-in-up"
              style={{
                fontSize: 'clamp(44px, 5.8vw, 80px)',
                lineHeight: '.94',
                letterSpacing: '-.04em',
                animationDelay: '0.18s',
                animationFillMode: 'forwards',
                color: 'var(--t)',
              }}
            >
              Customer Insights for <WordSwap />
            </h1>

            {/* Description */}
            <p
              className="text-[16px] leading-[1.75] max-w-[440px] mb-11 opacity-0 animate-fade-in-up"
              style={{
                color: 'var(--t2)',
                animationDelay: '0.28s',
                animationFillMode: 'forwards',
              }}
            >
              Empower your Customer Success team with AI-driven foresight. Turn raw behavioral data
              into proactive retention strategies that actually work.
            </p>

            {/* Actions */}
            <div
              className="flex items-center gap-3 mb-12 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '0.38s', animationFillMode: 'forwards' }}
            >
              <Link
                href="/auth/signup/configure-workspace"
                className="font-display inline-flex items-center gap-2 font-medium rounded-[10px] text-[14px] transition-all duration-200 hover:opacity-87 hover:-translate-y-px active:scale-[.97] group"
                style={{ height: '48px', padding: '0 28px', background: 'var(--t)', color: 'var(--inv-t)' }}
              >
                Onboard Your Team
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <button
                className="inline-flex items-center gap-3 text-[14px] rounded-[10px] transition-all duration-200 hover:-translate-y-px"
                style={{
                  height: '48px',
                  padding: '0 28px',
                  color: 'var(--t)',
                  background: 'none',
                  border: '1px solid var(--b2)',
                }}
                onClick={() => {
                  document.getElementById('process')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'none';
                }}
              >
                How it works
              </button>
            </div>

            {/* Trust row */}
            <div
              className="flex items-center gap-3 text-[12px] opacity-0 animate-fade-in-up"
              style={{ color: 'var(--t3)', animationDelay: '0.48s', animationFillMode: 'forwards' }}
            >
              <div className="flex">
                {['A', 'B', 'C', 'D'].map((l) => (
                  <div
                    key={l}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold -ml-2 first:ml-0"
                    style={{
                      background: 'var(--bg2)',
                      border: '2px solid var(--bg)',
                      color: 'var(--t2)',
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              Trusted by 500+ high-growth SaaS teams
            </div>
          </div>

          {/* ─── RIGHT: 3D Cube + Chips ─── */}
          <div className="relative hidden lg:flex items-center justify-center pointer-events-none" style={{ minHeight: '500px', zIndex: 1 }}>

            {/* Floating Chips */}
            <MetricChip
              label="Retention Rate" value="94.2%" delta="↑ 3.1% this month" deltaColor="var(--g)"
              style={{ top: '8%', right: '0%', animationDelay: '0.5s, 0.5s' }}
            />
            <MetricChip
              label="High Risk" value="28" delta="Needs action now" deltaColor="var(--r)"
              style={{ top: '45%', right: '-2%', animationDelay: '0.8s, 0.8s' }}
            />
            <MetricChip
              label="Model Accuracy" value="90%" delta="Verified production" deltaColor="var(--g)"
              style={{ bottom: '12%', right: '10%', animationDelay: '1.1s, 1.1s' }}
            />

            {/* 3D Cube */}
            <div
              className="opacity-0"
              style={{
                perspective: '700px',
                animation: 'fadeIn 0.8s ease forwards',
                animationDelay: '0.6s',
                animationFillMode: 'forwards',
              }}
            >
              <div className="cube-group">
                <div className="c3-face cf">
                  <div className="face-content">
                    <div className="fc-label">Churn Score</div>
                    <div className="fc-val" style={{ color: 'var(--r)' }}>78</div>
                    <div className="fc-bar"><div className="fc-bar-f" style={{ width: '78%' }}></div></div>
                    <div className="mt-auto">
                      <div className="grid grid-cols-5 gap-[3px] items-end h-[50px]">
                        {[35, 52, 44, 68, 50].map((h, i) => (
                          <div key={i} className="fc-bar-f opacity-70 rounded-t-[1px]" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="c3-face cb">
                  <div className="face-content">
                    <div className="fc-label">Segment</div>
                    <div className="text-[14px] font-bold mt-1" style={{ color: 'var(--t2)' }}>At Risk</div>
                    <div className="mt-2 space-y-1">
                      <div className="fc-bar"><div className="fc-bar-f" style={{ width: '55%' }}></div></div>
                      <div className="fc-bar"><div className="fc-bar-f" style={{ width: '30%' }}></div></div>
                      <div className="fc-bar"><div className="fc-bar-f" style={{ width: '70%' }}></div></div>
                    </div>
                  </div>
                </div>
                <div className="c3-face cr">
                  <div className="face-content">
                    <div className="fc-label">NLP Signal</div>
                    <div className="text-[16px] font-bold mt-1" style={{ color: 'var(--o)' }}>Negative</div>
                    <div className="fc-bar mt-2"><div className="fc-bar-f" style={{ width: '65%' }}></div></div>
                  </div>
                </div>
                <div className="c3-face cl">
                  <div className="face-content">
                    <div className="fc-label">SHAP Top</div>
                    <div className="mt-1 text-[11px] leading-[1.6]" style={{ color: 'var(--t2)' }}>
                      <div>↑ Billing delay</div>
                      <div>↑ Low usage</div>
                      <div>↓ NPS score</div>
                    </div>
                  </div>
                </div>
                <div className="c3-face ct"></div>
                <div className="c3-face cbt"></div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}