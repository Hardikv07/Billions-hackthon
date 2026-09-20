import { Activity, Approval, ExecutionWindow, Project, Simulation } from '../models';
import { getImpactRadius } from './impactService';
import { nextOccurrence } from './windowService';

const DAY = 24 * 3600 * 1000;

export interface SimulationResult {
  approvalKey: string;
  approvalName: string;
  delayDays: number;
  current: {
    completion: Date;
    windowsAvailable: number;
    milestonesOnTrack: number;
    nextWindowAt: Date | null;
  };
  simulated: {
    completion: Date;
    windowsLost: number;
    milestonesAffected: number;
    nextWindowAt: Date | null;
  };
  impactDays: number;
  activitiesAffected: number;
  narrative: string[];
  recommendation: string;
}

/**
 * Non-mutating forward simulation: how far does an additional approval delay
 * push the next usable execution window, and therefore the project completion.
 */
export async function simulateDelay(projectId: string, approvalKey: string, delayDays: number, persistBy?: string): Promise<SimulationResult | null> {
  const [project, approval] = await Promise.all([
    Project.findById(projectId),
    Approval.findOne({ projectId, key: approvalKey }),
  ]);
  if (!project || !approval) return null;

  const impact = await getImpactRadius(projectId, approvalKey);
  const activities = await Activity.find({ projectId });
  const windows = await ExecutionWindow.find({ projectId });
  const gatedWindows = windows.filter((w) =>
    (w.checklist ?? []).some((c) => c.approvalKey === approvalKey));

  const now = new Date();
  const clearanceAt = new Date(Math.max(now.getTime(), new Date(approval.dueAt).getTime()) + delayDays * DAY);

  let windowsLost = 0;
  let pushDays = 0;
  let nextWindowAt: Date | null = null;
  let currentNextWindow: Date | null = null;

  for (const w of gatedWindows) {
    const planned = new Date(w.startAt);
    if (!currentNextWindow || planned.getTime() < currentNextWindow.getTime()) currentNextWindow = planned;
    if (clearanceAt.getTime() > planned.getTime()) {
      windowsLost += 1;
      const next = nextOccurrence(w, clearanceAt);
      if (!nextWindowAt || next.getTime() < nextWindowAt.getTime()) nextWindowAt = next;
      pushDays = Math.max(pushDays, Math.ceil((next.getTime() - planned.getTime()) / DAY));
    }
  }

  const downstreamFloat = Math.min(
    ...[999, ...impact!.activities.filter((a) => a.depth > 0).map((a) => a.floatDays)],
  );
  const absorbed = Math.min(pushDays, Math.max(0, downstreamFloat === 999 ? 0 : downstreamFloat));
  const impactDays = Math.max(0, pushDays - absorbed);

  const current = new Date(project.plannedCompletion);
  const simulatedCompletion = new Date(current.getTime() + impactDays * DAY);
  const milestonesAffected = impactDays > 0 ? impact!.counts.milestones : 0;

  const narrative = [
    `${approval.name} clearance assumed on ${clearanceAt.toDateString()} after ${delayDays} additional day(s).`,
    windowsLost > 0
      ? `${windowsLost} restricted execution window is lost; the next usable window opens ${nextWindowAt?.toDateString()}.`
      : 'No restricted execution window is lost at this delay level.',
    absorbed > 0
      ? `${absorbed} day(s) absorbed by downstream float.`
      : 'No downstream float available to absorb the shift.',
    impactDays > 0
      ? `Projected completion moves from ${current.toDateString()} to ${simulatedCompletion.toDateString()} (+${impactDays} days).`
      : 'Projected completion is unchanged.',
  ];

  const result: SimulationResult = {
    approvalKey,
    approvalName: approval.name,
    delayDays,
    current: {
      completion: current,
      windowsAvailable: gatedWindows.length,
      milestonesOnTrack: activities.filter((a) => a.isMilestone).length,
      nextWindowAt: currentNextWindow,
    },
    simulated: {
      completion: simulatedCompletion,
      windowsLost,
      milestonesAffected,
      nextWindowAt,
    },
    impactDays,
    activitiesAffected: impact!.counts.activities,
    narrative,
    recommendation: impactDays >= 7
      ? 'Intervention recommended: escalate to Level 2 and request a time-bound decision.'
      : impactDays > 0
        ? 'Action overdue: request a status update from the deciding authority.'
        : 'Monitor. No schedule impact detected at this delay level.',
  };

  if (persistBy) {
    await Simulation.create({ projectId, approvalKey, delayDays, result, runBy: persistBy });
  }
  return result;
}
