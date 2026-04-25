'use client';

import { Inter, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import AuthLogo from '../../../components/auth/AuthLogo';

const inter = Inter({ subsets: ['latin'] });
const sg = Space_Grotesk({ subsets: ['latin'] });

const options = [
  {
    href: '/auth/signup/configure-workspace',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    iconBg: 'bg-black',
    iconWrap: 'bg-black',
    title: 'Create Workspace',
    desc: 'Deploy ArkaAnalytics for your company. Includes team management, custom domains, and enterprise-grade data ingestion.',
    cta: 'SET UP BUSINESS',
  },
  {
    href: '/auth/signup/create-arka-id',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    iconWrap: 'bg-gray-100',
    title: 'Create Arka ID',
    desc: 'Register your personal identity. Use this account to join existing team workspaces or manage your own portfolio in the future.',
    cta: 'GET PERSONAL ID',
  },
];

export default function SelectionPage() {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-50 flex flex-col`}>
      {/* Top logo centered */}
      <div className="pt-12 flex justify-center">
        <AuthLogo centered />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-12">
          <h1 className={`${sg.className} text-4xl lg:text-5xl font-bold text-black mb-3`}>
            How would you like to start?
          </h1>
          <p className={`${inter.className} text-gray-400 text-base`}>
            Choose a corporate setup or create your personal Arka ID.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {options.map((opt) => (
            <Link
              key={opt.href}
              href={opt.href}
              className="group bg-white rounded-3xl border border-gray-200 p-8 flex flex-col gap-6 transition-all duration-300 hover:border-black/30 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${opt.iconWrap} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                {opt.icon}
              </div>

              {/* Text */}
              <div>
                <h2 className={`${sg.className} text-xl font-bold text-black mb-2`}>{opt.title}</h2>
                <p className={`${inter.className} text-sm text-gray-500 leading-relaxed`}>{opt.desc}</p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2">
                <span className={`${sg.className} text-xs font-bold tracking-widest text-black uppercase transition-all duration-300 group-hover:translate-x-1`}>
                  {opt.cta}
                </span>
                <span className="transition-transform duration-300 group-hover:translate-x-2 text-black">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Back */}
        <Link
          href="/"
          className={`${sg.className} mt-10 text-xs font-semibold tracking-widest uppercase text-gray-400 hover:text-black transition-colors duration-200 relative group`}
        >
          Back to Home
          <span className="absolute bottom-0 left-0 w-0 h-px bg-black transition-all duration-300 group-hover:w-full" />
        </Link>
      </div>
    </div>
  );
}
