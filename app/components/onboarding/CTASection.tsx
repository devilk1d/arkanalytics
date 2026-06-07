'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

/** 3D wireframe deco cube using globals.css .deco-cube-inner / .deco-cube-face */
function DecoCube({ delay = '0s' }: { delay?: string }) {
  return (
    <div style={{ perspective: '180px' }}>
      <div className="deco-cube-inner" style={{ animationDelay: delay }}>
        <div className="deco-cube-face f" />
        <div className="deco-cube-face b" />
        <div className="deco-cube-face l" />
        <div className="deco-cube-face r" />
        <div className="deco-cube-face t" />
        <div className="deco-cube-face bt" />
      </div>
    </div>
  );
}

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

export default function CTASection() {
  const contentRef = useScrollReveal();

  return (
    <section className="py-12 md:py-20 px-6 relative z-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-[20px] px-6 sm:px-14 py-24 text-center relative overflow-hidden"
          style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,.08)' }}
        >
          {/* Animated conic border */}
          <div
            className="absolute inset-[-1px] rounded-[21px] pointer-events-none"
            style={{
              padding: '1px',
              background: 'conic-gradient(from var(--ca, 0deg), transparent 0%, rgba(255,255,255,.15) 12%, transparent 25%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              animation: 'caspin 6s linear infinite',
            }}
          />

          {/* Ghost text */}
          <div
            className="absolute bottom-[-10px] sm:bottom-[-20px] left-1/2 -translate-x-1/2 font-display font-bold tracking-[-0.05em] whitespace-nowrap leading-none pointer-events-none select-none"
            style={{ fontSize: 'clamp(60px,12vw,180px)', color: 'rgba(255,255,255,.025)', zIndex: 0 }}
          >
            ARKA
          </div>

          {/* Deco cubes — hidden on mobile to avoid clutter */}
          <div className="hidden sm:block absolute top-10 left-10 pointer-events-none">
            <DecoCube />
          </div>
          <div className="hidden sm:block absolute bottom-10 right-10 pointer-events-none rotate-180">
            <DecoCube delay="-6s" />
          </div>

          {/* Content */}
          <div ref={contentRef} className="rv relative z-10">
            <p
              className="font-display text-[11px] font-medium tracking-[.12em] uppercase mb-5"
              style={{ color: 'rgba(247,246,243,.36)' }}
            >
              Start Your Journey
            </p>

            <h2
              className="font-display font-bold tracking-[-0.04em] leading-[.95] sm:leading-[.92]"
              style={{ fontSize: 'clamp(36px,5.5vw,72px)', color: '#F7F6F3', marginBottom: '4px' }}
            >
              Ready to stop
            </h2>
            <h2
              className="font-display font-bold tracking-[-0.04em] leading-[.95] sm:leading-[.92] mb-6"
              style={{ fontSize: 'clamp(36px,5.5vw,72px)', color: 'rgba(247,246,243,.28)' }}
            >
              guessing?
            </h2>

            <p
              className="text-[14px] sm:text-[15px] leading-[1.7] mb-10 max-w-[440px] mx-auto"
              style={{ color: 'rgba(247,246,243,.46)' }}
            >
              Gain clear insights into customer behavior, take timely action, and improve retention across your organization.
            </p>

            <Link
              href="/auth/signup/selection"
              className="font-display inline-flex items-center gap-3 font-semibold rounded-[10px] text-[14px] transition-all duration-200 group hover:opacity-88 hover:translate-y-[-2px] active:scale-[.97]"
              style={{
                height: '50px',
                padding: '0 36px',
                background: '#F7F6F3',
                color: '#0C0C0C',
              }}
            >
              Get Started Free
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}