'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section id="hero" className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left Content */}
        <div>
          {/* Badge */}
          <div
            className="font-display inline-flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 mb-8 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            <span className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="3" fill="white" />
              </svg>
            </span>
            <span className="text-xs font-semibold tracking-widest text-gray-700 uppercase">
              Predict Early, Retain Better
            </span>
          </div>

          {/* Heading */}
          <h1
            className="font-display text-5xl lg:text-6xl font-bold leading-tight mb-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <span className="text-black">Customer</span>
            <br />
            <span className="text-black">Insights for</span>
            <br />
            <span className="text-gray-300">Better</span>
            <br />
            <span className="text-gray-300">Decisions.</span>
          </h1>

          {/* Description */}
          <p
            className="text-base text-gray-500 leading-relaxed mb-10 max-w-md opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}
          >
            Empower your Customer Success team with AI-driven foresight. Turn raw behavioral data into proactive retention strategies that actually work.
          </p>

          {/* CTA Button */}
          <div
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.45s', animationFillMode: 'forwards' }}
          >
            <Link href="/auth/signup/configure-workspace" className="font-display inline-flex items-center gap-3 bg-black text-white font-semibold px-8 py-4 rounded-2xl hover:bg-gray-800 transition-all duration-300 hover:scale-105 hover:gap-5 active:scale-95 group">
              Onboard Your Team
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Trust Badges */}
          <div
            className="flex items-center gap-3 mt-8 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.55s', animationFillMode: 'forwards' }}
          >
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((letter, i) => (
                <div
                  key={letter}
                  className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600 transition-all duration-200 hover:z-10 hover:scale-110 hover:-translate-y-1 cursor-pointer"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-1">
              Trusted by 500+ High-Growth SaaS
            </span>
          </div>
        </div>

        {/* Right: Dashboard Mockup */}
        <div
          className="hidden lg:block opacity-0 animate-scale-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-500">
            {/* Header bars */}
            <div className="h-3 w-36 bg-gray-200 rounded-full mb-2" />
            <div className="h-10 w-52 bg-black rounded-xl mb-5" />

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Retention Rate', value: '94.2%', color: 'text-green-500' },
                { label: 'Risk Alerts', value: '28', color: 'text-orange-500' },
                { label: 'Churn Rate', value: '5.4%', color: 'text-blue-500' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-black/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="h-4 w-44 bg-gray-200 rounded-full mb-3" />
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-end gap-2 h-20">
                {[40, 60, 50, 75, 65, 80, 55].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gray-200 rounded-t-md hover:bg-black transition-colors duration-200 cursor-pointer"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
