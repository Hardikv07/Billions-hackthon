import { Schema, model, Document, Types } from 'mongoose';
import type { EscalationStatus, RiskLevel } from '../types';

export interface IEscalation extends Document {
  projectId: Types.ObjectId;
  approvalKey: string;
  title: string;
  level: 1 | 2 | 3;
  raisedTo: string;
  status: EscalationStatus;
  severity: RiskLevel;
  openedAt: Date;
  closedAt?: Date;
  timeline: { at: Date; label: string; detail: string; type: 'EVENT' | 'WARNING' | 'BREACH' | 'ACTION' }[];
}

const schema = new Schema<IEscalation>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  approvalKey: String,
  title: String,
  level: { type: Number, default: 1 },
  raisedTo: String,
  status: { type: String, default: 'NEW' },
  severity: { type: String, default: 'HIGH' },
  openedAt: Date,
  closedAt: Date,
  timeline: [{
    at: Date,
    label: String,
    detail: String,
    type: { type: String, enum: ['EVENT', 'WARNING', 'BREACH', 'ACTION'] },
  }],
}, { timestamps: true });

export const Escalation = model<IEscalation>('Escalation', schema);
