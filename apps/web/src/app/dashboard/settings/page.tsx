'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const { token, user, signOut } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listApiKeys(token).then((r) => {
      setKeys(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!token || !newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await api.createApiKey(newKeyName.trim(), ['read', 'pay'], token);
      setNewlyCreatedKey(result.rawKey || result.raw_key);
      setNewKeyName('');
      const r = await api.listApiKeys(token);
      setKeys(r.data || []);
    } catch {}
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteApiKey(id, token);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {}
  };

  const handleCopy = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="px-4 pt-6 pb-8">
      {/* Profile section */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-bold">
            {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">API Keys</h2>

        {newlyCreatedKey && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 mb-3">
            <p className="text-xs font-semibold text-green-800">Copy this key now — it won&apos;t be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-mono border border-green-200 break-all">{newlyCreatedKey}</code>
              <button onClick={handleCopy} className="rounded-xl bg-green-600 px-3 py-2 text-xs text-white font-semibold hover:bg-green-700 transition">
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Key name (e.g. MCP Server)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="rounded-xl bg-black px-4 py-2.5 text-sm text-white font-semibold hover:bg-gray-800 transition disabled:opacity-50 shrink-0"
            >
              {creating ? '...' : 'Create'}
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : keys.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No API keys yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{k.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{k.keyPrefix}••••••••</p>
                    </div>
                    <button onClick={() => handleRevoke(k.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold transition shrink-0 ml-3">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
