import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Column, DataTable } from '@/components/DataTable';
import {
  Badge, Button, EmptyState, ErrorState, PageHeader, ProgressBar, SearchField, Segmented, Select, Skeleton, StatusBadge, type Tone,
} from '@/components/ui';
import { get } from '@/lib/api';
import { cn, fmtDate } from '@/lib/utils';
import type { ApprovalView } from '@/types';

const views = [
  { value: 'all', label: 'All' },
  { value: 'at-risk', label: 'At risk' },
  { value: 'breached', label: 'SLA breached' },
  { value: 'critical-window', label: 'Critical window' },
];

const impactTone = (i: string): Tone => (i === 'HIGH' ? 'bad' : i === 'MEDIUM' ? 'warn' : 'ok');
const impactRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function Approvals() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') ?? 'all';
  const projectId = params.get('projectId') ?? '';
  const [department, setDepartment] = useState(params.get('department') ?? '');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['approvals', view, department, projectId],
    queryFn: () => get<ApprovalView[]>(`/approvals?view=${view}${department ? `&department=${department}` : ''}${projectId ? `&projectId=${projectId}` : ''}`),
  });

  const departments = useMemo(
    () => [...new Map(data.map((a) => [a.departmentCode, a.department])).entries()],
    [data],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((a) => [a.name, a.department, a.projectName, a.referenceNo].some((s) => s.toLowerCase().includes(q)));
  }, [data, query]);

  const filtered = view !== 'all' || Boolean(department) || Boolean(query) || Boolean(projectId);
  const clear = () => { setParams({}); setDepartment(''); setQuery(''); };

  const columns: Column<ApprovalView>[] = [
    { key: 'name', header: 'Approval', sortValue: (a) => a.name, render: (a) => (
      <div className="min-w-0">
        <p className="text-body font-medium text-fg">{a.name}</p>
        <p className="mt-0.5 text-foot text-fg2">{a.projectName} · {a.referenceNo}</p>
      </div>
    ) },
    { key: 'dept', header: 'Department', sortValue: (a) => a.department, render: (a) => <span className="text-fg2">{a.department}</span> },
    { key: 'submitted', header: 'Submitted', sortValue: (a) => new Date(a.submittedAt).getTime(), render: (a) => <span className="num text-fg2">{fmtDate(a.submittedAt)}</span> },
    { key: 'remaining', header: 'Time remaining', className: 'w-52', sortValue: (a) => a.sla.remainingHours, render: (a) => {
      const cleared = a.status === 'APPROVED';
      const tone: Tone = a.sla.breached ? 'bad' : a.sla.percentConsumed >= 75 ? 'warn' : 'info';
      return (
        <div>
          <p className={cn('num text-body font-medium', cleared ? 'text-ok' : a.sla.breached ? 'text-bad' : a.sla.percentConsumed >= 75 ? 'text-warn' : 'text-fg')}>
            {cleared ? 'Cleared' : a.sla.label}
          </p>
          {a.status !== 'APPROVED' && <ProgressBar value={Math.min(100, a.sla.percentConsumed)} tone={tone} className="mt-2" label="Service standard consumed" />}
        </div>
      );
    } },
    { key: 'impact', header: 'Impact', sortValue: (a) => impactRank[a.impact] ?? 0, render: (a) => <Badge tone={impactTone(a.impact)}>{a.impact.charAt(0) + a.impact.slice(1).toLowerCase()}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <div className="space-y-10">
      <PageHeader title="Approvals" description="Where is government action becoming a project constraint?" />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="View" value={view} options={views}
            onChange={(v) => { const next = new URLSearchParams(params); if (v === 'all') next.delete('view'); else next.set('view', v); setParams(next); }} />
          <Select compact aria-label="Filter by department" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full sm:w-56">
            <option value="">All departments</option>
            {departments.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </Select>
          <SearchField value={query} onChange={setQuery} label="Search approvals" placeholder="Search approvals" className="w-full sm:ml-auto sm:w-72 [&_input]:h-9 [&_input]:text-foot" />
        </div>
        {!isLoading && !isError && (
          <p className="text-foot text-fg2" aria-live="polite">{rows.length === 1 ? '1 approval' : `${rows.length} approvals`}</p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading approvals">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px]" />)}</div>
      ) : isError ? (
        <ErrorState what="your approvals" onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} rows={rows} getKey={(a) => `${a.projectId}/${a.key}`}
          onRowClick={(a) => navigate(`/approvals/${a.projectId}/${a.key}`)}
          empty={
            <EmptyState icon={<ClipboardList size={28} strokeWidth={1.5} aria-hidden />}
              title={filtered ? 'No approvals match' : 'No approvals yet'}
              body={filtered ? 'Nothing fits the filters you have set. Clear them to see every approval.' : 'Approvals appear here once a tender has been processed into a project.'}
              action={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined} />
          } />
      )}
    </div>
  );
}
