import type { Payment } from '../api';
import { formatDate, formatRupees } from '../format';
import { StatusLabel } from './StatusLabel';

interface Props {
  payments: Payment[];
  updatingId: number | null;
  onUpdate: (id: number, status: 'Paid' | 'Rejected') => void;
}

const ACTION =
  'cursor-pointer rounded-md border border-line px-2.5 py-1 text-sm text-ink-soft hover:border-ink-faint hover:text-ink disabled:cursor-default disabled:opacity-50';

export function PaymentList({ payments, updatingId, onUpdate }: Props) {
  return (
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
          {payments.map((payment) => (
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
  );
}
