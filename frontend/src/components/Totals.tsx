import { STATUSES, type Payment } from '../api';
import { formatRupees } from '../format';
import { StatusLabel } from './StatusLabel';

function summarise(payments: Payment[], status: Payment['status']) {
  const matching = payments.filter((payment) => payment.status === status);
  // Add whole paise so floating point can't drift the total.
  const paise = matching.reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0);
  return { total: paise / 100, count: matching.length };
}

// payments is null until the list has loaded: a blank beats a false ₹0.00.
export function Totals({ payments }: { payments: Payment[] | null }) {
  return (
    <section aria-label="Totals" className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
      {STATUSES.map((status, index) => {
        const summary = payments && summarise(payments, status);
        return (
          <div key={status} className="rise bg-panel px-5 py-4" style={{ animationDelay: `${index * 60}ms` }}>
            <StatusLabel status={status} />
            <p className="mt-2 font-mono text-2xl font-medium tabular-nums break-words">
              {summary ? formatRupees(summary.total) : '—'}
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              {summary ? `${summary.count} ${summary.count === 1 ? 'payment' : 'payments'}` : ' '}
            </p>
          </div>
        );
      })}
    </section>
  );
}
