import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { get, post, tokenStore } from '@/lib/api';

export interface Officer { id: string; name: string; email: string; role: string; designation: string }

interface AuthValue {
  user: Officer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthValue>({ user: null, loading: true, signIn: async () => undefined, signOut: () => undefined });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Officer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    get<Officer>('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await post<{ token: string; user: Officer }>('/auth/login', { email, password });
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
