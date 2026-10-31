import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Db } from './db';
import { paymentsRouter } from './payments';

export function createApp(db: Db, frontendUrl: string) {
  const app = express();
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', error: 'Database unavailable' });
    }
  });

  app.use('/payments', paymentsRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    // Body-parser errors (bad JSON) carry a 4xx status; anything else is ours.
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
  });

  return app;
}
