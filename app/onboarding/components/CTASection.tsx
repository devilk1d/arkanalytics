'use client';

import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function CTASection() {
  return (
    <section className="py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-black rounded-3xl px-10 py-20 text-center group overflow-hidden relative">
          {/* Shimmer sweep on hover */}
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

          <p className={`${spaceGrotesk.className} text-xs font-semibold tracking-widest text-gray-400 uppercase mb-6`}>
            Start Your Journey
          </p>
          <h2 className={`${spaceGrotesk.className} text-4xl lg:text-5xl font-bold text-white mb-3 transition-transform duration-300 group-hover:-translate-y-0.5`}>
            Ready to stop
          </h2>
          <h2 className={`${spaceGrotesk.className} text-4xl lg:text-5xl font-bold text-gray-500 mb-8 transition-all duration-300 group-hover:text-gray-300 group-hover:-translate-y-0.5`}>
            guessing?
          </h2>
          <p className={`${inter.className} text-sm text-gray-400 max-w-md mx-auto mb-10`}>
            Gain clear insights into customer behavior, take timely action, and improve retention across your organization.
          </p>
          <button className={`${spaceGrotesk.className} inline-flex items-center gap-3 bg-white text-black font-semibold px-10 py-4 rounded-2xl transition-all duration-300 text-base hover:scale-105 hover:gap-5 hover:shadow-2xl active:scale-95 group/btn`}>
            Get Started
            <span className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
