import { Schema, model, Document, Types } from 'mongoose';

export interface IActivity extends Document {
  projectId: Types.ObjectId;
  key: string;
  name: string;
  sequence: number;
  isMilestone: boolean;
  isCritical: boolean;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'BLOCKED' | 'NOT_STARTED';
  progress: number;
  plannedStart: Date;
  plannedEnd: Date;
  floatDays: number;
  dependsOn: string[];
  requiresApprovalKeys: string[];
}

const schema = new Schema<IActivity>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  sequence: Number,
  isMilestone: { type: Boolean, default: false },
  isCritical: { type: Boolean, default: false },
  status: { type: String, default: 'NOT_STARTED' },
  progress: { type: Number, default: 0 },
  plannedStart: Date,
  plannedEnd: Date,
  floatDays: { type: Number, default: 0 },
  dependsOn: [String],
  requiresApprovalKeys: [String],
}, { timestamps: true });

schema.index({ projectId: 1, key: 1 }, { unique: true });

export const Activity = model<IActivity>('Activity', schema);
