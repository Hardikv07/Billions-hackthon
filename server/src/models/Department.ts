import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  code: string;
  name: string;
  authority: string;
  slaDays: number;
  contactOfficer: string;
  avgResponseDays: number;
}

const schema = new Schema<IDepartment>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  authority: String,
  slaDays: { type: Number, default: 7 },
  contactOfficer: String,
  avgResponseDays: { type: Number, default: 6 },
}, { timestamps: true });

export const Department = model<IDepartment>('Department', schema);
