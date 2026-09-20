export type ApprovalStatus =
  | 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW'
  | 'CLARIFICATION' | 'AT_RISK' | 'SLA_BREACHED' | 'APPROVED' | 'REJECTED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WindowStatus = 'PLANNED' | 'READY' | 'AT_RISK' | 'LOST' | 'COMPLETED';
export type ProjectStatus = 'ON_TRACK' | 'WATCH' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';
export type EscalationStatus = 'NEW' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SENIOR_OFFICER' | 'ADMIN' | 'PROJECT_MANAGER';
}
