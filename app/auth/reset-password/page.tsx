import { Suspense } from 'react';
import ResetPasswordPage from './ResetPasswordPage';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white text-gray-400 text-sm">
        Verifying reset link…
      </div>
    }>
      <ResetPasswordPage />
    </Suspense>
  );
}
