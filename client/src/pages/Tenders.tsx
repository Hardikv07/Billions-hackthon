import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, FileText, Minus, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert, Button, EmptyState, ErrorState, Field, PageHeader, ProgressBar, Section, Segmented, Skeleton, Spinner, Tooltip, useToast,
  type Tone,
} from '@/components/ui';
import { get, humanError, post } from '@/lib/api';
import { cn, fmtCr, fmtDate } from '@/lib/utils';
import type { Tender } from '@/types';

const STEPS = ['Reading the document', 'Extracting clauses', 'Identifying approvals', 'Mapping departments', 'Building the workflow'];

interface Match {
  id: string; reference: string; title: string; authority: string; location: string;
  contractValueCr: number; durationDays: number; closesAt: string; score: number;
  reasons: { label: string; met: boolean; detail: string }[];
}

/* ---------------------------------------------------------------- upload */

function Uploader({ onDone }: { onDone: (t: Tender) => void }) {
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append('file', file);
      const ticker = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 620);
      try {
        return await post<{ tender: Tender; mode: string }>('/tenders/upload', body);
      } finally {
        clearInterval(ticker);
      }
    },
    onMutate: () => { setError(''); setStep(0); },
    onSuccess: (res) => {
      setStep(STEPS.length);
      qc.invalidateQueries({ queryKey: ['tenders'] });
      toast({ title: 'Tender processed', detail: res.mode === 'AI' ? 'Extracted with the language model.' : 'Extracted with the built-in demo layer.', tone: 'ok' });
      onDone(res.tender);
    },
    onError: (e) => { setStep(-1); setError(humanError(e, "We couldn't process that tender. Please try again.")); },
  });

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('That file isn’t a PDF. Upload the tender document as a PDF.'); return; }
    upload.mutate(file);
  };

  const busy = upload.isPending || step >= 0;

  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) pick(e.dataTransfer.files); }}
        className={cn('rounded-card border border-dashed px-6 py-14 text-center transition-colors sm:py-16',
          dragging ? 'border-accent bg-accent/[0.06]' : 'border-line-strong bg-subtle/60')}>
        <input ref={inputRef} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} aria-label="Tender PDF" onChange={(e) => pick(e.target.files)} />

        {step < 0 ? (
          <div className="flex flex-col items-center">
            <UploadCloud aria-hidden size={30} strokeWidth={1.5} className="text-fg3" />
            <h2 className="mt-4 text-sub font-semibold tracking-[-0.014em]">Drop a tender PDF here</h2>
            <p className="mt-1.5 max-w-md text-pretty text-body text-fg2">
              We’ll identify its requirements, approvals, milestones, departments and execution constraints.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => inputRef.current?.click()}>Choose a file</Button>
          </div>
        ) : (
          <ol className="mx-auto w-full max-w-xs space-y-3 text-left" aria-live="polite" aria-label="Processing progress">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-3 text-body">
                <span aria-hidden className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full',
                  i < step ? 'bg-ok/15 text-ok' : i === step ? 'text-accent' : 'text-fg3')}>
                  {i < step ? <Check size={12} strokeWidth={2.5} /> : i === step ? <Spinner className="h-4 w-4" /> : <Minus size={12} />}
                </span>
                <span className={i <= step ? 'text-fg' : 'text-fg2'}>
                  {label}
                  <span className="sr-only">{i < step ? ' — done' : i === step ? ' — in progress' : ' — waiting'}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {error && (
        <Alert tone="bad" className="mt-4">
          <span className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <button type="button" className="btn-link text-foot" onClick={() => setError('')}>Dismiss</button>
          </span>
        </Alert>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- matching */

const RISK = [{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }];

function Criteria({ onMatched }: { onMatched: (m: Match[]) => void }) {
  const [form, setForm] = useState({ budgetMin: 100, budgetMax: 250, maxDurationDays: 600, experienceYears: 8, similarProjects: 4, riskTolerance: 'MEDIUM' });
  const toast = useToast();
  const match = useMutation({
    mutationFn: () => post<Match[]>('/tenders/match', form),
    onSuccess: (m) => { onMatched(m); toast({ title: 'Suitability assessed', detail: `${m.length} tenders scored against your criteria.`, tone: 'ok' }); },
    onError: (e) => toast({ title: "Couldn't score the tenders", detail: humanError(e), tone: 'bad' }),
  });

  const num = (label: string, key: 'budgetMin' | 'budgetMax' | 'maxDurationDays' | 'experienceYears' | 'similarProjects', helper?: string) => (
    <Field label={label} helper={helper}>
      {(p) => <input {...p} type="number" inputMode="numeric" min={0} value={form[key]} className="input"
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />}
    </Field>
  );

  return (
    <form className="max-w-2xl space-y-8" onSubmit={(e) => { e.preventDefault(); match.mutate(); }}>
      <fieldset className="space-y-5">
        <legend className="mb-3 text-body font-semibold">Budget</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {num('Lowest contract value (₹ Cr)', 'budgetMin')}
          {num('Highest contract value (₹ Cr)', 'budgetMax')}
        </div>
      </fieldset>
      <fieldset className="space-y-5">
        <legend className="mb-3 text-body font-semibold">Capacity</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          {num('Longest duration (days)', 'maxDurationDays')}
          {num('Years of experience', 'experienceYears')}
          {num('Similar projects', 'similarProjects')}
        </div>
      </fieldset>
      <div>
        <p className="mb-3 text-body font-semibold">Risk tolerance</p>
        <Segmented label="Risk tolerance" value={form.riskTolerance} options={RISK} onChange={(v) => setForm({ ...form, riskTolerance: v })} />
      </div>
      <Button type="submit" variant="primary" loading={match.isPending}>{match.isPending ? 'Scoring…' : 'Find matching tenders'}</Button>
    </form>
  );
}

/* ------------------------------------------------------------------- page */

export default function Tenders() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const { data: tenders = [], isLoading, isError, refetch } = useQuery({ queryKey: ['tenders'], queryFn: () => get<Tender[]>('/tenders') });

  const list: Match[] = matches.length ? matches : tenders.map((t) => ({
    id: t._id, reference: t.reference, title: t.title, authority: t.authority, location: t.location,
    contractValueCr: t.contractValueCr, durationDays: t.durationDays, closesAt: t.closesAt, score: 0, reasons: [],
  }));

  return (
    <div className="space-y-14 lg:space-y-16">
      <PageHeader title="Tenders" description="Turn tender documents into executable government workflows." />

      <Uploader onDone={(t) => navigate(`/tenders/${t._id}`)} />

      <section aria-labelledby="criteria-title">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="criteria-title" className="text-[22px] font-semibold leading-tight tracking-[-0.022em] sm:text-heading">Find tenders that suit you</h2>
            <p className="mt-1.5 text-body text-fg2">Scored against your declared capacity, not against the tenders’ quality.</p>
          </div>
          <Button size="sm" aria-expanded={criteriaOpen} aria-controls="criteria-form" onClick={() => setCriteriaOpen((v) => !v)} className="shrink-0">
            {criteriaOpen ? 'Hide' : 'Set criteria'}
            <ChevronDown aria-hidden size={14} className={cn('transition-transform', criteriaOpen && 'rotate-180')} />
          </Button>
        </div>
        {criteriaOpen && <div id="criteria-form" className="mt-8"><Criteria onMatched={(m) => setMatches(m)} /></div>}
      </section>

      <Section title={matches.length ? 'Suitability match' : 'Tenders on record'}
        description={matches.length ? 'Ordered by how well each fits your criteria.' : 'Published and awarded packages held by the authority.'}
        action={matches.length ? <Button variant="plain" size="sm" onClick={() => setMatches([])}>Clear matches</Button> : undefined}>
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading tenders">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : isError ? (
          <ErrorState what="your tenders" onRetry={() => refetch()} />
        ) : list.length === 0 ? (
          <EmptyState icon={<FileText size={28} strokeWidth={1.5} aria-hidden />} title="No tenders yet"
            body="Upload a tender PDF above and it will be listed here, ready to review." />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {list.map((t) => {
              const tone: Tone = t.score >= 80 ? 'ok' : t.score >= 60 ? 'warn' : 'neutral';
              return (
                <li key={t.id} className="relative rounded-card py-6 transition-colors hover:bg-subtle sm:-mx-5 sm:px-5">
                  {/* Stretched link: the whole row opens the tender, while the reason chips stay independently focusable. */}
                  <Link to={`/tenders/${t.id}`} className="block after:absolute after:inset-0 after:rounded-card">
                    <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
                      <div className="min-w-0 max-w-2xl">
                        <p className="text-callout font-semibold tracking-[-0.011em]">{t.title}</p>
                        <p className="mt-1 text-foot text-fg2">{t.reference} · {t.location}</p>
                        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body text-fg2">
                          <span>{fmtCr(t.contractValueCr)}</span>
                          <span>{t.durationDays} days</span>
                          <span>Closes {fmtDate(t.closesAt, { year: 'numeric' })}</span>
                        </p>
                      </div>
                      {t.score > 0 && (
                        <div className="w-40">
                          <p className={cn('num text-[30px] font-semibold leading-none tracking-[-0.03em]', { ok: 'text-ok', warn: 'text-warn', neutral: 'text-fg2', bad: '', info: '' }[tone])}>{t.score}%</p>
                          <p className="mt-1 text-foot text-fg2">Suitability match</p>
                          <ProgressBar value={t.score} tone={tone} className="mt-3" label="Suitability match" />
                        </div>
                      )}
                    </div>
                  </Link>
                  {t.reasons.length > 0 && (
                    <ul className="relative z-10 mt-5 flex flex-wrap gap-2">
                      {t.reasons.map((r) => (
                        <li key={r.label}>
                          <Tooltip content={r.detail}>
                            <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-cap font-medium', r.met ? 'bg-ok/10 text-ok' : 'bg-sunken text-fg2')}>
                              {r.met ? <Check aria-hidden size={12} strokeWidth={2.5} /> : <Minus aria-hidden size={12} />}
                              {r.label}
                              <span className="sr-only">{r.met ? ' — met' : ' — not met'}</span>
                            </span>
                          </Tooltip>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
