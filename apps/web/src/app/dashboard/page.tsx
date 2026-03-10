'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDashboard } from '@/lib/dashboard-context';
import { api } from '@/lib/api-client';
import { formatCents, formatDate } from '@/lib/utils';

const TX_PAGE_SIZE = 15;

export default function DashboardPage() {
  const { token } = useAuth();
  const { wallets, activeWalletId, selectWallet, showCreateModal, setShowCreateModal, refreshWallets, loading: walletsLoading } = useDashboard();

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txOffset, setTxOffset] = useState(0);
  const [rules, setRules] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const [newWalletName, setNewWalletName] = useState('');
  const [creating, setCreating] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [editRules, setEditRules] = useState({
    monthly_limit_cents: 5000,
    per_transaction_limit_cents: 2500,
    approval_threshold_cents: 1000,
    blocked_mccs: '',
    auto_approve: true,
  });

  const loadWalletDetails = useCallback(async (walletId: string) => {
    if (!token) return;
    setWalletLoading(true);
    setTxOffset(0);
    setShowCard(false);
    setCardDetails(null);
    setShowRulesPanel(false);
    setShowAddFunds(false);

    const [w, r, t] = await Promise.all([
      api.getWallet(walletId, token).catch(() => null),
      api.getRules(walletId, token).catch(() => null),
      api.listTransactions(walletId, token, { limit: TX_PAGE_SIZE, offset: 0 }).catch(() => ({ data: [], total: 0 })),
    ]);

    setWallet(w);
    setRules(r);
    setTransactions(t.data || []);
    setTxTotal(t.total || 0);

    if (r) {
      setEditRules({
        monthly_limit_cents: r.monthlyLimitCents ?? r.monthly_limit_cents ?? 5000,
        per_transaction_limit_cents: r.perTransactionLimitCents ?? r.per_transaction_limit_cents ?? 2500,
        approval_threshold_cents: r.approvalThresholdCents ?? r.approval_threshold_cents ?? 1000,
        blocked_mccs: (r.blockedMccs ?? r.blocked_mccs ?? []).join(', '),
        auto_approve: r.autoApprove ?? r.auto_approve ?? true,
      });
    }
    setWalletLoading(false);
  }, [token]);

  useEffect(() => {
    if (activeWalletId && token) {
      loadWalletDetails(activeWalletId);
    }
  }, [activeWalletId, token, loadWalletDetails]);

  const handleCreateWallet = async () => {
    if (!token || !newWalletName.trim()) return;
    setCreating(true);
    try {
      const w = await api.createWallet(newWalletName.trim(), token);
      setShowCreateModal(false);
      setNewWalletName('');
      await refreshWallets();
      selectWallet(w.id);
    } catch {}
    setCreating(false);
  };

  const handleTopup = async () => {
    if (!token || !activeWalletId || !topupAmount) return;
    const cents = Math.round(parseFloat(topupAmount) * 100);
    if (cents <= 0) return;
    setTopupLoading(true);
    try {
      const result = await api.topup(activeWalletId, cents, token);
      if (result.checkoutUrl || result.checkout_url) {
        window.location.href = result.checkoutUrl || result.checkout_url;
        return;
      }
    } catch {}
    setTopupLoading(false);
  };

  const handleFreeze = async () => {
    if (!token || !activeWalletId || !wallet) return;
    try {
      if (wallet.status === 'frozen') {
        await api.unfreezeWallet(activeWalletId, token);
      } else {
        await api.freezeWallet(activeWalletId, token);
      }
      const w = await api.getWallet(activeWalletId, token);
      setWallet(w);
      await refreshWallets();
    } catch {}
  };

  const handleViewCard = async () => {
    if (!token || !activeWalletId) return;
    if (showCard) { setShowCard(false); return; }
    try {
      const details = await api.getCardDetails(activeWalletId, token);
      setCardDetails(details);
      setShowCard(true);
    } catch { setShowCard(false); }
  };

  const handleSaveRules = async () => {
    if (!token || !activeWalletId) return;
    setSavingRules(true);
    try {
      await api.updateRules(activeWalletId, {
        monthly_limit_cents: editRules.monthly_limit_cents,
        per_transaction_limit_cents: editRules.per_transaction_limit_cents,
        approval_threshold_cents: editRules.approval_threshold_cents,
        blocked_mccs: editRules.blocked_mccs.split(',').map((s) => s.trim()).filter(Boolean),
        auto_approve: editRules.auto_approve,
      }, token);
      const r = await api.getRules(activeWalletId, token);
      setRules(r);
    } catch {}
    setSavingRules(false);
  };

  const handleLoadMore = async () => {
    if (!token || !activeWalletId) return;
    const newOffset = txOffset + TX_PAGE_SIZE;
    try {
      const t = await api.listTransactions(activeWalletId, token, { limit: TX_PAGE_SIZE, offset: newOffset });
      setTransactions((prev) => [...prev, ...(t.data || [])]);
      setTxOffset(newOffset);
      setTxTotal(t.total || 0);
    } catch {}
  };

  if (walletsLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
          <h1 className="text-3xl font-bold">Welcome to LetPay</h1>
          <p className="mt-3 text-gray-500 max-w-md">Create your first wallet to get a virtual Visa card for your AI agent.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 rounded-lg bg-black px-6 py-3 text-sm text-white font-medium hover:bg-gray-800 transition"
          >
            Create Wallet
          </button>
        </div>
        {showCreateModal && <CreateWalletModal name={newWalletName} setName={setNewWalletName} creating={creating} onCreate={handleCreateWallet} onClose={() => setShowCreateModal(false)} />}
      </>
    );
  }

  if (walletLoading || !wallet) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  const balance = wallet.balanceCents ?? wallet.balance_cents ?? 0;

  return (
    <>
      <div className="max-w-3xl mx-auto">
        {/* Balance */}
        <div className="text-center pt-8 pb-6">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{wallet.name}</p>
          <p className="mt-2 text-5xl font-bold tracking-tight">{formatCents(balance)}</p>
          <div className="mt-3">
            <WalletStatusBadge status={wallet.status} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowAddFunds(true)}
            className="rounded-lg bg-black px-5 py-2.5 text-sm text-white font-medium hover:bg-gray-800 transition"
          >
            Add Funds
          </button>
          <button
            onClick={() => setShowRulesPanel(!showRulesPanel)}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Spending Rules
          </button>
        </div>

        {/* Add Funds panel */}
        {showAddFunds && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Add Funds via Stripe</h3>
              <button onClick={() => setShowAddFunds(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button
                onClick={handleTopup}
                disabled={topupLoading || !topupAmount}
                className="rounded-lg bg-black px-5 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {topupLoading ? 'Redirecting...' : 'Pay'}
              </button>
            </div>
          </div>
        )}

        {/* Spending Rules panel */}
        {showRulesPanel && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Spending Rules</h3>
              <button onClick={() => setShowRulesPanel(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Limit (cents)</label>
                <input type="number" value={editRules.monthly_limit_cents} onChange={(e) => setEditRules({ ...editRules, monthly_limit_cents: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Per-Transaction Limit (cents)</label>
                <input type="number" value={editRules.per_transaction_limit_cents} onChange={(e) => setEditRules({ ...editRules, per_transaction_limit_cents: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Approval Threshold (cents)</label>
                <input type="number" value={editRules.approval_threshold_cents} onChange={(e) => setEditRules({ ...editRules, approval_threshold_cents: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Blocked MCCs (comma-separated)</label>
                <input type="text" value={editRules.blocked_mccs} onChange={(e) => setEditRules({ ...editRules, blocked_mccs: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="auto_approve" checked={editRules.auto_approve} onChange={(e) => setEditRules({ ...editRules, auto_approve: e.target.checked })} className="rounded" />
                <label htmlFor="auto_approve" className="text-sm text-gray-600">Auto-approve under threshold</label>
              </div>
              <button onClick={handleSaveRules} disabled={savingRules} className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50">
                {savingRules ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Card info */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Virtual Card</p>
              {showCard && cardDetails ? (
                <div className="mt-1.5 space-y-0.5 text-sm font-mono">
                  <p>{cardDetails.pan}</p>
                  <p>{cardDetails.expMonth}/{cardDetails.expYear} &middot; CVV: {cardDetails.cvv}</p>
                </div>
              ) : (
                <p className="mt-1.5 text-lg font-medium tracking-wider">•••• •••• •••• {wallet.wallesterCardId?.slice(-4) || '----'}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleViewCard}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                {showCard ? 'Hide' : 'Reveal'}
              </button>
              <button
                onClick={handleFreeze}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${wallet.status === 'frozen' ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {wallet.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
              </button>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-8 mb-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Transactions</h2>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
              <p className="text-gray-400">No transactions yet. Your agent hasn&apos;t spent anything.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.merchantName || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className={`text-sm font-semibold ${tx.status === 'approved' ? 'text-green-700' : tx.status === 'declined' ? 'text-red-600' : tx.status === 'pending' ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {formatCents(tx.amountCents)}
                      </span>
                      <TxBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
              {transactions.length < txTotal && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateWalletModal
          name={newWalletName}
          setName={setNewWalletName}
          creating={creating}
          onCreate={handleCreateWallet}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

function WalletStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    frozen: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
      {status}
    </span>
  );
}

function TxBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-green-50 text-green-700',
    declined: 'bg-red-50 text-red-700',
    pending: 'bg-yellow-50 text-yellow-700',
    refunded: 'bg-gray-50 text-gray-700',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
      {status}
    </span>
  );
}

function CreateWalletModal({ name, setName, creating, onCreate, onClose }: {
  name: string;
  setName: (v: string) => void;
  creating: boolean;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Create Wallet</h2>
        <p className="mt-1 text-sm text-gray-500">Give your wallet a name. Balance starts at €0.</p>
        <input
          type="text"
          placeholder="e.g. My Agent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }}
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={creating || !name.trim()}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
