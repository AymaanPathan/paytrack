const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const longDate = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatRupees(amount: number) {
  return rupees.format(amount);
}

export function formatDate(date: string) {
  return longDate.format(new Date(`${date}T00:00:00Z`));
}

// Local calendar date: toISOString() would give yesterday or tomorrow near midnight.
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
