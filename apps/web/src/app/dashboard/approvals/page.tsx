'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatCents, formatDate } from '@/lib/utils';

export default function ApprovalsPage() {
  const { token } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.listApprovals(token).then((r) => {
      setApprovals(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      await api.approveRequest(id, token);
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'approved' } : a));
    } catch {}
    setActionLoading(null);
  };

  const handleDeny = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      await api.denyRequest(id, token);
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'denied' } : a));
    } catch {}
    setActionLoading(null);
  };

  const pending = approvals.filter((a) => a.status === 'pending');
  const resolved = approvals.filter((a) => a.status !== 'pending');

  return (
    <div>
      <h1 className="text-2xl font-bold">Approvals</h1>
      <p className="mt-2 text-gray-600">Review and approve or deny agent payment requests.</p>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="mt-6">
            <h2 className="text-lg font-semibold">Pending ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="mt-4 text-gray-500">No pending approvals.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {pending.map((a) => (
                  <div key={a.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{a.merchantName || 'Unknown merchant'}</p>
                        <p className="mt-1 text-2xl font-bold">{formatCents(a.amountCents)}</p>
                        {a.agentReason && <p className="mt-2 text-sm text-gray-600">Reason: {a.agentReason}</p>}
                        <p className="mt-1 text-xs text-gray-500">Expires: {formatDate(a.expiresAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(a.id)}
                          disabled={actionLoading === a.id}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeny(a.id)}
                          disabled={actionLoading === a.id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {resolved.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Resolved</h2>
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">Merchant</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="px-4 py-3">{a.merchantName || '--'}</td>
                        <td className="px-4 py-3 font-medium">{formatCents(a.amountCents)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(a.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
