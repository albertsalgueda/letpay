'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatCents, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { token } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.listWallets(token).catch(() => ({ data: [] })),
      api.listApprovals(token).catch(() => ({ data: [] })),
    ]).then(async ([w, a]) => {
      setWallets(w.data);
      setApprovals(a.data);
      const allTx: any[] = [];
      for (const wallet of w.data.slice(0, 5)) {
        const txs = await api.listTransactions(wallet.id, token, { limit: 5 }).catch(() => ({ data: [] }));
        allTx.push(...(txs.data || []).map((t: any) => ({ ...t, walletName: wallet.name })));
      }
      allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(allTx.slice(0, 5));
      setLoading(false);
    });
  }, [token]);

  const totalBalance = wallets.reduce((s, w) => s + (w.balanceCents ?? w.balance_cents ?? 0), 0);
  const activeWallets = wallets.filter((w) => w.status === 'active').length;
  const monthlySpend = transactions.filter((t) => t.status === 'approved').reduce((s, t) => s + t.amountCents, 0);
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to LetPay. Manage your AI agent wallets.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Balance</h2>
          <p className="mt-2 text-3xl font-bold">{loading ? '--' : formatCents(totalBalance)}</p>
          <p className="mt-1 text-sm text-gray-500">Across all wallets</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Active Wallets</h2>
          <p className="mt-2 text-3xl font-bold">{loading ? '--' : activeWallets}</p>
          <p className="mt-1 text-sm text-gray-500">Virtual cards issued</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Monthly Spend</h2>
          <p className="mt-2 text-3xl font-bold">{loading ? '--' : formatCents(monthlySpend)}</p>
          <p className="mt-1 text-sm text-gray-500">This month</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Pending Approvals</h2>
          <p className="mt-2 text-3xl font-bold">{loading ? '--' : pendingApprovals}</p>
          <Link href="/dashboard/approvals" className="mt-1 text-sm text-blue-600 hover:underline">View all</Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">Recent Transactions</h2>
        {loading ? (
          <p className="mt-4 text-gray-500">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-gray-500">No transactions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-gray-600">{formatDate(tx.createdAt)}</td>
                    <td className="px-4 py-3">{tx.merchantName || '--'}</td>
                    <td className="px-4 py-3 font-medium">{formatCents(tx.amountCents)}</td>
                    <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{tx.walletName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    declined: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
