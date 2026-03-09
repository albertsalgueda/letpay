import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to LetPay. Manage your AI agent wallets.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Balance</h2>
          <p className="mt-2 text-3xl font-bold">--</p>
          <p className="mt-1 text-sm text-gray-500">Across all wallets</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Active Wallets</h2>
          <p className="mt-2 text-3xl font-bold">--</p>
          <p className="mt-1 text-sm text-gray-500">Virtual cards issued</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Pending Approvals</h2>
          <p className="mt-2 text-3xl font-bold">--</p>
          <Link href="/dashboard/approvals" className="mt-1 text-sm text-blue-600 hover:underline">View all</Link>
        </div>
      </div>
    </div>
  );
}
