'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';
import { formatCents, formatDate } from '@/lib/utils';

export default function ApprovalsPage() {
  const { token } = useAccessToken();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.listApprovals(token)
      .then((res) => setApprovals(res.data))
      .catch(() => setApprovals([]))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    if (!token) return;
    setActionId(id);
    try {
      if (action === 'approve') {
        await api.approveRequest(id, token);
      } else {
        await api.denyRequest(id, token);
      }
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Pending Approvals</h1>
      <p className="mt-2 text-gray-600">Review and approve or deny agent payment requests.</p>
      <div className="mt-6">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : approvals.length === 0 ? (
          <p className="text-gray-500">No pending approvals.</p>
        ) : (
          <div className="space-y-4">
            {approvals.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.merchant_name ?? 'Unknown merchant'}</p>
                    <p className="text-2xl font-bold mt-1">{formatCents(a.amount_cents)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {a.expires_at ? `Expires ${formatDate(a.expires_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(a.id, 'deny')}
                      disabled={actionId === a.id}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => handleAction(a.id, 'approve')}
                      disabled={actionId === a.id}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
