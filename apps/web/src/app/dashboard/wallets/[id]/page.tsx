'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatCents, formatDate } from '@/lib/utils';

export default function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [rules, setRules] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [showCard, setShowCard] = useState(false);

  const [editRules, setEditRules] = useState({
    monthly_limit_cents: 5000,
    per_transaction_limit_cents: 2500,
    approval_threshold_cents: 1000,
    blocked_mccs: '',
    auto_approve: true,
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getWallet(id, token).catch(() => null),
      api.getRules(id, token).catch(() => null),
      api.listTransactions(id, token, { limit: 10 }).catch(() => ({ data: [] })),
    ]).then(([w, r, t]) => {
      setWallet(w);
      if (r) {
        setRules(r);
        setEditRules({
          monthly_limit_cents: r.monthlyLimitCents ?? r.monthly_limit_cents ?? 5000,
          per_transaction_limit_cents: r.perTransactionLimitCents ?? r.per_transaction_limit_cents ?? 2500,
          approval_threshold_cents: r.approvalThresholdCents ?? r.approval_threshold_cents ?? 1000,
          blocked_mccs: (r.blockedMccs ?? r.blocked_mccs ?? []).join(', '),
          auto_approve: r.autoApprove ?? r.auto_approve ?? true,
        });
      }
      setTransactions(t.data || []);
      setLoading(false);
    });
  }, [id, token]);

  const handleFreeze = async () => {
    if (!token) return;
    if (wallet.status === 'frozen') {
      await api.unfreezeWallet(id, token);
    } else {
      await api.freezeWallet(id, token);
    }
    const w = await api.getWallet(id, token);
    setWallet(w);
  };

  const handleTopup = async () => {
    if (!token || !topupAmount) return;
    const cents = Math.round(parseFloat(topupAmount) * 100);
    if (cents <= 0) return;
    const result = await api.topup(id, cents, token);
    if (result.checkoutUrl || result.checkout_url) {
      window.location.href = result.checkoutUrl || result.checkout_url;
    }
  };

  const handleViewCard = async () => {
    if (!token) return;
    try {
      const details = await api.getCardDetails(id, token);
      setCardDetails(details);
      setShowCard(true);
    } catch {
      setShowCard(false);
    }
  };

  const handleSaveRules = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.updateRules(id, {
        monthly_limit_cents: editRules.monthly_limit_cents,
        per_transaction_limit_cents: editRules.per_transaction_limit_cents,
        approval_threshold_cents: editRules.approval_threshold_cents,
        blocked_mccs: editRules.blocked_mccs.split(',').map((s) => s.trim()).filter(Boolean),
        auto_approve: editRules.auto_approve,
      }, token);
      const r = await api.getRules(id, token);
      setRules(r);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!wallet) return <p className="text-gray-500">Wallet not found.</p>;

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{wallet.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${wallet.status === 'active' ? 'bg-green-100 text-green-700' : wallet.status === 'frozen' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
          {wallet.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Balance</h2>
          <p className="mt-2 text-3xl font-bold">{formatCents(wallet.balanceCents ?? wallet.balance_cents ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Card</h2>
          {showCard && cardDetails ? (
            <div className="mt-2 space-y-1 text-sm font-mono">
              <p>{cardDetails.pan}</p>
              <p>{cardDetails.expMonth}/{cardDetails.expYear} &middot; CVV: {cardDetails.cvv}</p>
            </div>
          ) : (
            <p className="mt-2 text-lg font-medium">•••• •••• •••• {wallet.wallesterCardId?.slice(-4) || '----'}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Amount (EUR)"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button onClick={handleTopup} className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition">
            Top Up
          </button>
        </div>
        <button onClick={handleViewCard} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition">
          {showCard ? 'Hide Card' : 'View Card'}
        </button>
        <button onClick={handleFreeze} className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${wallet.status === 'frozen' ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-red-300 text-red-600 hover:bg-red-50'}`}>
          {wallet.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">Spending Rules</h2>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit (cents)</label>
              <input type="number" value={editRules.monthly_limit_cents} onChange={(e) => setEditRules({ ...editRules, monthly_limit_cents: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per-Transaction Limit (cents)</label>
              <input type="number" value={editRules.per_transaction_limit_cents} onChange={(e) => setEditRules({ ...editRules, per_transaction_limit_cents: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Threshold (cents)</label>
              <input type="number" value={editRules.approval_threshold_cents} onChange={(e) => setEditRules({ ...editRules, approval_threshold_cents: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blocked MCCs (comma-separated)</label>
              <input type="text" value={editRules.blocked_mccs} onChange={(e) => setEditRules({ ...editRules, blocked_mccs: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="auto_approve" checked={editRules.auto_approve} onChange={(e) => setEditRules({ ...editRules, auto_approve: e.target.checked })} className="rounded" />
            <label htmlFor="auto_approve" className="text-sm font-medium text-gray-700">Auto-approve under threshold</label>
          </div>
          <button onClick={handleSaveRules} disabled={saving} className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">Recent Transactions</h2>
        {transactions.length === 0 ? (
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
