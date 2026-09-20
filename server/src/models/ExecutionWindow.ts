import { Schema, model, Document, Types } from 'mongoose';
import type { WindowStatus } from '../types';

export interface IExecutionWindow extends Document {
  projectId: Types.ObjectId;
  activityKey: string;
  title: string;
  authority: string;
  constraint: string;
  startAt: Date;
  endAt: Date;
  recurrenceDays: number;
  status: WindowStatus;
  checklist: { label: string; ready: boolean; owner: string; approvalKey?: string }[];
}

const schema = new Schema<IExecutionWindow>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  activityKey: String,
  title: { type: String, required: true },
  authority: String,
  constraint: String,
  startAt: Date,
  endAt: Date,
  recurrenceDays: { type: Number, default: 7 },
  status: { type: String, default: 'PLANNED' },
  checklist: [{ label: String, ready: Boolean, owner: String, approvalKey: String }],
}, { timestamps: true });

export const ExecutionWindow = model<IExecutionWindow>('ExecutionWindow', schema);
