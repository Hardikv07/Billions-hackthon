import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { connectDb } from './config/db';
import { aiEnabled, env } from './config/env';
import { errorHandler, notFound } from './middleware/error';
import { router } from './routes';

async function main() {
  await connectDb();

  const app = express();
  app.use(cors({
    origin(origin, cb) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      const allowed = [
        env.clientOrigin,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];
      // Accept any *.vercel.app preview / production URL
      if (allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, aiConfigured: aiEnabled, extraction: aiEnabled ? 'AI' : 'DEMO' }));
  app.use('/api', router);
  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`[api] http://localhost:${env.port}  ·  extraction: ${aiEnabled ? 'AI' : 'deterministic demo layer'}`);
  });
}

main().catch((err) => {
  console.error('[boot] failed to start:', err.message);
  process.exit(1);
});
