'use client';

interface AuthButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'black' | 'white';
  loading?: boolean;
}

export default function AuthButton({
  children,
  onClick,
  type = 'button',
  variant = 'black',
  loading = false,
}: AuthButtonProps) {
  const base = 'w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 active:scale-95 hover:scale-[1.01] flex items-center justify-center gap-2';
  const styles = {
    black: 'bg-black text-white hover:bg-gray-800',
    white: 'bg-white text-black border border-gray-200 hover:border-black',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`font-display ${base} ${styles[variant]} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {loading && (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
          <path d="M21 12a9 9 0 00-9-9" />
        </svg>
      )}
      {children}
    </button>
  );
}
