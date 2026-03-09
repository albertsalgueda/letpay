'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewWalletPage() {
  const [name, setName] = useState('My Agent');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call API to create wallet
    router.push('/dashboard/wallets');
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">Create Wallet</h1>
      <p className="mt-2 text-gray-600">Create a new wallet for your AI agent with a virtual Visa card.</p>
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
          className="rounded-lg bg-black px-4 py-2 text-white font-medium hover:bg-gray-800 transition"
        >
          Create Wallet
        </button>
      </form>
    </div>
  );
}
