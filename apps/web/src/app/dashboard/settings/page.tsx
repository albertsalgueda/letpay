'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAccessToken } from '@/lib/hooks/use-session';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { token } = useAccessToken();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listApiKeys(token)
      .then((res) => setApiKeys(res.data))
      .catch(() => setApiKeys([]))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!token || !newKeyName) return;
    setCreating(true);
    try {
      const res = await api.createApiKey(newKeyName, ['wallets:read', 'wallets:write', 'transactions:read'], token);
      setCreatedKey(res.raw_key);
      setApiKeys((prev) => [...prev, res]);
      setNewKeyName('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    await api.deleteApiKey(id, token);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="mt-8">
        <h2 className="text-lg font-bold">API Keys</h2>
        <p className="mt-2 text-gray-600">Manage API keys for your integrations and MCP server.</p>

        {createdKey && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-800">API key created! Copy it now — you won&apos;t see it again.</p>
            <code className="mt-2 block rounded bg-green-100 px-3 py-2 text-sm font-mono break-all">{createdKey}</code>
            <button onClick={() => setCreatedKey(null)} className="mt-2 text-sm text-green-700 hover:underline">Dismiss</button>
          </div>
        )}

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition"
        >
          Create API Key
        </button>

        {showCreate && (
          <div className="mt-4 flex items-center gap-3 max-w-sm">
            <input
              type="text"
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-gray-500">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{key.name}</p>
                    <p className="text-xs text-gray-500">{key.key_prefix}...</p>
                  </div>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 border-t pt-8">
        <h2 className="text-lg font-bold">Account</h2>
        <button
          onClick={handleSignOut}
          className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
