'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);

  const scrollToHero = () => {
    const hero = document.getElementById('hero');
    hero?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user?.email) {
        const { data: invites } = await supabase
          .from('workspace_invitations')
          .select('id, token, workspaces(name)')
          .eq('invited_email', data.user.email)
          .eq('status', 'pending');
        if (invites) setInvitations(invites);
      }
    });

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <nav
      className={`font-display fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-black/5' : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button type="button" onClick={scrollToHero} className="appearance-none bg-transparent border-0 p-0 cursor-pointer flex items-center gap-2 group focus:outline-none">
          <div className="transition-transform duration-300 group-hover:rotate-12">
            <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={32} height={32} />
          </div>
          <span className="font-semibold text-lg text-black">Arkanalytics</span>
        </button>

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

        {/* CTA Buttons & Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {invitations.length > 0 && (
                <div className="relative group">
                  <button className="relative px-3 py-2 text-sm font-medium text-black flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Invitations ({invitations.length})
                  </button>
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="p-2 flex flex-col gap-1">
                      <div className="px-3 py-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Pending Invites</div>
                      {invitations.map((inv) => (
                        <Link
                          key={inv.id}
                          href={`/auth/invite?token=${inv.token}`}
                          className="px-3 py-2 text-sm text-black hover:bg-gray-50 rounded-lg transition-colors block border border-gray-100"
                        >
                          Join <span className="font-semibold">{inv.workspaces?.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="relative group">
                <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 focus:outline-none font-bold text-gray-700">
                  {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs font-medium text-gray-500 truncate">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="px-3 pb-2 text-xs text-gray-400 truncate border-b border-gray-100">{user.email}</p>
                    <button onClick={handleSignOut} className="w-full text-left mt-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sign In → /auth/signin */}
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-black hover:text-gray-500 transition-colors duration-200 px-3 py-2"
              >
                Sign In
              </Link>
              {/* Get Started → /auth/signup/selection */}
              <Link
                href="/auth/signup/selection"
                className="text-sm font-medium text-white bg-black hover:bg-gray-800 transition-all duration-200 px-5 py-2.5 rounded-full hover:scale-105 active:scale-95"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
      {user && invitations.length === 0 && (
        <div className="bg-black text-white text-xs py-1.5 w-full overflow-hidden flex whitespace-nowrap border-t border-gray-800">
          <div className="animate-marquee inline-block font-medium tracking-[0.2em] uppercase">
            Waiting for workspace owner inviting you • Waiting for workspace owner inviting you • Waiting for workspace owner inviting you
          </div>
        </div>
      )}
    </nav>
  );
}
