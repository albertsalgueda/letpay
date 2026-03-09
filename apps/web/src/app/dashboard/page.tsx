'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';
import { formatCents } from '@/lib/utils';

export default function DashboardPage() {
  const { token, loading: authLoading } = useAccessToken();
  const [wallets, setWallets] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.listWallets(token).catch(() => ({ data: [] })),
      api.listApprovals(token).catch(() => ({ data: [] })),
    ]).then(([w, a]) => {
      setWallets(w.data);
      setApprovals(a.data);
      setLoading(false);
    });
  }, [token]);

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance_cents ?? 0), 0);
  const activeWallets = wallets.filter((w) => w.status === 'active').length;

  if (authLoading || loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to LetPay. Manage your AI agent wallets.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Balance</h2>
          <p className="mt-2 text-3xl font-bold">{formatCents(totalBalance)}</p>
          <p className="mt-1 text-sm text-gray-500">Across all wallets</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Active Wallets</h2>
          <p className="mt-2 text-3xl font-bold">{activeWallets}</p>
          <p className="mt-1 text-sm text-gray-500">Virtual cards issued</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Pending Approvals</h2>
          <p className="mt-2 text-3xl font-bold">{approvals.length}</p>
          <Link href="/dashboard/approvals" className="mt-1 text-sm text-blue-600 hover:underline">View all</Link>
        </div>
      </div>
    </div>
  );
}
