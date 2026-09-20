import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge, Button, EmptyState, ErrorState, PageHeader, SearchField, Section, Select, Skeleton, StatusBadge, useToast,
} from '@/components/ui';
import { get } from '@/lib/api';
import { cn, fmtDate, fmtDateTime, plural } from '@/lib/utils';
import type { ApprovalView, Project, SimulationResult } from '@/types';

interface Dossier {
  generatedAt: string; reference: string;
  project: { name: string; code: string; authority: string; contractValueCr: number; contractor: string; plannedCompletion: string; status: string };
  issue: { approval: string; department: string; referenceNo: string; submittedAt: string; dueAt: string; status: string; overdueDays: number };
  summary: string;
  timeline: { at: string; title: string; detail: string }[];
  evidence: { label: string; ref: string; date: string }[];
  affectedActivities: { key: string; name: string; isMilestone: boolean; depth: number }[];
  executionWindows: { title: string; startAt: string; endAt: string; readiness: number; missing: string[]; status: string }[];
  simulation: SimulationResult | null;
  escalations: { level: number; raisedTo: string; status: string; openedAt: string; timeline: { at: string; label: string; detail: string }[] }[];
  resolution: string;
}

interface MemoryEvent {
  id: string; at: string; actor: string; category: string;
  title: string; detail: string; cause?: string; resolution?: string; tags: string[];
}

function DossierSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-7 first:border-0 first:pt-0 print:break-inside-avoid">
      <h3 className="mb-3 text-foot font-semibold text-fg2">{title}</h3>
      {children}
    </section>
  );
}

