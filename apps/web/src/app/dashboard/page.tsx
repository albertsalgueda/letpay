'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useDashboard } from '@/lib/dashboard-context';
import { api } from '@/lib/api-client';
import { formatCents, formatDate, groupByDate } from '@/lib/utils';

const TX_PAGE_SIZE = 15;
const QUICK_AMOUNTS = [10, 25, 50, 100];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { wallets, activeWalletId, selectWallet, showCreateModal, setShowCreateModal, refreshWallets, loading: walletsLoading } = useDashboard();

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txOffset, setTxOffset] = useState(0);
  const [rules, setRules] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const [newWalletName, setNewWalletName] = useState('');
  const [creating, setCreating] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editRules, setEditRules] = useState({
    monthly_limit_cents: 5000,
    per_transaction_limit_cents: 2500,
    approval_threshold_cents: 1000,
    blocked_mccs: '',
    auto_approve: true,
  });

  const carouselRef = useRef<HTMLDivElement>(null);

  const loadWalletDetails = useCallback(async (walletId: string) => {
    if (!token) return;
    setWalletLoading(true);
    setTxOffset(0);
    setCardDetails(null);
    setCardRevealed(false);

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
    if (cardDetails) {
      setShowCardModal(true);
      return;
    }
    try {
      const details = await api.getCardDetails(activeWalletId, token);
      setCardDetails(details);
      setShowCardModal(true);
    } catch {}
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
      setShowRulesModal(false);
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

  const handleRefresh = async () => {
    if (!activeWalletId || refreshing) return;
    setRefreshing(true);
    await loadWalletDetails(activeWalletId);
    setRefreshing(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const activeIndex = wallets.findIndex((w) => w.id === activeWalletId);

  const scrollToCard = (index: number) => {
    if (!carouselRef.current) return;
    const cards = carouselRef.current.children;
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  useEffect(() => {
    if (activeIndex >= 0) scrollToCard(activeIndex);
  }, [activeIndex, wallets.length]);

  // --- Skeleton loading ---
  if (walletsLoading) {
    return (
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-20 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-44 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="flex gap-4 mt-6 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state ---
  if (wallets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <span className="text-2xl">💳</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to LetPay</h1>
          <p className="mt-3 text-gray-500 max-w-xs">Create your first wallet to get a virtual Visa card for your AI agent.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-8 rounded-xl bg-black px-8 py-3.5 text-sm text-white font-semibold hover:bg-gray-800 transition"
          >
            Create Wallet
          </button>
        </div>
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)}>
            <CreateWalletContent name={newWalletName} setName={setNewWalletName} creating={creating} onCreate={handleCreateWallet} />
          </Modal>
        )}
      </>
    );
  }

  // --- Wallet loading skeleton ---
  if (walletLoading && !wallet) {
    return (
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-20 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-44 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="flex gap-4 mt-6 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!wallet) return null;

  const balance = wallet.balanceCents ?? wallet.balance_cents ?? 0;
  const isFrozen = wallet.status === 'frozen';
  const userInitial = (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const last4 = wallet.wallesterCardId?.slice(-4) || wallet.wallester_card_id?.slice(-4) || '····';

  const txGroups = groupByDate(transactions);

  return (
    <>
      <div className="px-4 pt-4 pb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
            {userInitial}
          </div>
          <span className="text-sm font-semibold text-gray-900">LetPay</span>
          <button onClick={handleRefresh} className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
            <svg className={`w-4.5 h-4.5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>

        {/* Wallet carousel */}
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {wallets.map((w, i) => {
            const wBalance = w.balanceCents ?? w.balance_cents ?? 0;
            const isActive = w.id === activeWalletId;
            const wLast4 = w.wallesterCardId?.slice(-4) || '····';
            return (
              <button
                key={w.id}
                onClick={() => selectWallet(w.id)}
                className={`flex-shrink-0 snap-center rounded-2xl p-5 text-left transition-all ${
                  isActive
                    ? 'bg-black text-white w-[280px] shadow-lg'
                    : 'bg-white text-gray-900 w-[260px] shadow-sm border border-gray-100'
                }`}
              >
                <p className={`text-xs font-medium ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>{w.name}</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${isActive ? '' : ''}`}>{formatCents(wBalance)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-xs font-mono ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>•••• {wLast4}</span>
                  {w.status === 'frozen' && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 rounded-full px-2 py-0.5 font-medium">frozen</span>
                  )}
                </div>
              </button>
            );
          })}
          {/* Create new wallet card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 snap-center rounded-2xl border-2 border-dashed border-gray-300 w-[260px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition"
          >
            <div className="h-10 w-10 rounded-full border-2 border-current flex items-center justify-center text-xl font-light">+</div>
            <span className="text-xs font-medium">New Wallet</span>
          </button>
        </div>

        {/* Dots indicator */}
        {wallets.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {wallets.map((w, i) => (
              <div
                key={w.id}
                className={`rounded-full transition-all ${w.id === activeWalletId ? 'w-5 h-1.5 bg-black' : 'w-1.5 h-1.5 bg-gray-300'}`}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <ActionButton icon="💰" label="Add Funds" onClick={() => setShowAddFunds(true)} />
          <ActionButton icon="⚙️" label="Rules" onClick={() => setShowRulesModal(true)} />
          <ActionButton icon={isFrozen ? '🔥' : '❄️'} label={isFrozen ? 'Unfreeze' : 'Freeze'} onClick={handleFreeze} />
          <ActionButton icon="💳" label="Card" onClick={handleViewCard} />
        </div>

        {/* Transactions */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Transactions</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No transactions yet</p>
              <p className="text-gray-300 text-xs mt-1">Your agent hasn&apos;t spent anything.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {txGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-gray-400 mb-2 px-1">{group.label}</p>
                  <div className="rounded-2xl bg-white shadow-sm divide-y divide-gray-50">
                    {group.items.map((tx: any) => (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                          {(tx.merchantName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tx.merchantName || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`text-sm font-semibold ${
                            tx.status === 'approved' ? 'text-gray-900' :
                            tx.status === 'declined' ? 'text-red-500' :
                            tx.status === 'pending' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {tx.status === 'approved' ? '-' : ''}{formatCents(tx.amountCents ?? tx.amount_cents ?? 0)}
                          </span>
                          <TxBadge status={tx.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {transactions.length < txTotal && (
                <div className="text-center pt-2 pb-4">
                  <button
                    onClick={handleLoadMore}
                    className="text-sm font-medium text-gray-500 hover:text-black transition"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <CreateWalletContent name={newWalletName} setName={setNewWalletName} creating={creating} onCreate={handleCreateWallet} />
        </Modal>
      )}

      {showAddFunds && (
        <Modal onClose={() => setShowAddFunds(false)}>
          <h3 className="text-lg font-bold">Add Funds</h3>
          <p className="text-sm text-gray-500 mt-1">Top up via Stripe checkout</p>
          <div className="flex gap-2 mt-4">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setTopupAmount(String(amt))}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  topupAmount === String(amt)
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                €{amt}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Custom amount"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
          </div>
          <button
            onClick={handleTopup}
            disabled={topupLoading || !topupAmount}
            className="mt-4 w-full rounded-xl bg-black py-3.5 text-sm text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {topupLoading ? 'Redirecting...' : `Pay €${topupAmount || '0'}`}
          </button>
        </Modal>
      )}

      {showRulesModal && (
        <Modal onClose={() => setShowRulesModal(false)}>
          <h3 className="text-lg font-bold">Spending Rules</h3>
          <p className="text-sm text-gray-500 mt-1">Control how your agent spends</p>
          <div className="mt-4 space-y-4">
            <RuleInput label="Monthly limit" value={editRules.monthly_limit_cents} onChange={(v) => setEditRules({ ...editRules, monthly_limit_cents: v })} />
            <RuleInput label="Per-transaction limit" value={editRules.per_transaction_limit_cents} onChange={(v) => setEditRules({ ...editRules, per_transaction_limit_cents: v })} />
            <RuleInput label="Approval threshold" value={editRules.approval_threshold_cents} onChange={(v) => setEditRules({ ...editRules, approval_threshold_cents: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Blocked MCCs</label>
              <input
                type="text"
                value={editRules.blocked_mccs}
                onChange={(e) => setEditRules({ ...editRules, blocked_mccs: e.target.value })}
                placeholder="e.g. 7995, 5912"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setEditRules({ ...editRules, auto_approve: !editRules.auto_approve })}
                className={`relative h-6 w-11 rounded-full transition-colors ${editRules.auto_approve ? 'bg-black' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editRules.auto_approve ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm text-gray-700">Auto-approve under threshold</span>
            </div>
          </div>
          <button
            onClick={handleSaveRules}
            disabled={savingRules}
            className="mt-6 w-full rounded-xl bg-black py-3.5 text-sm text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {savingRules ? 'Saving...' : 'Save Rules'}
          </button>
        </Modal>
      )}

      {showCardModal && cardDetails && (
        <Modal onClose={() => { setShowCardModal(false); setCardRevealed(false); }}>
          <h3 className="text-lg font-bold">Card Details</h3>
          <p className="text-sm text-gray-500 mt-1">{wallet.name} virtual card</p>
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-5 text-white">
            <p className="text-xs text-gray-400 font-medium">Card Number</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-mono tracking-wider">{cardRevealed ? cardDetails.pan : '•••• •••• •••• ' + last4}</p>
              {cardRevealed && (
                <button onClick={() => copyToClipboard(cardDetails.pan, 'pan')} className="text-xs text-gray-400 hover:text-white">
                  {copiedField === 'pan' ? '✓' : 'Copy'}
                </button>
              )}
            </div>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-xs text-gray-400 font-medium">Expiry</p>
                <p className="text-sm font-mono mt-0.5">{cardRevealed ? `${cardDetails.expMonth}/${cardDetails.expYear}` : '••/••'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">CVV</p>
                <p className="text-sm font-mono mt-0.5">{cardRevealed ? cardDetails.cvv : '•••'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setCardRevealed(!cardRevealed)}
            className="mt-4 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
          >
            {cardRevealed ? 'Hide Details' : 'Reveal Details'}
          </button>
        </Modal>
      )}
    </>
  );
}

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <div className="h-12 w-12 rounded-full bg-[#6366f1] text-white flex items-center justify-center text-lg group-hover:bg-[#5558e6] transition shadow-sm">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </button>
  );
}

function RuleInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const euros = (value / 100).toFixed(2);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <span className="text-xs font-semibold text-gray-900">€{euros}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100000}
        step={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black"
      />
    </div>
  );
}

function TxBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'text-green-600',
    declined: 'text-red-500',
    pending: 'text-yellow-600',
    refunded: 'text-gray-500',
  };
  return (
    <span className={`text-[10px] font-medium ${styles[status] || 'text-gray-500'}`}>
      {status}
    </span>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl mx-0 sm:mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 mb-4 sm:hidden" />
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        {children}
      </div>
    </div>
  );
}

function CreateWalletContent({ name, setName, creating, onCreate }: {
  name: string;
  setName: (v: string) => void;
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <>
      <h3 className="text-lg font-bold">Create Wallet</h3>
      <p className="mt-1 text-sm text-gray-500">Give your wallet a name. Balance starts at €0.</p>
      <input
        type="text"
        placeholder="e.g. My Agent"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
        onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }}
      />
      <button
        onClick={onCreate}
        disabled={creating || !name.trim()}
        className="mt-4 w-full rounded-xl bg-black py-3.5 text-sm text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50"
      >
        {creating ? 'Creating...' : 'Create'}
      </button>
    </>
  );
}
