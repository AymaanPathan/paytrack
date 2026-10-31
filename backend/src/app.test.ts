import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from './app';
import type { Db } from './db';

const FRONTEND = 'http://frontend.test';
const row = { id: 1, customerName: 'Asha', amount: 100.5, date: '2026-10-01', status: 'Pending' };

let queries: { text: string; values?: unknown[] }[] = [];
let result: unknown[] = [row];
const db = {
  query: async (text: string, values?: unknown[]) => {
    queries.push({ text, values });
    return { rows: result };
  },
} as unknown as Db;

let server: Server;
let base: string;

function send(method: string, path: string, body?: unknown) {
  return fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  server = createApp(db, FRONTEND).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(() => {
  queries = [];
  result = [row];
});

test('GET /health reports ok and allows only FRONTEND_URL', async () => {
  const res = await fetch(`${base}/health`, { headers: { Origin: 'http://evil.test' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.equal(res.headers.get('access-control-allow-origin'), FRONTEND);
});

test('GET /payments filters by status and rejects unknown ones', async () => {
  assert.equal((await send('GET', '/payments')).status, 200);
  assert.deepEqual(queries[0].values, []);
  assert.equal((await send('GET', '/payments?status=Paid')).status, 200);
  assert.deepEqual(queries[1].values, ['Paid']);
  assert.equal((await send('GET', '/payments?status=Nope')).status, 400);
  assert.equal(queries.length, 2);
});

test('POST /payments creates a payment', async () => {
  const res = await send('POST', '/payments', {
    customerName: '  Asha ',
    amount: 100.5,
    date: '2026-10-01',
  });
  assert.equal(res.status, 201);
  assert.deepEqual(queries[0].values, ['Asha', 100.5, '2026-10-01']);
});

test('POST /payments rejects bad input', async () => {
  const good = { customerName: 'Asha', amount: 10, date: '2026-10-01' };
  for (const bad of [
    { ...good, customerName: '  ' },
    { ...good, amount: 0 },
    { ...good, amount: 1.234 },
    { ...good, amount: '10' },
    { ...good, date: '2026-02-30' },
    { ...good, date: 'soon' },
  ]) {
    assert.equal((await send('POST', '/payments', bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await fetch(`${base}/payments`, { method: 'POST' })).status, 400);
  assert.equal(queries.length, 0);
});

test('malformed JSON is a 400, not a 500', async () => {
  const res = await fetch(`${base}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{oops',
  });
  assert.equal(res.status, 400);
});

test('PATCH /payments/:id marks Paid or Rejected only', async () => {
  assert.equal((await send('PATCH', '/payments/1', { status: 'Paid' })).status, 200);
  assert.deepEqual(queries[0].values, ['Paid', 1]);
  assert.equal((await send('PATCH', '/payments/1', { status: 'Pending' })).status, 400);
  assert.equal((await send('PATCH', '/payments/abc', { status: 'Paid' })).status, 404);
  assert.equal((await send('PATCH', '/payments/99999999999', { status: 'Paid' })).status, 404);
  result = [];
  assert.equal((await send('PATCH', '/payments/2', { status: 'Paid' })).status, 404);
});

test('POST /payments/:id/review approves a payment and rejects bad input', async () => {
  assert.equal((await send('POST', '/payments/1/review', { approved: 'true' })).status, 200);
  assert.deepEqual(queries[0].values, ['Paid', 1]);
  assert.equal((await send('POST', '/payments/1/review', { approved: 'false' })).status, 200);
  assert.deepEqual(queries[1].values, ['Rejected', 1]);
  assert.equal((await send('POST', '/payments/1/review', { approved: 'maybe' })).status, 400);
  assert.equal((await send('POST', '/payments/abc/review', { approved: 'true' })).status, 404);
  result = [];
  assert.equal((await send('POST', '/payments/2/review', { approved: 'true' })).status, 404);
});
