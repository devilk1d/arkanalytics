'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import QuoteSidebar from '../../components/auth/QuoteSidebar';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrengthHint, usePasswordValidation } from '../../components/auth/PasswordStrengthHint';

type PageStatus = 'loading' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const supabase      = createClient();

  const [status, setStatus]                   = useState<PageStatus>('loading');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const { isValid: passwordValid } = usePasswordValidation(password);

  // The Supabase browser client (createBrowserClient) automatically detects
  // and exchanges the PKCE ?code= param from the URL on initialisation.
  // Calling exchangeCodeForSession() manually would fail because the code
  // is already consumed. Instead we listen to onAuthStateChange and wait
  // for SIGNED_IN / PASSWORD_RECOVERY, with a timeout fallback.
  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setStatus('invalid');
      return;
    }

    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (settled) return;
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
          settled = true;
          setStatus('ready');
        }
      }
    );

    // Fallback: if the auth event hasn't fired after 4 s, check the session
    // directly (handles cases where the event fires before we subscribe).
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      const { data: { session } } = await supabase.auth.getSession();
      setStatus(session ? 'ready' : 'invalid');
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (!passwordValid) {
      setError('Password must meet all requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setStatus('success');
      // Sign out so the user has a clean session, then redirect to sign in
      await supabase.auth.signOut();
      setTimeout(() => router.push('/auth/signin'), 2500);
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

        <div className="flex-1 flex items-center justify-center px-8 lg:px-0">
          <div className="w-full max-w-sm">

            {/* ── Loading state ── */}
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <svg className="animate-spin text-gray-300" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p className="text-sm text-gray-400">Verifying your reset link… please wait</p>
              </div>
            )}

            {/* ── Invalid / expired link ── */}
            {status === 'invalid' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-bold text-black mb-2">Link Expired</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  This password reset link is invalid or has already expired. Please request a new one.
                </p>
                <Link
                  href="/auth/forgot-password"
                  className="w-full py-4 rounded-2xl font-semibold text-sm bg-black text-white hover:bg-gray-800 flex items-center justify-center transition-all duration-300 font-display"
                >
                  Request New Link
                </Link>
                <Link
                  href="/auth/signin"
                  className="mt-4 text-sm font-semibold text-gray-400 hover:text-black transition-colors duration-200"
                >
                  ← Back to Sign In
                </Link>
              </div>
            )}

            {/* ── Success state ── */}
            {status === 'success' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-bold text-black mb-2">Password Updated</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Your password has been reset successfully. Redirecting you to sign in…
                </p>
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full animate-[progress_2.5s_linear_forwards]" />
                </div>
              </div>
            )}

            {/* ── Form state ── */}
            {status === 'ready' && (
              <>
                <h1 className="font-display text-3xl font-bold text-black mb-1">
                  Reset Password
                </h1>
                <p className="text-gray-400 text-sm mb-10 leading-relaxed">
                  Enter a new password for your account.
                </p>

                <div className="flex flex-col gap-4 mb-8">
                  <AuthInput
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    hint={<PasswordStrengthHint password={password} />}
                  />
                  <AuthInput
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />
                </div>

                <AuthButton onClick={handleSubmit} loading={loading}>
                  Set New Password
                </AuthButton>

                {error && (
                  <p className="mt-3 text-sm text-red-600">{error}</p>
                )}

                <p className="text-sm text-gray-400 text-center mt-6">
                  Remembered it?{' '}
                  <Link href="/auth/signin" className="font-bold text-black hover:underline">
                    Sign In
                  </Link>
                </p>
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
