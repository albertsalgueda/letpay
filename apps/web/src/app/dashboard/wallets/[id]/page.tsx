'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';
import { formatCents, formatDate, cn } from '@/lib/utils';

export default function WalletDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAccessToken();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [showTopup, setShowTopup] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([
      api.getWallet(id, token),
      api.listTransactions(id, token).catch(() => ({ data: [] })),
    ]).then(([w, t]) => {
      setWallet(w);
      setTransactions(t.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token, id]);

  const handleFreeze = async () => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      if (wallet.status === 'active') {
        await api.freezeWallet(id, token);
      } else {
        await api.unfreezeWallet(id, token);
      }
      const updated = await api.getWallet(id, token);
      setWallet(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!token || !id || !topupAmount) return;
    setActionLoading(true);
    try {
      const res = await api.topup(id, Math.round(parseFloat(topupAmount) * 100), token);
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch {
      // handle error silently
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Wallet Details</h1>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Wallet not found</h1>
        <button onClick={() => router.push('/dashboard/wallets')} className="mt-4 text-blue-600 hover:underline">
          Back to wallets
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{wallet.name ?? 'Wallet'}</h1>
      <p className="mt-1 text-sm text-gray-500">ID: {id}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Balance</h2>
          <p className="mt-2 text-3xl font-bold">{formatCents(wallet.balance_cents ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Card Status</h2>
          <p className={cn('mt-2 text-lg font-medium', wallet.status === 'active' ? 'text-green-600' : 'text-gray-500')}>
            {wallet.status}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => setShowTopup(!showTopup)}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition"
        >
          Top Up
        </button>
        <button
          onClick={handleFreeze}
          disabled={actionLoading}
          className={cn(
            'rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50',
            wallet.status === 'active'
              ? 'border-red-300 text-red-600 hover:bg-red-50'
              : 'border-green-300 text-green-600 hover:bg-green-50',
          )}
        >
          {wallet.status === 'active' ? 'Freeze' : 'Unfreeze'}
        </button>
      </div>

      {showTopup && (
        <div className="mt-4 flex items-center gap-3 max-w-sm">
          <input
            type="number"
            placeholder="Amount (e.g. 50.00)"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            min="1"
            step="0.01"
          />
          <button
            onClick={handleTopup}
            disabled={actionLoading || !topupAmount}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            Pay
          </button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-bold">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="mt-2 text-gray-500">No transactions yet.</p>
        ) : (
          <table className="mt-4 w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Merchant</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b">
                  <td className="py-3 text-sm">{formatDate(tx.created_at)}</td>
                  <td className="py-3 text-sm">{tx.merchant_name ?? '-'}</td>
                  <td className="py-3 text-sm font-medium">{formatCents(tx.amount_cents)}</td>
                  <td className="py-3">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                      tx.status === 'declined' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700',
                    )}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
