import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Countdown } from '@/components/Countdown';
import { Column, DataTable } from '@/components/DataTable';
import {
  Badge, buttonClass, ErrorState, PageHeader, ProgressBar, Section, Skeleton, Stat, StatusBadge, type Tone,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { get } from '@/lib/api';
import { cn, firstName, fmtDate, fmtTime, plural } from '@/lib/utils';
import type { Intervention, Overview as OverviewData } from '@/types';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const days = (n: number) => (Number.isInteger(n) ? plural(n, 'day') : `${n} days`);

/* One intervention: what is stuck, how late it is, what it puts at risk, what to do. */
function InterventionRow({ item, lead }: { item: Intervention; lead: boolean }) {
  const breached = item.breachedByDays > 0;
  const tone: Tone = breached ? 'bad' : 'warn';
  const action = lead ? 'Investigate' : item.window ? 'Review' : 'View impact';

  return (
    <li className="grid gap-x-10 gap-y-6 py-8 first:pt-0 last:pb-0 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-sub font-semibold tracking-[-0.014em]">{item.approvalName}</h3>
          <StatusBadge status={item.status} />
          {item.window?.status === 'AT_RISK' && <Badge tone="bad">Window at risk</Badge>}
        </div>
        <p className="mt-1.5 text-body text-fg2">
          <Link to={`/projects/${item.projectId}`} className="hover:text-fg hover:underline hover:underline-offset-4">{item.projectName}</Link>
          <span aria-hidden className="mx-2 text-fg3">·</span>{item.department}
        </p>
        {item.blocks.length > 0 && (
          <p className="mt-3 text-body text-fg2">Holding back <span className="font-medium text-fg">{item.blocks.join(', ')}</span></p>
        )}
      </div>

      <div>
        <p className="text-foot text-fg2">{breached ? 'Overdue by' : 'Time left'}</p>
        <p className={cn('num mt-1 text-[24px] font-semibold leading-tight tracking-[-0.025em]', breached ? 'text-bad' : 'text-warn')}>
          {breached ? days(item.breachedByDays) : item.slaLabel.replace(' remaining', '')}
        </p>
        <ProgressBar value={Math.min(100, item.percentConsumed)} tone={tone} className="mt-3 max-w-[200px]" label="Service standard consumed" />
        <p className="mt-2 text-foot text-fg2">{item.percentConsumed}% of the standard used</p>
      </div>

      <div>
        {item.window ? (
          <>
            <p className="text-foot text-fg2">Execution window opens in</p>
            <Countdown target={item.window.startAt} className="mt-1" />
            <p className="mt-2 text-foot text-fg2">{fmtDate(item.window.startAt, { weekday: 'long' })}, {fmtTime(item.window.startAt)}</p>
          </>
        ) : (
          <>
            <p className="text-foot text-fg2">Downstream impact</p>
            <p className="num mt-1 text-[24px] font-semibold leading-tight tracking-[-0.025em]">{item.activitiesAffected}</p>
            <p className="mt-2 text-foot text-fg2">{item.activitiesAffected === 1 ? 'activity' : 'activities'} affected</p>
          </>
        )}
      </div>

      <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-end">
        <Link to={`/approvals/${item.projectId}/${item.approvalKey}`} className={cn(buttonClass(lead ? 'primary' : 'secondary'), 'w-full sm:w-auto')}>
          {action}
        </Link>
      </div>
    </li>
  );
}

const riskOf = (score: number): { label: string; tone: Tone } =>
  score > 70 ? { label: 'High', tone: 'bad' } : score > 45 ? { label: 'Medium', tone: 'warn' } : { label: 'Low', tone: 'ok' };

type ProjectRow = OverviewData['projects'][number];

const projectColumns: Column<ProjectRow>[] = [
  { key: 'name', header: 'Project', render: (p) => (
    <div className="min-w-0">
      <Link to={`/projects/${p.id}`} className="text-body font-medium text-fg hover:text-accent">{p.name}</Link>
      <div className="mt-1 flex items-center gap-2 text-foot text-fg2">{p.code}<StatusBadge status={p.status} /></div>
    </div>
  ) },
  { key: 'progress', header: 'Progress', className: 'w-56', render: (p) => (
    <div>
      <span className="num text-body font-medium">{p.physicalProgress}%</span>
      <ProgressBar value={p.physicalProgress} className="mt-2" label="Physical progress" />
    </div>
  ) },
  { key: 'schedule', header: 'Schedule', render: (p) => (
    <span className={cn('num text-body', p.scheduleProgress < p.physicalProgress - 5 ? 'text-warn' : 'text-fg')}>{p.scheduleProgress}%</span>
  ) },
  { key: 'approvals', header: 'Approvals', render: (p) => (
    <span className={cn('num text-body', p.approvalHealth < 75 ? 'text-warn' : 'text-fg')}>{p.approvalHealth}%</span>
  ) },
  { key: 'risk', header: 'Risk', render: (p) => { const r = riskOf(p.riskScore); return <Badge tone={r.tone}>{r.label}</Badge>; } },
];

function OverviewSkeleton() {
  return (
    <div className="space-y-16" aria-busy="true" aria-label="Loading overview">
      <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-5 w-96 max-w-full" /></div>
      <div className="grid grid-cols-3 gap-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      <div className="space-y-8"><Skeleton className="h-6 w-56" />{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['overview'], queryFn: () => get<OverviewData>('/overview') });

  if (isLoading) return <OverviewSkeleton />;
  if (isError || !data) return <ErrorState what="your overview" onRetry={() => refetch()} />;

  const { metrics, interventions, projects, windows } = data;

  const attention: string[] = [];
  if (metrics.slaBreaches) attention.push(`${plural(metrics.slaBreaches, 'approval')} past the service standard`);
  if (metrics.criticalWindows) attention.push(`${plural(metrics.criticalWindows, 'execution window')} at risk`);
  const summary = attention.length ? `${attention.join(' and ')}.` : 'Everything is on track. Nothing needs your attention today.';

  const byDay = windows.reduce<Record<string, typeof windows>>((acc, w) => {
    const key = fmtDate(w.startAt, { weekday: 'long', day: 'numeric', month: 'short' });
    acc[key] = [...(acc[key] ?? []), w];
    return acc;
  }, {});

  return (
    <div className="space-y-14 lg:space-y-16">
      <PageHeader title={`${greeting()}, ${firstName(user?.name)}.`}
        description={`${summary} Across ${plural(metrics.activeProjects, 'active project')}.`} />

      <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-7">
        <Stat label="Pending approvals" value={metrics.pendingApprovals} className="pr-4 sm:pr-8" />
        <Stat label="Past standard" value={metrics.slaBreaches} tone={metrics.slaBreaches ? 'bad' : 'neutral'} className="px-4 sm:px-8" />
        <Stat label="Windows at risk" value={metrics.criticalWindows} tone={metrics.criticalWindows ? 'warn' : 'neutral'} className="pl-4 sm:pl-8" />
      </div>

      <Section title="Needs your attention" description="Pending government action that is becoming a delivery constraint."
        action={<Link to="/approvals?view=breached" className="btn-link">All breaches →</Link>}>
        {interventions.length ? (
          <ul className="divide-y divide-line">
            {interventions.map((item, i) => <InterventionRow key={item.approvalKey + item.projectId} item={item} lead={i === 0} />)}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-card bg-ok/[0.08] px-5 py-4 text-body">
            <CheckCircle2 aria-hidden size={18} className="shrink-0 text-ok" />
            No approval is holding up work right now.
          </div>
        )}
      </Section>

      <Section title="Coming up" description="Time-critical opportunities to execute work."
        action={<Link to="/execution-windows" className="btn-link">All windows →</Link>}>
        {windows.length ? (
          <div className="space-y-8">
            {Object.entries(byDay).map(([day, list]) => (
              <div key={day}>
                <h3 className="mb-1 text-foot font-medium text-fg2">{day}</h3>
                <ul className="divide-y divide-line border-y border-line">
                  {list.map((w) => (
                    <li key={w.id}>
                      <Link to="/execution-windows" className="grid gap-x-8 gap-y-1 rounded py-4 transition-colors hover:bg-subtle sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-baseline sm:px-3 sm:-mx-3">
                        <span className="num text-body text-fg2">{fmtTime(w.startAt)}–{fmtTime(w.endAt)}</span>
                        <span className="min-w-0">
                          <span className="block text-body font-medium text-fg">{w.title}</span>
                          <span className="block truncate text-foot text-fg2">{w.projectName}</span>
                        </span>
                        <span className="text-body sm:text-right">
                          <span className="num text-fg2">{w.readiness}% ready</span>
                          {w.missing.length > 0 && (
                            <span className="mt-0.5 flex items-center gap-1.5 text-foot text-bad sm:justify-end">
                              <AlertTriangle aria-hidden size={13} /> Missing {w.missing.join(', ')}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : <p className="text-body text-fg2">No execution windows are scheduled in the coming days.</p>}
      </Section>

      <Section title="Project health" description="Progress, schedule, approvals and risk across active projects.">
        <DataTable columns={projectColumns} rows={projects} getKey={(p) => p.id} />
      </Section>
    </div>
  );
}
