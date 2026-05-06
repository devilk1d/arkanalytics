'use client';

import Link from 'next/link';
import { useState } from 'react';

const testimonials = [
  {
    quote: 'ArkaAnalytics helped us reduce churn by 35% in just three months. The AI insights are incredibly accurate.',
    name: 'Sarah Chen',
    role: 'HEAD OF CS, TECHCORP',
    initials: 'SC',
    dark: false,
  },
  {
    quote: 'The team collaboration features are game-changing. Everyone has context on our customers instantly.',
    name: 'Herrens Dwi',
    role: 'VP OF SALES, DORSAM CO.',
    initials: 'HD',
    dark: true,
  },
  {
    quote: 'We cut our response time to at-risk accounts by 60%. Arkanalytics changed how we do customer success.',
    name: 'Mark Rivera',
    role: 'CTO, GROWTHLY',
    initials: 'MR',
    dark: false,
  },
  {
    quote: 'The segmentation engine is brilliant. We finally understand why customers churn before they do.',
    name: 'Priya Nair',
    role: 'HEAD OF PRODUCT, SAASIFY',
    initials: 'PN',
    dark: true,
  },
  {
    quote: 'The predictive analytics allow us to proactively engage with our customers. It feels like having a crystal ball.',
    name: 'Jane Doe',
    role: 'DIRECTOR OF CS, OMNITECH',
    initials: 'JD',
    dark: false,
  },
  {
    quote: 'Integrating ArkaAnalytics was smooth and straightforward. The value it provides is evident from day one.',
    name: 'John Smith',
    role: 'FOUNDER, NEXUS',
    initials: 'JS',
    dark: true,
  },
];

function StarRating({ dark }: { dark: boolean }) {
  return (
    <div className="flex gap-1 mb-5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-yellow-400 transition-transform duration-150 hover:scale-125 cursor-default"
          style={{ transitionDelay: `${i * 40}ms` }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(testimonials.length / itemsPerPage);
  const displayedTestimonials = testimonials.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <section id="testimonials" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* Left */}
          <div>
            <div className="font-display inline-block bg-black text-white text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full mb-6">
              Testimonials
            </div>
            <h2 className="font-display text-4xl font-bold text-black leading-tight mb-4">
              Loved by high-growth teams.
            </h2>
            <p className="text-sm text-gray-400 mb-10">
              Trusted by the world's most customer-centric companies to protect their revenue
            </p>
            <div className="flex gap-8">
              {[
                { num: '98%', label: 'Retention Rate' },
                { num: '200+', label: 'Global Partners' },
              ].map((s) => (
                <div key={s.label} className="group cursor-default">
                  <p className="font-display text-3xl font-bold text-black transition-all duration-300 group-hover:scale-110 inline-block">
                    {s.num}
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mt-1 transition-colors duration-300 group-hover:text-black">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Testimonial cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayedTestimonials.map((t, i) => (
              <div
                key={i}
                className={`rounded-3xl p-7 cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  t.dark
                    ? 'bg-black text-white hover:shadow-black/20'
                    : 'bg-gray-50 text-black border border-gray-100 hover:border-black/20'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <StarRating dark={t.dark} />
                  <svg width="28" height="24" viewBox="0 0 28 24" fill="none" className="transition-opacity duration-300 opacity-60 group-hover:opacity-100">
                    <path d="M0 24V14.4C0 6.4 5.6 1.6 16.8 0L18 2.8C13.2 3.6 10 6 9.6 9.6H14.4V24H0ZM14 24V14.4C14 6.4 19.6 1.6 30.8 0L32 2.8C27.2 3.6 24 6 23.6 9.6H28.4V24H14Z" fill={t.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} />
                  </svg>
                </div>
                <p className={`text-sm leading-relaxed mb-6 ${t.dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 hover:rounded-full ${
                    t.dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black text-white'
                  }`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold">{t.name}</p>
                    <p className={`text-xs uppercase tracking-wide ${t.dark ? 'text-gray-400' : 'text-gray-400'}`}>
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Join CTA card */}
            <div className="sm:col-span-2 bg-gray-50 rounded-3xl p-7 border border-gray-100 flex items-center justify-between group hover:border-black/20 hover:shadow-md transition-all duration-300 cursor-default">
              <div className="flex -space-x-2">
                {['U1', 'U2', 'U3', 'U4'].map((u, i) => (
                  <div
                    key={u}
                    className="w-9 h-9 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600 transition-all duration-200 hover:z-10 hover:scale-110 hover:-translate-y-1 cursor-pointer"
                    style={{ transitionDelay: `${i * 30}ms` }}
                  >
                    {u}
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full bg-black border-2 border-white flex items-center justify-center text-xs font-bold text-white hover:scale-110 hover:-translate-y-1 transition-transform duration-200 cursor-pointer">
                  +12
                </div>
              </div>
              <div className="flex-1 px-6">
                <p className="font-display text-base font-bold text-black">Join 2,000+ teams worldwide</p>
                <p className="text-xs text-gray-400">Sharing insights and protecting revenue with Arkanalytics</p>
              </div>
              <Link href="/auth/signup/configure-workspace" className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:rounded-full active:scale-95">
                →
              </Link>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:rounded-full active:scale-95 disabled:opacity-30"
            disabled={currentPage === 1}
          >
            ‹
          </button>
          <span className="text-sm text-gray-500 tabular-nums">{currentPage}/{totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:rounded-full active:scale-95 disabled:opacity-30"
            disabled={currentPage === totalPages}
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
