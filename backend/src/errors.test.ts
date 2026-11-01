import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, mock, test } from 'node:test';
import { createApp } from './app';
import { initDb, type Db } from './db';

const FRONTEND = 'http://frontend.test';

let failing = false;
let queries: string[] = [];
const db = {
  query: async (text: string, values: unknown[] = []) => {
    queries.push(text);
    if (failing) throw new Error('secret connection detail');
    // Postgres refuses anything too big for NUMERIC(12, 2), which would be a 500.
    if (values.some((v) => typeof v === 'number' && v >= 10_000_000_000)) {
      throw new Error('numeric field overflow');
    }
    return { rows: [] };
  },
} as unknown as Db;

let server: Server;
let base: string;

before(async () => {
  server = createApp(db, FRONTEND).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(() => {
  failing = false;
  queries = [];
});

test('initDb creates the payments table only if missing, Pending by default', async () => {
  await initDb(db);
  assert.equal(queries.length, 1);
  assert.match(queries[0], /CREATE TABLE IF NOT EXISTS payments/);
  assert.match(queries[0], /status TEXT NOT NULL DEFAULT 'Pending'/);
});

test('GET /health is 503 when the database is down', async () => {
  failing = true;
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { status: 'error', error: 'Database unavailable' });
});

test('database failures are a 500 that leaks no detail', async (t) => {
  const log = mock.method(console, 'error', () => {});
  t.after(() => log.mock.restore());
  failing = true;

  const res = await fetch(`${base}/payments`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Internal server error' });
  assert.equal(log.mock.callCount(), 1);
});

test('unknown routes are a JSON 404', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});

test('preflight lets FRONTEND_URL PATCH with a JSON body', async () => {
  const res = await fetch(`${base}/payments/1`, {
    method: 'OPTIONS',
    headers: {
      Origin: FRONTEND,
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), FRONTEND);
  assert.match(res.headers.get('access-control-allow-methods') ?? '', /PATCH/);
  assert.match(res.headers.get('access-control-allow-headers') ?? '', /content-type/i);
});

test('a repeated or empty status filter is rejected, not sent to the database', async () => {
  for (const query of ['status=Paid&status=Rejected', 'status=']) {
    assert.equal((await fetch(`${base}/payments?${query}`)).status, 400, query);
  }
  assert.equal(queries.length, 0);
});

test('POST /payments enforces the largest amount the column can hold', async () => {
  const post = (amount: number) =>
    fetch(`${base}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Asha', amount, date: '2026-10-01' }),
    });
  assert.equal((await post(10_000_000_000)).status, 400);
  assert.equal(queries.length, 0);
  assert.equal((await post(9_999_999_999.99)).status, 201);
});

test('a very large amount is a 400 that never reaches the database, not a 500', async () => {
  const log = mock.method(console, 'error', () => {});
  try {
    for (const amount of [10_000_000_000, 1e15, 1e21]) {
      const res = await fetch(`${base}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: 'Asha', amount, date: '2026-10-01' }),
      });
      assert.equal(res.status, 400, String(amount));
      assert.match(((await res.json()) as { error: string }).error, /amount must be/);
    }
    assert.equal(queries.length, 0);
  } finally {
    log.mock.restore();
  }
});

test('a normal amount is still accepted', async () => {
  const res = await fetch(`${base}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: 'Asha', amount: 1500.75, date: '2026-10-01' }),
  });
  assert.equal(res.status, 201);
});

test('PATCH /payments/:id with no body is a 400', async () => {
  const res = await fetch(`${base}/payments/1`, { method: 'PATCH' });
  assert.equal(res.status, 400);
  assert.equal(queries.length, 0);
});
