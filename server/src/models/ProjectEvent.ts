import { Schema, model, Document, Types } from 'mongoose';

export interface IProjectEvent extends Document {
  projectId: Types.ObjectId;
  at: Date;
  actor: string;
  category: 'APPROVAL' | 'WINDOW' | 'ESCALATION' | 'TENDER' | 'SIMULATION' | 'SYSTEM';
  title: string;
  detail: string;
  cause?: string;
  resolution?: string;
  tags: string[];
}

const schema = new Schema<IProjectEvent>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  at: Date,
  actor: String,
  category: String,
  title: String,
  detail: String,
  cause: String,
  resolution: String,
  tags: [String],
}, { timestamps: true });

schema.index({ title: 'text', detail: 'text', cause: 'text', resolution: 'text', tags: 'text' });

export const ProjectEvent = model<IProjectEvent>('ProjectEvent', schema);
