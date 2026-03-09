export default async function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">Wallet Details</h1>
      <p className="mt-2 text-gray-600">Wallet ID: {id}</p>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Balance</h2>
          <p className="mt-2 text-3xl font-bold">--</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Card Status</h2>
          <p className="mt-2 text-lg font-medium">--</p>
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <button className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition">Top Up</button>
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition">View Card</button>
        <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 transition">Freeze</button>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-bold">Recent Transactions</h2>
        <p className="mt-2 text-gray-500">No transactions yet.</p>
      </div>
    </div>
  );
}
