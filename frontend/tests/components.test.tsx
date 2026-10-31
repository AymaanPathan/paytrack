/** @jsxRuntime automatic */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Payment, Status } from '../src/api.ts';
import { PaymentList } from '../src/components/PaymentList.tsx';
import { Totals } from '../src/components/Totals.tsx';

function payment(id: number, status: Status, amount: number, customerName = `Customer ${id}`): Payment {
  return { id, customerName, amount, date: '2026-10-01', status, createdAt: '2026-10-01T00:00:00Z' };
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

test('Totals sums each status separately, in Paid, Pending, Rejected order', () => {
  const html = renderToStaticMarkup(
    <Totals
      payments={[
        payment(1, 'Paid', 100.5),
        payment(2, 'Paid', 200),
        payment(3, 'Pending', 50),
        payment(4, 'Rejected', 1000),
      ]}
    />,
  );
  const out = text(html);
  assert.match(out, /Paid ₹300\.50 2 payments/);
  assert.match(out, /Pending ₹50\.00 1 payment\b/);
  assert.match(out, /Rejected ₹1,000\.00 1 payment\b/);
  assert.ok(out.indexOf('Paid') < out.indexOf('Pending'));
  assert.ok(out.indexOf('Pending') < out.indexOf('Rejected'));
});

test('Totals does not drift on decimals that floats cannot hold', () => {
  const out = text(
    renderToStaticMarkup(
      <Totals payments={[payment(1, 'Paid', 0.1), payment(2, 'Paid', 0.2), payment(3, 'Paid', 1.1)]} />,
    ),
  );
  assert.match(out, /Paid ₹1\.40 3 payments/);
});

test('Totals shows zero for an empty list but a blank while loading', () => {
  assert.equal(text(renderToStaticMarkup(<Totals payments={[]} />)).match(/₹0\.00/g)?.length, 3);
  const loading = text(renderToStaticMarkup(<Totals payments={null} />));
  assert.ok(!loading.includes('₹'), loading);
});

test('only Pending payments offer Paid and Reject', () => {
  const html = renderToStaticMarkup(
    <PaymentList
      payments={[
        payment(1, 'Pending', 10, 'Asha'),
        payment(2, 'Paid', 20, 'Ravi'),
        payment(3, 'Rejected', 30, 'Meera'),
      ]}
      updatingId={null}
      onUpdate={() => {}}
    />,
  );
  assert.match(html, /aria-label="Mark Asha paid"/);
  assert.match(html, /aria-label="Mark Asha rejected"/);
  assert.equal(html.match(/<button/g)?.length, 2);
});

test('the row being updated has its buttons disabled, others stay active', () => {
  const html = renderToStaticMarkup(
    <PaymentList
      payments={[payment(1, 'Pending', 10), payment(2, 'Pending', 20)]}
      updatingId={1}
      onUpdate={() => {}}
    />,
  );
  assert.equal(html.match(/disabled=""/g)?.length, 2);
  assert.equal(html.match(/<button/g)?.length, 4);
});

test('a row shows customer, date, rupee amount and status', () => {
  const out = text(
    renderToStaticMarkup(
      <PaymentList payments={[payment(1, 'Paid', 150000, 'Asha')]} updatingId={null} onUpdate={() => {}} />,
    ),
  );
  assert.match(out, /Asha 01 Oct 2026 ₹1,50,000\.00 ✓ Paid/);
});
