// Runs the real frontend API client against the real backend routes. Only the
// database is faked, so this proves the two sides agree on paths and JSON.
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, mock, test } from 'node:test';
import { createApp } from '../../backend/src/app.ts';

type Row = Record<string, unknown>;

let rows: Row[] = [];
let queries: { text: string; values: unknown[] }[] = [];
const db = {
  query: async (text: string, values: unknown[] = []) => {
    queries.push({ text, values });
    return { rows };
  },
};

let server: Server;
let api: typeof import('../src/api.ts');

before(async () => {
  server = createApp(db as never, 'http://frontend.test').listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  // A trailing slash on VITE_API_URL must not produce //payments.
  process.env.VITE_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  api = await import('../src/api.ts');
});

after(() => server.close());

beforeEach(() => {
  rows = [];
  queries = [];
});

const asha = {
  id: 1,
  customerName: 'Asha',
  amount: 100.5,
  date: '2026-10-01',
  status: 'Pending',
  createdAt: '2026-10-01T00:00:00Z',
};

test('listPayments returns the list', async () => {
  rows = [asha];
  assert.deepEqual(await api.listPayments(), [asha]);
});

test('createPayment sends what the backend expects', async () => {
  rows = [asha];
  const created = await api.createPayment({ customerName: 'Asha', amount: 100.5, date: '2026-10-01' });
  assert.deepEqual(created, asha);
  assert.deepEqual(queries[0].values, ['Asha', 100.5, '2026-10-01']);
});

test('updatePaymentStatus sends the new status for that id', async () => {
  rows = [{ ...asha, status: 'Paid' }];
  const updated = await api.updatePaymentStatus(1, 'Paid');
  assert.equal(updated.status, 'Paid');
  assert.deepEqual(queries[0].values, ['Paid', 1]);
});

test("the backend's validation message reaches the user", async () => {
  await assert.rejects(
    api.createPayment({ customerName: 'Asha', amount: 0, date: '2026-10-01' }),
    /amount must be a positive number/,
  );
});

test('a missing payment surfaces as an error', async () => {
  await assert.rejects(api.updatePaymentStatus(99, 'Paid'), /Payment not found/);
});

test('an unreachable API gives a readable error', async (t) => {
  const failed = mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed');
  });
  t.after(() => failed.mock.restore());
  await assert.rejects(api.listPayments(), /Could not reach the API/);
});

test('a non-JSON error response still gives a readable error', async (t) => {
  const failed = mock.method(globalThis, 'fetch', async () => new Response('<html>', { status: 502 }));
  t.after(() => failed.mock.restore());
  await assert.rejects(api.listPayments(), /Request failed \(502\)/);
});
