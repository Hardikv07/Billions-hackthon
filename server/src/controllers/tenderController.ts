import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { Tender } from '../models';
import { AppError, asyncRoute } from '../middleware/error';
import { extractTender } from '../services/aiService';
import { aiEnabled } from '../config/env';

async function readPdfText(filePath: string): Promise<string> {
  try {
    // Lazy require keeps startup fast and tolerates a missing optional parser.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return parsed.text ?? '';
  } catch (err) {
    console.warn('[tender] text extraction failed:', (err as Error).message);
    return '';
  }
}

export const uploadTender = asyncRoute(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw new AppError(400, 'Attach a tender PDF to continue.');
  if (file.mimetype !== 'application/pdf') {
    await fs.unlink(file.path).catch(() => undefined);
    throw new AppError(400, 'Only PDF tender documents can be read right now.');
  }

  const text = await readPdfText(file.path);
  const extraction = await extractTender(text, file.originalname);

  const reference = `TND/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
  const tender = await Tender.create({
    reference,
    title: path.parse(file.originalname).name.replace(/[_-]+/g, ' ').slice(0, 120) || 'Uploaded tender',
    authority: 'State Infrastructure Development Authority',
    location: 'Ahmedabad, Gujarat',
    contractValueCr: extraction.contractValueCr,
    durationDays: extraction.durationDays,
    publishedAt: new Date(),
    closesAt: new Date(Date.now() + 21 * 86400000),
    status: 'EXTRACTED',
    sourceFile: file.filename,
    extractionMode: extraction.mode,
    understanding: {
      milestones: extraction.milestones.length,
      approvals: extraction.approvals.length,
      departments: new Set(extraction.approvals.map((a) => a.departmentCode)).size,
      executionWindows: extraction.executionWindows.length,
    },
    extracted: {
      overview: extraction.overview,
      milestones: extraction.milestones,
      approvals: extraction.approvals,
      executionWindows: extraction.executionWindows,
      clauses: extraction.clauses,
      payments: extraction.payments,
    },
  });

  res.status(201).json({ tender, mode: extraction.mode, aiConfigured: aiEnabled, textLength: text.length });
});

export const matchTenders = asyncRoute(async (req: Request, res: Response) => {
  const { budgetMin = 100, budgetMax = 250, maxDurationDays = 600, experienceYears = 5, similarProjects = 3, riskTolerance = 'MEDIUM' } = req.body ?? {};
  const tenders = await Tender.find();

  const scored = tenders.map((t) => {
    const reasons = [
      { label: 'Contract value', met: t.contractValueCr >= budgetMin && t.contractValueCr <= budgetMax, detail: `₹${t.contractValueCr} Cr against ₹${budgetMin}–${budgetMax} Cr` },
      { label: 'Duration', met: t.durationDays <= maxDurationDays, detail: `${t.durationDays} days against a ${maxDurationDays}-day ceiling` },
      { label: 'Experience', met: experienceYears >= 5, detail: `${experienceYears} years of declared experience` },
      { label: 'Similar work', met: similarProjects >= 3, detail: `${similarProjects} comparable packages delivered` },
      { label: 'Location', met: /gujarat|ahmedabad|surat|vadodara/i.test(t.location ?? ''), detail: t.location ?? 'Location not stated' },
      { label: 'Risk appetite', met: riskTolerance !== 'LOW', detail: `${riskTolerance} risk tolerance declared` },
    ];
    const score = Math.round((reasons.filter((r) => r.met).length / reasons.length) * 100);
    return { id: String(t._id), reference: t.reference, title: t.title, authority: t.authority, location: t.location, contractValueCr: t.contractValueCr, durationDays: t.durationDays, closesAt: t.closesAt, score, reasons };
  });

  res.json(scored.sort((a, b) => b.score - a.score).slice(0, 5));
});
