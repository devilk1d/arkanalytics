'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from './ThemeProvider';

/* ── 3D rotating cube logo ── */
function CubeLogo() {
  return (
    <div className="logo-cube">
      <div className="lc-inner">
        <div className="lc-face f" />
        <div className="lc-face b" />
        <div className="lc-face l" />
        <div className="lc-face r" />
        <div className="lc-face t" />
        <div className="lc-face bt" />
      </div>
    </div>
  );
}

/* ── Sun icon ── */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  );
}

/* ── Moon icon ── */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Navbar() {
  const { theme, toggle } = useTheme();

  const [scrolled, setScrolled]           = useState(false);
  const [user, setUser]                   = useState<any>(null);
  const [invitations, setInvitations]     = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState('');

  const scrollToHero = () =>
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: '-30% 0px -30% 0px' }
    );
    ['hero', 'problems', 'features', 'process', 'testimonials'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => { window.removeEventListener('scroll', onScroll); obs.disconnect(); };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <nav
      className={`font-display fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-center px-6
        transition-all duration-300
        ${scrolled ? 'backdrop-blur-xl shadow-sm' : ''}`}
      style={{
        background: scrolled
          ? 'color-mix(in srgb, var(--bg) 88%, transparent)'
          : 'var(--bg)',
        borderBottom: '1px solid var(--b2)',
      }}
    >
    <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
      {/* Logo */}
      <button
        type="button"
        onClick={scrollToHero}
        className="appearance-none bg-transparent border-0 p-0 cursor-pointer flex items-center gap-2.5 focus:outline-none group"
      >
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
          className="font-semibold text-[14px] tracking-[-0.015em]"
          style={{ color: 'var(--t)' }}
        >
          Arkanalytics
        </span>
      </button>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-1">
        {['Problems', 'Features', 'Process', 'Testimonials'].map((item) => {
          const id     = item.toLowerCase();
          const active = activeSection === id;
          return (
            <a
              key={item}
              href={`#${id}`}
              className="relative text-[13px] px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{
                color:      active ? 'var(--t)' : 'var(--t2)',
                fontWeight: active ? 500 : 400,
                background: active ? 'var(--b)' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--b)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              {item}
              {active && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-px"
                  style={{ background: 'var(--t)' }}
                />
              )}
            </a>
          );
        })}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">

        {/* ── THEME TOGGLE ── */}
        <button
          className="theme-toggle-btn"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Auth section */}
        {user ? (
          <>
            {invitations.length > 0 && (
              <div className="relative group">
                <button
                  className="relative px-3 py-2 text-[13px] font-medium flex items-center gap-2 rounded-lg transition-colors"
                  style={{ color: 'var(--t)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--b)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  Invitations ({invitations.length})
                </button>
                <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]"
                    style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)' }}
                >
                  <div className="p-2 flex flex-col gap-1">
                    <div className="px-3 py-2 text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--t3)' }}>
                      Pending Invites
                    </div>
                    {invitations.map((inv) => (
                      <Link
                        key={inv.id}
                        href={`/auth/invite?token=${inv.token}`}
                        className="px-3 py-2 text-[13px] rounded-xl transition-colors block"
                        style={{ color: 'var(--dropdown-text)', border: '1px solid var(--dropdown-border)' }}
                      >
                        Join <span className="font-semibold">{inv.workspaces?.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="relative group">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center border font-bold text-sm focus:outline-none"
                style={{ background: 'var(--bg2)', borderColor: 'var(--b2)', color: 'var(--t2)' }}
              >
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </button>
              <div
                className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]"
                style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--dropdown-border)' }}
              >
                <div className="p-2">
                  <p className="px-3 py-2 text-[12px] font-medium truncate" style={{ color: 'var(--dropdown-text)' }}>
                    {user.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="px-3 pb-2 text-[11px] truncate" style={{ color: 'var(--dropdown-muted)', borderBottom: '1px solid var(--dropdown-border)' }}>
                    {user.email}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left mt-1 px-3 py-2 text-[13px] rounded-xl transition-colors"
                    style={{ color: 'var(--dropdown-text)' }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link
              href="/auth/signin"
              className="text-[13px] font-medium px-3 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--t2)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--t)';
                (e.currentTarget as HTMLElement).style.background = 'var(--b)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--t2)';
                (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup/selection"
              className="text-[13px] font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-87 hover:scale-[1.02] active:scale-95"
              style={{ background: 'var(--t)', color: 'var(--inv-t)' }}
            >
              Get Started
            </Link>
          </>
        )}
      </div>

      </div>

      {/* Marquee waiting bar */}
      {user && invitations.length === 0 && (
        <div
          className="absolute top-full left-0 right-0 text-[10px] py-1.5 overflow-hidden flex whitespace-nowrap z-40"
          style={{
            background: theme === 'dark' ? '#FFFFFF' : '#0C0C0C',
            color: theme === 'dark' ? '#0C0C0C' : '#FFFFFF',
            borderTop: theme === 'dark' ? '1px solid rgba(0,0,0,.08)' : '1px solid rgba(255,255,255,.08)',
          }}
        >
          <div className="animate-marquee inline-block font-medium tracking-[0.2em] uppercase">
            Waiting for workspace owner inviting you • Waiting for workspace owner inviting you • Waiting for workspace owner inviting you
          </div>
        </div>
      )}
    </nav>
  );
}