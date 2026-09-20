import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExecutionWindowCard } from '@/components/ExecutionWindowCard';
import {
  BackLink, Badge, ErrorState, Facts, Modal, PageHeader, ProgressBar, Section, Skeleton, StatusBadge, type Tone,
} from '@/components/ui';
import { get } from '@/lib/api';
import { cn, fmtCr, fmtDate, humanize } from '@/lib/utils';
import type { Activity, ApprovalView, Escalation, Project, WindowView } from '@/types';

interface Detail {
  project: Project; activities: Activity[]; approvals: ApprovalView[];
  windows: WindowView[]; escalations: Escalation[];
}

const dot = (a: Activity) =>
  a.status === 'COMPLETED' ? 'bg-ok border-ok'
    : a.status === 'BLOCKED' ? 'bg-bad border-bad'
    : a.status === 'IN_PROGRESS' ? 'bg-accent border-accent'
    : 'bg-canvas border-line-strong';

const stateText = (a: Activity) =>
  a.status === 'BLOCKED' ? { text: 'Blocked', cls: 'text-bad' }
    : a.status === 'IN_PROGRESS' ? { text: 'In progress', cls: 'text-accent' }
    : a.status === 'COMPLETED' ? { text: 'Completed', cls: 'text-fg2' }
    : { text: 'Not started', cls: 'text-fg2' };

