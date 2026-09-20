import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'nirman.theme';

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const readChoice = (): ThemeChoice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch { return 'system'; }
};

interface ThemeValue { theme: ThemeChoice; resolved: 'light' | 'dark'; setTheme: (t: ThemeChoice) => void }
const Ctx = createContext<ThemeValue>({ theme: 'system', resolved: 'light', setTheme: () => undefined });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(readChoice);
  const [prefersDark, setPrefersDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPrefersDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch { /* private mode — the choice still applies for this session */ }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
