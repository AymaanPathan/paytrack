import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate, formatRupees, today } from '../src/format.ts';

test('amounts are in rupees with Indian digit grouping', () => {
  assert.equal(formatRupees(150000.5), '₹1,50,000.50');
  assert.equal(formatRupees(0), '₹0.00');
});

test('a date shows the same day it was entered, whatever the time zone', () => {
  assert.equal(formatDate('2026-10-01'), '01 Oct 2026');
  assert.equal(formatDate('2026-12-31'), '31 Dec 2026');
});

test('today is the local calendar date as YYYY-MM-DD', () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  assert.equal(today(), local.toISOString().slice(0, 10));
});
