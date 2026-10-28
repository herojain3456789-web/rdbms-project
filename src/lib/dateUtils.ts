/**
 * Format a date value (Date object, string, or number) to YYYY-MM-DD
 */
export function toISODateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    return val.slice(0, 10);
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

/**
 * Format a date to readable user-facing string: e.g. "Oct 15, 2026"
 */
export function formatDisplayDate(val: any): string {
  if (!val) return '—';
  const iso = toISODateString(val);
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate overdue days between due date and today or return date
 */
export function calculateDaysOverdue(dueDateStr: string, returnDateStr?: string | null): number {
  if (!dueDateStr) return 0;
  const due = new Date(toISODateString(dueDateStr) + 'T00:00:00');
  const compareTo = returnDateStr 
    ? new Date(toISODateString(returnDateStr) + 'T00:00:00')
    : new Date();
  
  // Set compareTo to beginning of day
  compareTo.setHours(0, 0, 0, 0);
  
  const diffTime = compareTo.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}
