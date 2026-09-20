import { Schema, model, Document, Types } from 'mongoose';
import type { ProjectStatus } from '../types';

export interface IProject extends Document {
  code: string;
  name: string;
  package: string;
  authority: string;
  location: string;
  contractValueCr: number;
  durationDays: number;
  startDate: Date;
  plannedCompletion: Date;
  forecastCompletion: Date;
  physicalProgress: number;
  scheduleProgress: number;
  approvalHealth: number;
  riskScore: number;
  status: ProjectStatus;
  contractor: string;
  tenderId?: Types.ObjectId;
}

const schema = new Schema<IProject>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  package: String,
  authority: String,
  location: String,
  contractValueCr: Number,
  durationDays: Number,
  startDate: Date,
  plannedCompletion: Date,
  forecastCompletion: Date,
  physicalProgress: Number,
  scheduleProgress: Number,
  approvalHealth: Number,
  riskScore: Number,
  status: { type: String, default: 'ON_TRACK' },
  contractor: String,
  tenderId: { type: Schema.Types.ObjectId, ref: 'Tender' },
}, { timestamps: true });

schema.index({ name: 'text', code: 'text', location: 'text' });

export const Project = model<IProject>('Project', schema);
