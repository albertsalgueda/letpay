'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/lib/auth-context';
import { DashboardProvider, useDashboard } from '@/lib/dashboard-context';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { wallets, activeWalletId, selectWallet, setShowCreateModal } = useDashboard();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        wallets={wallets}
        activeWalletId={activeWalletId}
        onSelectWallet={selectWallet}
        onCreateWallet={() => setShowCreateModal(true)}
      />
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
