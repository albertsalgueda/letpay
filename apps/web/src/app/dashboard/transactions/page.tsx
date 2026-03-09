'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatCents, formatDate } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { token } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.listWallets(token).then((r) => setWallets(r.data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    loadTransactions();
  }, [token, selectedWallet, offset]);

  const loadTransactions = async () => {
    if (!token) return;
    try {
      if (selectedWallet) {
        const r = await api.listTransactions(selectedWallet, token, { limit: PAGE_SIZE, offset });
        setTransactions(r.data || []);
        setTotal(r.total || 0);
      } else {
        const allTx: any[] = [];
        const walletList = wallets.length ? wallets : (await api.listWallets(token).catch(() => ({ data: [] }))).data;
        for (const w of walletList) {
          const r = await api.listTransactions(w.id, token, { limit: 100 }).catch(() => ({ data: [] }));
          allTx.push(...(r.data || []).map((t: any) => ({ ...t, walletName: w.name })));
        }
        allTx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTotal(allTx.length);
        setTransactions(allTx.slice(offset, offset + PAGE_SIZE));
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <select
          value={selectedWallet}
          onChange={(e) => { setSelectedWallet(e.target.value); setOffset(0); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All wallets</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : transactions.length === 0 ? (
        <p className="mt-6 text-gray-500">No transactions yet.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tx.status === 'approved' ? 'bg-green-100 text-green-700' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tx.walletName || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Previous
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
