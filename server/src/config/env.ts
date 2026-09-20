import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 5050),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/nirman360',
  jwtSecret: process.env.JWT_SECRET ?? 'nirman-360-demo-secret',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? 'gemini-1.5-flash',
};

export const aiEnabled = Boolean(env.geminiApiKey);
