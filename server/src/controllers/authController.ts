import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { User } from '../models';
import { signToken } from '../middleware/auth';
import { AppError, asyncRoute } from '../middleware/error';

export const login = asyncRoute(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email: String(email ?? '').toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password ?? ''), user.passwordHash))) {
    throw new AppError(401, 'That email and password do not match.');
  }
  const payload = { id: String(user._id), name: user.name, email: user.email, role: user.role };
  res.json({ token: signToken(payload), user: { ...payload, designation: user.designation } });
});

export const me = asyncRoute(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) throw new AppError(404, 'Account not found.');
  res.json({ id: String(user._id), name: user.name, email: user.email, role: user.role, designation: user.designation });
});
