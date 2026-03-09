'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';

export default function NewWalletPage() {
  const [name, setName] = useState('My Agent');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { token } = useAccessToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);

    try {
      await api.createWallet(name, token);
      router.push('/dashboard/wallets');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">Create Wallet</h1>
      <p className="mt-2 text-gray-600">Create a new wallet for your AI agent with a virtual Visa card.</p>
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
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
