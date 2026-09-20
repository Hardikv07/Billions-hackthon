import { Approval, ExecutionWindow, Project } from '../models';
import type { IExecutionWindow } from '../models';
import { computeSla } from './slaService';

export interface WindowView {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  activityKey: string;
  authority: string;
  constraint: string;
  startAt: Date;
  endAt: Date;
  hoursUntilStart: number;
  readiness: number;
  status: IExecutionWindow['status'];
  checklist: { label: string; ready: boolean; owner: string; approvalKey?: string }[];
  missing: string[];
  nextWindowAt: Date;
}

export function nextOccurrence(window: Pick<IExecutionWindow, 'startAt' | 'recurrenceDays'>, after = new Date()): Date {
  const start = new Date(window.startAt);
  const step = (window.recurrenceDays || 7) * 24 * 3600 * 1000;
  let next = start.getTime();
  while (next <= after.getTime()) next += step;
  return new Date(next);
}

export async function listWindows(filter: Record<string, unknown> = {}, now = new Date()): Promise<WindowView[]> {
  const windows = await ExecutionWindow.find(filter).sort({ startAt: 1 });
  const projects = await Project.find({ _id: { $in: windows.map((w) => w.projectId) } });
  const projectName = new Map(projects.map((p) => [String(p._id), p.name]));
  const approvals = await Approval.find({ projectId: { $in: windows.map((w) => w.projectId) } });

  return windows.map((w) => {
    // Map fields explicitly: spreading a Mongoose subdocument copies its internals, not label/owner.
    const checklist = (w.checklist ?? []).map((item) => {
      const approval = item.approvalKey
        ? approvals.find((a) => a.key === item.approvalKey && String(a.projectId) === String(w.projectId))
        : undefined;
      const ready = approval ? approval.status === 'APPROVED' : item.ready;
      return { label: item.label, ready, owner: item.owner, approvalKey: item.approvalKey };
    });
    const readiness = checklist.length
      ? Math.round((checklist.filter((c) => c.ready).length / checklist.length) * 100)
      : 100;
    const missing = checklist.filter((c) => !c.ready).map((c) => c.label);
    const hoursUntilStart = (new Date(w.startAt).getTime() - now.getTime()) / 3600000;

    let status = w.status;
    if (status !== 'COMPLETED' && status !== 'LOST') {
      status = missing.length === 0 ? 'READY' : hoursUntilStart < 72 ? 'AT_RISK' : 'PLANNED';
    }

    return {
      id: String(w._id),
      projectId: String(w.projectId),
      projectName: projectName.get(String(w.projectId)) ?? '—',
      title: w.title,
      activityKey: w.activityKey,
      authority: w.authority,
      constraint: w.constraint,
      startAt: w.startAt,
      endAt: w.endAt,
      hoursUntilStart,
      readiness,
      status,
      checklist,
      missing,
      nextWindowAt: nextOccurrence(w, new Date(w.endAt)),
    };
  });
}

export async function blockingApprovalsFor(windowId: string) {
  const w = await ExecutionWindow.findById(windowId);
  if (!w) return [];
  const keys = (w.checklist ?? []).filter((c) => c.approvalKey).map((c) => c.approvalKey!);
  const approvals = await Approval.find({ projectId: w.projectId, key: { $in: keys } });
  return approvals
    .filter((a) => a.status !== 'APPROVED')
    .map((a) => ({ key: a.key, name: a.name, sla: computeSla(a) }));
}
