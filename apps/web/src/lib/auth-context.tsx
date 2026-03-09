'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isMockAuth } from './supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@letpay.ai',
  name: 'Demo User',
};

function createMockToken(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: user.id, email: user.email, name: user.name, exp: Math.floor(Date.now() / 1000) + 86400 }));
  return `${header}.${payload}.mock`;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isMockAuth()) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('letpay_mock_auth') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
        setToken(parsed.token);
      }
      setLoading(false);
      return;
    }

    supabase!.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email!, name: session.user.user_metadata?.name });
        setToken(session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email!, name: session.user.user_metadata?.name });
        setToken(session.access_token);
      } else {
        setUser(null);
        setToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isMockAuth()) {
      const mockUser = { ...MOCK_USER, email };
      const mockToken = createMockToken(mockUser);
      localStorage.setItem('letpay_mock_auth', JSON.stringify({ user: mockUser, token: mockToken }));
      setUser(mockUser);
      setToken(mockToken);
      router.push('/dashboard');
      return;
    }

    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    router.push('/dashboard');
  }, [router]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (isMockAuth()) {
      const mockUser = { ...MOCK_USER, email, name };
      const mockToken = createMockToken(mockUser);
      localStorage.setItem('letpay_mock_auth', JSON.stringify({ user: mockUser, token: mockToken }));
      setUser(mockUser);
      setToken(mockToken);
      router.push('/dashboard');
      return;
    }

    const { error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    router.push('/dashboard');
  }, [router]);

  const signOut = useCallback(async () => {
    if (isMockAuth()) {
      localStorage.removeItem('letpay_mock_auth');
      setUser(null);
      setToken(null);
      router.push('/login');
      return;
    }

    await supabase!.auth.signOut();
    setUser(null);
    setToken(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
