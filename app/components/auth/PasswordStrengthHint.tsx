'use client';

// ── Reusable password strength checklist ──────────────────────────────────────
// Used on all pages that contain a "create/reset password" form so the
// validation rules are defined in one place.

interface Requirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthHintProps {
  password: string;
}

export function PasswordStrengthHint({ password }: PasswordStrengthHintProps) {
  const reqs: Requirement[] = [
    { label: '8+ characters',    met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number',           met: /[0-9]/.test(password) },
  ];

  return (
    <ul className="mt-1.5 space-y-1">
      {reqs.map((req, i) => (
        <li
          key={i}
          className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
            req.met ? 'text-green-600 font-medium' : 'text-gray-400'
          }`}
        >
          {req.met ? (
            <svg
              width="13" height="13"
              viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <span className="w-3 h-3 rounded-full border border-gray-400 inline-block shrink-0" />
          )}
          {req.label}
        </li>
      ))}
    </ul>
  );
}

// ── Hook: derive validation state from a password string ──────────────────────
export function usePasswordValidation(password: string) {
  const hasLength = password.length >= 8;
  const hasUpper  = /[A-Z]/.test(password);
  const hasLower  = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isValid   = hasLength && hasUpper && hasLower && hasNumber;
  return { hasLength, hasUpper, hasLower, hasNumber, isValid };
}
