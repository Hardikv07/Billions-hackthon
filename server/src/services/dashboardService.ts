import { Approval, Escalation, Project } from '../models';
import { listApprovals } from './approvalService';
import { listWindows } from './windowService';
import { getImpactRadius } from './impactService';

export async function getOverview() {
  const [projects, approvals, windows, escalations] = await Promise.all([
    Project.find().sort({ riskScore: -1 }),
    listApprovals({}),
    listWindows({}),
    Escalation.find({ status: { $ne: 'RESOLVED' } }),
  ]);

  const open = approvals.filter((a) => a.status !== 'APPROVED' && a.status !== 'REJECTED');
  const breached = open.filter((a) => a.sla.breached);
  const criticalWindows = windows.filter((w) => w.status === 'AT_RISK' || w.status === 'LOST');

  const ranked = [...open].sort((a, b) => {
    const score = (x: typeof a) => (x.sla.breached ? 1000 : 0) + x.sla.percentConsumed + (x.impact === 'HIGH' ? 200 : 0);
    return score(b) - score(a);
  });

  const interventions = await Promise.all(ranked.slice(0, 3).map(async (a) => {
    const impact = await getImpactRadius(a.projectId, a.key);
    const window = windows.find((w) => impact?.windows.some((iw) => iw.id === w.id));
    return {
      approvalKey: a.key,
      approvalName: a.name,
      projectId: a.projectId,
      projectName: a.projectName,
      department: a.department,
      status: a.status,
      risk: a.risk,
      slaLabel: a.sla.label,
      breachedByDays: a.sla.breachedByDays,
      percentConsumed: a.sla.percentConsumed,
      remainingHours: a.sla.remainingHours,
      activitiesAffected: impact?.counts.activities ?? 0,
      milestonesAffected: impact?.counts.milestones ?? 0,
      window: window ? { id: window.id, title: window.title, startAt: window.startAt, hoursUntilStart: window.hoursUntilStart, status: window.status } : null,
      blocks: impact?.activities.filter((n) => n.depth === 0).map((n) => n.name) ?? [],
    };
  }));

  return {
    metrics: {
      activeProjects: projects.length,
      pendingApprovals: open.length,
      slaBreaches: breached.length,
      criticalWindows: criticalWindows.length,
    },
    interventions,
    projects: projects.map((p) => ({
      id: String(p._id),
      code: p.code,
      name: p.name,
      status: p.status,
      contractValueCr: p.contractValueCr,
      physicalProgress: p.physicalProgress,
      scheduleProgress: p.scheduleProgress,
      approvalHealth: p.approvalHealth,
      riskScore: p.riskScore,
    })),
    windows: windows.slice(0, 6),
  };
}

export async function getNotifications() {
  const approvals = await listApprovals({});
  const windows = await listWindows({});
  const items = [
    ...approvals
      .filter((a) => a.sla.breached && a.status !== 'APPROVED')
      .map((a) => ({
        id: `sla-${a.id}`, severity: 'CRITICAL' as const,
        title: `${a.name} breached its SLA`,
        detail: `${a.projectName} — overdue by ${a.sla.breachedByDays} days`,
        href: `/approvals/${a.projectId}/${a.key}`, at: a.dueAt,
      })),
    ...windows
      .filter((w) => w.status === 'AT_RISK')
      .map((w) => ({
        id: `win-${w.id}`, severity: 'WARNING' as const,
        title: `${w.title} window at risk`,
        detail: `${w.projectName} — missing ${w.missing.join(', ') || 'prerequisites'}`,
        href: `/execution-windows`, at: w.startAt,
      })),
    ...approvals
      .filter((a) => !a.sla.breached && a.sla.percentConsumed >= 75 && a.status !== 'APPROVED')
      .map((a) => ({
        id: `warn-${a.id}`, severity: 'WARNING' as const,
        title: `${a.name} approaching SLA`,
        detail: `${a.projectName} — ${a.sla.label}`,
        href: `/approvals/${a.projectId}/${a.key}`, at: a.dueAt,
      })),
  ];
  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
