"use client";

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]" style={{ transition: 'background .35s' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 relative animate-in fade-in duration-500 ease-in-out">
          {children}
        </main>
      </div>
    </div>
  );
}