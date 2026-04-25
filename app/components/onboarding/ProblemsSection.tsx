'use client';

import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

const problems = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: 'Hard to track behavior',
    desc: 'Scattered data across multiple tools makes it impossible to see the full picture.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
      </svg>
    ),
    title: 'High churn, low insights',
    desc: "Customers leave and you don't know why until it's too late to save them.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Siloed collaboration',
    desc: 'Sales, support, and product work in silos without shared customer context.',
  },
];

export default function ProblemsSection() {
  return (
    <section id="problems" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-gray-50 rounded-3xl p-8 border border-gray-100 group cursor-default transition-all duration-300 hover:border-black/20 hover:shadow-md hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rounded-xl">
                {p.icon}
              </div>
              <h3 className={`${spaceGrotesk.className} text-lg font-semibold text-black mb-3 transition-colors duration-200`}>
                {p.title}
              </h3>
              <p className={`${inter.className} text-sm text-gray-500 leading-relaxed transition-colors duration-200 group-hover:text-gray-700`}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Solution Banner */}
        <div className="bg-black rounded-3xl px-10 py-12 text-center group overflow-hidden relative">
          {/* Subtle animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          <h2 className={`${spaceGrotesk.className} text-3xl lg:text-4xl font-bold text-white mb-4`}>
            Arkanalytics solves all three
          </h2>
          <p className={`${inter.className} text-sm text-gray-400 mb-8 max-w-lg mx-auto`}>
            Identify at-risk customers, take fast action, and improve collaboration across your entire organization.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {['At-risk identification', 'Proactive action', 'Shared context'].map((item) => (
              <div key={item} className="flex items-center gap-2 group/item cursor-default">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-hover/item:scale-125">
                  <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5" />
                  <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={`${inter.className} text-sm text-gray-300 transition-colors duration-200 group-hover/item:text-white`}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
