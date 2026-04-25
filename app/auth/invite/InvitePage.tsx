'use client';

import { Inter, Space_Grotesk } from 'next/font/google';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';

const inter = Inter({ subsets: ['latin'] });
const sg = Space_Grotesk({ subsets: ['latin'] });

// The invitation details (in real app would come from URL params / API)
const INVITE = {
  inviterName: 'Jack Foster',
  workspaceName: 'Telvora Co.',
  inviteeEmail: 'herrens@telvora.com',
  inviteeName: 'Arkan Foster',
  inviteeInitials: 'AF',
  inviteeArkaId: 'ARK-998',
};

// Step 1: Accept invitation card
function InviteCard({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={28} height={28} />
          <span className={`${sg.className} font-semibold text-lg text-black`}>Arkanalytics</span>
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

        <h1 className={`${sg.className} text-2xl font-bold text-black mb-3`}>Team Invitation</h1>
        <p className={`${inter.className} text-sm text-gray-500 leading-relaxed mb-8`}>
          You have been invited by{' '}
          <span className="font-bold text-black">{INVITE.inviterName}</span>{' '}
          to join the{' '}
          <span className="font-bold text-black">{INVITE.workspaceName}</span>{' '}
          workspace.
        </p>

        {/* Invitee info card */}
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3 mb-8 text-left">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold shrink-0">
            {INVITE.inviteeInitials}
          </div>
          <div>
            <p className={`${sg.className} text-sm font-semibold text-black`}>{INVITE.inviteeName}</p>
            <p className={`${inter.className} text-xs text-gray-400`}>
              {INVITE.inviteeEmail} ({INVITE.inviteeArkaId})
            </p>
          </div>
        </div>

        <AuthButton onClick={onJoin}>Join Workspace</AuthButton>
      </div>
    </div>
  );
}

// Step 2: Register + join form
function InviteRegisterForm({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-12">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* Left: Invite summary */}
        <div className="p-10 border-r border-gray-100 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <Image src="/images/logo_arka_hitam.png" alt="Arkanalytics" width={24} height={24} />
            <span className={`${sg.className} font-semibold text-base text-black`}>Arkanalytics</span>
          </div>

          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>

          <h2 className={`${sg.className} text-xl font-bold text-black mb-3`}>Team Invitation</h2>
          <p className={`${inter.className} text-sm text-gray-500 leading-relaxed mb-8`}>
            You have been invited by{' '}
            <span className="font-bold text-black">{INVITE.inviterName}</span>{' '}
            to join the{' '}
            <span className="font-bold text-black">{INVITE.workspaceName}</span>{' '}
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
            <span className={`${inter.className} text-xs text-gray-500`}>
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
          <h2 className={`${sg.className} text-2xl font-bold text-black mb-1`}>Create Your Arka ID</h2>
          <p className={`${inter.className} text-sm text-gray-400 mb-8`}>
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
              value={INVITE.inviteeEmail}
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
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  const [step, setStep] = useState<'card' | 'form'>('card');

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
        <InviteCard onJoin={() => setStep('form')} />
      ) : (
        <InviteRegisterForm onBack={() => setStep('card')} />
      )}
    </div>
  );
}
