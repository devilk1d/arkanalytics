'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import { createClient } from '@/lib/supabase/client';

type InviteContext = {
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  invitedEmail: string;
  roleToAssign: string;
  inviterName: string;
  inviteeExists: boolean;
  inviteeCanSignIn: boolean;
  inviteeName: string;
  inviteeArkaId: string | null;
};

type AuthUser = {
  id: string;
  email: string;
};

function getInitials(nameOrEmail: string) {
  const parts = nameOrEmail
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

// Step 1: Accept invitation card
function InviteCard({
  onJoin,
  invite,
  joinLabel,
}: {
  onJoin: () => void;
  invite: InviteContext;
  joinLabel: string;
}) {
  const inviteeInitials = useMemo(
    () => getInitials(invite.inviteeName || invite.invitedEmail),
    [invite.invitedEmail, invite.inviteeName],
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={28} height={28} />
          <span className="font-display font-semibold text-lg text-black">Arkanalytics</span>
        </div>

        {/* Person icon */}
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>

        <h1 className="font-display text-2xl font-bold text-black mb-3">Team Invitation</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          You have been invited by{' '}
          <span className="font-bold text-black">{invite.inviterName}</span>{' '}
          to join the{' '}
          <span className="font-bold text-black">{invite.workspaceName}</span>{' '}
          workspace.
        </p>

        {/* Invitee info card */}
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 mb-8 text-left">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold shrink-0">
            {inviteeInitials}
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-black">{invite.inviteeName}</p>
            <p className="text-xs text-gray-400">
              {invite.invitedEmail}
              {invite.inviteeArkaId ? ` (${invite.inviteeArkaId})` : ''}
            </p>
          </div>
        </div>

        <AuthButton onClick={onJoin}>{joinLabel}</AuthButton>
      </div>
    </div>
  );
}

// Step 2a: Register + join form (for NEW users coming via Supabase invite link)
// At this point the user already has an active session from the invite link's access_token.
// We only need them to set their name & password via updateUser — no signUp needed.
function InviteRegisterForm({
  invite,
  onSuccessJoin,
}: {
  invite: InviteContext;
  onSuccessJoin: (user: AuthUser) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!name.trim() || !password || !confirmPassword) {
      setError('Please complete all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    if (!agreed) {
      setError('You must agree to the terms before continuing.');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // The user already has a session from the Supabase invite link (access_token in URL hash).
    // We update their profile (name + password) instead of calling signUp.
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        full_name: name.trim(),
      },
    });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    if (!updateData.user || !updateData.user.email) {
      setLoading(false);
      setError('Failed to update account. Please try again.');
      return;
    }

    const joinError = await onSuccessJoin({ id: updateData.user.id, email: updateData.user.email });
    if (joinError) {
      setLoading(false);
      setError(joinError);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-12">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* Left: Invite summary */}
        <div className="p-10 border-r border-gray-100 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={24} height={24} />
            <span className="font-display font-semibold text-base text-black">Arkanalytics</span>
          </div>

          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>

          <h2 className="font-display text-xl font-bold text-black mb-3">Team Invitation</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            You have been invited by{' '}
            <span className="font-bold text-black">{invite.inviterName}</span>{' '}
            to join the{' '}
            <span className="font-bold text-black">{invite.workspaceName}</span>{' '}
            workspace.
          </p>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Terms */}
          <div className="flex items-center gap-2.5 mb-5">
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
            <span className="text-xs text-gray-500">
              I agree to the{' '}
              <Link href="#" className="font-bold text-black hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="#" className="font-bold text-black hover:underline">Privacy Policy</Link>
            </span>
          </div>

          <AuthButton onClick={handleSubmit} loading={loading}>
            Join Workspace
          </AuthButton>
        </div>

        {/* Right: Arka ID form */}
        <div className="p-10">
          <h2 className="font-display text-2xl font-bold text-black mb-1">Create Your Arka ID</h2>
          <p className="text-sm text-gray-400 mb-8">
            Your single identity for all ArkaAnalytics teams.
          </p>

          <div className="flex flex-col gap-4">
            <AuthInput
              label="Full Name"
              placeholder="Your name"
              value={name}
              onChange={setName}
            />
            <AuthInput
              label="Email Address"
              type="email"
              value={invite.invitedEmail}
              readOnly
              prefilled
              hint="This email was invited by your team"
            />
            <AuthInput
              label="Password"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={setPassword}
              hint="Must be at least 8 characters"
            />
            <AuthInput
              label="Confirm Password"
              type="password"
              placeholder="••••••••••"
              value={confirmPassword}
              onChange={setConfirmPassword}
              hint="Must be at least 8 characters"
            />
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'card' | 'form'>('card');
  const [invite, setInvite] = useState<InviteContext | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const loadInviteContext = async () => {
      setLoading(true);
      setError('');

      if (!token) {
        setLoading(false);
        setError('Invitation token is missing from URL.');
        return;
      }

      const supabase = createClient();

      // IMPORTANT: When a new user clicks the Supabase invite email link, they land here
      // with #access_token in the URL hash. Supabase client automatically picks up that
      // session. We need to wait for the session to be established before calling getUser.
      // onAuthStateChange fires once the hash is consumed and session is set.
      const sessionUser = await new Promise<AuthUser | null>((resolve) => {
        // Check if there's already an active session first
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.email) {
            resolve({ id: session.user.id, email: session.user.email });
          } else {
            // No existing session — listen for the invite link token exchange
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
              subscription.unsubscribe();
              if (newSession?.user?.email) {
                resolve({ id: newSession.user.id, email: newSession.user.email });
              } else {
                resolve(null);
              }
            });

            // Timeout fallback: if no auth event fires within 2s, proceed as unauthenticated
            setTimeout(() => {
              subscription.unsubscribe();
              resolve(null);
            }, 2000);
          }
        });
      });

      const { data: inviteData, error: inviteError } = await supabase.rpc(
        'get_workspace_invitation_context',
        { p_token: token },
      );

      if (inviteError) {
        setLoading(false);
        setError(inviteError.message);
        return;
      }

      if (!inviteData?.success) {
        setLoading(false);
        setError(inviteData?.error || 'Invitation is invalid.');
        return;
      }

      const nextInvite: InviteContext = {
        invitationId: inviteData.invitation_id,
        workspaceId: inviteData.workspace_id,
        workspaceName: inviteData.workspace_name,
        invitedEmail: inviteData.invited_email,
        roleToAssign: inviteData.role_to_assign,
        inviterName: inviteData.inviter_name,
        inviteeExists: Boolean(inviteData.invitee_exists),
        // A Supabase-invited user exists in auth.users but cannot sign in with password yet.
        // Only treat as "can sign in" if they truly have a confirmed account.
        inviteeCanSignIn: Boolean(inviteData.invitee_can_sign_in),
        inviteeName: inviteData.invitee_name,
        inviteeArkaId: inviteData.invitee_arka_id,
      };

      setInvite(nextInvite);
      setAuthUser(sessionUser);
      setLoading(false);
    };

    void loadInviteContext();
  }, [token]);

  const acceptInvitation = async (user: AuthUser): Promise<string | null> => {
    if (!invite || !token) return 'Invitation token is missing.';

    const supabase = createClient();
    const { data, error: acceptError } = await supabase.rpc('accept_workspace_invitation_v2', {
      p_token: token,
      p_user_id: user.id,
      p_user_email: user.email,
    });

    if (acceptError) {
      return acceptError.message;
    }

    if (data?.success === false) {
      return data.error || 'Failed to accept invitation.';
    }

    await supabase.from('users')
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq('id', user.id);

    router.push('/dashboard/overview');
    router.refresh();
    return null;
  };

  const handleJoin = async () => {
    if (!invite || !token) return;

    // Case 1: User is already signed in
    if (authUser) {
      if (authUser.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
        setError(`You are signed in as ${authUser.email}. Please sign in with ${invite.invitedEmail} to continue.`);
        return;
      }

      const acceptError = await acceptInvitation(authUser);
      if (acceptError) {
        setError(acceptError);
      }
      return;
    }

    // Case 2: User has an existing confirmed account → redirect to sign in
    if (invite.inviteeCanSignIn) {
      router.push(`/auth/signin?redirectTo=${encodeURIComponent(`/auth/invite?token=${token}`)}`);
      return;
    }

    // Case 3: New user (or invited-but-unconfirmed) → show register form.
    // The user must have clicked the invite email link so they have a session.
    // InviteRegisterForm will use updateUser (not signUp) to set name + password.
    setStep('form');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 w-full max-w-md text-center">
          <p className="text-sm text-gray-500">Loading invitation…</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 w-full max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-black mb-3">Invitation Error</h1>
          <p className="text-sm text-red-600">{error || 'Invitation is not available.'}</p>
          <div className="mt-6">
            <Link href="/auth/signin" className="text-sm font-semibold text-black hover:underline">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // For the join button label:
  // - If already signed in → "Join Workspace"
  // - If existing confirmed user → "Sign In to Join"
  // - If new user (came via invite link, has session) → "Join Workspace"
  const joinLabel = authUser
    ? 'Join Workspace'
    : invite.inviteeCanSignIn
      ? 'Sign In to Join'
      : 'Join Workspace';

  return (
    <div
      key={step}
      className="opacity-0"
      style={{
        animation: 'fadeIn 0.4s ease forwards',
      }}
    >
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0); } }`}</style>
      {step === 'card' ? (
        <>
          <InviteCard onJoin={() => { void handleJoin(); }} invite={invite} joinLabel={joinLabel} />
          {error ? (
            <div className="fixed bottom-5 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-6">
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>
            </div>
          ) : null}
        </>
      ) : (
        <InviteRegisterForm
          invite={invite}
          onSuccessJoin={async (user) => {
            setAuthUser(user);
            return acceptInvitation(user);
          }}
        />
      )}
    </div>
  );
}