import type { Status } from '../api';

const STYLES: Record<Status, { color: string; icon: string }> = {
  Paid: { color: 'text-paid', icon: '✓' },
  Pending: { color: 'text-pending', icon: '•' },
  Rejected: { color: 'text-rejected', icon: '✕' },
};

export function StatusLabel({ status }: { status: Status }) {
  const { color, icon } = STYLES[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
      <span aria-hidden="true" className={`w-3 text-center font-mono ${color}`}>
        {icon}
      </span>
      {status}
    </span>
  );
}
