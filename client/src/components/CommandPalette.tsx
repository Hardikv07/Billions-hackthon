import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { get } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Hit { id: string; label: string; sub: string; href: string }
type Results = Record<'projects' | 'approvals' | 'tenders' | 'departments', Hit[]>;

const routes: Hit[] = [
  { id: 'r1', label: 'Overview', sub: 'What needs attention today', href: '/' },
  { id: 'r2', label: 'Tenders', sub: 'Upload and understand tender documents', href: '/tenders' },
  { id: 'r3', label: 'Projects', sub: 'Packages under delivery', href: '/projects' },
  { id: 'r4', label: 'Approvals', sub: 'Pending government decisions', href: '/approvals' },
  { id: 'r5', label: 'Execution windows', sub: 'Time-critical work', href: '/execution-windows' },
  { id: 'r6', label: 'Impact simulator', sub: 'What a delay would cost', href: '/impact' },
  { id: 'r7', label: 'Escalations', sub: 'Issues raised for a decision', href: '/escalations' },
  { id: 'r8', label: 'Breached approvals', sub: 'Past their service standard', href: '/approvals?view=breached' },
  { id: 'r9', label: 'Reports', sub: 'Delay dossiers and project memory', href: '/reports' },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return createPortal(
    <AnimatePresence>{open && <Palette onOpenChange={onOpenChange} />}</AnimatePresence>,
    document.body,
  );
}

function Palette({ onOpenChange }: { onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const searching = q.trim().length > 1;

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: () => get<Results>(`/search?q=${encodeURIComponent(q)}`),
    enabled: searching,
  });

  const groups = useMemo(() => {
    const filteredRoutes = routes.filter((r) => r.label.toLowerCase().includes(q.trim().toLowerCase()));
    return [
      { name: 'Go to', items: q.trim() ? filteredRoutes : routes },
      { name: 'Projects', items: data?.projects ?? [] },
      { name: 'Approvals', items: data?.approvals ?? [] },
      { name: 'Tenders', items: data?.tenders ?? [] },
      { name: 'Departments', items: data?.departments ?? [] },
    ].filter((g) => g.items.length);
  }, [q, data]);

  const flat = groups.flatMap((g) => g.items);
  const activeId = flat[cursor] ? `${listId}-${flat[cursor].id}` : undefined;

  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => { document.getElementById(activeId ?? '')?.scrollIntoView({ block: 'nearest' }); }, [activeId]);

  const go = (href: string) => { onOpenChange(false); navigate(href); };

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/30 p-4 pt-[12vh] backdrop-blur-[3px] dark:bg-black/55"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}>
      <motion.div role="dialog" aria-modal="true" aria-label="Search"
        initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.99 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-xl overflow-hidden rounded-sheet bg-surface shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search aria-hidden size={18} className="shrink-0 text-fg3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={activeId} aria-autocomplete="list"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              if (e.key === 'Enter' && flat[cursor]) go(flat[cursor].href);
              if (e.key === 'Escape') onOpenChange(false);
            }}
            placeholder="Search projects, approvals, tenders…"
            aria-label="Search"
            className="h-14 w-full bg-transparent text-callout text-fg placeholder:text-fg3 focus:outline-none" />
          {isFetching ? <Spinner className="shrink-0 text-fg3" />
            : <kbd className="shrink-0 rounded-md bg-sunken px-1.5 py-0.5 text-cap font-medium text-fg2">esc</kbd>}
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
          {groups.map((g) => (
            <div key={g.name} role="group" aria-label={g.name} className="py-1">
              <p className="px-3 py-1.5 text-cap font-medium text-fg2">{g.name}</p>
              {g.items.map((item) => {
                const index = flat.indexOf(item);
                const active = index === cursor;
                return (
                  <div key={item.id} id={`${listId}-${item.id}`} role="option" aria-selected={active}
                    onMouseMove={() => setCursor(index)} onClick={() => go(item.href)}
                    className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2.5', active && 'bg-sunken/80')}>
                    <span className="min-w-0">
                      <span className="block truncate text-body font-medium text-fg">{item.label}</span>
                      <span className="block truncate text-foot text-fg2">{item.sub}</span>
                    </span>
                    <ArrowRight aria-hidden size={15} className={cn('shrink-0 text-fg3 transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
                  </div>
                );
              })}
            </div>
          ))}
          {!groups.length && (
            <p className="px-4 py-10 text-center text-body text-fg2">
              {isFetching ? 'Searching…' : <>No results for “{q.trim()}”. Try a project, department or approval name.</>}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
