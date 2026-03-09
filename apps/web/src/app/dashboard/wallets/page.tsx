'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';
import { formatCents, cn } from '@/lib/utils';

export default function WalletsPage() {
  const { token } = useAccessToken();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.listWallets(token)
      .then((res) => setWallets(res.data))
      .catch(() => setWallets([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallets</h1>
        <Link
          href="/dashboard/wallets/new"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition"
        >
          Create Wallet
        </Link>
      </div>
      <div className="mt-6">
        {loading ? (
          <p className="text-gray-500">Loading wallets...</p>
        ) : wallets.length === 0 ? (
          <p className="text-gray-500">No wallets yet. Create your first wallet to get started.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wallets.map((wallet) => (
              <Link
                key={wallet.id}
                href={`/dashboard/wallets/${wallet.id}`}
                className="rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-400 transition"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{wallet.name ?? 'Wallet'}</h3>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    wallet.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                  )}>{wallet.status}</span>
                </div>
                <p className="mt-3 text-2xl font-bold">{formatCents(wallet.balance_cents ?? 0)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
