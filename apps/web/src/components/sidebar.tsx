'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface Wallet {
  id: string;
  name: string;
  balanceCents?: number;
  balance_cents?: number;
  status: string;
}

interface SidebarProps {
  wallets: Wallet[];
  activeWalletId: string | null;
  onSelectWallet: (id: string) => void;
  onCreateWallet: () => void;
}

function formatCentsShort(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function Sidebar({ wallets, activeWalletId, onSelectWallet, onCreateWallet }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <>
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">LetPay</Link>
        <button
          className="md:hidden rounded p-1 hover:bg-gray-100"
          onClick={() => setMobileOpen(false)}
        >
          ✕
        </button>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Wallets</span>
          <button
            onClick={() => { onCreateWallet(); setMobileOpen(false); }}
            className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black transition text-xs font-bold"
          >
            +
          </button>
        </div>
        <div className="space-y-0.5">
          {wallets.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No wallets yet</p>
          ) : (
            wallets.map((w) => {
              const active = w.id === activeWalletId;
              const balance = w.balanceCents ?? w.balance_cents ?? 0;
              return (
                <button
                  key={w.id}
                  onClick={() => { onSelectWallet(w.id); setMobileOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition text-left',
                    active ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black',
                  )}
                >
                  <span className="truncate">{w.name}</span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">{formatCentsShort(balance)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <nav className="mt-6 space-y-0.5">
        <Link
          href="/dashboard/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
            pathname === '/dashboard/settings' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black',
          )}
        >
          Settings
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-black transition"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="fixed top-4 left-4 z-40 rounded-lg border border-gray-200 bg-white p-2 shadow-sm md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white p-6 transition-transform md:static md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {nav}
      </aside>
    </>
  );
}
