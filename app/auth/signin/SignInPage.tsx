'use client';

import { Inter, Space_Grotesk } from 'next/font/google';
import { useState } from 'react';
import Link from 'next/link';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import QuoteSidebar from '../../components/auth/QuoteSidebar';

const inter = Inter({ subsets: ['latin'] });
const sg = Space_Grotesk({ subsets: ['latin'] });

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="relative flex-1 flex flex-col bg-white">

        {/* Logo — pinned top-left */}
        <div className="absolute top-8 left-8 lg:left-12">
          <AuthLogo />
        </div>

        {/* Form — truly centered in the panel */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-0">
          <div className="w-full max-w-sm">

            <h1 className={`${sg.className} text-3xl font-bold text-black mb-1`}>
              Welcome Back
            </h1>
            <p className={`${inter.className} text-gray-400 text-sm mb-10`}>
              Access your analytics workspace and predictive insights.
            </p>

            <div className="flex flex-col gap-4 mb-8">
              <AuthInput
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={setEmail}
              />

              {/* Password with inline Forgot link */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className={`${inter.className} text-xs font-semibold tracking-widest uppercase text-gray-500`}>
                    Password
                  </label>
                  <Link
                    href="#"
                    className={`${sg.className} text-xs font-semibold tracking-widest uppercase text-gray-400 hover:text-black transition-colors duration-200`}
                  >
                    Forgot ?
                  </Link>
                </div>
                <AuthInput
                  label=""
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                />
              </div>
            </div>

            <AuthButton onClick={handleSubmit} loading={loading}>
              Sign In
            </AuthButton>

            <p className={`${inter.className} text-sm text-gray-400 text-center mt-6`}>
              Don't have an Arka ID yet?{' '}
              <Link href="/auth/signup/selection" className="font-bold text-black hover:underline">
                Register now
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right quote sidebar ── */}
      <QuoteSidebar
        quote="&quot;Predict Early, Retain Better isn't just our slogan; its the foundation of our revenue growth strategy.&quot;"
        author="Naufal, Founder Arka"
      />
    </div>
  );
}
