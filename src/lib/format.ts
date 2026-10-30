const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-date YYYY-MM-DD for a Date. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** "29 Oct 2026" from YYYY-MM-DD. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Whole nights between two YYYY-MM-DD dates (0 if invalid). */
export function nights(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split("-").map(Number);
  const [y2, m2, d2] = checkOut.split("-").map(Number);
  if ([y1, m1, d1, y2, m2, d2].some((n) => !Number.isFinite(n))) return 0;
  const diff = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);
  return Math.round(diff / 86_400_000);
}

/** ₹4,200 / ₹1,25,000 (Indian grouping). */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** "1 night" / "3 nights". */
export function formatNights(n: number): string {
  return n === 1 ? "1 night" : `${n} nights`;
}

/** "29–30 Oct 2026", "29 Oct – 2 Nov 2026", or "30 Dec 2026 – 2 Jan 2027". */
export function formatDateRange(checkIn: string, checkOut: string): string {
  const [y1, m1, d1] = checkIn.split("-").map(Number);
  const [y2, m2, d2] = checkOut.split("-").map(Number);
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MONTHS[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y1}`;
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`;
}

/** "2 adults, 1 child" / "1 adult". */
export function formatGuests(adults: number, children: number): string {
  const a = `${adults} ${adults === 1 ? "adult" : "adults"}`;
  if (children <= 0) return a;
  return `${a}, ${children} ${children === 1 ? "child" : "children"}`;
}

/** One decimal, trailing ".0" dropped: 9.52 → "9.5", 10 → "10". */
export function formatRating(rating: number): string {
  return String(Number(rating.toFixed(1)));
}
