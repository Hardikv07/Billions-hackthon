import { Schema, model, Document, Types } from 'mongoose';
import type { ApprovalStatus, RiskLevel } from '../types';

export interface IApproval extends Document {
  key: string;
  name: string;
  projectId: Types.ObjectId;
  departmentCode: string;
  referenceNo: string;
  status: ApprovalStatus;
  submittedAt: Date;
  slaDays: number;
  dueAt: Date;
  decidedAt?: Date;
  impact: RiskLevel;
  blocksActivityKeys: string[];
  sourcePage: number;
  confidence: number;
  notes: string;
  evidence: { label: string; ref: string; date: Date }[];
}

const schema = new Schema<IApproval>({
  key: { type: String, required: true },
  name: { type: String, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  departmentCode: { type: String, required: true },
  referenceNo: String,
  status: { type: String, default: 'SUBMITTED' },
  submittedAt: Date,
  slaDays: { type: Number, default: 7 },
  dueAt: Date,
  decidedAt: Date,
  impact: { type: String, default: 'MEDIUM' },
  blocksActivityKeys: [String],
  sourcePage: Number,
  confidence: Number,
  notes: String,
  evidence: [{ label: String, ref: String, date: Date }],
}, { timestamps: true });

schema.index({ name: 'text', referenceNo: 'text' });
schema.index({ projectId: 1, key: 1 }, { unique: true });

export const Approval = model<IApproval>('Approval', schema);
