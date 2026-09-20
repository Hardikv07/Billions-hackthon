import { Approval, Department, Project } from '../models';
import { computeSla, riskFromSla, type SlaView } from './slaService';
import { getImpactRadius } from './impactService';

export interface ApprovalView {
  id: string;
  key: string;
  name: string;
  referenceNo: string;
  projectId: string;
  projectName: string;
  department: string;
  departmentCode: string;
  authority: string;
  status: string;
  impact: string;
  risk: string;
  submittedAt: Date;
  dueAt: Date;
  slaDays: number;
  sla: SlaView;
  blocksActivityKeys: string[];
  sourcePage: number;
  confidence: number;
  notes: string;
  evidence: { label: string; ref: string; date: Date }[];
}

export async function listApprovals(filter: Record<string, unknown> = {}): Promise<ApprovalView[]> {
  const approvals = await Approval.find(filter).sort({ dueAt: 1 });
  const [projects, departments] = await Promise.all([Project.find(), Department.find()]);
  const pName = new Map(projects.map((p) => [String(p._id), p.name]));
  const dep = new Map(departments.map((d) => [d.code, d]));

  return approvals.map((a) => {
    const sla = computeSla(a);
    const d = dep.get(a.departmentCode);
    return {
      id: String(a._id),
      key: a.key,
      name: a.name,
      referenceNo: a.referenceNo,
      projectId: String(a.projectId),
      projectName: pName.get(String(a.projectId)) ?? '—',
      department: d?.name ?? a.departmentCode,
      departmentCode: a.departmentCode,
      authority: d?.authority ?? '',
      status: sla.derivedStatus,
      impact: a.impact,
      risk: riskFromSla(sla, a.impact),
      submittedAt: a.submittedAt,
      dueAt: a.dueAt,
      slaDays: a.slaDays,
      sla,
      blocksActivityKeys: a.blocksActivityKeys ?? [],
      sourcePage: a.sourcePage,
      confidence: a.confidence,
      notes: a.notes,
      evidence: a.evidence ?? [],
    };
  });
}

export async function getApprovalDetail(projectId: string, key: string) {
  const [view] = await listApprovals({ projectId, key });
  if (!view) return null;
  const impact = await getImpactRadius(projectId, key);
  return { ...view, impact };
}
