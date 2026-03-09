export default function TransactionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Transactions</h1>
      <p className="mt-2 text-gray-600">View all transactions across your wallets.</p>
      <div className="mt-6">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Merchant</th>
              <th className="pb-2 font-medium">Wallet</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">No transactions yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
