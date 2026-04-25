'use client';

import { Inter, Space_Grotesk } from 'next/font/google';
import { useState } from 'react';
import Link from 'next/link';
import AuthLogo from '../../../components/auth/AuthLogo';
import AuthInput from '../../../components/auth/AuthInput';
import AuthSelect from '../../../components/auth/AuthDropdown';
import AuthButton from '../../../components/auth/AuthButton';
import StepIndicator from '../../../components/auth/StepIndicator';

const inter = Inter({ subsets: ['latin'] });
const sg = Space_Grotesk({ subsets: ['latin'] });

/* ─── Step 1 ─── */
function WorkspaceStep({ onNext }: { onNext: () => void }) {
  const [company, setCompany] = useState('');
  const [sector, setSector] = useState('');
  const [email, setEmail] = useState('');
  const [scale, setScale] = useState('');

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

  return (
    <div className="w-full max-w-xl">
      <h1 className={`${sg.className} text-3xl font-bold text-black mb-1`}>Configure Workspace</h1>
      <p className={`${inter.className} text-gray-400 text-sm mb-8`}>Setup the operational core for your team.</p>

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

      <AuthButton onClick={onNext}>Next</AuthButton>
    </div>
  );
}

/* ─── Step 2 ─── */
function ArkaIDStep({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-xl">
      {/* Header row with back button */}
      <div className="flex items-start justify-between mb-1">
        <h1 className={`${sg.className} text-3xl font-bold text-black`}>Create Your Arka ID</h1>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shrink-0 transition-all duration-200 hover:scale-110 hover:bg-gray-800 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
      <p className={`${inter.className} text-gray-400 text-sm mb-8`}>Setup the operational core for your team.</p>

      <StepIndicator
        steps={[
          { label: 'Workspace', status: 'done' },
          { label: 'Arka ID', status: 'active' },
        ]}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-5">
        <AuthInput label="Full Name" placeholder="Your name" value={name} onChange={setName} />
        <AuthInput label="Password" type="password" placeholder="••••••••••" value={password} onChange={setPassword} hint="Must be at least 8 characters" />
        <AuthInput label="Email Address" type="email" placeholder="john@company.com" value={email} onChange={setEmail} />
        <AuthInput label="Confirm Password" type="password" placeholder="••••••••••" value={confirmPassword} onChange={setConfirmPassword} hint="Must be at least 8 characters" />
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
        <span className={`${inter.className} text-sm text-gray-500`}>
          I agree to the{' '}
          <Link href="#" className="font-bold text-black hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="#" className="font-bold text-black hover:underline">Privacy Policy</Link>
        </span>
      </div>

      <AuthButton onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 2000); }} loading={loading}>
        Create My Workspace
      </AuthButton>
    </div>
  );
}

/* ─── Page shell ─── */
export default function ConfigureWorkspacePage() {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className={`${inter.className} min-h-screen bg-white flex flex-col`}>

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
            ? <WorkspaceStep onNext={() => setStep(2)} />
            : <ArkaIDStep onBack={() => setStep(1)} />
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
