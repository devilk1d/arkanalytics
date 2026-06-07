'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLogo from '../../../components/auth/AuthLogo';
import AuthInput from '../../../components/auth/AuthInput';
import AuthButton from '../../../components/auth/AuthButton';
import QuoteSidebar from '../../../components/auth/QuoteSidebar';
import { PasswordStrengthHint, usePasswordValidation } from '../../../components/auth/PasswordStrengthHint';
import { createClient } from '@/lib/supabase/client';

export default function CreateArkaIDPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { hasLength, hasUpper, hasLower, hasNumber, isValid: passwordValid } = usePasswordValidation(password);
  const passwordHint = <PasswordStrengthHint password={password} />;

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage('Please complete all fields.');
      return;
    }

    if (!passwordValid) {
      setErrorMessage('Password must meet all requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    if (!agreed) {
      setErrorMessage('You must agree to the terms before continuing.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setSuccessMessage('Account created. Please verify your email, then sign in.');
      return;
    }

    router.push('/');
    router.refresh();
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
          <div className="w-full max-w-md">

            <h1 className="font-display text-3xl font-bold text-black mb-1">
              Create Your Arka ID
            </h1>
            <p className="text-gray-400 text-sm mb-10">
              Your single identity for all ArkaAnalytics teams.
            </p>

            {/* 2-col grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-5">
              <AuthInput
                label="Full Name"
                placeholder="Your name"
                value={name}
                onChange={setName}
              />
              <AuthInput
                label="Password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={setPassword}
                hint={passwordHint}
              />
              <AuthInput
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={setEmail}
              />
              <AuthInput
                label="Confirm Password"
                type="password"
                placeholder="••••••••••"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>

            {/* Terms — right-aligned like design */}
            <div className="flex items-center gap-2.5 mb-6">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 shrink-0
                  ${agreed ? 'bg-black border-black' : 'border-gray-300 bg-white hover:border-black'}`}
              >
                {agreed && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-gray-500">
                I agree to the{' '}
                <Link href="#" className="font-bold text-black hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" className="font-bold text-black hover:underline">Privacy Policy</Link>
              </span>
            </div>

            <AuthButton onClick={handleSubmit} loading={loading}>
              Create Arka ID
            </AuthButton>

            {errorMessage ? (
              <p className="mt-3 text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="mt-3 text-sm text-green-700">
                {successMessage}
              </p>
            ) : null}

            <p className="text-sm text-gray-400 text-center mt-6">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-bold text-black hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Right quote sidebar ── */}
      <QuoteSidebar
        quote='"Unified identity across multiple workspaces makes our consulting workflow seamless."'
        author="Klish, Telvora CRM Team"
      />
    </div>
  );
}
