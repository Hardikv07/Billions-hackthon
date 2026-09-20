import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Timeline } from '@/components/Timeline';
import {
  Badge, Button, buttonClass, ConfirmDialog, Drawer, EmptyState, ErrorState, PageHeader, Segmented, Skeleton, StatusBadge, useToast,
} from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { get, humanError, patch } from '@/lib/api';
import { cn, fmtDateTime, humanize } from '@/lib/utils';
import type { Escalation } from '@/types';

const tabs = ['ALL', 'NEW', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED'].map((t) => ({ value: t, label: t === 'ALL' ? 'All' : humanize(t) }));

function EscalationDetail({ e, onUpdate, pending }: {
  e: Escalation; onUpdate: (status: string) => void; pending: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const open = e.status !== 'RESOLVED';
  const canEscalate = e.status !== 'ESCALATED' && open;
  // One dominant action at a time: acknowledge first, then escalate.
  const lead = e.status === 'NEW' ? 'acknowledge' : canEscalate ? 'escalate' : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-balance text-heading font-semibold tracking-[-0.022em]">{e.title}</h2>
          <p className="mt-1.5 text-body text-fg2">Raised to {e.raisedTo} · Level {e.level}</p>
        </div>
        <Badge tone={e.severity === 'CRITICAL' ? 'bad' : 'warn'}>{humanize(e.severity)}</Badge>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {e.status === 'NEW' && (
          <Button variant={lead === 'acknowledge' ? 'primary' : 'secondary'} loading={pending} onClick={() => onUpdate('ACKNOWLEDGED')}>Acknowledge</Button>
        )}
        {canEscalate && (
          <Button variant={lead === 'escalate' ? 'primary' : 'secondary'} onClick={() => setConfirming(true)}>Escalate to level 2</Button>
        )}
        {open && <Button onClick={() => onUpdate('RESOLVED')}>Mark resolved</Button>}
        <Link to={`/approvals/${e.projectId}/${e.approvalKey}`} className={buttonClass('plain')}>Open approval →</Link>
      </div>

      <div className="mt-10">
        <h3 className="mb-5 text-sub font-semibold tracking-[-0.014em]">What happened</h3>
        <Timeline items={e.timeline} />
      </div>

      <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} title="Escalate to Level 2?"
        body="A senior officer will be notified, with the impact assessment attached."
        confirmLabel="Escalate" loading={pending}
        onConfirm={() => { onUpdate('ESCALATED'); setConfirming(false); }} />
    </div>
  );
}

export default function Escalations() {
  const [tab, setTab] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const wide = useMediaQuery('(min-width: 1024px)');
  const qc = useQueryClient();
  const toast = useToast();

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['escalations', tab],
    queryFn: () => get<Escalation[]>(`/escalations?status=${tab}`),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patch(`/escalations/${id}`, { status }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['escalations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: v.status === 'RESOLVED' ? 'Marked as resolved' : v.status === 'ESCALATED' ? 'Escalated to Level 2' : 'Escalation acknowledged',
        tone: v.status === 'RESOLVED' ? 'ok' : 'neutral',
      });
    },
    onError: (e) => toast({ title: "Couldn't update the escalation", detail: humanError(e), tone: 'bad' }),
  });

  const selected = data.find((e) => e._id === selectedId) ?? (wide ? data[0] : undefined);
  const detail = selected && (
    <EscalationDetail key={selected._id} e={selected} pending={update.isPending} onUpdate={(status) => update.mutate({ id: selected._id, status })} />
  );

  return (
    <div className="space-y-10">
      <PageHeader title="Escalations" description="Issues raised for a time-bound decision, and what happened next." />

      <Segmented label="Status" value={tab} onChange={(v) => { setTab(v); setSelectedId(null); }} options={tabs} />

      {isLoading ? (
        <div className="grid gap-10 lg:grid-cols-[360px_1fr]" aria-busy="true" aria-label="Loading escalations">
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="hidden h-96 lg:block" />
        </div>
      ) : isError ? (
        <ErrorState what="your escalations" onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={<ShieldAlert size={28} strokeWidth={1.5} aria-hidden />}
          title={tab === 'ALL' ? 'No escalations yet' : `Nothing ${tab === 'NEW' ? 'new' : humanize(tab).toLowerCase()}`}
          body={tab === 'ALL'
            ? 'When an approval passes its service standard, you can raise it for a senior decision. It will appear here.'
            : 'No escalation is in this state. Choose another status to see the rest.'}
          action={tab === 'ALL' ? <Link to="/approvals?view=breached" className={buttonClass('primary')}>Review breached approvals</Link>
            : <Button onClick={() => setTab('ALL')}>Show all</Button>} />
      ) : (
        <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
          <ul className="space-y-1">
            {data.map((e) => {
              const active = selected?._id === e._id && wide;
              return (
                <li key={e._id}>
                  <button type="button" aria-current={active ? 'true' : undefined}
                    onClick={() => { setSelectedId(e._id); if (!wide) setSheetOpen(true); }}
                    className={cn('w-full rounded-card px-5 py-4 text-left transition-colors', active ? 'bg-sunken/80' : 'hover:bg-subtle')}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-body font-medium leading-snug text-fg">{e.title}</span>
                      <StatusBadge status={e.status} className="shrink-0" />
                    </span>
                    <span className="mt-1.5 block text-foot text-fg2">{e.projectName} · Level {e.level} · {e.raisedTo}</span>
                    <span className="num mt-1 block text-foot text-fg2">Opened {fmtDateTime(e.openedAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {wide && detail && <div className="min-w-0 lg:border-l lg:border-line lg:pl-14">{detail}</div>}
        </div>
      )}

      {!wide && (
        <Drawer open={sheetOpen && Boolean(selected)} onClose={() => setSheetOpen(false)} title="Escalation">{detail}</Drawer>
      )}
    </div>
  );
}
