import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fmtDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', ...opts });

export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtCr = (n?: number) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')} Cr`);

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "SLA_BREACHED" → "SLA breached" */
export const humanize = (s: string) => {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace(/\bsla\b/gi, 'SLA');
};

export const initials = (name?: string) =>
  (name ?? '').split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

export function durationParts(ms: number) {
  const abs = Math.abs(ms);
  return {
    negative: ms < 0,
    days: Math.floor(abs / 86400000),
    hours: Math.floor((abs / 3600000) % 24),
    minutes: Math.floor((abs / 60000) % 60),
    seconds: Math.floor((abs / 1000) % 60),
  };
}

export function fmtDuration(ms: number) {
  const { days, hours, minutes } = durationParts(ms);
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

export const riskTone = (risk?: string) =>
  risk === 'CRITICAL' || risk === 'HIGH' ? 'bad' : risk === 'MEDIUM' ? 'warn' : 'ok';

export const firstName = (name?: string) => {
  const parts = (name ?? '').trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
};
