'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatCents } from '@/lib/utils';

export default function WalletsPage() {
  const { token } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.listWallets(token).then((r) => {
      setWallets(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    frozen: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };

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

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : wallets.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No wallets yet. Create your first wallet to get started.</p>
          <Link href="/dashboard/wallets/new" className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition">
            Create Wallet
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <Link
              key={w.id}
              href={`/dashboard/wallets/${w.id}`}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{w.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[w.status] || 'bg-gray-100 text-gray-700'}`}>
                  {w.status}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold">{formatCents(w.balanceCents ?? w.balance_cents ?? 0)}</p>
              {w.wallesterCardId && (
                <p className="mt-2 text-sm text-gray-500">Card: •••• {w.wallesterCardId.slice(-4)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
