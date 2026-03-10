'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import { api } from './api-client';

interface Wallet {
  id: string;
  name: string;
  balanceCents?: number;
  balance_cents?: number;
  status: string;
  wallesterCardId?: string;
}

interface DashboardState {
  wallets: Wallet[];
  activeWalletId: string | null;
  loading: boolean;
  selectWallet: (id: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  refreshWallets: () => Promise<Wallet[]>;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const refreshWallets = useCallback(async () => {
    if (!token) return [];
    const r = await api.listWallets(token).catch(() => ({ data: [] as Wallet[] }));
    setWallets(r.data);
    return r.data;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshWallets().then((list) => {
      if (list.length > 0 && !activeWalletId) {
        setActiveWalletId(list[0].id);
      }
      setLoading(false);
    });
  }, [token, refreshWallets]);

  const selectWallet = useCallback((id: string) => {
    setActiveWalletId(id);
  }, []);

  return (
    <DashboardContext.Provider value={{
      wallets,
      activeWalletId,
      loading,
      selectWallet,
      showCreateModal,
      setShowCreateModal,
      refreshWallets,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
