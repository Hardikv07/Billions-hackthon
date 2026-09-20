import { Activity, Approval, ExecutionWindow } from '../models';
import type { IActivity } from '../models';
import type { Types } from 'mongoose';

export interface ImpactNode {
  key: string;
  name: string;
  isMilestone: boolean;
  isCritical: boolean;
  status: string;
  depth: number;
  floatDays: number;
}

export interface ImpactRadius {
  approvalKey: string;
  directActivities: string[];
  activities: ImpactNode[];
  milestones: ImpactNode[];
  windows: { id: string; title: string; startAt: Date; endAt: Date; status: string }[];
  counts: { activities: number; milestones: number; windows: number };
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  path: { from: string; to: string }[];
}

/** Walks the activity dependency graph downstream from the activities an approval gates. */
export function traverseDownstream(activities: IActivity[], seedKeys: string[]) {
  const byKey = new Map(activities.map((a) => [a.key, a]));
  const children = new Map<string, string[]>();
  for (const a of activities) {
    for (const parent of a.dependsOn ?? []) {
      children.set(parent, [...(children.get(parent) ?? []), a.key]);
    }
  }

  const visited = new Map<string, number>();
  const edges: { from: string; to: string }[] = [];
  const queue: { key: string; depth: number }[] = seedKeys.map((key) => ({ key, depth: 0 }));

  while (queue.length) {
    const { key, depth } = queue.shift()!;
    if (visited.has(key)) continue;
    visited.set(key, depth);
    for (const child of children.get(key) ?? []) {
      edges.push({ from: key, to: child });
      if (!visited.has(child)) queue.push({ key: child, depth: depth + 1 });
    }
  }

  const nodes: ImpactNode[] = [...visited.entries()]
    .map(([key, depth]) => {
      const a = byKey.get(key);
      if (!a) return null;
      return {
        key: a.key, name: a.name, isMilestone: a.isMilestone, isCritical: a.isCritical,
        status: a.status, depth, floatDays: a.floatDays,
      };
    })
    .filter(Boolean) as ImpactNode[];

  nodes.sort((a, b) => a.depth - b.depth);
  return { nodes, edges, byKey };
}

export async function getImpactRadius(projectId: Types.ObjectId | string, approvalKey: string): Promise<ImpactRadius | null> {
  const approval = await Approval.findOne({ projectId, key: approvalKey });
  if (!approval) return null;

  const activities = await Activity.find({ projectId }).sort({ sequence: 1 });
  const { nodes, edges } = traverseDownstream(activities, approval.blocksActivityKeys ?? []);

  const affectedKeys = new Set(nodes.map((n) => n.key));
  const windows = (await ExecutionWindow.find({ projectId }))
    .filter((w) => affectedKeys.has(w.activityKey))
    .map((w) => ({ id: String(w._id), title: w.title, startAt: w.startAt, endAt: w.endAt, status: w.status }));

  const milestones = nodes.filter((n) => n.isMilestone);
  const criticalWindow = windows.some((w) => w.status === 'AT_RISK' || w.status === 'LOST');
  const level = criticalWindow ? 'CRITICAL' : nodes.length >= 5 ? 'HIGH' : nodes.length >= 2 ? 'MEDIUM' : 'LOW';

  return {
    approvalKey,
    directActivities: approval.blocksActivityKeys ?? [],
    activities: nodes,
    milestones,
    windows,
    counts: { activities: nodes.length, milestones: milestones.length, windows: windows.length },
    level,
    path: edges,
  };
}
