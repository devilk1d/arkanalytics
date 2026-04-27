'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLogo from '../../components/auth/AuthLogo';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import QuoteSidebar from '../../components/auth/QuoteSidebar';
import { createClient } from '@/lib/supabase/client';

type PendingWorkspaceDraft = {
  company: string;
  sector: string;
  email: string;
  scale: string;
};

const WORKSPACE_DRAFT_KEY = 'pending_workspace_draft';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const signedInUserId = data.user?.id;
    const rawDraft = localStorage.getItem(WORKSPACE_DRAFT_KEY);

    if (signedInUserId && rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as PendingWorkspaceDraft;
        if (draft.company && draft.sector && draft.email && draft.scale) {
          const { error: workspaceError } = await supabase.from('workspaces').insert({
            name: draft.company,
            industry_sector: draft.sector,
            support_email: draft.email,
            team_scale: draft.scale,
            owner_user_id: signedInUserId,
          });

          if (workspaceError) {
            setLoading(false);
            setErrorMessage(`Login berhasil, tapi create workspace gagal: ${workspaceError.message}`);
            return;
          }
        }

        localStorage.removeItem(WORKSPACE_DRAFT_KEY);
      } catch {
        localStorage.removeItem(WORKSPACE_DRAFT_KEY);
      }
    }

    setLoading(false);

    router.push('/dashboard/overview');
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
          <div className="w-full max-w-sm">

            <h1 className="font-display text-3xl font-bold text-black mb-1">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm mb-10">
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
                  <label className="text-xs font-semibold tracking-widest uppercase text-gray-500">
                    Password
                  </label>
                  <Link
                    href="#"
                    className="font-display text-xs font-semibold tracking-widest uppercase text-gray-400 hover:text-black transition-colors duration-200"
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

            {errorMessage ? (
              <p className="mt-3 text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <p className="text-sm text-gray-400 text-center mt-6">
              Don&apos;t have an Arka ID yet?{' '}
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
