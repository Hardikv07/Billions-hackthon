import { Check, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Countdown } from './Countdown';
import { ProgressBar, StatusBadge, type Tone } from './ui';
import { cn, fmtDate, fmtTime } from '@/lib/utils';
import type { WindowView } from '@/types';

/** One card because these facts genuinely belong together: when, how ready, and what is missing. */
export function ExecutionWindowCard({ w, onOpen, compact }: { w: WindowView; onOpen?: (w: WindowView) => void; compact?: boolean }) {
  const atRisk = w.status === 'AT_RISK' || w.status === 'LOST';
  const tone: Tone = atRisk ? 'bad' : w.readiness === 100 ? 'ok' : 'warn';

  return (
    <article className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sub font-semibold tracking-[-0.014em]">{w.title}</h3>
            <StatusBadge status={w.status} />
          </div>
          <p className="mt-1.5 text-body text-fg2">
            <Link to={`/projects/${w.projectId}`} className="hover:text-fg hover:underline hover:underline-offset-4">{w.projectName}</Link>
            <span aria-hidden className="mx-2 text-fg3">·</span>{w.authority}
          </p>
        </div>
        <div>
          <p className="text-foot text-fg2">Opens in</p>
          <Countdown target={w.startAt} className="mt-1" />
        </div>
      </div>

      <p className="mt-5 text-body text-fg">
        {fmtDate(w.startAt, { weekday: 'long' })}, {fmtTime(w.startAt)}–{fmtTime(w.endAt)}
        <span className="text-fg2"> · {w.constraint}</span>
      </p>

      <div className={cn('mt-6 grid gap-x-10 gap-y-6 border-t border-line pt-6', !compact && 'md:grid-cols-[180px_1fr]')}>
        <div>
          <p className="text-foot text-fg2">Readiness</p>
          <p className={cn('num mt-1 text-[32px] font-semibold leading-none tracking-[-0.03em]', { bad: 'text-bad', ok: 'text-ok', warn: 'text-warn', info: '', neutral: '' }[tone])}>{w.readiness}%</p>
          <ProgressBar value={w.readiness} tone={tone} className="mt-3" label="Readiness" />
        </div>
        <ul className={cn('grid content-start gap-x-6 gap-y-3', !compact && 'sm:grid-cols-2')}>
          {w.checklist.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5 text-body">
              {c.ready
                ? <Check size={16} aria-hidden className="mt-1 shrink-0 text-ok" />
                : <Minus size={16} aria-hidden className="mt-1 shrink-0 text-bad" />}
              <span className={c.ready ? 'text-fg2' : 'font-medium text-fg'}>
                {c.label}
                <span className="sr-only">{c.ready ? ' — ready' : ' — pending'}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {onOpen && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-body text-fg2">
            {w.missing.length ? <>Missing <span className="font-medium text-fg">{w.missing.join(', ')}</span></> : 'All prerequisites are closed.'}
          </p>
          <button type="button" className="btn-link" onClick={() => onOpen(w)}>View readiness →</button>
        </div>
      )}
    </article>
  );
}
