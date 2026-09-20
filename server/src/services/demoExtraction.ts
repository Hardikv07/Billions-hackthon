import type { TenderExtraction } from './aiService';

/**
 * Deterministic extraction used when no model credentials are configured, or when
 * a model call fails. Keyword-driven so an uploaded document still influences output.
 */
export function demoExtraction(text: string, hint?: string): TenderExtraction {
  const body = `${hint ?? ''}\n${text ?? ''}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => body.includes(w));

  const approvals = [
    { name: 'Railway NOC', departmentCode: 'RLY', slaDays: 7, page: 17, confidence: 94, when: has('railway', 'rail', 'metro', 'interchange') || true },
    { name: 'Traffic Diversion Approval', departmentCode: 'TRF', slaDays: 10, page: 21, confidence: 91, when: true },
    { name: 'Utility Shifting Clearance', departmentCode: 'UTL', slaDays: 14, page: 24, confidence: 88, when: true },
    { name: 'Safety Clearance', departmentCode: 'SFT', slaDays: 7, page: 29, confidence: 92, when: true },
    { name: 'Finance Concurrence', departmentCode: 'FIN', slaDays: 5, page: 33, confidence: 90, when: true },
    { name: 'Environmental Consent', departmentCode: 'ENV', slaDays: 21, page: 36, confidence: 84, when: has('environment', 'tree', 'consent') },
    { name: 'Municipal Road Cutting Permit', departmentCode: 'MUN', slaDays: 12, page: 39, confidence: 81, when: has('road', 'municipal', 'cutting') },
  ].filter((a) => a.when).map(({ when, ...rest }) => rest);

  const milestones = [
    { name: 'Design & Drawing Approval', day: 60, page: 11, confidence: 95 },
    { name: 'Utility Shifting Complete', day: 140, page: 12, confidence: 91 },
    { name: 'Foundation Complete', day: 210, page: 12, confidence: 93 },
    { name: 'Pier Casting Complete', day: 290, page: 13, confidence: 92 },
    { name: 'Girder Fabrication Complete', day: 340, page: 13, confidence: 90 },
    { name: 'Bridge Installation', day: 385, page: 17, confidence: 96 },
    { name: 'Deck Work Complete', day: 430, page: 14, confidence: 89 },
    { name: 'Road Works Complete', day: 480, page: 14, confidence: 88 },
    { name: 'Load Testing & Commissioning', day: 515, page: 15, confidence: 90 },
    { name: 'Handover', day: 540, page: 15, confidence: 94 },
  ];

  return {
    mode: 'DEMO',
    overview:
      'Construction of a grade-separated metro–road interchange including pier casting, steel girder fabrication, night-window girder launching over live railway tracks, deck work, approach roads and load testing prior to handover.',
    contractValueCr: 184,
    durationDays: 540,
    milestones,
    approvals,
    executionWindows: [
      { activity: 'Bridge Installation', constraint: 'Traffic block permitted only Sunday 02:00–04:00 under railway supervision', page: 17, confidence: 96 },
      { activity: 'Utility Shifting', constraint: 'Power shutdown permitted 23:00–05:00 on weekdays', page: 24, confidence: 87 },
      { activity: 'Road Tie-in', constraint: 'Carriageway closure permitted 22:00–05:00 with traffic police escort', page: 21, confidence: 85 },
    ],
    dependencies: [
      { from: 'Bridge Installation', to: 'Deck Work Complete' },
      { from: 'Deck Work Complete', to: 'Road Works Complete' },
      { from: 'Road Works Complete', to: 'Load Testing & Commissioning' },
      { from: 'Load Testing & Commissioning', to: 'Handover' },
    ],
    clauses: [
      { title: 'Restricted execution window', text: 'Girder launching over railway tracks shall be executed only within the sanctioned traffic block of 02:00 to 04:00 hours on Sunday.', page: 17, severity: 'CRITICAL', confidence: 96 },
      { title: 'Railway supervision charges', text: 'Supervision charges payable in advance; block sanction lapses if not availed within the sanctioned date.', page: 18, severity: 'WATCH', confidence: 89 },
      { title: 'Liquidated damages', text: 'Liquidated damages at 0.05% of contract value per week of delay, capped at 5%.', page: 44, severity: 'CRITICAL', confidence: 93 },
      { title: 'Extension of time', text: 'Delay attributable to pending statutory approval is admissible for extension of time on documented evidence.', page: 46, severity: 'INFO', confidence: 86 },
    ],
    payments: [
      { stage: 'Mobilisation advance', percent: 10, page: 40, confidence: 92 },
      { stage: 'Foundation completion', percent: 20, page: 40, confidence: 90 },
      { stage: 'Superstructure completion', percent: 35, page: 41, confidence: 91 },
      { stage: 'Road works completion', percent: 25, page: 41, confidence: 88 },
      { stage: 'Handover & defect liability', percent: 10, page: 42, confidence: 90 },
    ],
  };
}
