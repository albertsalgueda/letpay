import Link from 'next/link';

export default function WalletsPage() {
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
        <p className="text-gray-500">No wallets yet. Create your first wallet to get started.</p>
      </div>
    </div>
  );
}
