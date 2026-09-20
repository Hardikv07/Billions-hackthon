import { useQuery } from '@tanstack/react-query';
import { Timer } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Countdown } from '@/components/Countdown';
import { ExecutionWindowCard } from '@/components/ExecutionWindowCard';
import { Drawer, EmptyState, ErrorState, PageHeader, ProgressBar, Skeleton, Stat, StatusBadge } from '@/components/ui';
import { get } from '@/lib/api';
import { cn, fmtDate, fmtDateTime, fmtTime } from '@/lib/utils';
import type { ApprovalView, WindowView } from '@/types';

function Readiness({ w }: { w: WindowView }) {
  const { data: blockers = [] } = useQuery({
    queryKey: ['window-blockers', w.id],
    queryFn: () => get<{ key: string; name: string; sla: ApprovalView['sla'] }[]>(`/windows/${w.id}/blockers`),
  });
  const gap = Math.round((new Date(w.nextWindowAt).getTime() - new Date(w.startAt).getTime()) / 86400000) || 7;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-foot text-fg2">Window opens in</p>
        <Countdown target={w.startAt} size="xl" className="mt-2" />
        <p className="mt-4 text-body font-medium">{fmtDate(w.startAt, { weekday: 'long' })}, {fmtTime(w.startAt)}–{fmtTime(w.endAt)}</p>
        <p className="mt-1 text-body text-fg2">{w.constraint}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-body font-semibold">Readiness</h3>
          <span className="num text-sub font-semibold">{w.readiness}%</span>
        </div>
        <ProgressBar value={w.readiness} tone={w.readiness === 100 ? 'ok' : 'warn'} className="mt-3" label="Readiness" />
      </div>

      <div>
        <h3 className="text-body font-semibold">Prerequisites</h3>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {w.checklist.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-4 py-3">
              <span className={cn('text-body', c.ready ? 'text-fg2' : 'font-medium text-fg')}>{c.label}</span>
              <span className={cn('text-foot font-medium', c.ready ? 'text-ok' : 'text-bad')}>{c.ready ? 'Ready' : 'Pending'}</span>
            </li>
          ))}
        </ul>
      </div>

      {blockers.length > 0 && (
        <div>
          <h3 className="text-body font-semibold">Approvals still needed</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {blockers.map((b) => (
              <li key={b.key}>
                <Link to={`/approvals/${w.projectId}/${b.key}`} className="flex items-center justify-between gap-4 rounded py-3.5 transition-colors hover:bg-subtle sm:-mx-3 sm:px-3">
                  <span className="min-w-0">
                    <span className="block text-body font-medium">{b.name}</span>
                    <span className="block text-foot text-fg2">{b.sla.label}</span>
                  </span>
                  <StatusBadge status={b.sla.derivedStatus} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-card bg-subtle px-5 py-4">
        <p className="text-foot text-fg2">If this window is missed</p>
        <p className="mt-1 text-body font-medium">The next one opens {fmtDateTime(w.nextWindowAt)}</p>
        <p className="mt-0.5 text-foot text-fg2">Windows recur every {gap} days under the sanctioned block.</p>
      </div>
    </div>
  );
}

export default function ExecutionWindows() {
  const [selected, setSelected] = useState<WindowView | null>(null);
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['windows'], queryFn: () => get<WindowView[]>('/windows') });

  const atRisk = data.filter((w) => w.status === 'AT_RISK').length;
  const grouped = data.reduce<Record<string, WindowView[]>>((acc, w) => {
    const key = fmtDate(w.startAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    acc[key] = [...(acc[key] ?? []), w];
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      <PageHeader title="Execution windows" description="Time-critical opportunities to execute work."
        actions={!isLoading && !isError && data.length > 0 ? (
          <div className="flex gap-10">
            <Stat label="Scheduled" value={data.length} />
            <Stat label="At risk" value={atRisk} tone={atRisk ? 'bad' : 'neutral'} />
          </div>
        ) : undefined} />

      {isLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading execution windows">{[0, 1].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : isError ? (
        <ErrorState what="your execution windows" onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={<Timer size={28} strokeWidth={1.5} aria-hidden />} title="No windows scheduled"
          body="Execution windows appear here once a tender with restricted working hours has been processed." />
      ) : (
        Object.entries(grouped).map(([day, windows]) => (
          <section key={day} aria-label={day}>
            <h2 className="mb-5 text-sub font-semibold tracking-[-0.014em] text-fg">{day}</h2>
            <div className="space-y-5">
              {windows.map((w) => <ExecutionWindowCard key={w.id} w={w} onOpen={setSelected} />)}
            </div>
          </section>
        ))
      )}

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${selected.title} readiness` : 'Readiness'}>
        {selected && <Readiness w={selected} />}
      </Drawer>
    </div>
  );
}
