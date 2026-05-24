'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import QuoteSidebar from '../../components/auth/QuoteSidebar';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
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

            {sent ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h1 className="font-display text-3xl font-bold text-black mb-2">
                  Check your email
                </h1>
                <p className="text-gray-400 text-sm mb-2 leading-relaxed">
                  We sent a password reset link to
                </p>
                <p className="text-black font-semibold text-sm mb-8">{email}</p>
                <p className="text-gray-400 text-xs mb-8 leading-relaxed max-w-xs">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <Link
                  href="/auth/signin"
                  className="text-sm font-semibold text-gray-400 hover:text-black transition-colors duration-200"
                >
                  ← Back to Sign In
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                {/* Back link */}
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-gray-400 hover:text-black transition-colors duration-200 mb-8"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to Sign In
                </Link>

                <h1 className="font-display text-3xl font-bold text-black mb-1">
                  Forgot Password
                </h1>
                <p className="text-gray-400 text-sm mb-10 leading-relaxed">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>

                <div className="flex flex-col gap-4 mb-8">
                  <AuthInput
                    label="Email Address"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={setEmail}
                  />
                </div>

                <AuthButton onClick={handleSubmit} loading={loading}>
                  Send Reset Link
                </AuthButton>

                {error && (
                  <p className="mt-3 text-sm text-red-600">{error}</p>
                )}
              </>
            )}
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
