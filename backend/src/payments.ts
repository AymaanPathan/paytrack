import { Router, type Response } from 'express';
import type { Db } from './db';

const STATUSES = ['Pending', 'Paid', 'Rejected'];
const MAX_AMOUNT = 9_999_999_999.99; // Largest value NUMERIC(12, 2) can hold.
const MAX_ID = 2_147_483_647; // Largest SERIAL value.

// Casts keep amount a number and the date a plain YYYY-MM-DD string, so
// pg's timezone conversion of DATE can't shift it by a day.
const COLUMNS = `id, customer_name AS "customerName", amount::float8 AS amount,
  payment_date::text AS date, status, created_at AS "createdAt"`;

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isValidAmount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    value > 0 &&
    value <= MAX_AMOUNT &&
    Math.round(value * 100) / 100 === value
  );
}

// The Paid check sits in the UPDATE so two requests at once can't slip past it.
async function updateStatus(db: Db, res: Response, id: number, status: 'Paid' | 'Rejected') {
  const { rows } = await db.query(
    `UPDATE payments SET status = $1 WHERE id = $2
     ${status === 'Rejected' ? "AND status <> 'Paid'" : ''}
     RETURNING ${COLUMNS}`,
    [status, id],
  );
  if (rows.length > 0) {
    res.json(rows[0]);
    return;
  }
  const existing = await db.query('SELECT id FROM payments WHERE id = $1', [id]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'A Paid payment cannot be changed to Rejected' });
    return;
  }
  res.status(404).json({ error: 'Payment not found' });
}

export function paymentsRouter(db: Db): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !STATUSES.includes(status as string)) {
      res.status(400).json({ error: 'status must be Pending, Paid or Rejected' });
      return;
    }
    const { rows } = await db.query(
      `SELECT ${COLUMNS} FROM payments
       ${status ? 'WHERE status = $1' : ''}
       ORDER BY payment_date DESC, id DESC`,
      status ? [status] : [],
    );
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { customerName, amount, date } = req.body ?? {};
    const name = typeof customerName === 'string' ? customerName.trim() : '';
    if (!name) {
      res.status(400).json({ error: 'customerName is required' });
      return;
    }
    if (!isValidAmount(amount)) {
      res.status(400).json({
        error: `amount must be a positive number up to ${MAX_AMOUNT} with at most 2 decimals`,
      });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ error: 'date must be a valid YYYY-MM-DD date' });
      return;
    }
    const { rows } = await db.query(
      `INSERT INTO payments (customer_name, amount, payment_date)
       VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
      [name, amount, date],
    );
    res.status(201).json(rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > MAX_ID) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    const { status } = req.body ?? {};
    if (status !== 'Paid' && status !== 'Rejected') {
      res.status(400).json({ error: 'status must be Paid or Rejected' });
      return;
    }
    await updateStatus(db, res, id, status);
  });

  router.post('/:id/review', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > MAX_ID) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    const { approved } = req.body ?? {};
    if (approved !== 'true' && approved !== 'false') {
      res.status(400).json({ error: "approved must be 'true' or 'false'" });
      return;
    }
    const status = approved === 'true' ? 'Paid' : 'Rejected';
    await updateStatus(db, res, id, status);
  });

  return router;
}
