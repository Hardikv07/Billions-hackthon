import { useQuery } from '@tanstack/react-query';
import { FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader, ProgressBar, Skeleton, StatusBadge } from '@/components/ui';
import { get } from '@/lib/api';
import { fmtCr, fmtDate } from '@/lib/utils';
import type { Project } from '@/types';

const riskLabel = (score: number) => (score > 70 ? 'High' : score > 45 ? 'Medium' : 'Low');

export default function Projects() {
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['projects'], queryFn: () => get<Project[]>('/projects') });

  return (
    <div className="space-y-12">
      <PageHeader title="Projects" description="Packages under delivery, ordered by risk." />

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading projects">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : isError ? (
        <ErrorState what="your projects" onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState icon={<FolderKanban size={28} strokeWidth={1.5} aria-hidden />} title="No projects yet"
          body="Upload a tender document and NIRMAN 360 will turn it into a project with its approvals and milestones." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((p) => (
            <li key={p._id}>
              <Link to={`/projects/${p._id}`}
                className="grid gap-x-12 gap-y-5 rounded-card py-7 transition-colors hover:bg-subtle sm:-mx-5 sm:px-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="text-sub font-semibold tracking-[-0.014em]">{p.name}</h2>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1.5 text-body text-fg2">{p.contractor} · {p.location}</p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-foot text-fg2">Physical progress</span>
                    <span className="num text-body font-semibold">{p.physicalProgress}%</span>
                  </div>
                  <ProgressBar value={p.physicalProgress} className="mt-2" label="Physical progress" />
                  <p className="num mt-2.5 text-foot text-fg2">
                    Schedule {p.scheduleProgress}% · Approvals {p.approvalHealth}% · {riskLabel(p.riskScore)} risk
                  </p>
                </div>

                <dl className="flex gap-10 lg:text-right">
                  <div>
                    <dt className="text-foot text-fg2">Contract</dt>
                    <dd className="num mt-0.5 text-body font-semibold">{fmtCr(p.contractValueCr)}</dd>
                  </div>
                  <div>
                    <dt className="text-foot text-fg2">Planned completion</dt>
                    <dd className="num mt-0.5 text-body font-semibold">{fmtDate(p.plannedCompletion, { year: 'numeric' })}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
