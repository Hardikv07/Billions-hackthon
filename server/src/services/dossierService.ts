import { Escalation, Project, ProjectEvent } from '../models';
import { getApprovalDetail } from './approvalService';
import { listWindows } from './windowService';
import { simulateDelay } from './simulationService';

export async function buildDossier(projectId: string, approvalKey: string) {
  const [project, approval] = await Promise.all([
    Project.findById(projectId),
    getApprovalDetail(projectId, approvalKey),
  ]);
  if (!project || !approval) return null;

  const [windows, escalations, events, simulation] = await Promise.all([
    listWindows({ projectId }),
    Escalation.find({ projectId, approvalKey }).sort({ openedAt: 1 }),
    ProjectEvent.find({ projectId, tags: approvalKey }).sort({ at: 1 }),
    simulateDelay(projectId, approvalKey, 3),
  ]);

  const affectedWindows = windows.filter((w) => approval.impact?.windows.some((iw) => iw.id === w.id));

  return {
    generatedAt: new Date(),
    reference: `NIRMAN/DD/${project.code}/${approvalKey}`,
    project: {
      name: project.name, code: project.code, authority: project.authority,
      contractValueCr: project.contractValueCr, contractor: project.contractor,
      plannedCompletion: project.plannedCompletion, status: project.status,
    },
    issue: {
      approval: approval.name, department: approval.department, referenceNo: approval.referenceNo,
      submittedAt: approval.submittedAt, dueAt: approval.dueAt,
      status: approval.status, overdueDays: approval.sla.breachedByDays,
    },
    summary: `${approval.name} with ${approval.department} was submitted on ${new Date(approval.submittedAt).toDateString()} against a ${approval.slaDays}-day service standard. The decision remains pending and the service standard is exceeded by ${approval.sla.breachedByDays} days. The pending action gates ${approval.impact?.counts.activities ?? 0} downstream activities and ${affectedWindows.length} restricted execution window(s).`,
    timeline: events.map((e) => ({ at: e.at, title: e.title, detail: e.detail })),
    evidence: approval.evidence,
    affectedActivities: approval.impact?.activities ?? [],
    executionWindows: affectedWindows.map((w) => ({ title: w.title, startAt: w.startAt, endAt: w.endAt, readiness: w.readiness, missing: w.missing, status: w.status })),
    simulation,
    escalations: escalations.map((e) => ({ level: e.level, raisedTo: e.raisedTo, status: e.status, openedAt: e.openedAt, timeline: e.timeline })),
    resolution: 'Intervention recommended: a time-bound decision is requested so that the sanctioned execution window can be availed without further schedule impact.',
  };
}
