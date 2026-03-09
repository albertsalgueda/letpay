'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/wallets', label: 'Wallets' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/approvals', label: 'Approvals' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-200 bg-white min-h-screen p-6">
      <Link href="/dashboard" className="text-xl font-bold">LetPay</Link>
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm font-medium transition',
              pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
                ? 'bg-gray-100 text-black'
                : 'text-gray-600 hover:bg-gray-50 hover:text-black',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
