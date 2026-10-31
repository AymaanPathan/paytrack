import { Pool } from 'pg';

export type Db = Pick<Pool, 'query'>;

export function createPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString });
  // Without a listener an idle client error would crash the process.
  pool.on('error', (err) => console.error('Postgres pool error', err));
  return pool;
}

export async function initDb(db: Db): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      payment_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Paid', 'Rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
