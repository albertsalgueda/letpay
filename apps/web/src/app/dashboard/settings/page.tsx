'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const { token } = useAuth();
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
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-8">
        <h2 className="text-lg font-bold">API Keys</h2>
        <p className="mt-2 text-gray-600">Manage API keys for your integrations and MCP server.</p>

        {newlyCreatedKey && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">API key created. Copy it now — it won&apos;t be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono border border-green-200 break-all">{newlyCreatedKey}</code>
              <button onClick={handleCopy} className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white font-medium hover:bg-green-700 transition">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Key name (e.g. MCP Server)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create API Key'}
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-gray-500">Loading...</p>
        ) : keys.length === 0 ? (
          <p className="mt-4 text-gray-500">No API keys yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Scopes</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{k.keyPrefix}••••••••</td>
                    <td className="px-4 py-3 text-gray-600">{(k.scopes || []).join(', ')}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRevoke(k.id)} className="text-sm text-red-600 hover:text-red-800 font-medium transition">
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
