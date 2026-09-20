import type { IApproval } from '../models';
import type { ApprovalStatus, RiskLevel } from '../types';

const HOUR = 3600 * 1000;

export interface SlaView {
  dueAt: Date;
  submittedAt: Date;
  totalHours: number;
  elapsedHours: number;
  remainingHours: number;
  percentConsumed: number;
  breached: boolean;
  breachedByDays: number;
  label: string;
  derivedStatus: ApprovalStatus;
}

export function formatDuration(hours: number): string {
  const abs = Math.abs(hours);
  const d = Math.floor(abs / 24);
  const h = Math.floor(abs % 24);
  const m = Math.floor((abs % 1) * 60);
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h`;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

/** Pure SLA computation. No database access, so it is trivially testable. */
export function computeSla(approval: Pick<IApproval, 'submittedAt' | 'dueAt' | 'status'>, now = new Date()): SlaView {
  const submittedAt = new Date(approval.submittedAt);
  const dueAt = new Date(approval.dueAt);
  const totalHours = Math.max(1, (dueAt.getTime() - submittedAt.getTime()) / HOUR);
  const elapsedHours = (now.getTime() - submittedAt.getTime()) / HOUR;
  const remainingHours = (dueAt.getTime() - now.getTime()) / HOUR;
  const percentConsumed = Math.min(999, Math.round((elapsedHours / totalHours) * 100));
  const breached = remainingHours < 0;
  const breachedByDays = breached ? Number((Math.abs(remainingHours) / 24).toFixed(1)) : 0;

  let derivedStatus: ApprovalStatus = approval.status;
  if (approval.status !== 'APPROVED' && approval.status !== 'REJECTED') {
    if (breached) derivedStatus = 'SLA_BREACHED';
    else if (percentConsumed >= 75) derivedStatus = 'AT_RISK';
  }

  const label = approval.status === 'APPROVED'
    ? 'Cleared'
    : breached
      ? `Overdue by ${formatDuration(remainingHours)}`
      : `${formatDuration(remainingHours)} remaining`;

  return { dueAt, submittedAt, totalHours, elapsedHours, remainingHours, percentConsumed, breached, breachedByDays, label, derivedStatus };
}

export function riskFromSla(sla: SlaView, impact: RiskLevel): RiskLevel {
  if (sla.breached && (impact === 'HIGH' || impact === 'CRITICAL')) return 'CRITICAL';
  if (sla.breached) return 'HIGH';
  if (sla.percentConsumed >= 75) return impact === 'HIGH' ? 'HIGH' : 'MEDIUM';
  return 'LOW';
}
