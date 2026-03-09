'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';
import { formatCents, formatDate, cn } from '@/lib/utils';

export default function TransactionsPage() {
  const { token } = useAccessToken();
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.listWallets(token)
      .then(async (res) => {
        setWallets(res.data);
        const allTxs = await Promise.all(
          res.data.map((w: any) =>
            api.listTransactions(w.id, token).catch(() => ({ data: [] }))
          )
        );
        setTransactions(allTxs.flatMap((t) => t.data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Transactions</h1>
      <p className="mt-2 text-gray-600">View all transactions across your wallets.</p>
      <div className="mt-6">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Merchant</th>
              <th className="pb-2 font-medium">Wallet</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">No transactions yet.</td>
              </tr>
            ) : (
              transactions
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((tx) => (
                  <tr key={tx.id} className="border-b">
                    <td className="py-3 text-sm">{formatDate(tx.created_at)}</td>
                    <td className="py-3 text-sm">{tx.merchant_name ?? '-'}</td>
                    <td className="py-3 text-sm">{wallets.find((w) => w.id === tx.wallet_id)?.name ?? tx.wallet_id}</td>
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
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
