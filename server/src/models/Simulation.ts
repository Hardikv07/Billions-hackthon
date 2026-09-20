import { Schema, model, Document, Types } from 'mongoose';

export interface ISimulation extends Document {
  projectId: Types.ObjectId;
  approvalKey: string;
  delayDays: number;
  result: Record<string, unknown>;
  runBy: string;
}

const schema = new Schema<ISimulation>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  approvalKey: String,
  delayDays: Number,
  result: Schema.Types.Mixed,
  runBy: String,
}, { timestamps: true });

export const Simulation = model<ISimulation>('Simulation', schema);
