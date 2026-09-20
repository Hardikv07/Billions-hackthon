import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Field, PageHeader, Segmented, Select, StatusBadge, useToast, type Tone } from '@/components/ui';
import { get, humanError, post } from '@/lib/api';
import { cn, fmtDate, fmtDateTime, plural } from '@/lib/utils';
import type { ApprovalView, Project, SimulationResult } from '@/types';

const PRESETS = [1, 3, 7, 14].map((d) => ({ value: d, label: `${d}d` }));

export default function ImpactSimulator() {
  const [params] = useSearchParams();
  const toast = useToast();
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [approvalKey, setApprovalKey] = useState(params.get('approval') ?? '');
  const [delay, setDelay] = useState(3);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => get<Project[]>('/projects') });
  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals', 'project', projectId],
    queryFn: () => get<ApprovalView[]>(`/approvals?projectId=${projectId}`),
    enabled: Boolean(projectId),
  });

  useEffect(() => { if (!projectId && projects.length) setProjectId(projects[0]._id); }, [projects, projectId]);
  // Default to the most urgent open approval — simulating a delay on a cleared one tells you nothing.
  useEffect(() => {
    if (approvalKey || !approvals.length) return;
    const open = approvals.filter((a) => a.status !== 'APPROVED');
    setApprovalKey((open.find((a) => a.sla.breached) ?? open[0] ?? approvals[0]).key);
  }, [approvals, approvalKey]);

  const run = useMutation({
    mutationFn: () => post<SimulationResult>('/simulate', { projectId, approvalKey, delayDays: delay }),
    onSuccess: (res) => {
      setResult(res);
      // On a phone the result sits below the form — bring it into view.
      if (window.innerWidth < 1024) requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    },
    onError: (e) => toast({ title: "Couldn't run the simulation", detail: humanError(e), tone: 'bad' }),
  });

  const selected = approvals.find((a) => a.key === approvalKey);
  const shifted = (result?.impactDays ?? 0) > 0;
  const resultTone: Tone = shifted ? (result!.impactDays >= 7 ? 'bad' : 'warn') : 'ok';

  const rows: [string, string, string, Tone?][] = result ? [
    ['Projected completion', fmtDate(result.current.completion, { year: 'numeric' }), fmtDate(result.simulated.completion, { year: 'numeric' }), shifted ? resultTone : undefined],
    ['Execution windows', `${result.current.windowsAvailable} available`, result.simulated.windowsLost ? `${result.simulated.windowsLost} lost` : 'None lost', result.simulated.windowsLost ? 'bad' : 'ok'],
    ['Milestones', `${result.current.milestonesOnTrack} on track`, result.simulated.milestonesAffected ? `${result.simulated.milestonesAffected} affected` : 'None affected', result.simulated.milestonesAffected ? 'bad' : 'ok'],
    ['Next window', result.current.nextWindowAt ? fmtDateTime(result.current.nextWindowAt) : '—', result.simulated.nextWindowAt ? fmtDateTime(result.simulated.nextWindowAt) : 'Window kept'],
  ] : [];

  return (
    <div className="space-y-12">
      <PageHeader title="Impact simulator" description="See what happens before the delay happens. Nothing here changes the live project." />

      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form className="space-y-6 lg:sticky lg:top-14 lg:self-start" onSubmit={(e) => { e.preventDefault(); run.mutate(); }}>
          <Field label="Project">
            {(p) => (
              <Select {...p} value={projectId} onChange={(e) => { setProjectId(e.target.value); setApprovalKey(''); setResult(null); }}>
                {projects.map((pr) => <option key={pr._id} value={pr._id}>{pr.name}</option>)}
              </Select>
            )}
          </Field>

          <Field label="Approval" helper={selected && <span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={selected.status} />{selected.sla.label}</span>}>
            {(p) => (
              <Select {...p} value={approvalKey} onChange={(e) => { setApprovalKey(e.target.value); setResult(null); }}>
                {approvals.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
              </Select>
            )}
          </Field>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="delay" className="text-foot font-medium">Additional delay</label>
              <span className="num text-body font-semibold">{plural(delay, 'day')}</span>
            </div>
            <input id="delay" type="range" min={1} max={14} value={delay} onChange={(e) => setDelay(Number(e.target.value))}
              className="h-11 w-full cursor-pointer accent-accent" />
            <Segmented label="Quick delay" value={delay} onChange={setDelay} options={PRESETS} className="mt-1 w-full [&>button]:flex-1" />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={run.isPending} disabled={!projectId || !approvalKey} className="w-full">
            {run.isPending ? 'Running…' : 'Run simulation'}
          </Button>
        </form>

        <div ref={resultRef} className="min-w-0 scroll-mt-20" aria-live="polite">
          {!result ? (
            <div className="rounded-card bg-subtle px-8 py-20 text-center">
              <p className="text-sub font-semibold tracking-[-0.014em]">Choose an approval and a delay</p>
              <p className="mx-auto mt-2 max-w-sm text-body text-fg2">
                We’ll show how the completion date, execution windows and milestones would move, using live dependency data.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              <div>
                <p className="text-foot text-fg2">If “{result.approvalName}” slips a further {plural(result.delayDays, 'day')}</p>
                <p className={cn('num mt-2 text-[44px] font-semibold leading-none tracking-[-0.035em] sm:text-hero',
                  { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', info: '', neutral: '' }[resultTone])}>
                  {shifted ? `+${plural(result.impactDays, 'day')}` : 'No change'}
                </p>
                <p className="mt-3 text-callout text-fg2">
                  {shifted ? 'to the projected completion date.' : 'The completion date holds.'}
                  {result.activitiesAffected > 0 && ` ${plural(result.activitiesAffected, 'activity', 'activities')} would be affected.`}
                </p>
              </div>

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-foot font-medium text-fg2">
                    <th scope="col" className="py-3 pr-4"><span className="sr-only">Measure</span></th>
                    <th scope="col" className="px-4 py-3">Current plan</th>
                    <th scope="col" className="py-3 pl-4">After a {result.delayDays}-day delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(([label, now, after, tone]) => (
                    <tr key={label} className="align-top">
                      <th scope="row" className="py-4 pr-4 text-body font-normal text-fg2">{label}</th>
                      <td className="num px-4 py-4 text-body">{now}</td>
                      <td className={cn('num py-4 pl-4 text-body font-medium', tone && { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', info: '', neutral: '' }[tone])}>{after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <h2 className="text-heading font-semibold tracking-[-0.022em]">What the simulation found</h2>
                <ol className="mt-5 space-y-3">
                  {result.narrative.map((line, i) => (
                    <li key={i} className="flex gap-4 text-body">
                      <span aria-hidden className="num w-5 shrink-0 text-fg3">{i + 1}</span>
                      <span className="text-fg">{line}</span>
                    </li>
                  ))}
                </ol>
                <Alert tone={result.impactDays >= 7 ? 'bad' : shifted ? 'warn' : 'info'} title="Recommendation" className="mt-8">
                  {result.recommendation}
                </Alert>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
