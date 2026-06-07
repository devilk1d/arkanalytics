'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLogo from '../../../components/auth/AuthLogo';
import AuthInput from '../../../components/auth/AuthInput';
import AuthSelect from '../../../components/auth/AuthDropdown';
import AuthButton from '../../../components/auth/AuthButton';
import StepIndicator from '../../../components/auth/StepIndicator';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrengthHint, usePasswordValidation } from '../../../components/auth/PasswordStrengthHint';

type WorkspaceDraft = {
  company: string;
  sector: string;
  email: string;
  scale: string;
};

const WORKSPACE_DRAFT_KEY = 'pending_workspace_draft';

/* ─── Step 1 ─── */
function WorkspaceStep({
  draft,
  onNext,
}: {
  draft: WorkspaceDraft;
  onNext: (draft: WorkspaceDraft) => void;
}) {
  const [company, setCompany] = useState(draft.company);
  const [sector, setSector] = useState(draft.sector);
  const [email, setEmail] = useState(draft.email);
  const [scale, setScale] = useState(draft.scale);
  const [errorMessage, setErrorMessage] = useState('');

  const sectors = [
  { label: 'Telecommunication', value: 'telecommunication' },
  { label: 'SaaS / Software', value: 'saas' },
  { label: 'Fintech', value: 'fintech' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'E-Commerce', value: 'ecommerce' },
  { label: 'Education', value: 'education' },
  { label: 'Other', value: 'other' },
];
  const scales = [
    { label: '0 - 50', value: '0 - 50' },
    { label: '51 - 200', value: '51 - 200' },
    { label: '201 - 500', value: '201 - 500' },
    { label: '501 - 1000', value: '501 - 1000' },
    { label: '1000+', value: '1000+' }
  ];

  const handleNext = () => {
    const nextDraft: WorkspaceDraft = {
      company: company.trim(),
      sector,
      email: email.trim(),
      scale,
    };

    if (!nextDraft.company || !nextDraft.sector || !nextDraft.email || !nextDraft.scale) {
      setErrorMessage('Please complete all workspace fields before continuing.');
      return;
    }

    setErrorMessage('');
    onNext(nextDraft);
  };

  return (
    <div className="w-full max-w-xl">
      <h1 className="font-display text-3xl font-bold text-black mb-1">Configure Workspace</h1>
      <p className="text-gray-400 text-sm mb-8">Setup the operational core for your team.</p>

      <StepIndicator
        steps={[
          { label: 'Workspace', status: 'active' },
          { label: 'Arka ID', status: 'pending' },
        ]}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-8">
        <AuthInput
          label="Legal Entity"
          placeholder="Company Name"
          value={company}
          onChange={setCompany}
        />
        <AuthSelect
          label="Industry Sector"
          options={sectors}
          value={sector}
          onChange={setSector}
        />
        <AuthInput
          label="Support Email"
          type="email"
          placeholder="support@company.com"
          value={email}
          onChange={setEmail}
        />
        <AuthSelect
          label="Team Scale"
          options={scales}
          value={scale}
          onChange={setScale}
        />
      </div>

      <AuthButton onClick={handleNext}>Next</AuthButton>
      {errorMessage ? (
        <p className="mt-3 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/* ─── Step 2 ─── */
function ArkaIDStep({
  workspaceDraft,
  onBack,
}: {
  workspaceDraft: WorkspaceDraft;
  onBack: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { isValid: passwordValid } = usePasswordValidation(password);

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage('Please complete all account fields.');
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

    const pendingDraft = {
      company: workspaceDraft.company,
      sector: workspaceDraft.sector,
      email: workspaceDraft.email,
      scale: workspaceDraft.scale,
    };

    localStorage.setItem(WORKSPACE_DRAFT_KEY, JSON.stringify(pendingDraft));

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

    if (error) {
      localStorage.removeItem(WORKSPACE_DRAFT_KEY);
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setSuccessMessage('Account created. Verify your email, then sign in. Workspace akan otomatis dibuat setelah login.');
      return;
    }

    const ownerUserId = data.session.user.id;

    const { error: workspaceError } = await supabase.from('workspaces').insert({
      name: workspaceDraft.company,
      industry_sector: workspaceDraft.sector,
      support_email: workspaceDraft.email,
      team_scale: workspaceDraft.scale,
      owner_user_id: ownerUserId,
    });

    setLoading(false);

    if (workspaceError) {
      setErrorMessage(workspaceError.message);
      return;
    }

    localStorage.removeItem(WORKSPACE_DRAFT_KEY);

    router.push('/dashboard/overview');
    router.refresh();
  };

  return (
    <div className="w-full max-w-xl">
      {/* Header row with back button */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="font-display text-3xl font-bold text-black">Create Your Arka ID</h1>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shrink-0 transition-all duration-200 hover:scale-110 hover:bg-gray-800 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-8">Setup the operational core for your team.</p>

      <StepIndicator
        steps={[
          { label: 'Workspace', status: 'done' },
          { label: 'Arka ID', status: 'active' },
        ]}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-5">
        <AuthInput label="Full Name" placeholder="Your name" value={name} onChange={setName} />
        <AuthInput label="Password" type="password" placeholder="••••••••••" value={password} onChange={setPassword} hint={<PasswordStrengthHint password={password} />} />
        <AuthInput label="Email Address" type="email" placeholder="john@company.com" value={email} onChange={setEmail} />
        <AuthInput label="Confirm Password" type="password" placeholder="••••••••••" value={confirmPassword} onChange={setConfirmPassword} />
      </div>

      {/* Terms — right side aligned like design */}
      <div className="flex items-center gap-2.5 mb-6 justify-end">
        <button
          type="button"
          onClick={() => setAgreed(!agreed)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 shrink-0
            ${agreed ? 'bg-black border-black' : 'border-gray-300 hover:border-black'}`}
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
        Create My Workspace
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
    </div>
  );
}

/* ─── Page shell ─── */
export default function ConfigureWorkspacePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>({
    company: '',
    sector: '',
    email: '',
    scale: '',
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Logo — pinned top-left */}
      <div className="absolute top-8 left-8 lg:left-12 z-10">
        <AuthLogo />
      </div>

      {/* Form — vertically & horizontally centered */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-0">
        <div
          key={step}
          style={{ animation: 'fadeInUp 0.35s ease forwards' }}
        >
          {step === 1
            ? (
              <WorkspaceStep
                draft={workspaceDraft}
                onNext={(nextDraft) => {
                  setWorkspaceDraft(nextDraft);
                  setStep(2);
                }}
              />
            )
            : <ArkaIDStep workspaceDraft={workspaceDraft} onBack={() => setStep(1)} />
          }
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
