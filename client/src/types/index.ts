export interface Sla {
  dueAt: string; submittedAt: string; totalHours: number; elapsedHours: number;
  remainingHours: number; percentConsumed: number; breached: boolean;
  breachedByDays: number; label: string; derivedStatus: string;
}

export interface ApprovalView {
  id: string; key: string; name: string; referenceNo: string;
  projectId: string; projectName: string; department: string; departmentCode: string;
  authority: string; status: string; impact: string; risk: string;
  submittedAt: string; dueAt: string; slaDays: number; sla: Sla;
  blocksActivityKeys: string[]; sourcePage: number; confidence: number;
  notes: string; evidence: { label: string; ref: string; date: string }[];
  impactRadius?: ImpactRadius;
}

export interface ImpactNode {
  key: string; name: string; isMilestone: boolean; isCritical: boolean;
  status: string; depth: number; floatDays: number;
}

export interface ImpactRadius {
  approvalKey: string; directActivities: string[]; activities: ImpactNode[];
  milestones: ImpactNode[];
  windows: { id: string; title: string; startAt: string; endAt: string; status: string }[];
  counts: { activities: number; milestones: number; windows: number };
  level: string; path: { from: string; to: string }[];
}

export interface WindowView {
  id: string; projectId: string; projectName: string; title: string; activityKey: string;
  authority: string; constraint: string; startAt: string; endAt: string;
  hoursUntilStart: number; readiness: number; status: string;
  checklist: { label: string; ready: boolean; owner: string; approvalKey?: string }[];
  missing: string[]; nextWindowAt: string;
}

export interface Intervention {
  approvalKey: string; approvalName: string; projectId: string; projectName: string;
  department: string; status: string; risk: string; slaLabel: string;
  breachedByDays: number; percentConsumed: number; remainingHours: number;
  activitiesAffected: number; milestonesAffected: number;
  window: { id: string; title: string; startAt: string; hoursUntilStart: number; status: string } | null;
  blocks: string[];
}

export interface Overview {
  metrics: { activeProjects: number; pendingApprovals: number; slaBreaches: number; criticalWindows: number };
  interventions: Intervention[];
  projects: {
    id: string; code: string; name: string; status: string; contractValueCr: number;
    physicalProgress: number; scheduleProgress: number; approvalHealth: number; riskScore: number;
  }[];
  windows: WindowView[];
}

export interface Project {
  _id: string; code: string; name: string; authority: string; location: string;
  contractValueCr: number; durationDays: number; startDate: string; plannedCompletion: string;
  forecastCompletion: string; physicalProgress: number; scheduleProgress: number;
  approvalHealth: number; riskScore: number; status: string; contractor: string;
}

export interface Activity {
  _id: string; key: string; name: string; sequence: number; isMilestone: boolean;
  isCritical: boolean; status: string; progress: number; plannedStart: string;
  plannedEnd: string; floatDays: number; dependsOn: string[];
}

export interface SimulationResult {
  approvalKey: string; approvalName: string; delayDays: number;
  current: { completion: string; windowsAvailable: number; milestonesOnTrack: number; nextWindowAt: string | null };
  simulated: { completion: string; windowsLost: number; milestonesAffected: number; nextWindowAt: string | null };
  impactDays: number; activitiesAffected: number; narrative: string[]; recommendation: string;
}

export interface Escalation {
  _id: string; projectId: string; projectName?: string; approvalKey: string; title: string;
  level: number; raisedTo: string; status: string; severity: string; openedAt: string; closedAt?: string;
  timeline: { at: string; label: string; detail: string; type: string }[];
}

export interface Notification {
  id: string; severity: 'CRITICAL' | 'WARNING'; title: string; detail: string; href: string; at: string;
}

export interface Tender {
  _id: string; reference: string; title: string; authority: string; location: string;
  contractValueCr: number; durationDays: number; publishedAt: string; closesAt: string;
  status: string; extractionMode?: string;
  understanding?: { milestones: number; approvals: number; departments: number; executionWindows: number };
  extracted?: {
    overview: string;
    milestones: { name: string; day: number; page: number; confidence: number }[];
    approvals: { name: string; departmentCode: string; slaDays: number; page: number; confidence: number }[];
    executionWindows: { activity: string; constraint: string; page: number; confidence: number }[];
    clauses: { title: string; text: string; page: number; severity: string; confidence: number }[];
    payments: { stage: string; percent: number; page: number; confidence: number }[];
  };
}
