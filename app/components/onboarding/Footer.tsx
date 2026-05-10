'use client';

import Image from 'next/image';
import { useTheme } from './ThemeProvider';

export default function Footer() {
  const { theme } = useTheme();
  return (
    <footer
      className="py-12 px-6 relative z-10"
      style={{ background: 'var(--bg)', borderTop: '1px solid var(--b2)' }}
    >
      <div className="max-w-7xl mx-auto">

        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 md:gap-20 mb-11 items-start">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3 cursor-pointer w-fit group">
              <div className="transition-transform duration-300 group-hover:rotate-12">
                <Image
                  src={theme === 'dark' ? '/images/logo_arka_putih.png' : '/images/logo_arka_hitam.png'}
                  alt="Arkanalytics"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span
                className="font-display font-semibold text-[14.5px] tracking-[-0.015em]"
                style={{ color: 'var(--t)' }}
              >
                Arkanalytics
              </span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--t3)', maxWidth: '240px' }}>
              Unified identity and predictive intelligence for modern customer retention teams.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-14">
            {[
              { title: 'Product', links: ['Predictions', 'Integrations', 'Pricing'] },
              { title: 'Company', links: ['Privacy', 'Security', 'Terms'] },
            ].map((col) => (
              <div key={col.title}>
                <p
                  className="font-display text-[10px] font-semibold tracking-[.09em] uppercase mb-3.5"
                  style={{ color: 'var(--t3)' }}
                >
                  {col.title}
                </p>
                <div className="flex flex-col gap-2.5">
                  {col.links.map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="text-[13px] relative group w-fit transition-colors duration-200"
                      style={{ color: 'var(--t2)' }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--t)')}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--t2)')}
                    >
                      {item}
                      <span
                        className="absolute bottom-0 left-0 w-0 h-px transition-all duration-300 group-hover:w-full"
                        style={{ background: 'var(--t)' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div
          className="pt-5 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderTop: '1px solid var(--b2)' }}
        >
          <p className="text-[12px]" style={{ color: 'var(--t3)' }}>© 2026 Arkanalytics. All rights reserved.</p>
          <p
            className="font-display text-[10px] font-semibold tracking-[.1em] uppercase cursor-default transition-colors duration-300 hover:opacity-100"
            style={{ color: 'var(--t4)' }}
          >
            Predict Early, Retain Better
          </p>
        </div>

      </div>
    </footer>
  );
}