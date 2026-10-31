import { useState, type FormEvent } from 'react';
import type { NewPayment } from '../api';
import { today } from '../format';

const FIELD =
  'mt-1.5 w-full rounded-md border border-line bg-field px-3 py-2 text-ink placeholder:text-ink-faint';

export function PaymentForm({ onAdd }: { onAdd: (payment: NewPayment) => Promise<void> }) {
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!customerName.trim()) {
      setError('Enter a customer name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd({ customerName: customerName.trim(), amount: Number(amount), date });
      setCustomerName('');
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the payment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-panel p-5">
      <h2 className="font-semibold">Add payment</h2>

      <label className="mt-4 block text-sm text-ink-soft">
        Customer name
        <input
          required
          maxLength={200}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className={FIELD}
        />
      </label>

      <label className="mt-4 block text-sm text-ink-soft">
        Amount (₹)
        <input
          required
          type="number"
          inputMode="decimal"
          min="0.01"
          max="9999999999.99"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={`${FIELD} font-mono tabular-nums`}
        />
      </label>

      <label className="mt-4 block text-sm text-ink-soft">
        Date
        <input
          required
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className={`${FIELD} font-mono`}
        />
      </label>

      {error && (
        <p role="alert" className="mt-4 text-sm text-rejected">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-5 w-full cursor-pointer rounded-md bg-accent px-3 py-2 font-medium text-page hover:brightness-110 disabled:cursor-default disabled:opacity-60"
      >
        {saving ? 'Adding…' : 'Add payment'}
      </button>
    </form>
  );
}
