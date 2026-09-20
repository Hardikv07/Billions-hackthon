import { Approval, Department, Project, ProjectEvent, Tender } from '../models';

export async function globalSearch(q: string) {
  if (!q || q.trim().length < 2) return { projects: [], approvals: [], tenders: [], departments: [] };
  const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [projects, approvals, tenders, departments] = await Promise.all([
    Project.find({ $or: [{ name: rx }, { code: rx }, { location: rx }] }).limit(5),
    Approval.find({ $or: [{ name: rx }, { referenceNo: rx }] }).limit(6),
    Tender.find({ $or: [{ title: rx }, { reference: rx }] }).limit(5),
    Department.find({ $or: [{ name: rx }, { authority: rx }, { code: rx }] }).limit(4),
  ]);
  return {
    projects: projects.map((p) => ({ id: String(p._id), label: p.name, sub: `${p.code} · ₹${p.contractValueCr} Cr`, href: `/projects/${p._id}` })),
    approvals: approvals.map((a) => ({ id: String(a._id), label: a.name, sub: a.referenceNo, href: `/approvals/${a.projectId}/${a.key}` })),
    tenders: tenders.map((t) => ({ id: String(t._id), label: t.title, sub: t.reference, href: `/tenders/${t._id}` })),
    departments: departments.map((d) => ({ id: String(d._id), label: d.name, sub: d.authority, href: `/approvals?department=${d.code}` })),
  };
}

/** Project memory: natural-language-ish lookup over recorded project events. */
export async function searchMemory(q: string, projectId?: string) {
  const filter: Record<string, unknown> = {};
  if (projectId) filter.projectId = projectId;
  const stop = new Set(['why', 'was', 'the', 'is', 'what', 'when', 'how', 'did', 'a', 'an', 'of', 'for', 'to', 'in', 'on']);
  const terms = (q ?? '').toLowerCase().split(/\W+/).filter((t) => t.length > 2 && !stop.has(t));
  if (terms.length) {
    filter.$or = terms.flatMap((t) => {
      const rx = new RegExp(t, 'i');
      return [{ title: rx }, { detail: rx }, { cause: rx }, { resolution: rx }, { tags: rx }];
    });
  }
  const events = await ProjectEvent.find(filter).sort({ at: -1 }).limit(25);
  return events.map((e) => ({
    id: String(e._id), at: e.at, actor: e.actor, category: e.category,
    title: e.title, detail: e.detail, cause: e.cause, resolution: e.resolution, tags: e.tags,
  }));
}
