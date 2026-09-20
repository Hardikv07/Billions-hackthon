import type { Request, Response } from 'express';
import { Activity, Approval, Department, Escalation, Project, Tender } from '../models';
import { asyncRoute, AppError } from '../middleware/error';
import { getOverview, getNotifications } from '../services/dashboardService';
import { listApprovals, getApprovalDetail } from '../services/approvalService';
import { listWindows, blockingApprovalsFor } from '../services/windowService';
import { getImpactRadius } from '../services/impactService';
import { simulateDelay } from '../services/simulationService';
import { globalSearch, searchMemory } from '../services/searchService';
import { buildDossier } from '../services/dossierService';

export const overview = asyncRoute(async (_req, res: Response) => res.json(await getOverview()));
export const notifications = asyncRoute(async (_req, res: Response) => res.json(await getNotifications()));
export const departments = asyncRoute(async (_req, res: Response) => res.json(await Department.find().sort({ name: 1 })));

export const projects = asyncRoute(async (_req, res: Response) => res.json(await Project.find().sort({ riskScore: -1 })));

export const projectDetail = asyncRoute(async (req: Request, res: Response) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError(404, 'Project not found.');
  const [activities, approvals, windows, escalations] = await Promise.all([
    Activity.find({ projectId: project._id }).sort({ sequence: 1 }),
    listApprovals({ projectId: project._id }),
    listWindows({ projectId: project._id }),
    Escalation.find({ projectId: project._id }).sort({ openedAt: -1 }),
  ]);
  res.json({ project, activities, approvals, windows, escalations });
});

export const approvals = asyncRoute(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.department) filter.departmentCode = req.query.department;
  let list = await listApprovals(filter);
  const view = String(req.query.view ?? 'all');
  if (view === 'breached') list = list.filter((a) => a.sla.breached && a.status !== 'APPROVED');
  if (view === 'at-risk') list = list.filter((a) => !a.sla.breached && a.sla.percentConsumed >= 75);
  if (view === 'critical-window') list = list.filter((a) => a.impact === 'HIGH' || a.impact === 'CRITICAL');
  res.json(list);
});

export const approvalDetail = asyncRoute(async (req: Request, res: Response) => {
  const detail = await getApprovalDetail(req.params.projectId, req.params.key);
  if (!detail) throw new AppError(404, 'Approval not found.');
  res.json(detail);
});

export const impact = asyncRoute(async (req: Request, res: Response) => {
  const result = await getImpactRadius(req.params.projectId, req.params.key);
  if (!result) throw new AppError(404, 'Approval not found.');
  res.json(result);
});

export const windows = asyncRoute(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  res.json(await listWindows(filter));
});

export const windowBlockers = asyncRoute(async (req: Request, res: Response) =>
  res.json(await blockingApprovalsFor(req.params.id)));

export const simulate = asyncRoute(async (req: Request, res: Response) => {
  const { projectId, approvalKey, delayDays } = req.body ?? {};
  const result = await simulateDelay(String(projectId), String(approvalKey), Number(delayDays ?? 3), req.user?.name);
  if (!result) throw new AppError(404, 'Nothing to simulate for that approval.');
  res.json(result);
});

export const escalations = asyncRoute(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;
  const list = await Escalation.find(filter).sort({ openedAt: -1 });
  const projectMap = new Map((await Project.find()).map((p) => [String(p._id), p.name]));
  res.json(list.map((e) => ({ ...e.toObject(), projectName: projectMap.get(String(e.projectId)) })));
});

export const updateEscalation = asyncRoute(async (req: Request, res: Response) => {
  const { status, note } = req.body ?? {};
  const esc = await Escalation.findById(req.params.id);
  if (!esc) throw new AppError(404, 'Escalation not found.');
  if (status) esc.status = status;
  esc.timeline.push({
    at: new Date(),
    label: status === 'ESCALATED' ? 'Escalated to Level 2' : status === 'RESOLVED' ? 'Issue closed' : 'Acknowledged',
    detail: note || `Status set to ${status} by ${req.user?.name ?? 'officer'}.`,
    type: 'ACTION',
  });
  if (status === 'RESOLVED') esc.closedAt = new Date();
  await esc.save();
  res.json(esc);
});

export const raiseEscalation = asyncRoute(async (req: Request, res: Response) => {
  const { projectId, approvalKey, title, raisedTo } = req.body ?? {};
  const approval = await Approval.findOne({ projectId, key: approvalKey });
  if (!approval) throw new AppError(404, 'Approval not found.');
  const esc = await Escalation.create({
    projectId, approvalKey, title: title ?? `${approval.name} — intervention requested`,
    level: 2, raisedTo: raisedTo ?? 'Principal Secretary, Infrastructure',
    status: 'ESCALATED', severity: 'HIGH', openedAt: new Date(),
    timeline: [{ at: new Date(), label: 'Escalation raised', detail: `Raised by ${req.user?.name ?? 'officer'} following SLA breach.`, type: 'ACTION' }],
  });
  res.status(201).json(esc);
});

export const dossier = asyncRoute(async (req: Request, res: Response) => {
  const result = await buildDossier(req.params.projectId, req.params.key);
  if (!result) throw new AppError(404, 'Unable to build a dossier for that issue.');
  res.json(result);
});

export const search = asyncRoute(async (req: Request, res: Response) =>
  res.json(await globalSearch(String(req.query.q ?? ''))));

export const memory = asyncRoute(async (req: Request, res: Response) =>
  res.json(await searchMemory(String(req.query.q ?? ''), req.query.projectId as string | undefined)));

export const tenders = asyncRoute(async (_req, res: Response) => res.json(await Tender.find().sort({ createdAt: -1 })));

export const tenderDetail = asyncRoute(async (req: Request, res: Response) => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) throw new AppError(404, 'Tender not found.');
  res.json(tender);
});
