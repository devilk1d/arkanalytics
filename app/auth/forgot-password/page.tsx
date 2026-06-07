import { Suspense } from 'react';
import ForgotPasswordPage from './ForgotPasswordPage';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white text-gray-400 text-sm">
        Loading...
      </div>
    }>
      <ForgotPasswordPage />
    </Suspense>
  );
}
