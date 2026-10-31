export const STATUSES = ['Paid', 'Pending', 'Rejected'] as const;

export type Status = (typeof STATUSES)[number];

export interface Payment {
  id: number;
  customerName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: Status;
  createdAt: string;
}

export interface NewPayment {
  customerName: string;
  amount: number;
  date: string;
}

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('VITE_API_URL is not set.');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    throw new Error('Could not reach the API.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `Request failed (${response.status}).`);
  return body as T;
}

export function listPayments(signal?: AbortSignal) {
  return request<Payment[]>('/payments', { signal });
}

export function createPayment(payment: NewPayment) {
  return request<Payment>('/payments', { method: 'POST', body: JSON.stringify(payment) });
}

export function updatePaymentStatus(id: number, status: 'Paid' | 'Rejected') {
  return request<Payment>(`/payments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
