import { aiEnabled, env } from '../config/env';
import { demoExtraction } from './demoExtraction';

export interface TenderExtraction {
  mode: 'AI' | 'DEMO';
  overview: string;
  contractValueCr: number;
  durationDays: number;
  milestones: { name: string; day: number; page: number; confidence: number }[];
  approvals: { name: string; departmentCode: string; slaDays: number; page: number; confidence: number }[];
  executionWindows: { activity: string; constraint: string; page: number; confidence: number }[];
  dependencies: { from: string; to: string }[];
  clauses: { title: string; text: string; page: number; severity: 'INFO' | 'WATCH' | 'CRITICAL'; confidence: number }[];
  payments: { stage: string; percent: number; page: number; confidence: number }[];
}

const SYSTEM = `You are a tender analyst for a government infrastructure delivery authority.
Read the tender text and return ONLY a JSON object, with no prose and no markdown fences, matching:
{"overview":string,"contractValueCr":number,"durationDays":number,
"milestones":[{"name":string,"day":number,"page":number,"confidence":number}],
"approvals":[{"name":string,"departmentCode":string,"slaDays":number,"page":number,"confidence":number}],
"executionWindows":[{"activity":string,"constraint":string,"page":number,"confidence":number}],
"dependencies":[{"from":string,"to":string}],
"clauses":[{"title":string,"text":string,"page":number,"severity":"INFO"|"WATCH"|"CRITICAL","confidence":number}],
"payments":[{"stage":string,"percent":number,"page":number,"confidence":number}]}
departmentCode is one of RLY, TRF, UTL, SFT, FIN, ENV, MUN. confidence is 0-100.`;

async function callModel(text: string): Promise<TenderExtraction | null> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.aiModel}:generateContent?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: { text: SYSTEM } },
        contents: [{ role: 'user', parts: [{ text: text.slice(0, 60000) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`model responded ${res.status}: ${errData}`);
    }
    const data: any = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return { mode: 'AI', ...JSON.parse(raw.replace(/```json|```/g, '').trim()) };
  } catch (err) {
    console.warn('[ai] extraction failed, using deterministic layer:', (err as Error).message);
    return null;
  }
}

/** Single entry point. Falls back to the deterministic demo layer so the demo never breaks. */
export async function extractTender(text: string, hint?: string): Promise<TenderExtraction> {
  if (aiEnabled) {
    const result = await callModel(text);
    if (result) return result;
  }
  return demoExtraction(text, hint);
}

export async function extractApprovals(text: string) {
  return (await extractTender(text)).approvals;
}
export async function extractMilestones(text: string) {
  return (await extractTender(text)).milestones;
}
export async function extractExecutionWindows(text: string) {
  return (await extractTender(text)).executionWindows;
}
export async function extractDependencies(text: string) {
  return (await extractTender(text)).dependencies;
}
