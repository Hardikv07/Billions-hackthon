import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronLeft, Info, Loader2, Search, X,
} from 'lucide-react';
import {
  createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode, type RefObject, type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cn, humanize } from '@/lib/utils';

/* =========================================================================
   Tone — colour is used only to carry meaning.
   ok = success · warn = needs attention · bad = critical · info = the accent
   ========================================================================= */

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

export const toneSoft: Record<Tone, string> = {
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/[0.12] text-warn',
  bad: 'bg-bad/10 text-bad',
  info: 'bg-accent/10 text-accent',
  neutral: 'bg-sunken text-fg2',
};
export const toneText: Record<Tone, string> = {
  ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', info: 'text-accent', neutral: 'text-fg',
};
export const toneFill: Record<Tone, string> = {
  ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-accent', neutral: 'bg-fg3',
};
const toneIcon = {
  ok: CheckCircle2, warn: AlertTriangle, bad: AlertCircle, info: Info, neutral: Info,
} as const;

/* ------------------------------------------------------------------ badge */

export function Badge({ tone = 'neutral', children, className }: {
  tone?: Tone; children: ReactNode; className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-cap font-medium', toneSoft[tone], className)}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  SLA_BREACHED: 'bad', AT_RISK: 'warn', UNDER_REVIEW: 'info', SUBMITTED: 'info',
  CLARIFICATION: 'warn', APPROVED: 'ok', REJECTED: 'bad', NOT_SUBMITTED: 'neutral',
  LOST: 'bad', READY: 'ok', PLANNED: 'info', COMPLETED: 'ok',
  ON_TRACK: 'ok', WATCH: 'warn', DELAYED: 'bad', BLOCKED: 'bad',
  IN_PROGRESS: 'info', NOT_STARTED: 'neutral',
  NEW: 'info', ACKNOWLEDGED: 'warn', ESCALATED: 'bad', RESOLVED: 'ok',
  LOW: 'ok', MEDIUM: 'warn', HIGH: 'bad', CRITICAL: 'bad',
};
export const toneOf = (status: string): Tone => statusTone[status] ?? 'neutral';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge tone={toneOf(status)} className={className}>{humanize(status)}</Badge>;
}

/* ----------------------------------------------------------------- button */

type Variant = 'primary' | 'secondary' | 'danger' | 'plain';
const variantClass: Record<Variant, string> = {
  primary: 'btn-primary', secondary: 'btn-secondary', danger: 'btn-danger', plain: 'btn-plain',
};

/** Class string for using button styling on a <Link> or <a>. */
export const buttonClass = (variant: Variant = 'secondary', size: 'sm' | 'md' | 'lg' = 'md') =>
  cn('btn', variantClass[variant], size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg');

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden size={16} className={cn('animate-spin', className)} />;
}

