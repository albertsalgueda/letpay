export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-8">
        <h2 className="text-lg font-bold">API Keys</h2>
        <p className="mt-2 text-gray-600">Manage API keys for your integrations and MCP server.</p>
        <button className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white font-medium hover:bg-gray-800 transition">
          Create API Key
        </button>
        <div className="mt-4">
          <p className="text-gray-500">No API keys yet.</p>
        </div>
      </div>
    </div>
  );
}
