'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';

export default function NewWalletPage() {
  const [name, setName] = useState('My Agent');
  const [fundingAmount, setFundingAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      const wallet = await api.createWallet(name, token);
      const walletId = wallet.id;
      if (fundingAmount && parseFloat(fundingAmount) > 0) {
        const cents = Math.round(parseFloat(fundingAmount) * 100);
        const topup = await api.topup(walletId, cents, token);
        if (topup.checkoutUrl || topup.checkout_url) {
          window.location.href = topup.checkoutUrl || topup.checkout_url;
          return;
        }
      }
      router.push(`/dashboard/wallets/${walletId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">Create Wallet</h1>
      <p className="mt-2 text-gray-600">Create a new wallet for your AI agent with a virtual Visa card.</p>
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Wallet Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>
        <div>
          <label htmlFor="funding" className="block text-sm font-medium mb-1">Initial Funding (EUR, optional)</label>
          <input
            id="funding"
            type="number"
            step="0.01"
            min="0"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Wallet'}
        </button>
      </form>
    </div>
  );
}
