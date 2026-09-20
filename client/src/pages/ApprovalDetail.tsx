import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Countdown } from '@/components/Countdown';
import { ImpactGraph } from '@/components/ImpactGraph';
import {
  Alert, BackLink, Badge, Button, buttonClass, ConfirmDialog, ErrorState, Facts, ProgressBar, Section, Skeleton, StatusBadge, useToast,
  type Tone,
} from '@/components/ui';
import { get, humanError, post } from '@/lib/api';
import { cn, fmtDate, fmtDateTime, fmtTime, humanize } from '@/lib/utils';
import type { ApprovalView, ImpactRadius, WindowView } from '@/types';

type Detail = ApprovalView & { impact: ImpactRadius | null };

function DetailSkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading approval">
      <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>
      <Skeleton className="h-24" /><Skeleton className="h-[340px]" />
    </div>
  );
}

export default function ApprovalDetail() {
  const { projectId = '', key = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['approval', projectId, key],
    queryFn: () => get<Detail>(`/approvals/${projectId}/${key}`),
  });
  const { data: windows = [] } = useQuery({
    queryKey: ['windows', projectId],
    queryFn: () => get<WindowView[]>(`/windows?projectId=${projectId}`),
  });

  const escalate = useMutation({
    mutationFn: () => post('/escalations', { projectId, approvalKey: key }),
    onSuccess: () => {
      setConfirming(false);
      toast({ title: 'Escalation raised', detail: 'A senior officer has been notified.', tone: 'ok' });
      qc.invalidateQueries({ queryKey: ['escalations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      navigate('/escalations');
    },
    onError: (e) => { setConfirming(false); toast({ title: "Couldn't raise the escalation", detail: humanError(e), tone: 'bad' }); },
  });

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) return (
    <><BackLink to="/approvals">Approvals</BackLink><ErrorState what="this approval" onRetry={() => refetch()} /></>
  );

  const impact = data.impact;
  const window = windows.find((w) => impact?.windows.some((iw) => iw.id === w.id));
  const breached = data.sla.breached;
  const cleared = data.status === 'APPROVED';
  const consumedTone: Tone = breached ? 'bad' : 'warn';

  return (
    <div className="space-y-14 lg:space-y-16">
      <div>
        <BackLink to="/approvals">Approvals</BackLink>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-title">{data.name}</h1>
          <StatusBadge status={data.status} />
        </div>
        <p className="mt-3 text-callout text-fg2">
          {data.department}
          <span aria-hidden className="mx-2 text-fg3">·</span>
          <Link to={`/projects/${data.projectId}`} className="hover:text-fg hover:underline hover:underline-offset-4">{data.projectName}</Link>
          <span aria-hidden className="mx-2 text-fg3">·</span>
          <span className="num">{data.referenceNo}</span>
        </p>
        {data.notes && <p className="mt-4 max-w-2xl text-pretty text-body text-fg2">{data.notes}</p>}

        {/* The one number that matters, and the one thing to do about it */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-y border-line py-8">
          <div>
            <p className="text-foot text-fg2">{cleared ? 'Decision' : breached ? 'Overdue by' : 'Time remaining'}</p>
            {cleared
              ? <p className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.03em] text-ok sm:text-[52px]">Cleared</p>
              : <Countdown target={data.dueAt} size="xl" className="mt-2" />}
          </div>
          {!cleared && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button onClick={() => navigate(`/impact?project=${projectId}&approval=${key}`)}>
                <Sparkles aria-hidden size={16} /> Simulate delay
              </Button>
              <Button variant="primary" onClick={() => setConfirming(true)}>Escalate</Button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Facts items={[
            ['Submitted', fmtDateTime(data.submittedAt)],
            ['Service standard', `${data.slaDays} days`],
            ['Decision due', fmtDateTime(data.dueAt)],
            ...(cleared ? [] : [['Standard used', `${data.sla.percentConsumed}%`] as [string, string]]),
          ]} />
          {!cleared && (
            <ProgressBar value={Math.min(100, data.sla.percentConsumed)} tone={consumedTone} className="mt-6" label="Service standard consumed" />
          )}
        </div>
      </div>

      <Section title={cleared ? 'What depended on this' : 'What this is holding back'}
        description={cleared ? 'This decision has been made. These are the activities that relied on it.' : 'The work that cannot move until this decision is made.'}>
        <div className="mb-8 grid grid-cols-3 gap-6">
          {([
            ['Activities', impact?.counts.activities ?? 0],
            ['Milestones', impact?.counts.milestones ?? 0],
            ['Execution windows', impact?.counts.windows ?? 0],
          ] as const).map(([label, value]) => (
            <div key={label}>
              <p className="text-foot text-fg2">{label}</p>
              <p className="num mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em]">{value}</p>
            </div>
          ))}
        </div>
        {impact && impact.counts.activities > 0 ? (
          <>
            <ImpactGraph impact={impact} approvalName={data.name} />
            <p className="mt-4 text-foot text-fg2">
              {cleared ? 'Impact while pending' : 'Potential impact'}: <Badge tone={impact.level === 'LOW' ? 'ok' : impact.level === 'MEDIUM' ? 'warn' : 'bad'}>{humanize(impact.level)}</Badge>
            </p>
          </>
        ) : (
          <p className="text-body text-fg2">This approval does not gate any scheduled activity.</p>
        )}
      </Section>

      {window && (
        <Section title="Execution window" description="The time-critical opportunity this decision affects.">
          <div className="grid gap-x-12 gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-foot text-fg2">Opens in</p>
              <Countdown target={window.startAt} className="mt-1" />
              <p className="mt-3 text-body font-medium">
                {fmtDate(window.startAt, { weekday: 'long' })}, {fmtTime(window.startAt)}–{fmtTime(window.endAt)}
              </p>
              <p className="mt-1 text-body text-fg2">{window.constraint}</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <StatusBadge status={window.status} />
                <span className="num text-body font-medium">{window.readiness}% ready</span>
              </div>
              <ProgressBar value={window.readiness} tone={window.status === 'AT_RISK' ? 'bad' : 'ok'} className="mt-3" label="Window readiness" />
              {window.missing.length > 0 && (
                <Alert tone="bad" className="mt-5">Missing prerequisite: <span className="font-medium text-fg">{window.missing.join(', ')}</span></Alert>
              )}
              <Link to="/execution-windows" className="btn-link mt-4">View readiness →</Link>
            </div>
          </div>
        </Section>
      )}

      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        <Section title="Evidence on record" description="Correspondence supporting the delay dossier.">
          {data.evidence.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {data.evidence.map((e) => (
                <li key={e.ref} className="flex items-baseline justify-between gap-4 py-3.5">
                  <span className="min-w-0">
                    <span className="block text-body text-fg">{e.label}</span>
                    <span className="block text-foot text-fg2">{e.ref}</span>
                  </span>
                  <span className="num shrink-0 text-foot text-fg2">{fmtDate(e.date)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-body text-fg2">No correspondence has been recorded against this approval yet.</p>}
          <Link to={`/reports?project=${projectId}&approval=${key}`} className={cn(buttonClass('secondary'), 'mt-6')}>Build delay dossier</Link>
        </Section>

        <Section title="Downstream activities" description="Ordered by distance from the pending decision.">
          {impact?.activities.length ? (
            <ol className="relative ml-[5px] border-l border-line-strong/70 pl-6">
              {impact.activities.map((a) => (
                <li key={a.key} className="relative pb-6 last:pb-0">
                  <span aria-hidden className={cn('absolute -left-[30px] top-[7px] h-2.5 w-2.5 rounded-full ring-4 ring-canvas',
                    a.depth === 0 ? 'bg-bad' : a.isMilestone ? 'bg-warn' : 'bg-fg3')} />
                  <p className="text-body font-medium">{a.name}</p>
                  <p className="mt-0.5 text-foot text-fg2">
                    {a.depth === 0 ? (cleared ? 'Directly depended on it' : 'Directly blocked') : `${a.depth} step${a.depth === 1 ? '' : 's'} away`}
                    {a.isMilestone && ' · Milestone'} · {a.floatDays} days of float · {humanize(a.status).toLowerCase()}
                  </p>
                </li>
              ))}
            </ol>
          ) : <p className="text-body text-fg2">Nothing downstream depends on this decision.</p>}
        </Section>
      </div>

      <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} title="Escalate to Level 2?"
        body="A senior officer will be notified, with the impact assessment attached."
        confirmLabel="Escalate" loading={escalate.isPending} onConfirm={() => escalate.mutate()} />
    </div>
  );
}