export function Button({ variant = 'secondary', size = 'md', loading, className, children, onClick, type = 'button', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  return (
    <button {...rest} type={type} aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      className={cn(buttonClass(variant, size), className)}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="btn-link -ml-1 mb-6 text-foot">
      <ChevronLeft size={16} aria-hidden /> {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({ label, helper, error, children, className }: {
  label: string; helper?: ReactNode; error?: string; className?: string;
  children: (p: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const descId = `${id}-desc`;
  const note = error ?? helper;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-foot font-medium text-fg">{label}</label>
      {children({ id, 'aria-describedby': note ? descId : undefined, 'aria-invalid': error ? true : undefined })}
      {note && <p id={descId} className={cn('mt-1.5 text-foot', error ? 'text-bad' : 'text-fg2')}>{note}</p>}
    </div>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }>(
  ({ className, children, compact, ...rest }, ref) => (
    <div className={cn('relative', className)}>
      <select ref={ref} {...rest} className={cn('input', compact && 'h-9 text-foot [@media(pointer:coarse)]:h-11')}>{children}</select>
      <ChevronDown aria-hidden size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-fg3" />
    </div>
  ),
);
Select.displayName = 'Select';

export function SearchField({ value, onChange, placeholder, label, className, onSubmit, busy }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string;
  className?: string; onSubmit?: () => void; busy?: boolean;
}) {
  return (
    <div className={cn('relative', className)} role="search">
      <Search aria-hidden size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg3" />
      <input type="search" value={value} aria-label={label} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.(); }}
        className="input pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden" />
      {busy ? <Spinner className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg3" />
        : value && (
          <button type="button" aria-label="Clear search" onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-fg3 hover:bg-sunken hover:text-fg">
            <X size={14} aria-hidden />
          </button>
        )}
    </div>
  );
}

/** A small set of mutually exclusive choices — filters, views, quick presets. */
export function Segmented<T extends string | number>({ value, onChange, options, label, className }: {
  value: T; onChange: (v: T) => void; label: string; className?: string;
  options: { value: T; label: string }[];
}) {
  const group = useId();
  return (
    <div role="group" aria-label={label}
      className={cn('inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control bg-sunken/80 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={String(o.value)} type="button" aria-pressed={active} onClick={() => onChange(o.value)}
            className={cn('relative h-8 whitespace-nowrap rounded-[8px] px-3.5 text-foot font-medium transition-colors [@media(pointer:coarse)]:h-10',
              active ? 'text-fg' : 'text-fg2 hover:text-fg')}>
            {active && (
              <motion.span layoutId={group} className="absolute inset-0 rounded-[8px] bg-thumb shadow-card"
                transition={{ type: 'spring', stiffness: 520, damping: 42 }} />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- structure */

export function PageHeader({ title, description, actions }: {
  title: string; description?: ReactNode; actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0">
        <h1 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-title">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-pretty text-callout text-fg2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, description, action, children, className }: {
  title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={id} className="text-[22px] font-semibold leading-tight tracking-[-0.022em] sm:text-heading">{title}</h2>
          {description && <p className="mt-1.5 text-body text-fg2">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'neutral', className }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-foot text-fg2">{label}</p>
      <p className={cn('num mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.03em] sm:text-[36px]', toneText[tone])}>{value}</p>
      {hint && <p className="mt-2 text-foot text-fg2">{hint}</p>}
    </div>
  );
}

/** Label / value pairs — quiet metadata. */
export function Facts({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4', className)}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-foot text-fg2">{k}</dt>
          <dd className="num mt-1 text-body font-medium text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, tone = 'info', className, label }: {
  value: number; tone?: Tone; className?: string; label?: string;
}) {
  const target = Math.min(100, Math.max(0, value));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div role="progressbar" aria-valuenow={Math.round(target)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-ease', toneFill[tone])} style={{ width: `${shown}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-sunken/80', className)} />;
}

/* ---------------------------------------------------------------- feedback */

export function EmptyState({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-fg3">{icon}</div>}
      <h3 className="text-sub font-semibold tracking-[-0.014em]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-pretty text-body text-fg2">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ what, onRetry, title = 'Something went wrong.' }: {
  what: string; onRetry?: () => void; title?: string;
}) {
  return (
    <div role="alert">
      <EmptyState icon={<AlertCircle size={28} strokeWidth={1.5} aria-hidden />} title={title}
        body={`We couldn't load ${what}. Check your connection and try again.`}
        action={onRetry && <Button onClick={onRetry}>Try again</Button>} />
    </div>
  );
}

export function Alert({ tone = 'info', title, children, className }: {
  tone?: Tone; title?: string; children?: ReactNode; className?: string;
}) {
  const Icon = toneIcon[tone];
  const bg = { ok: 'bg-ok/[0.08]', warn: 'bg-warn/[0.09]', bad: 'bg-bad/[0.08]', info: 'bg-accent/[0.08]', neutral: 'bg-subtle' }[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-control px-4 py-3.5', bg, className)}>
      <Icon aria-hidden size={18} className={cn('mt-0.5 shrink-0', toneText[tone === 'neutral' ? 'info' : tone])} />
      <div className="min-w-0 text-body">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && <div className={cn('text-fg2', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-cap text-canvas opacity-0 shadow-float transition-opacity duration-150 group-focus:opacity-100 group-hover:opacity-100">
        {content}
      </span>
    </span>
  );
}

/* --------------------------------------------------------------- overlays */

function useLockScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Move focus into the dialog, keep it there, close on Escape, and hand focus back on close. */
function useDialog(ref: RefObject<HTMLElement>, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLockScroll();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const items = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (items()[0] ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const f = items();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [ref]);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken/70 text-fg2 transition-colors hover:bg-sunken hover:text-fg">
      <X size={16} aria-hidden />
    </button>
  );
}

const scrim = 'bg-black/30 backdrop-blur-[3px] dark:bg-black/55';

function ModalSurface({ onClose, title, description, footer, children, size }: {
  onClose: () => void; title: string; description?: string; footer?: ReactNode; children?: ReactNode; size: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, onClose);
  return (
    <motion.div className={cn('fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 sm:p-6', scrim)}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        className={cn('w-full rounded-sheet bg-surface shadow-float', { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }[size])}>
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sub font-semibold tracking-[-0.014em]">{title}</h2>
            {description && <p className="mt-1.5 text-body text-fg2">{description}</p>}
          </div>
          <CloseButton onClose={onClose} />
        </div>
        {children && <div className="px-6 pb-2 pt-3">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-5 sm:flex-row sm:justify-end">{footer}</div>}
        {!footer && <div className="h-4" />}
      </motion.div>
    </motion.div>
  );
}

export function Modal({ open, onClose, title, description, footer, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; description?: string; footer?: ReactNode;
  children?: ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  return createPortal(
    <AnimatePresence>
      {open && <ModalSurface onClose={onClose} title={title} description={description} footer={footer} size={size}>{children}</ModalSurface>}
    </AnimatePresence>,
    document.body,
  );
}

/** For one decision the user must make deliberately. Keep the copy short. */
export function ConfirmDialog({ open, onClose, title, body, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', loading, onConfirm }: {
  open: boolean; onClose: () => void; title: string; body: string; confirmLabel: string;
  cancelLabel?: string; tone?: 'primary' | 'danger'; loading?: boolean; onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={body} size="sm"
      footer={<>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button variant={tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>} />
  );
}

function DrawerSurface({ onClose, title, children, side }: {
  onClose: () => void; title: string; children: ReactNode; side: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, onClose);
  const from = side === 'right' ? 40 : -40;
  return (
    <motion.div className={cn('fixed inset-0 z-50 flex', side === 'right' ? 'justify-end' : 'justify-start', scrim)}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        initial={{ x: from, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: from / 2, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        className={cn('flex h-full w-full flex-col bg-surface shadow-float',
          side === 'right' ? 'sm:max-w-[440px] sm:rounded-l-sheet' : 'max-w-[300px] rounded-r-sheet')}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id={titleId} className="min-w-0 truncate text-sub font-semibold tracking-[-0.014em]">{title}</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </motion.aside>
    </motion.div>
  );
}

/** A sheet that slides in from the edge. Right by default; left for navigation. */
export function Drawer({ open, onClose, title, children, side = 'right' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; side?: 'left' | 'right';
}) {
  return createPortal(
    <AnimatePresence>{open && <DrawerSurface onClose={onClose} title={title} side={side}>{children}</DrawerSurface>}</AnimatePresence>,
    document.body,
  );
}

/** Small anchored panel for menus and quick lists. Closes on outside click and Escape. */
export function Popover({ trigger, children, align = 'right', side = 'bottom', className }: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right'; side?: 'top' | 'bottom'; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      wrap.current?.querySelector<HTMLElement>('button')?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div role="dialog"
            initial={{ opacity: 0, y: side === 'top' ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className={cn('absolute z-50 rounded-card bg-surface shadow-float',
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2', align === 'right' ? 'right-0' : 'left-0', className)}>
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ toast */

interface ToastItem { id: number; title: string; detail?: string; tone: Tone }
type ToastInput = Omit<ToastItem, 'id' | 'tone'> & { tone?: Tone };
const ToastCtx = createContext<(t: ToastInput) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-2), { ...t, tone: t.tone ?? 'neutral', id }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4200);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] print:hidden" role="status" aria-live="polite">
          <AnimatePresence>
            {items.map((t) => {
              const Icon = t.tone === 'ok' ? Check : toneIcon[t.tone];
              return (
                <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card bg-surface px-4 py-3 shadow-float">
                  <Icon aria-hidden size={18} className={cn('mt-0.5 shrink-0', toneText[t.tone === 'neutral' ? 'info' : t.tone])} />
                  <div className="min-w-0">
                    <p className="text-body font-medium text-fg">{t.title}</p>
                    {t.detail && <p className="mt-0.5 text-foot text-fg2">{t.detail}</p>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}
