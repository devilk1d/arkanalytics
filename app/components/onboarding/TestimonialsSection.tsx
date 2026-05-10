'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

const testimonials = [
  {
    quote: 'ArkaAnalytics helped us reduce churn by 35% in just three months. The AI insights are incredibly accurate.',
    name: 'Sarah Chen', role: 'HEAD OF CS, TECHCORP', initials: 'SC', dark: false,
  },
  {
    quote: 'The team collaboration features are game-changing. Everyone has context on our customers instantly.',
    name: 'Herrens Dwi', role: 'VP OF SALES, DORSAM CO.', initials: 'HD', dark: true,
  },
  {
    quote: 'We cut our response time to at-risk accounts by 60%. Arkanalytics changed how we do customer success.',
    name: 'Mark Rivera', role: 'CTO, GROWTHLY', initials: 'MR', dark: false,
  },
  {
    quote: 'The segmentation engine is brilliant. We finally understand why customers churn before they do.',
    name: 'Priya Nair', role: 'HEAD OF PRODUCT, SAASIFY', initials: 'PN', dark: true,
  },
  {
    quote: 'The predictive analytics allow us to proactively engage with our customers. It feels like having a crystal ball.',
    name: 'Jane Doe', role: 'DIRECTOR OF CS, OMNITECH', initials: 'JD', dark: false,
  },
  {
    quote: 'Integrating ArkaAnalytics was smooth and straightforward. The value it provides is evident from day one.',
    name: 'John Smith', role: 'FOUNDER, NEXUS', initials: 'JS', dark: true,
  },
];

const DARK_TEXT = '#F7F6F3';
const DARK_SURFACE = '#0C0C0C';

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

export default function TestimonialsSection() {
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const hdrRef = useScrollReveal();

  // Double the testimonials for seamless loop
  const list = [...testimonials, ...testimonials];

  return (
    <section id="testimonials" className="py-24 px-6 relative z-10 overflow-hidden" style={{ background: 'var(--bg1)' }}>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-290px * ${testimonials.length} - 16px * ${testimonials.length})); }
        }
        .marquee-track {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: scroll 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        .marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div ref={hdrRef} className="rv flex items-end justify-between mb-11 flex-wrap gap-6">
          <div>
            <p
              className="font-display text-[11px] font-medium tracking-[.12em] uppercase flex items-center gap-2.5 mb-4"
              style={{ color: 'var(--t3)' }}
            >
              <span className="inline-block w-4 h-px" style={{ background: 'var(--t3)' }} />
              Testimonials
            </p>
            <h2
              className="font-display font-bold tracking-[-0.034em] leading-[1.05]"
              style={{ fontSize: 'clamp(28px,3vw,44px)', color: 'var(--t)' }}
            >
              Loved by high-growth<br />teams worldwide.
            </h2>
          </div>
          
          <div className="flex gap-2 shrink-0">
             <button
                className="w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ border: '1px solid var(--b2)', background: 'var(--surf)', color: 'var(--t2)' }}
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                )}
             </button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative -mx-6 md:mx-0">
          {/* Gradient Overlays for Fade Effect */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none" 
               style={{ background: 'linear-gradient(to right, var(--bg1), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none" 
               style={{ background: 'linear-gradient(to left, var(--bg1), transparent)' }} />
          
          <div className="overflow-hidden px-6 md:px-0">
            <div 
              ref={trackRef}
              className={`marquee-track ${isPaused ? 'paused' : ''}`}
            >
              {list.map((t, i) => (
                <div
                  key={i}
                  className="shrink-0 w-72.5 rounded-[14px] p-6 cursor-default transition-transform duration-300 hover:scale-[1.01]"
                  style={{
                    background: t.dark ? DARK_SURFACE : '#FFFFFF',
                    border: `1px solid ${t.dark ? 'rgba(255,255,255,.05)' : 'var(--b2)'}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,.03)',
                  }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-3.5">
                    {[...Array(5)].map((_, si) => (
                      <svg key={si} width="13" height="13" viewBox="0 0 24 24"
                        fill={t.dark ? DARK_TEXT : '#0C0C0C'} className="opacity-90">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <p
                    className="text-[13px] leading-[1.72] mb-4 italic"
                    style={{ color: t.dark ? 'rgba(247,246,243,.85)' : '#0C0C0C' }}
                  >
                    "{t.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{
                        background: t.dark ? 'rgba(255,255,255,.1)' : '#F7F6F3',
                        border: `1px solid ${t.dark ? 'rgba(255,255,255,.12)' : 'var(--b)'}`,
                        color: t.dark ? DARK_TEXT : '#0C0C0C',
                      }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p
                        className="font-display text-[13px] font-semibold"
                        style={{ color: t.dark ? DARK_TEXT : '#0C0C0C' }}
                      >
                        {t.name}
                      </p>
                      <p
                        className="text-[10px] mt-px"
                        style={{ color: t.dark ? 'rgba(247,246,243,.38)' : 'var(--t3)' }}
                      >
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Join banner */}
        <div
          className="mt-12 flex items-center gap-3 rounded-xl px-5 py-4 flex-wrap sm:flex-nowrap"
          style={{ background: 'var(--surf)', border: '1px solid var(--b2)' }}
        >
          <div className="flex">
            {['U1', 'U2', 'U3', 'U4'].map((u, i) => (
              <div
                key={u}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold -ml-1.5 first:ml-0 cursor-pointer hover:z-10 hover:scale-110 transition-all duration-200"
                style={{
                  background: 'var(--bg2)',
                  border: '2px solid var(--surf)',
                  color: 'var(--t2)',
                  transitionDelay: `${i * 30}ms`,
                }}
              >
                {u}
              </div>
            ))}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold -ml-1.5 cursor-pointer hover:scale-110 transition-transform"
              style={{ background: 'var(--t)', border: '2px solid var(--surf)', color: 'var(--inv-t)' }}
            >
              +
            </div>
          </div>

          <div className="flex-1 min-w-0 ml-1">
            <p className="font-display text-[13px] font-semibold" style={{ color: 'var(--t)' }}>
              Join 2,000+ teams worldwide
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
              Protecting revenue with Arkanalytics
            </p>
          </div>

          <Link
            href="/auth/signup/configure-workspace"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:opacity-88 hover:translate-y-[-1px] active:scale-95 transition-all"
            style={{ background: 'var(--t)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--inv-t)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}