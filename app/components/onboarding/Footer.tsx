'use client';

import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10">

          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-4 group cursor-pointer w-fit">
              <div className="transition-transform duration-300 group-hover:rotate-12">
                <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={28} height={28} />
              </div>
                <span className="font-display font-semibold text-lg text-black">Arkanalytics</span>
            </div>
              <p className="text-sm text-gray-400 leading-relaxed">
              Unified identity and predictive intelligence for modern customer retention teams.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            {[
              { title: 'Product', links: ['Predictions', 'Integrations', 'Pricing'] },
              { title: 'Company', links: ['Privacy', 'Security', 'Terms'] },
            ].map((col) => (
              <div key={col.title}>
                <p className="font-display text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
                  {col.title}
                </p>
                <div className="flex flex-col gap-3">
                  {col.links.map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="text-sm text-gray-700 hover:text-black transition-all duration-200 relative group w-fit"
                    >
                      {item}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-black transition-all duration-300 group-hover:w-full" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-16 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400">© 2026 Arkanalytics</p>
          <p className="font-display text-xs font-semibold tracking-widest text-gray-300 uppercase hover:text-black transition-colors duration-300 cursor-default">
            Predict Early, Retain Better
          </p>
        </div>
      </div>
    </footer>
  );
}
