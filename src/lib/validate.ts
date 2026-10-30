import { nights, todayISO } from "./format";
import type { SearchInput } from "./types";

export type SearchErrors = Partial<{
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  childAges: string;
}>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Shared by the client form and (later) /api/search. Empty object = valid. */
export function validateSearchInput(input: SearchInput, today = todayISO()): SearchErrors {
  const errors: SearchErrors = {};

  if (!input.destination.trim()) errors.destination = "Please enter a destination";

  if (!ISO.test(input.checkIn)) errors.checkIn = "Please choose a check-in date";
  else if (input.checkIn < today) errors.checkIn = "Check-in can't be in the past";

  if (!ISO.test(input.checkOut)) errors.checkOut = "Please choose a check-out date";
  else if (ISO.test(input.checkIn) && nights(input.checkIn, input.checkOut) < 1)
    errors.checkOut = "Check-out must be after check-in";

  if (!Number.isInteger(input.adults) || input.adults < 1) errors.adults = "At least 1 adult is required";

  if (!Number.isInteger(input.children) || input.children < 0) errors.children = "Children can't be negative";
  else if (
    input.childAges.length !== input.children ||
    input.childAges.some((a) => !Number.isInteger(a) || a < 0 || a > 17)
  )
    errors.childAges = "Please select an age for each child";

  return errors;
}

/**
 * Earliest check-in the SERVER accepts: one day before the server's UTC date. The server's clock
 * (UTC on Vercel) can be a day ahead of a visitor west of UTC, so their "today" must not be rejected.
 * The client keeps the strict "not before my today" rule.
 */
export function serverEarliestCheckIn(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return d.toISOString().slice(0, 10);
}
