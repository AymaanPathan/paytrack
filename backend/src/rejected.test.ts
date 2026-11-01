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
      stored = { ...stored, status: values[0] as string };
      return { rows: [stored] };
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
