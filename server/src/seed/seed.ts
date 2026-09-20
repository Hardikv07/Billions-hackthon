/**
 * Seeds a complete, demo-ready state.
 *
 * Dates are anchored relative to "now" rather than hard-coded, so the critical
 * scenario (Railway NOC overdue, Sunday night bridge window at risk) is always
 * live whenever the demo is run.
 *
 *   npm run seed
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { demoExtraction } from '../services/demoExtraction';
import {
  Activity, Approval, Department, Escalation, ExecutionWindow,
  Project, ProjectEvent, Simulation, Tender, User,
} from '../models';

const DAY = 86400000;
const HOUR = 3600000;
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * DAY);
const hours = (n: number) => new Date(now.getTime() + n * HOUR);

/** Next Sunday 02:00 local time — the sanctioned railway traffic block. */
function nextSunday(hour: number): Date {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  const delta = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

const departments = [
  { code: 'RLY', name: 'Railway Authority', authority: 'Western Railway — Construction Wing', slaDays: 7, contactOfficer: 'Dy. Chief Engineer (Construction)', avgResponseDays: 9 },
  { code: 'TRF', name: 'Traffic Police', authority: 'City Traffic Branch', slaDays: 10, contactOfficer: 'DCP (Traffic)', avgResponseDays: 7 },
  { code: 'UTL', name: 'Utility Coordination Cell', authority: 'Power & Water Utilities Board', slaDays: 14, contactOfficer: 'Executive Engineer (Utilities)', avgResponseDays: 12 },
  { code: 'SFT', name: 'Safety Directorate', authority: 'Directorate of Construction Safety', slaDays: 7, contactOfficer: 'Dy. Director (Safety)', avgResponseDays: 5 },
  { code: 'FIN', name: 'Finance Department', authority: 'Finance Department — Works Wing', slaDays: 5, contactOfficer: 'Joint Secretary (Works)', avgResponseDays: 6 },
  { code: 'ENV', name: 'Environment Cell', authority: 'State Pollution Control Board', slaDays: 21, contactOfficer: 'Regional Officer', avgResponseDays: 19 },
  { code: 'MUN', name: 'Municipal Corporation', authority: 'Roads & Buildings Department', slaDays: 12, contactOfficer: 'City Engineer', avgResponseDays: 10 },
];

const metroActivities = [
  { key: 'DESIGN', name: 'Design & Drawing Approval', sequence: 1, isMilestone: true, status: 'COMPLETED', progress: 100, dependsOn: [], float: 0 },
  { key: 'UTILITY', name: 'Utility Shifting', sequence: 2, isMilestone: false, status: 'COMPLETED', progress: 100, dependsOn: ['DESIGN'], float: 4 },
  { key: 'FOUNDATION', name: 'Foundation Works', sequence: 3, isMilestone: true, status: 'COMPLETED', progress: 100, dependsOn: ['UTILITY'], float: 0 },
  { key: 'PIERS', name: 'Pier Casting', sequence: 4, isMilestone: false, status: 'COMPLETED', progress: 100, dependsOn: ['FOUNDATION'], float: 2 },
  { key: 'GIRDER_FAB', name: 'Girder Fabrication', sequence: 5, isMilestone: false, status: 'COMPLETED', progress: 100, dependsOn: ['FOUNDATION'], float: 6 },
  { key: 'GIRDER_STAGE', name: 'Girder Transport & Staging', sequence: 6, isMilestone: false, status: 'IN_PROGRESS', progress: 82, dependsOn: ['GIRDER_FAB', 'PIERS'], float: 1 },
  { key: 'BRIDGE_INSTALL', name: 'Bridge Installation', sequence: 7, isMilestone: true, critical: true, status: 'BLOCKED', progress: 0, dependsOn: ['GIRDER_STAGE'], float: 0 },
  { key: 'DECK', name: 'Deck Slab & Wearing Coat', sequence: 8, isMilestone: false, critical: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['BRIDGE_INSTALL'], float: 0 },
  { key: 'BEARINGS', name: 'Expansion Joints & Bearings', sequence: 9, isMilestone: false, status: 'NOT_STARTED', progress: 0, dependsOn: ['BRIDGE_INSTALL'], float: 3 },
  { key: 'ROAD', name: 'Approach Road Works', sequence: 10, isMilestone: false, critical: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['DECK', 'BEARINGS'], float: 0 },
  { key: 'TESTING', name: 'Load Testing & Commissioning', sequence: 11, isMilestone: false, critical: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['ROAD'], float: 0 },
  { key: 'HANDOVER', name: 'Handover', sequence: 12, isMilestone: true, critical: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['TESTING'], float: 0 },
];

const roadActivities = [
  { key: 'B_DESIGN', name: 'Design Approval', sequence: 1, isMilestone: true, status: 'COMPLETED', progress: 100, dependsOn: [], float: 0 },
  { key: 'B_MOBILISE', name: 'Contractor Mobilisation', sequence: 2, isMilestone: false, critical: true, status: 'BLOCKED', progress: 0, dependsOn: ['B_DESIGN'], float: 0 },
  { key: 'B_UTILITY', name: 'Utility Shifting', sequence: 3, isMilestone: false, status: 'NOT_STARTED', progress: 0, dependsOn: ['B_MOBILISE'], float: 2 },
  { key: 'B_ROAD', name: 'Carriageway Widening', sequence: 4, isMilestone: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['B_UTILITY'], float: 0 },
  { key: 'B_HANDOVER', name: 'Handover', sequence: 5, isMilestone: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['B_ROAD'], float: 0 },
];

const flyoverActivities = [
  { key: 'C_PIERS', name: 'Pier Casting', sequence: 1, isMilestone: false, status: 'IN_PROGRESS', progress: 55, dependsOn: [], float: 3 },
  { key: 'C_TIEIN', name: 'Road Tie-in Works', sequence: 2, isMilestone: true, critical: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['C_PIERS'], float: 0 },
  { key: 'C_DECK', name: 'Deck Work', sequence: 3, isMilestone: false, status: 'NOT_STARTED', progress: 0, dependsOn: ['C_TIEIN'], float: 1 },
  { key: 'C_HANDOVER', name: 'Handover', sequence: 4, isMilestone: true, status: 'NOT_STARTED', progress: 0, dependsOn: ['C_DECK'], float: 0 },
];

async function seed() {
  await connectDb();
  await Promise.all([
    User.deleteMany({}), Department.deleteMany({}), Tender.deleteMany({}), Project.deleteMany({}),
    Activity.deleteMany({}), Approval.deleteMany({}), ExecutionWindow.deleteMany({}),
    Escalation.deleteMany({}), ProjectEvent.deleteMany({}), Simulation.deleteMany({}),
  ]);

  const hash = await bcrypt.hash('demo123', 10);
  await User.insertMany([
    { name: 'A. Mehra', email: 'officer@nirman.demo', passwordHash: hash, role: 'SENIOR_OFFICER', designation: 'Senior Infrastructure Officer' },
    { name: 'R. Iyer', email: 'admin@nirman.demo', passwordHash: hash, role: 'ADMIN', designation: 'Platform Administrator' },
    { name: 'S. Deshmukh', email: 'pm@nirman.demo', passwordHash: hash, role: 'PROJECT_MANAGER', designation: 'Project Manager — Package A' },
  ]);
  await Department.insertMany(departments);

  const [metro, roadB, flyoverC] = await Project.create([
    {
      code: 'MRI-A', name: 'Metro–Road Interchange Package A', package: 'Package A',
      authority: 'State Infrastructure Development Authority', location: 'Ahmedabad, Gujarat',
      contractValueCr: 184, durationDays: 540, startDate: days(-385), plannedCompletion: days(155),
      forecastCompletion: days(162), physicalProgress: 68, scheduleProgress: 61, approvalHealth: 72,
      riskScore: 86, status: 'AT_RISK', contractor: 'Sanghavi Infra Projects Ltd.',
    },
    {
      code: 'URC-B', name: 'Urban Road Corridor Package B', package: 'Package B',
      authority: 'State Infrastructure Development Authority', location: 'Surat, Gujarat',
      contractValueCr: 96, durationDays: 420, startDate: days(-120), plannedCompletion: days(300),
      forecastCompletion: days(304), physicalProgress: 22, scheduleProgress: 28, approvalHealth: 64,
      riskScore: 58, status: 'WATCH', contractor: 'Narmada Constructions Pvt. Ltd.',
    },
    {
      code: 'FLY-C', name: 'Flyover Package C', package: 'Package C',
      authority: 'State Infrastructure Development Authority', location: 'Vadodara, Gujarat',
      contractValueCr: 142, durationDays: 480, startDate: days(-210), plannedCompletion: days(270),
      forecastCompletion: days(270), physicalProgress: 44, scheduleProgress: 46, approvalHealth: 81,
      riskScore: 41, status: 'ON_TRACK', contractor: 'Vishwa Engineering Corporation',
    },
  ]);

  const mkActivities = (projectId: mongoose.Types.ObjectId, list: typeof metroActivities, startOffset: number) =>
    list.map((a, i) => ({
      projectId, key: a.key, name: a.name, sequence: a.sequence,
      isMilestone: a.isMilestone, isCritical: Boolean((a as { critical?: boolean }).critical),
      status: a.status, progress: a.progress,
      plannedStart: days(startOffset + i * 38), plannedEnd: days(startOffset + i * 38 + 34),
      floatDays: a.float, dependsOn: a.dependsOn, requiresApprovalKeys: [],
    }));

  await Activity.insertMany([
    ...mkActivities(metro._id, metroActivities, -385),
    ...mkActivities(roadB._id, roadActivities as typeof metroActivities, -120),
    ...mkActivities(flyoverC._id, flyoverActivities as typeof metroActivities, -210),
  ]);

  // --- The critical scenario -------------------------------------------------
  // Railway NOC: submitted 8.4 days ago against a 7-day standard → overdue 1.4 days.
  const rlySubmitted = hours(-8.4 * 24);
  const rlyDue = hours(-1.4 * 24);

  await Approval.insertMany([
    {
      key: 'RLY_NOC', name: 'Railway NOC', projectId: metro._id, departmentCode: 'RLY',
      referenceNo: 'WR/CN/NOC/2026/4471', status: 'UNDER_REVIEW',
      submittedAt: rlySubmitted, slaDays: 7, dueAt: rlyDue, impact: 'HIGH',
      blocksActivityKeys: ['BRIDGE_INSTALL'], sourcePage: 17, confidence: 94,
      notes: 'No-objection for girder launching over live railway tracks within the sanctioned traffic block.',
      evidence: [
        { label: 'Application with drawings', ref: 'WR/CN/NOC/2026/4471', date: rlySubmitted },
        { label: 'Clarification sought by authority', ref: 'WR/CN/QRY/118', date: hours(-3.4 * 24) },
        { label: 'Clarification submitted', ref: 'SIDA/RLY/REPLY/62', date: hours(-2.4 * 24) },
        { label: 'Service standard reminder issued', ref: 'SIDA/RLY/RMD/09', date: hours(-0.6 * 24) },
      ],
    },
    {
      key: 'TRAFFIC_DIVERSION', name: 'Traffic Diversion Approval', projectId: metro._id, departmentCode: 'TRF',
      referenceNo: 'TRF/DIV/2026/0912', status: 'APPROVED', submittedAt: days(-32), slaDays: 10,
      dueAt: days(-22), decidedAt: days(-25), impact: 'MEDIUM', blocksActivityKeys: ['ROAD'],
      sourcePage: 21, confidence: 91, notes: 'Night diversion sanctioned for approach road works.', evidence: [],
    },
    {
      key: 'UTILITY_SHIFT', name: 'Utility Shifting Clearance', projectId: metro._id, departmentCode: 'UTL',
      referenceNo: 'UTL/SFT/2026/0330', status: 'APPROVED', submittedAt: days(-140), slaDays: 14,
      dueAt: days(-126), decidedAt: days(-129), impact: 'MEDIUM', blocksActivityKeys: ['UTILITY'],
      sourcePage: 24, confidence: 88, notes: 'Power and water lines cleared from the pier alignment.', evidence: [],
    },
    {
      key: 'SAFETY_CLEAR', name: 'Safety Clearance — Night Works', projectId: metro._id, departmentCode: 'SFT',
      referenceNo: 'SFT/NW/2026/2210', status: 'SUBMITTED', submittedAt: hours(-40), slaDays: 7,
      dueAt: hours(128), impact: 'MEDIUM', blocksActivityKeys: ['BRIDGE_INSTALL'],
      sourcePage: 29, confidence: 92, notes: 'Night working permission for the launching crew.', evidence: [],
    },
    {
      key: 'FINANCE_CONCUR', name: 'Finance Concurrence — Variation 3', projectId: metro._id, departmentCode: 'FIN',
      referenceNo: 'FIN/VAR/2026/0071', status: 'APPROVED', submittedAt: days(-40), slaDays: 5,
      dueAt: days(-35), decidedAt: days(-36), impact: 'LOW', blocksActivityKeys: [],
      sourcePage: 33, confidence: 90, notes: 'Variation for additional pier protection works.', evidence: [],
    },
    {
      key: 'ENV_CONSENT', name: 'Environmental Consent — Renewal', projectId: metro._id, departmentCode: 'ENV',
      referenceNo: 'ENV/CTO/2026/1188', status: 'UNDER_REVIEW', submittedAt: days(-17), slaDays: 21,
      dueAt: days(4), impact: 'MEDIUM', blocksActivityKeys: ['DECK'], sourcePage: 36, confidence: 84,
      notes: 'Consent-to-operate renewal for the batching plant.', evidence: [],
    },
    {
      key: 'FINANCE_APPROVAL', name: 'Finance Approval — Mobilisation Advance', projectId: roadB._id, departmentCode: 'FIN',
      referenceNo: 'FIN/MOB/2026/0448', status: 'UNDER_REVIEW', submittedAt: hours(-41), slaDays: 2,
      dueAt: hours(7), impact: 'HIGH', blocksActivityKeys: ['B_MOBILISE'], sourcePage: 30, confidence: 93,
      notes: 'Mobilisation advance release against bank guarantee.',
      evidence: [{ label: 'Bank guarantee lodged', ref: 'BG/2026/77412', date: hours(-44) }],
    },
    {
      key: 'MUN_PERMIT', name: 'Municipal Road Cutting Permit', projectId: roadB._id, departmentCode: 'MUN',
      referenceNo: 'MUN/RC/2026/2290', status: 'SUBMITTED', submittedAt: days(-5), slaDays: 12,
      dueAt: days(7), impact: 'MEDIUM', blocksActivityKeys: ['B_UTILITY'], sourcePage: 26, confidence: 86,
      notes: 'Permission to cut and reinstate the carriageway for utility ducting.', evidence: [],
    },
    {
      key: 'UTILITY_B', name: 'Utility Shifting Clearance', projectId: roadB._id, departmentCode: 'UTL',
      referenceNo: 'UTL/SFT/2026/0501', status: 'APPROVED', submittedAt: days(-60), slaDays: 14,
      dueAt: days(-46), decidedAt: days(-50), impact: 'LOW', blocksActivityKeys: [], sourcePage: 27, confidence: 85,
      notes: 'Clearance issued with reinstatement conditions.', evidence: [],
    },
    {
      key: 'TRAFFIC_CLEARANCE', name: 'Traffic Clearance — Tie-in Block', projectId: flyoverC._id, departmentCode: 'TRF',
      referenceNo: 'TRF/TIE/2026/1033', status: 'UNDER_REVIEW', submittedAt: hours(-8.2 * 24), slaDays: 10,
      dueAt: hours(1.8 * 24), impact: 'HIGH', blocksActivityKeys: ['C_TIEIN'], sourcePage: 19, confidence: 89,
      notes: 'Carriageway closure for the tie-in block on the service road.', evidence: [],
    },
    {
      key: 'SAFETY_C', name: 'Safety Clearance', projectId: flyoverC._id, departmentCode: 'SFT',
      referenceNo: 'SFT/FLY/2026/0654', status: 'SUBMITTED', submittedAt: days(-2), slaDays: 7,
      dueAt: days(5), impact: 'LOW', blocksActivityKeys: [], sourcePage: 31, confidence: 88,
      notes: 'Routine safety clearance for elevated works.', evidence: [],
    },
    {
      key: 'ENV_C', name: 'Environmental Consent', projectId: flyoverC._id, departmentCode: 'ENV',
      referenceNo: 'ENV/CTO/2026/0902', status: 'APPROVED', submittedAt: days(-90), slaDays: 21,
      dueAt: days(-69), decidedAt: days(-72), impact: 'LOW', blocksActivityKeys: [], sourcePage: 34, confidence: 87,
      notes: 'Consent issued for the full construction period.', evidence: [],
    },
  ]);

  const sundayStart = nextSunday(2);
  await ExecutionWindow.insertMany([
    {
      projectId: metro._id, activityKey: 'BRIDGE_INSTALL', title: 'Bridge Installation',
      authority: 'Western Railway — Construction Wing',
      constraint: 'Girder launching permitted only inside the sanctioned Sunday traffic block.',
      startAt: sundayStart, endAt: new Date(sundayStart.getTime() + 2 * HOUR),
      recurrenceDays: 7, status: 'AT_RISK',
      checklist: [
        { label: '450T crawler crane', ready: true, owner: 'Contractor' },
        { label: 'Launching crew & supervision', ready: true, owner: 'Contractor' },
        { label: 'Steel girder segments at site', ready: true, owner: 'Contractor' },
        { label: 'Safety cordon & lighting plan', ready: true, owner: 'Safety Directorate' },
        { label: 'Railway NOC', ready: false, owner: 'Railway Authority', approvalKey: 'RLY_NOC' },
      ],
    },
    {
      projectId: metro._id, activityKey: 'DECK', title: 'Deck Concreting — Night Pour',
      authority: 'Municipal Corporation',
      constraint: 'Continuous pour permitted 23:00–05:00 on weekdays only.',
      startAt: days(9), endAt: new Date(days(9).getTime() + 6 * HOUR), recurrenceDays: 1, status: 'PLANNED',
      checklist: [
        { label: 'Batching plant consent', ready: false, owner: 'Environment Cell', approvalKey: 'ENV_CONSENT' },
        { label: 'Concrete pumps', ready: true, owner: 'Contractor' },
        { label: 'Night working permission', ready: true, owner: 'Safety Directorate' },
      ],
    },
    {
      projectId: flyoverC._id, activityKey: 'C_TIEIN', title: 'Road Tie-in Block',
      authority: 'City Traffic Branch',
      constraint: 'Carriageway closure permitted 23:00–05:00 with traffic police escort.',
      startAt: hours(30), endAt: hours(36), recurrenceDays: 7, status: 'AT_RISK',
      checklist: [
        { label: 'Diversion signage', ready: true, owner: 'Contractor' },
        { label: 'Milling machine & paver', ready: true, owner: 'Contractor' },
        { label: 'Traffic clearance', ready: false, owner: 'Traffic Police', approvalKey: 'TRAFFIC_CLEARANCE' },
      ],
    },
  ]);

  await Escalation.insertMany([
    {
      projectId: metro._id, approvalKey: 'RLY_NOC',
      title: 'Railway NOC — service standard exceeded, execution window at risk',
      level: 2, raisedTo: 'Principal Secretary, Infrastructure', status: 'ESCALATED', severity: 'CRITICAL',
      openedAt: hours(-14),
      timeline: [
        { at: rlySubmitted, label: 'Application submitted', detail: 'NOC application lodged with drawings and method statement.', type: 'EVENT' },
        { at: hours(-3.4 * 24), label: 'Clarification requested', detail: 'Authority sought revised launching sequence drawings.', type: 'EVENT' },
        { at: hours(-2.4 * 24), label: 'Clarification submitted', detail: 'Revised drawings and crane load chart furnished.', type: 'EVENT' },
        { at: hours(-1.9 * 24), label: 'Service standard warning', detail: '75% of the 7-day standard consumed.', type: 'WARNING' },
        { at: rlyDue, label: 'SLA breached', detail: 'Decision not received within the 7-day service standard.', type: 'BREACH' },
        { at: hours(-14), label: 'Senior officer notified', detail: 'Escalated to Level 2 with impact assessment attached.', type: 'ACTION' },
      ],
    },
    {
      projectId: roadB._id, approvalKey: 'FINANCE_APPROVAL',
      title: 'Mobilisation advance — approaching service standard',
      level: 1, raisedTo: 'Joint Secretary (Works)', status: 'ACKNOWLEDGED', severity: 'HIGH', openedAt: hours(-20),
      timeline: [
        { at: hours(-44), label: 'Bank guarantee lodged', detail: 'BG/2026/77412 accepted by the authority.', type: 'EVENT' },
        { at: hours(-41), label: 'Application submitted', detail: 'Mobilisation advance release requested.', type: 'EVENT' },
        { at: hours(-20), label: 'Reminder issued', detail: 'Reminder sent; 7 hours remain on the standard.', type: 'ACTION' },
      ],
    },
    {
      projectId: flyoverC._id, approvalKey: 'TRAFFIC_CLEARANCE',
      title: 'Tie-in block clearance — window tomorrow night',
      level: 1, raisedTo: 'DCP (Traffic)', status: 'NEW', severity: 'HIGH', openedAt: hours(-6),
      timeline: [
        { at: hours(-8.2 * 24), label: 'Application submitted', detail: 'Closure request lodged for the tie-in block.', type: 'EVENT' },
        { at: hours(-6), label: 'Readiness flagged', detail: '82% of the standard consumed with the window 30 hours away.', type: 'WARNING' },
      ],
    },
  ]);

  await ProjectEvent.insertMany([
    { projectId: metro._id, at: days(-140), actor: 'Utility Coordination Cell', category: 'APPROVAL', title: 'Utility shifting clearance issued', detail: 'Power and water lines cleared from the pier alignment.', cause: 'Joint survey completed ahead of schedule.', resolution: 'Clearance issued in 11 days against a 14-day standard.', tags: ['UTILITY_SHIFT', 'utility'] },
    { projectId: metro._id, at: days(-96), actor: 'Railway Authority', category: 'APPROVAL', title: 'Earlier railway NOC delayed by 9 days', detail: 'The pier-protection NOC was held pending a revised soil investigation report.', cause: 'Soil investigation report was not attached to the original application.', resolution: 'Report furnished; NOC issued on day 16. Checklist updated to require the report upfront.', tags: ['RLY_NOC', 'railway', 'delay'] },
    { projectId: metro._id, at: days(-60), actor: 'Project Manager', category: 'WINDOW', title: 'Sunday traffic block availed successfully', detail: 'Pier cap segment lifted within the 02:00–04:00 block.', cause: 'All prerequisites closed 48 hours in advance.', resolution: 'Window used in full; no schedule loss.', tags: ['BRIDGE_INSTALL', 'window'] },
    { projectId: metro._id, at: hours(-8.4 * 24), actor: 'Project Manager', category: 'APPROVAL', title: 'Railway NOC application submitted', detail: 'Application lodged for girder launching over live tracks.', tags: ['RLY_NOC', 'railway'] },
    { projectId: metro._id, at: hours(-3.4 * 24), actor: 'Railway Authority', category: 'APPROVAL', title: 'Clarification requested on launching sequence', detail: 'Authority sought revised drawings showing the launching sequence.', cause: 'Launching sequence drawing was at a superseded revision.', tags: ['RLY_NOC', 'railway', 'clarification'] },
    { projectId: metro._id, at: hours(-2.4 * 24), actor: 'Project Manager', category: 'APPROVAL', title: 'Clarification submitted', detail: 'Revised drawings and crane load chart furnished the same day.', resolution: 'Application returned to the authority for decision.', tags: ['RLY_NOC', 'railway'] },
    { projectId: metro._id, at: rlyDue, actor: 'System', category: 'APPROVAL', title: 'Railway NOC breached its service standard', detail: 'Decision not received within the 7-day standard.', tags: ['RLY_NOC', 'sla', 'breach'] },
    { projectId: metro._id, at: hours(-14), actor: 'A. Mehra', category: 'ESCALATION', title: 'Escalated to Principal Secretary', detail: 'Level 2 escalation raised with the impact assessment attached.', tags: ['RLY_NOC', 'escalation'] },
    { projectId: metro._id, at: hours(-2), actor: 'System', category: 'WINDOW', title: 'Bridge installation window flagged at risk', detail: 'Readiness at 80% with the railway NOC outstanding.', tags: ['BRIDGE_INSTALL', 'window', 'risk'] },
    { projectId: roadB._id, at: hours(-41), actor: 'Project Manager', category: 'APPROVAL', title: 'Mobilisation advance requested', detail: 'Release sought against bank guarantee BG/2026/77412.', tags: ['FINANCE_APPROVAL', 'finance'] },
    { projectId: flyoverC._id, at: hours(-8.2 * 24), actor: 'Project Manager', category: 'APPROVAL', title: 'Tie-in block clearance requested', detail: 'Closure request lodged with the traffic branch.', tags: ['TRAFFIC_CLEARANCE', 'traffic'] },
    { projectId: flyoverC._id, at: days(-45), actor: 'Traffic Police', category: 'APPROVAL', title: 'Previous closure cleared in 6 days', detail: 'Earlier closure request cleared well inside the standard.', cause: 'Application filed with the diversion plan attached.', resolution: 'Practice adopted as standard for this package.', tags: ['TRAFFIC_CLEARANCE', 'traffic'] },
  ]);

  const extraction = demoExtraction('metro road interchange railway girder launching', 'Metro Road Interchange Package A');
  await Tender.insertMany([
    {
      reference: 'SIDA/2026/MRI/A', title: 'Metro–Road Interchange Package A',
      authority: 'State Infrastructure Development Authority', location: 'Ahmedabad, Gujarat',
      contractValueCr: 184, durationDays: 540, publishedAt: days(-420), closesAt: days(-395),
      status: 'AWARDED', extractionMode: 'DEMO', projectId: metro._id,
      understanding: { milestones: extraction.milestones.length, approvals: extraction.approvals.length, departments: 7, executionWindows: extraction.executionWindows.length },
      extracted: { overview: extraction.overview, milestones: extraction.milestones, approvals: extraction.approvals, executionWindows: extraction.executionWindows, clauses: extraction.clauses, payments: extraction.payments },
    },
    { reference: 'SIDA/2026/ROB/117', title: 'Road Over Bridge at Chandkheda Level Crossing', authority: 'State Infrastructure Development Authority', location: 'Ahmedabad, Gujarat', contractValueCr: 168, durationDays: 510, publishedAt: days(-12), closesAt: days(14), status: 'PUBLISHED' },
    { reference: 'SIDA/2026/ELV/204', title: 'Elevated Corridor Package D — Ring Road', authority: 'Urban Development Authority', location: 'Surat, Gujarat', contractValueCr: 232, durationDays: 580, publishedAt: days(-8), closesAt: days(19), status: 'PUBLISHED' },
    { reference: 'SIDA/2026/JCT/088', title: 'Grade-Separated Junction Improvement, Ring Road', authority: 'Municipal Corporation', location: 'Vadodara, Gujarat', contractValueCr: 118, durationDays: 420, publishedAt: days(-19), closesAt: days(9), status: 'PUBLISHED' },
    { reference: 'NHAI/2026/BYP/031', title: 'Four-Laning of Bypass with Service Roads', authority: 'National Highways Authority', location: 'Bhopal, Madhya Pradesh', contractValueCr: 410, durationDays: 720, publishedAt: days(-6), closesAt: days(22), status: 'PUBLISHED' },
    { reference: 'SIDA/2026/FOB/055', title: 'Foot Over Bridges and Pedestrian Facilities', authority: 'Municipal Corporation', location: 'Rajkot, Gujarat', contractValueCr: 42, durationDays: 300, publishedAt: days(-15), closesAt: days(6), status: 'PUBLISHED' },
  ]);

  console.log('[seed] complete');
  console.log('[seed] sign in with officer@nirman.demo / demo123');
  console.log('[seed] bridge installation window opens', sundayStart.toString());
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