export default function Reports() {
  const [params] = useSearchParams();
  const toast = useToast();
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [approvalKey, setApprovalKey] = useState(params.get('approval') ?? '');
  const [query, setQuery] = useState('Why was the railway approval delayed?');
  const [submitted, setSubmitted] = useState('Why was the railway approval delayed?');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => get<Project[]>('/projects') });
  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals', 'project', projectId],
    queryFn: () => get<ApprovalView[]>(`/approvals?projectId=${projectId}`),
    enabled: Boolean(projectId),
  });

  useEffect(() => { if (!projectId && projects.length) setProjectId(projects[0]._id); }, [projects, projectId]);
  useEffect(() => {
    if (approvalKey || !approvals.length) return;
    const open = approvals.filter((a) => a.status !== 'APPROVED');
    setApprovalKey((open.find((a) => a.sla.breached) ?? open[0] ?? approvals[0]).key);
  }, [approvals, approvalKey]);

  const { data: dossier, isLoading, isError, refetch } = useQuery({
    queryKey: ['dossier', projectId, approvalKey],
    queryFn: () => get<Dossier>(`/approvals/${projectId}/${approvalKey}/dossier`),
    enabled: Boolean(projectId && approvalKey),
  });

  const { data: memory = [], isFetching: searching } = useQuery({
    queryKey: ['memory', submitted, projectId],
    queryFn: () => get<MemoryEvent[]>(`/memory?q=${encodeURIComponent(submitted)}&projectId=${projectId}`),
    enabled: Boolean(projectId),
  });

  const generate = useMutation({
    mutationFn: async () => {
      toast({ title: 'Dossier ready', detail: 'Choose “Save as PDF” in the print dialog.', tone: 'ok' });
      await new Promise((r) => setTimeout(r, 500));
      window.print();
    },
  });

  return (
    <div className="space-y-16">
      <div className="space-y-8 print:hidden">
        <PageHeader title="Reports" description="Evidence-backed delay dossiers, and what this project already knows." />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select aria-label="Project" value={projectId} className="sm:w-64"
            onChange={(e) => { setProjectId(e.target.value); setApprovalKey(''); }}>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <Select aria-label="Approval" value={approvalKey} className="sm:w-64" onChange={(e) => setApprovalKey(e.target.value)}>
            {approvals.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
          </Select>
          <Button variant="primary" className="sm:ml-auto" loading={generate.isPending} disabled={!dossier} onClick={() => generate.mutate()}>
            Generate PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[480px]" />
      ) : isError ? (
        <ErrorState what="this dossier" onRetry={() => refetch()} />
      ) : !dossier ? (
        <EmptyState icon={<FileText size={28} strokeWidth={1.5} aria-hidden />} title="Nothing to report yet"
          body="Choose a project and an approval above to build its delay dossier." />
      ) : (
        <article className="card mx-auto max-w-4xl p-6 sm:p-12 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <div className="border-b border-line pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-foot font-medium text-fg2">Project delay dossier</p>
              <StatusBadge status={dossier.project.status} />
            </div>
            <h2 className="mt-3 text-balance text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-title">{dossier.project.name}</h2>
            <p className="mt-2 text-body text-fg2">{dossier.project.authority} · {dossier.project.contractor}</p>
            <p className="num mt-4 text-foot text-fg2">{dossier.reference} · Generated {fmtDateTime(dossier.generatedAt)}</p>
          </div>

          <div className="mt-8">
            <DossierSection title="Summary">
              <p className="max-w-prose text-pretty text-callout text-fg">{dossier.summary}</p>
            </DossierSection>

            <DossierSection title="The issue">
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-4">
                {[
                  ['Approval', dossier.issue.approval],
                  ['Department', dossier.issue.department],
                  ['Submitted', fmtDate(dossier.issue.submittedAt)],
                  ['Decision due', fmtDate(dossier.issue.dueAt)],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-foot text-fg2">{k}</dt><dd className="mt-1 text-body font-medium">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <StatusBadge status={dossier.issue.status} />
                {dossier.issue.overdueDays > 0 && <Badge tone="bad">Overdue by {plural(dossier.issue.overdueDays, 'day')}</Badge>}
              </div>
            </DossierSection>

            <DossierSection title="Timeline">
              {!dossier.timeline.length && <p className="text-body text-fg2">No events have been recorded for this approval yet.</p>}
              <ol className="space-y-3">
                {dossier.timeline.map((t, i) => (
                  <li key={i} className="gap-6 sm:flex">
                    <span className="num w-36 shrink-0 text-foot leading-[1.6] text-fg2">{fmtDateTime(t.at)}</span>
                    <span className="text-body">
                      <span className="font-medium">{t.title}</span>
                      {t.detail && <span className="block text-fg2">{t.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </DossierSection>

            <DossierSection title="Evidence">
              {dossier.evidence.length ? (
                <ul className="divide-y divide-line">
                  {dossier.evidence.map((e) => (
                    <li key={e.ref} className="flex flex-wrap justify-between gap-x-6 py-2.5 text-body first:pt-0">
                      <span>{e.label}</span>
                      <span className="num text-foot leading-[1.6] text-fg2">{e.ref} · {fmtDate(e.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-body text-fg2">No correspondence has been recorded.</p>}
            </DossierSection>

            <DossierSection title="Affected activities">
              <div className="flex flex-wrap gap-2">
                {dossier.affectedActivities.map((a) => (
                  <Badge key={a.key} tone={a.depth === 0 ? 'bad' : a.isMilestone ? 'warn' : 'neutral'}>{a.name}</Badge>
                ))}
                {!dossier.affectedActivities.length && <p className="text-body text-fg2">No scheduled activity depends on this approval.</p>}
              </div>
            </DossierSection>

            <DossierSection title="Execution windows">
              {dossier.executionWindows.length ? (
                <ul className="divide-y divide-line">
                  {dossier.executionWindows.map((w) => (
                    <li key={w.title} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 text-body first:pt-0">
                      <span className="font-medium">{w.title}</span>
                      <span className="num text-foot text-fg2">{fmtDateTime(w.startAt)} · {w.readiness}% ready · {w.missing.join(', ') || 'no gaps'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-body text-fg2">No restricted execution window is affected.</p>}
            </DossierSection>

            {dossier.simulation && (
              <DossierSection title="Impact simulation">
                <p className="text-body">
                  At a further {plural(dossier.simulation.delayDays, 'day')} of delay, the projected completion moves to{' '}
                  <span className="font-semibold">{fmtDate(dossier.simulation.simulated.completion, { year: 'numeric' })}</span>
                  {dossier.simulation.impactDays > 0 && <span className="font-medium text-bad"> (+{plural(dossier.simulation.impactDays, 'day')})</span>}.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-body text-fg2">
                  {dossier.simulation.narrative.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </DossierSection>
            )}

            <DossierSection title="Escalation history">
              {dossier.escalations.length ? dossier.escalations.map((e, i) => (
                <p key={i} className="mb-3 text-body last:mb-0">
                  <span className="font-medium">Level {e.level} · {e.raisedTo}</span>
                  <span className="block text-foot text-fg2">{e.status.charAt(0) + e.status.slice(1).toLowerCase()} · opened {fmtDateTime(e.openedAt)}</span>
                </p>
              )) : <p className="text-body text-fg2">No escalation has been raised so far.</p>}
            </DossierSection>

            <DossierSection title="Recommended resolution">
              <p className="rounded-control bg-subtle px-5 py-4 text-body text-fg">{dossier.resolution}</p>
            </DossierSection>
          </div>
        </article>
      )}

      <Section title="Project memory" description="Ask what this project has already learned." className="print:hidden">
        <SearchField value={query} onChange={setQuery} onSubmit={() => setSubmitted(query)} busy={searching}
          label="Search project memory" placeholder="Why was the railway approval delayed?" className="max-w-2xl" />

        <ul className={cn('mt-8 divide-y divide-line', memory.length > 0 && 'border-y border-line')}>
          {memory.map((e) => (
            <li key={e.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0 max-w-2xl">
                  <p className="text-body font-semibold">{e.title}</p>
                  <p className="mt-1 text-body text-fg2">{e.detail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-foot text-fg2">{fmtDate(e.at, { year: 'numeric' })}</span>
                  <Badge>{e.category}</Badge>
                </div>
              </div>
              {(e.cause || e.resolution) && (
                <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                  {e.cause && <div><dt className="text-foot text-fg2">Cause</dt><dd className="mt-1 text-body">{e.cause}</dd></div>}
                  {e.resolution && <div><dt className="text-foot text-fg2">Resolution</dt><dd className="mt-1 text-body">{e.resolution}</dd></div>}
                </dl>
              )}
            </li>
          ))}
        </ul>
        {!memory.length && !searching && (
          <p className="py-10 text-center text-body text-fg2">Nothing in memory matches that question yet. Try rephrasing it.</p>
        )}
      </Section>
    </div>
  );
}
