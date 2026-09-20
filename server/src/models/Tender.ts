import { Schema, model, Document, Types } from 'mongoose';

export interface ITender extends Document {
  reference: string;
  title: string;
  authority: string;
  location: string;
  contractValueCr: number;
  durationDays: number;
  publishedAt: Date;
  closesAt: Date;
  status: 'PUBLISHED' | 'PROCESSING' | 'EXTRACTED' | 'AWARDED';
  sourceFile?: string;
  extractionMode?: 'AI' | 'DEMO';
  suitability?: {
    score: number;
    reasons: { label: string; met: boolean; detail: string }[];
  };
  understanding?: {
    milestones: number;
    approvals: number;
    departments: number;
    executionWindows: number;
  };
  extracted?: {
    overview: string;
    milestones: { name: string; day: number; page: number; confidence: number }[];
    approvals: { name: string; departmentCode: string; slaDays: number; page: number; confidence: number }[];
    executionWindows: { activity: string; constraint: string; page: number; confidence: number }[];
    clauses: { title: string; text: string; page: number; severity: 'INFO' | 'WATCH' | 'CRITICAL'; confidence: number }[];
    payments: { stage: string; percent: number; page: number; confidence: number }[];
  };
  projectId?: Types.ObjectId;
}

const schema = new Schema<ITender>({
  reference: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  authority: String,
  location: String,
  contractValueCr: Number,
  durationDays: Number,
  publishedAt: Date,
  closesAt: Date,
  status: { type: String, default: 'PUBLISHED' },
  sourceFile: String,
  extractionMode: String,
  suitability: Schema.Types.Mixed,
  understanding: Schema.Types.Mixed,
  extracted: Schema.Types.Mixed,
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
}, { timestamps: true });

schema.index({ title: 'text', reference: 'text', location: 'text' });

export const Tender = model<ITender>('Tender', schema);
