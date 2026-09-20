import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bell, ClipboardList, FileText, FolderKanban, GitBranch, LayoutDashboard, LogOut, Menu, Search,
  ScrollText, ShieldAlert, Timer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/CommandPalette';
import { Logo } from '@/components/Logo';
import { Drawer, Popover, Segmented } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, type ThemeChoice } from '@/hooks/useTheme';
import { get } from '@/lib/api';
import { cn, fmtDateTime, initials } from '@/lib/utils';
import type { Notification } from '@/types';

const primary = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/approvals', label: 'Approvals', icon: ClipboardList },
  { to: '/execution-windows', label: 'Execution windows', icon: Timer },
  { to: '/escalations', label: 'Escalations', icon: ShieldAlert },
];
const tools = [
  { to: '/tenders', label: 'Tenders', icon: FileText },
  { to: '/impact', label: 'Impact simulator', icon: GitBranch },
  { to: '/reports', label: 'Reports', icon: ScrollText },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/* ------------------------------------------------------------- navigation */

function NavList({ id, onNavigate }: { id: string; onNavigate?: () => void }) {
  const renderGroup = (items: typeof primary) => (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => cn(
              'relative flex h-9 items-center gap-3 rounded-control px-3 text-body font-medium transition-colors [@media(pointer:coarse)]:h-11',
              isActive ? 'text-fg' : 'text-fg2 hover:bg-sunken/50 hover:text-fg',
            )}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId={`nav-${id}`} className="absolute inset-0 rounded-control bg-sunken"
                    transition={{ type: 'spring', stiffness: 520, damping: 44 }} />
                )}
                <Icon aria-hidden size={18} strokeWidth={1.75} className={cn('relative shrink-0', isActive && 'text-accent')} />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
  return (
    <nav aria-label="Main" className="space-y-6">
      {renderGroup(primary)}
      {renderGroup(tools)}
    </nav>
  );
}

/* ---------------------------------------------------------- notifications */

/** `align` is which edge of the bell the panel lines up with: in the sidebar it opens toward the content. */
function NotificationBell({ align }: { align: 'left' | 'right' }) {
  const navigate = useNavigate();
  const { data = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => get<Notification[]>('/notifications'), refetchInterval: 60000 });
  const critical = data.some((n) => n.severity === 'CRITICAL');

  return (
    <Popover align={align} className="w-[min(380px,calc(100vw-2rem))]"
      trigger={({ open, toggle }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog"
          aria-label={data.length ? `Notifications, ${data.length} need attention` : 'Notifications'}
          className="relative grid h-9 w-9 place-items-center rounded-full text-fg2 transition-colors hover:bg-sunken/70 hover:text-fg [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
          <Bell aria-hidden size={18} strokeWidth={1.75} />
          {data.length > 0 && (
            <span aria-hidden className={cn('absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold',
              critical ? 'bg-bad text-on-bad' : 'bg-warn text-canvas')}>{data.length}</span>
          )}
        </button>
      )}>
      {(close) => (
        <div>
          <div className="px-5 pb-2 pt-4">
            <p className="text-body font-semibold">Notifications</p>
            <p className="text-foot text-fg2">{data.length ? `${data.length} need your attention` : 'You are all caught up'}</p>
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto pb-1">
            {data.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => { close(); navigate(n.href); }}
                  className="flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-subtle">
                  <span aria-hidden className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', n.severity === 'CRITICAL' ? 'bg-bad' : 'bg-warn')} />
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-fg">{n.title}</span>
                    <span className="block text-foot text-fg2">{n.detail}</span>
                    <span className="num mt-1 block text-cap text-fg2">{n.severity === 'CRITICAL' ? 'Critical · ' : ''}{fmtDateTime(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!data.length && <li className="px-5 py-8 text-center text-body text-fg2">Nothing needs attention right now.</li>}
          </ul>
        </div>
      )}
    </Popover>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  return (
    <Popover side="top" align="left" className="w-[232px] p-3"
      trigger={({ open, toggle }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog"
          className="flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-sunken/60">
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-foot font-semibold text-fg2">{initials(user?.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-medium text-fg">{user?.name}</span>
            <span className="block truncate text-cap text-fg2">{user?.designation}</span>
          </span>
        </button>
      )}>
      {(close) => (
        <div>
          <div className="px-2 pb-3">
            <p className="truncate text-body font-medium">{user?.name}</p>
            <p className="truncate text-foot text-fg2">{user?.email}</p>
          </div>
          <p className="px-2 pb-1.5 text-cap font-medium text-fg2">Appearance</p>
          <Segmented<ThemeChoice> label="Appearance" value={theme} onChange={setTheme} className="w-full [&>button]:flex-1"
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Auto' }]} />
          <div className="mt-3 border-t border-line pt-2">
            <button type="button" onClick={() => { close(); signOut(); }}
              className="flex h-9 w-full items-center gap-2.5 rounded-control px-2 text-body text-fg2 transition-colors hover:bg-sunken/60 hover:text-fg [@media(pointer:coarse)]:h-11">
              <LogOut aria-hidden size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

/* ------------------------------------------------------------------ shell */

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only rounded-control bg-surface px-4 py-2 text-body font-medium shadow-float focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80]">
        Skip to content
      </a>

      {/* Sidebar — desktop */}
      <aside className="sticky top-0 z-20 hidden h-screen w-[256px] shrink-0 flex-col border-r border-line bg-subtle/70 px-3 pb-3 pt-4 print:hidden lg:flex">
        <div className="flex items-center justify-between px-2">
          <Logo />
          <NotificationBell align="left" />
        </div>
        <button type="button" onClick={() => setPaletteOpen(true)}
          className="mt-5 flex h-9 w-full items-center gap-2 rounded-control bg-sunken/70 px-3 text-body text-fg2 transition-colors hover:bg-sunken">
          <Search aria-hidden size={15} /> <span>Search</span>
          <kbd className="ml-auto text-cap font-medium text-fg2">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <div className="mt-6 flex-1 overflow-y-auto"><NavList id="side" /></div>
        <div className="border-t border-line pt-3"><ProfileMenu /></div>
      </aside>

      {/* Top bar — phone and tablet */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-canvas/80 px-3 backdrop-blur-xl print:hidden lg:hidden">
        <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu"
          className="grid h-11 w-11 place-items-center rounded-full text-fg transition-colors hover:bg-sunken/70">
          <Menu aria-hidden size={20} strokeWidth={1.75} />
        </button>
        <Logo className="mr-auto" />
        <button type="button" onClick={() => setPaletteOpen(true)} aria-label="Search"
          className="grid h-11 w-11 place-items-center rounded-full text-fg2 transition-colors hover:bg-sunken/70 hover:text-fg">
          <Search aria-hidden size={18} strokeWidth={1.75} />
        </button>
        <NotificationBell align="right" />
      </header>

      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Menu" side="left">
        <div className="flex h-full flex-col justify-between gap-8">
          <NavList id="sheet" onNavigate={() => setNavOpen(false)} />
          <ProfileMenu />
        </div>
      </Drawer>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1120px] px-5 pb-28 pt-8 sm:px-8 lg:px-12 lg:pt-14 print:max-w-none print:p-0">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}>
            <Outlet />
          </motion.div>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
