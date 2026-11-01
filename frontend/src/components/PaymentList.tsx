import { useState } from 'react';
import type { Payment } from '../api';
import { formatDate, formatRupees } from '../format';
import { StatusLabel } from './StatusLabel';

interface Props {
  payments: Payment[];
  emptyMessage: string;
  updatingId: number | null;
  onUpdate: (id: number, status: 'Paid' | 'Rejected') => void;
}

const ACTION =
  'cursor-pointer rounded-md border border-line px-2.5 py-1 text-sm text-ink-soft hover:border-ink-faint hover:text-ink disabled:cursor-default disabled:opacity-50';

export function PaymentList({ payments, emptyMessage, updatingId, onUpdate }: Props) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const matching = payments.filter((payment) =>
    payment.customerName.toLowerCase().includes(query),
  );

  return (
    <>
      <div className="border-b border-line px-5 py-3">
        <input
          type="search"
          aria-label="Search by customer name"
          placeholder="Search by customer name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-md border border-line bg-field px-3 py-2 text-ink placeholder:text-ink-faint"
        />
      </div>

      {matching.length === 0 ? (
        <p className="px-5 py-12 text-center break-words text-ink-faint">
          {payments.length === 0 ? emptyMessage : `No customers match "${search.trim()}".`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-line text-sm text-ink-faint">
                <th scope="col" className="px-5 py-3 font-normal">Customer</th>
                <th scope="col" className="px-3 py-3 font-normal">Date</th>
                <th scope="col" className="px-3 py-3 text-right font-normal">Amount</th>
                <th scope="col" className="px-3 py-3 font-normal">Status</th>
                <th scope="col" className="px-5 py-3 font-normal"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {matching.map((payment) => (
                <tr key={payment.id} className="border-b border-line last:border-b-0">
                  <td className="max-w-56 px-5 py-3 break-words">{payment.customerName}</td>
                  <td className="px-3 py-3 font-mono text-sm whitespace-nowrap text-ink-soft">
                    {formatDate(payment.date)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatRupees(payment.amount)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <StatusLabel status={payment.status} />
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {payment.status === 'Pending' && (
                      <span className="inline-flex gap-2">
                        <button
                          type="button"
                          className={ACTION}
                          disabled={updatingId === payment.id}
                          aria-label={`Mark ${payment.customerName} paid`}
                          onClick={() => onUpdate(payment.id, 'Paid')}
                        >
                          Paid
                        </button>
                        <button
                          type="button"
                          className={ACTION}
                          disabled={updatingId === payment.id}
                          aria-label={`Mark ${payment.customerName} rejected`}
                          onClick={() => onUpdate(payment.id, 'Rejected')}
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