const healthTone = (v: number): Tone => (v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'bad');

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const [selected, setSelected] = useState<Activity | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['project', id], queryFn: () => get<Detail>(`/projects/${id}`) });

  if (isLoading) {
    return (
      <div className="space-y-12" aria-busy="true" aria-label="Loading project">
        <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>
        <Skeleton className="h-24" /><Skeleton className="h-40" /><Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !data) return <><BackLink to="/projects">Projects</BackLink><ErrorState what="this project" onRetry={() => refetch()} /></>;

  const { project: p, activities, approvals, windows } = data;
  const criticalIssues = approvals.filter((a) => a.sla.breached || a.sla.percentConsumed >= 75).length;
  const blockers = selected ? approvals.filter((a) => a.blocksActivityKeys.includes(selected.key)) : [];

  return (
    <div className="space-y-14 lg:space-y-16">
      <div>
        <BackLink to="/projects">Projects</BackLink>
        <PageHeader title={p.name} description={`${p.authority} · ${p.contractor} · ${p.location}`}
          actions={<StatusBadge status={p.status} />} />
      </div>

      <div className="grid gap-x-10 gap-y-8 border-y border-line py-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-foot text-fg2">Contract</p>
          <p className="num mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.025em]">{fmtCr(p.contractValueCr)}</p>
        </div>
        {([['Physical progress', p.physicalProgress], ['Schedule', p.scheduleProgress], ['Approval health', p.approvalHealth]] as const).map(([label, value]) => (
          <div key={label}>
            <p className="text-foot text-fg2">{label}</p>
            <p className="num mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.025em]">{value}%</p>
            <ProgressBar value={value} tone={healthTone(value)} className="mt-3" label={label} />
          </div>
        ))}
        <div>
          <p className="text-foot text-fg2">Needs attention</p>
          <p className={cn('num mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.025em]', criticalIssues > 0 && 'text-bad')}>{criticalIssues}</p>
          <p className="mt-3 text-foot text-fg2">{criticalIssues === 1 ? 'approval' : 'approvals'}</p>
        </div>
      </div>

      <Section title="Timeline" description="Select an activity to see what is holding it.">
        {/* Wide screens: a horizontal track */}
        <div className="hidden overflow-x-auto pb-4 md:block">
          <ol className="relative flex min-w-[880px] items-start">
            <span aria-hidden className="absolute left-0 right-0 top-[9px] h-px bg-line-strong" />
            {activities.map((a) => {
              const st = stateText(a);
              return (
                <li key={a.key} className="flex-1">
                  <button type="button" onClick={() => setSelected(a)} className="group flex w-full flex-col items-center px-1.5 text-center">
                    <span aria-hidden className={cn('relative z-10 h-[19px] w-[19px] rounded-full border-2 ring-[6px] ring-canvas transition-transform group-hover:scale-110', dot(a))} />
                    <span className={cn('mt-3 text-foot leading-tight', a.isMilestone ? 'font-semibold text-fg' : 'font-medium text-fg2')}>{a.name}</span>
                    <span className="num mt-1 text-cap text-fg2">{fmtDate(a.plannedEnd)}</span>
                    {(a.status === 'BLOCKED' || a.status === 'IN_PROGRESS') && <span className={cn('mt-1 text-cap font-medium', st.cls)}>{st.text}</span>}
                    {a.isCritical && <span className="mt-0.5 text-cap text-fg2">Critical path</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Phones: a vertical list */}
        <ol className="divide-y divide-line border-y border-line md:hidden">
          {activities.map((a) => {
            const st = stateText(a);
            return (
              <li key={a.key}>
                <button type="button" onClick={() => setSelected(a)} className="flex w-full items-center gap-4 py-4 text-left">
                  <span aria-hidden className={cn('h-3.5 w-3.5 shrink-0 rounded-full border-2', dot(a))} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-body', a.isMilestone ? 'font-semibold' : 'font-medium')}>{a.name}</span>
                    <span className="block text-foot text-fg2">{fmtDate(a.plannedEnd)}{a.isCritical && ' · Critical path'}</span>
                  </span>
                  <span className={cn('shrink-0 text-foot font-medium', st.cls)}>{st.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Section>

      <div className="grid gap-x-16 gap-y-14 xl:grid-cols-2">
        <Section title="Approvals" description="Decisions this package depends on."
          action={<Link to={`/approvals?projectId=${id}`} className="btn-link">Open all →</Link>}>
          <ul className="divide-y divide-line border-y border-line">
            {approvals.map((a) => (
              <li key={a.key}>
                <Link to={`/approvals/${id}/${a.key}`}
                  className="flex items-center justify-between gap-4 rounded py-4 transition-colors hover:bg-subtle sm:-mx-3 sm:px-3">
                  <span className="min-w-0">
                    <span className="block text-body font-medium">{a.name}</span>
                    <span className="block text-foot text-fg2">{a.department}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <StatusBadge status={a.status} />
                    <span className={cn('mt-1 block text-foot', a.sla.breached ? 'text-bad' : 'text-fg2')}>{a.sla.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Execution windows" description="Restricted opportunities held by this package.">
          {windows.length
            ? <div className="space-y-5">{windows.map((w) => <ExecutionWindowCard key={w.id} w={w} compact />)}</div>
            : <p className="text-body text-fg2">This package has no restricted execution windows.</p>}
        </Section>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name ?? ''}
        description={selected ? [humanize(selected.status), selected.isMilestone ? 'Milestone' : null].filter(Boolean).join(' · ') : undefined}>
        {selected && (
          <div className="space-y-7 pb-2">
            <Facts className="lg:grid-cols-2" items={[
              ['Planned start', fmtDate(selected.plannedStart, { year: 'numeric' })],
              ['Planned finish', fmtDate(selected.plannedEnd, { year: 'numeric' })],
              ['Progress', `${selected.progress}%`],
              ['Float', `${selected.floatDays} days`],
            ]} />
            <ProgressBar value={selected.progress} tone={selected.status === 'BLOCKED' ? 'bad' : 'info'} label="Activity progress" />
            <div>
              <h3 className="text-body font-semibold">Blocked by</h3>
              {blockers.length ? (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {blockers.map((b) => (
                    <li key={b.key}>
                      <Link to={`/approvals/${id}/${b.key}`} onClick={() => setSelected(null)}
                        className="flex items-center justify-between gap-4 py-3 text-body">
                        <span className="font-medium">{b.name}</span>
                        <Badge tone={b.sla.breached ? 'bad' : 'warn'}>{b.sla.label}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-1.5 text-body text-fg2">Nothing is holding this activity.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
