import { useEffect, useState } from 'react';
import {
  createPayment,
  listPayments,
  reviewPayment,
  STATUSES,
  type NewPayment,
  type Payment,
  type Status,
} from './api';
import { PaymentForm } from './components/PaymentForm';
import { PaymentList } from './components/PaymentList';
import { Totals } from './components/Totals';

type Filter = Status | 'All';

const FILTERS: Filter[] = ['All', ...STATUSES];

// Same order the API lists in, so added payments land where a reload would put them.
function newestFirst(a: Payment, b: Payment) {
  return b.date.localeCompare(a.date) || b.id - a.id;
}

function messageOf(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function App() {
  // Always the full list: the totals need every status, so filtering happens here.
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>('All');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listPayments(controller.signal)
      .then((loaded) => {
        setPayments(loaded);
        setLoadError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(messageOf(err, 'Could not load payments.'));
      });
    return () => controller.abort();
  }, [attempt]);

  async function handleAdd(input: NewPayment) {
    const created = await createPayment(input);
    setPayments((current) => [created, ...(current ?? [])].sort(newestFirst));
  }

  async function handleUpdate(id: number, status: 'Paid' | 'Rejected') {
    setUpdatingId(id);
    setUpdateError(null);
    try {
      const updated = await reviewPayment(id, status === 'Paid');
      setPayments((current) => current?.map((p) => (p.id === id ? updated : p)) ?? null);
    } catch (err) {
      setUpdateError(messageOf(err, 'Could not update the payment.'));
    } finally {
      setUpdatingId(null);
    }
  }

  function retry() {
    setLoadError(null);
    setAttempt((count) => count + 1);
  }

  const visible = payments?.filter((p) => filter === 'All' || p.status === filter) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="font-mono text-xl font-medium tracking-tight">
          pay<span className="text-accent">track</span>
        </h1>
      </header>

      <Totals payments={payments} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PaymentForm onAdd={handleAdd} />

        <main className="min-w-0 rounded-lg border border-line bg-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h2 className="font-semibold">Payments</h2>
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={`cursor-pointer rounded-md px-3 py-1 text-sm ${
                    filter === option ? 'bg-line text-ink' : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {updateError && (
            <p role="alert" className="border-b border-line px-5 py-3 text-sm text-rejected">
              {updateError}
            </p>
          )}

          {loadError ? (
            <div role="alert" className="px-5 py-12 text-center">
              <p className="text-ink-soft">{loadError}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 cursor-pointer rounded-md border border-line px-3 py-1 text-sm text-ink-soft hover:text-ink"
              >
                Try again
              </button>
            </div>
          ) : payments === null ? (
            <p className="px-5 py-12 text-center text-ink-faint">Loading payments…</p>
          ) : visible.length === 0 ? (
            <p className="px-5 py-12 text-center text-ink-faint">
              {filter === 'All' ? 'No payments yet.' : `No ${filter.toLowerCase()} payments.`}
            </p>
          ) : (
            <PaymentList payments={visible} updatingId={updatingId} onUpdate={handleUpdate} />
          )}
        </main>
      </div>
    </div>
  );
}
