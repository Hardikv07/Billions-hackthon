import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'SENIOR_OFFICER' | 'ADMIN' | 'PROJECT_MANAGER';
  designation: string;
}

const schema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'SENIOR_OFFICER' },
  designation: { type: String, default: 'Senior Infrastructure Officer' },
}, { timestamps: true });

export const User = model<IUser>('User', schema);
