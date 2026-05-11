"use client";

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useDashboardContext } from '../context/DashboardContext';

interface DashboardLayoutProps {
  children: ReactNode;
  workspace?: string;
  page: string;
}

export default function DashboardLayout({
  children,
  page,
}: DashboardLayoutProps) {
  return <DashboardShell page={page}>{children}</DashboardShell>;
}

function DashboardShell({
  children,
  page,
}: {
  children: ReactNode;
  page: string;
}) {
  const { workspace } = useDashboardContext();
  const workspaceName = workspace?.name || 'Workspace';
  const workspaceLogo = workspace?.logoUrl ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar workspace={workspaceName} logoUrl={workspaceLogo} page={page} />
        <main className="flex-1 overflow-y-auto p-6 relative animate-in fade-in duration-500 ease-in-out">
          {children}
        </main>
      </div>
    </div>
  );
}