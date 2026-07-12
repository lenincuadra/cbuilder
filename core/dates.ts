/** Format a Date as a local "YYYY-MM-DD" string (no timezone shift). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format an ISO "YYYY-MM-DD" string as "DD-MM" (Spanish order, no year). */
export function formatDateShort(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}-${month}`;
}

/** Format an ISO "YYYY-MM-DD" string as "DD-MM-YYYY" (Spanish order). */
export function formatDateLong(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}
