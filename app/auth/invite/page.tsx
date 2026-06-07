import InvitePage from './InvitePage';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--t2)] text-sm">Loading invitation...</div>}>
      <InvitePage />
    </Suspense>
  );
}
