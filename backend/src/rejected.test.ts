import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from './app';
import type { Db } from './db';

// Keeps the row's status between calls, so a review can be read back like real data.
let stored = { id: 1, customerName: 'Asha', amount: 100, date: '2026-10-01', status: 'Pending' };
const db = {
  query: async (text: string, values: unknown[] = []) => {
    if (text.startsWith('UPDATE')) {
      const blocked = text.includes("status <> 'Paid'") && stored.status === 'Paid';
      if (values[1] !== stored.id || blocked) return { rows: [] };
      stored = { ...stored, status: values[0] as string };
      return { rows: [stored] };
    }
    if (text.startsWith('SELECT id FROM')) {
      return { rows: values[0] === stored.id ? [{ id: stored.id }] : [] };
    }
    const wanted = values[0];
    return { rows: wanted === undefined || wanted === stored.status ? [stored] : [] };
  },
} as unknown as Db;

let server: Server;
let base: string;

before(async () => {
  server = createApp(db, 'http://frontend.test').listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

beforeEach(() => {
  stored = { ...stored, status: 'Pending' };
});

function review(approved: string) {
  return fetch(`${base}/payments/1/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved }),
  });
}

async function list(query = '') {
  return (await (await fetch(`${base}/payments${query}`)).json()) as { status: string }[];
}

test('a rejected payment comes back Rejected, not Paid', async () => {
  const res = await review('false');
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { status: string }).status, 'Rejected');
  assert.equal(stored.status, 'Rejected');
});

test('a rejected payment is listed under Rejected and never under Paid', async () => {
  await review('false');
  assert.deepEqual(await list('?status=Paid'), []);
  assert.equal((await list('?status=Rejected')).length, 1);
  assert.equal((await list())[0].status, 'Rejected');
});

test('an approved payment is still Paid', async () => {
  await review('true');
  assert.equal((await list('?status=Paid')).length, 1);
  assert.deepEqual(await list('?status=Rejected'), []);
});

test('a Paid payment cannot become Rejected on either route', async () => {
  await review('true');
  const reviewed = await review('false');
  assert.equal(reviewed.status, 409);
  assert.deepEqual(await reviewed.json(), { error: 'A Paid payment cannot be changed to Rejected' });
  const patched = await fetch(`${base}/payments/1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Rejected' }),
  });
  assert.equal(patched.status, 409);
  assert.equal(stored.status, 'Paid');
});

test('rejecting a payment that does not exist is still a 404', async () => {
  const res = await fetch(`${base}/payments/2/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: 'false' }),
  });
  assert.equal(res.status, 404);
});
test('PATCH from Paid to Rejected is a 409 and the payment stays Paid', async () => {
  stored = { ...stored, status: 'Paid' };
  const res = await fetch(`${base}/payments/1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Rejected' }),
  });
  assert.equal(res.status, 409);
  assert.equal(stored.status, 'Paid');
  assert.equal((await list('?status=Paid')).length, 1);
});
