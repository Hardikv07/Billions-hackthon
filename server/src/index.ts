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
  app.use(cors({ origin: [env.clientOrigin, 'http://127.0.0.1:5173'] }));
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
