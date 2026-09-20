import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, FileText } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { BackLink, Badge, Button, ErrorState, Facts, PageHeader, Segmented, Skeleton, useToast } from '@/components/ui';
import { get } from '@/lib/api';
import { cn, fmtCr } from '@/lib/utils';
import type { Tender } from '@/types';

/** One thing the system read from the document, with where it found it and how sure it is. */
function Extracted({ label, page, confidence, children, verified, onVerify }: {
  label: string; page: number; confidence: number; children: ReactNode; verified: boolean; onVerify: () => void;
}) {
  return (
    <li className="py-5 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body font-medium text-fg">{label}</p>
          <div className="mt-0.5 text-body text-fg2">{children}</div>
        </div>
        <p className="num shrink-0 text-right text-foot text-fg2">
          Page {page}
          <span className={cn('block font-medium', confidence >= 90 ? 'text-ok' : 'text-warn')}>{confidence}% sure</span>
        </p>
      </div>
      <div className="mt-2 flex justify-end">
        {verified
          ? <Badge tone="ok"><BadgeCheck aria-hidden size={13} /> Verified</Badge>
          : <Button variant="plain" size="sm" onClick={onVerify} aria-label={`Verify ${label}`}>Verify</Button>}
      </div>
    </li>
  );
}

const TABS = ['Overview', 'Milestones', 'Approvals', 'Constraints', 'Payments', 'Clauses'].map((t) => ({ value: t, label: t }));

export default function TenderDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState('Overview');
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['tender', id], queryFn: () => get<Tender>(`/tenders/${id}`) });

  if (isLoading) {
    return (
      <div className="space-y-10" aria-busy="true" aria-label="Loading tender">
        <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>
        <Skeleton className="h-20" />
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-[520px]" /><Skeleton className="h-[520px]" /></div>
      </div>
    );
  }
  if (isError || !data) return <><BackLink to="/tenders">Tenders</BackLink><ErrorState what="this tender" onRetry={() => refetch()} /></>;

  const x = data.extracted;
  const verify = (key: string) => {
    setVerified((v) => ({ ...v, [key]: true }));
    toast({ title: 'Marked as verified', detail: key, tone: 'ok' });
  };

  const list = (items: ReactNode[]) => (items.length ? <ul className="divide-y divide-line">{items}</ul> : <p className="text-body text-fg2">Nothing was found in this category.</p>);

  return (
    <div className="space-y-12">
      <div>
        <BackLink to="/tenders">Tenders</BackLink>
        <PageHeader title={data.title} description={`${data.reference} · ${data.authority} · ${data.location}`}
          actions={<Badge tone={data.extractionMode === 'AI' ? 'info' : 'neutral'}>{data.extractionMode === 'AI' ? 'Read by language model' : 'Read by demo layer'}</Badge>} />
      </div>

      {data.understanding && (
        <Facts className="border-y border-line py-7 lg:grid-cols-6" items={[
          ['Contract value', fmtCr(data.contractValueCr)],
          ['Duration', `${data.durationDays} days`],
          ['Milestones', String(data.understanding.milestones)],
          ['Approvals', String(data.understanding.approvals)],
          ['Departments', String(data.understanding.departments)],
          ['Execution windows', String(data.understanding.executionWindows)],
        ]} />
      )}

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-2">
        <section aria-label="Tender document" className="card flex max-h-[480px] flex-col overflow-hidden lg:h-[640px] lg:max-h-none">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
            <FileText aria-hidden size={16} className="text-fg3" />
            <h2 className="text-body font-medium">Tender document</h2>
            <span className="num ml-auto truncate text-foot text-fg2">{data.reference}.pdf</span>
          </div>
          <div className="flex-1 overflow-auto bg-subtle p-4 sm:p-8">
            <div className="mx-auto max-w-lg space-y-4 rounded-lg bg-surface p-6 shadow-card sm:p-10">
              <p className="text-center text-foot font-medium text-fg2">{data.authority}</p>
              <h3 className="text-balance text-center text-sub font-semibold">{data.title}</h3>
              <p className="num text-center text-foot text-fg2">{data.reference}</p>
              <hr className="my-4 border-line" />
              <p className="text-body leading-relaxed text-fg">{x?.overview}</p>
              {x?.clauses.map((c) => (
                <div key={c.title} className="pt-3">
                  <p className="text-foot font-semibold text-fg">{c.title}</p>
                  <p className="mt-1 text-body leading-relaxed text-fg2">{c.text}</p>
                  <p className="num mt-1 text-cap text-fg2">Page {c.page}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="What the system understood" className="flex min-w-0 flex-col lg:h-[640px]">
          <h2 className="text-heading font-semibold tracking-[-0.022em]">What the system understood</h2>
          <p className="mt-1.5 text-body text-fg2">Each item shows its source page and confidence. Verify it before it drives a workflow.</p>
          <Segmented label="Category" value={tab} onChange={setTab} options={TABS} className="mt-6 self-start" />

          <div className="mt-6 flex-1 overflow-y-auto pr-1">
            {!x ? <p className="text-body text-fg2">This tender hasn’t been processed yet.</p> : (
              <>
                {tab === 'Overview' && <p className="max-w-prose text-pretty text-callout text-fg">{x.overview}</p>}

                {tab === 'Milestones' && list(x.milestones.map((m) => (
                  <Extracted key={m.name} label={m.name} page={m.page} confidence={m.confidence} verified={!!verified[m.name]} onVerify={() => verify(m.name)}>
                    Day {m.day} of {data.durationDays}
                  </Extracted>
                )))}

                {tab === 'Approvals' && list(x.approvals.map((a) => (
                  <Extracted key={a.name} label={a.name} page={a.page} confidence={a.confidence} verified={!!verified[a.name]} onVerify={() => verify(a.name)}>
                    {a.departmentCode} · {a.slaDays}-day service standard
                  </Extracted>
                )))}

                {tab === 'Constraints' && list(x.executionWindows.map((w) => (
                  <Extracted key={w.activity} label={w.activity} page={w.page} confidence={w.confidence} verified={!!verified[w.activity]} onVerify={() => verify(w.activity)}>
                    {w.constraint}
                  </Extracted>
                )))}

                {tab === 'Payments' && list(x.payments.map((p) => (
                  <Extracted key={p.stage} label={p.stage} page={p.page} confidence={p.confidence} verified={!!verified[p.stage]} onVerify={() => verify(p.stage)}>
                    {p.percent}% of the contract value
                  </Extracted>
                )))}

                {tab === 'Clauses' && list(x.clauses.map((c) => (
                  <Extracted key={c.title} label={c.title} page={c.page} confidence={c.confidence} verified={!!verified[c.title]} onVerify={() => verify(c.title)}>
                    <span className="block">{c.text}</span>
                    <Badge tone={c.severity === 'CRITICAL' ? 'bad' : c.severity === 'WATCH' ? 'warn' : 'info'} className="mt-2">
                      {c.severity.charAt(0) + c.severity.slice(1).toLowerCase()}
                    </Badge>
                  </Extracted>
                )))}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
