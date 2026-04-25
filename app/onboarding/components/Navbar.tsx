'use client';

import { Space_Grotesk } from 'next/font/google';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`${spaceGrotesk.className} fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-black/5' : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="transition-transform duration-300 group-hover:rotate-12">
            <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={32} height={32} />
          </div>
          <span className="font-semibold text-lg text-black">Arkanalytics</span>
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {['Problems', 'Features', 'Process', 'Testimonials'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative text-sm text-gray-500 hover:text-black transition-colors duration-200 group py-1"
            >
              {item}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <button className="text-sm font-medium text-black hover:text-gray-500 transition-colors duration-200 px-3 py-2">
            Sign In
          </button>
          <button className="text-sm font-medium text-white bg-black hover:bg-gray-800 transition-all duration-200 px-5 py-2.5 rounded-full hover:scale-105 active:scale-95">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}
