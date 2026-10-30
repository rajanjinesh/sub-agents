import type { Stay } from "./types";

export const MIN_RATING = 7.0;
export const MAX_PER_SOURCE = 3;

/** Hostels, dorms, bunk/shared rooms ("shared bathroom" is fine). */
const SHARED_OR_HOSTEL = /hostel|dorm|shared (room|dorm)|bunk|\bbed in\b/i;

export function isSharedOrHostel(text: string): boolean {
  return SHARED_OR_HOSTEL.test(text);
}

/**
 * Product rules, in code, for ONE source's stays (CLAUDE.md section 4):
 * rating 7.0+/10 (unrated out), no hostels/dorms/shared rooms, a parseable INR total,
 * then the 3 cheapest. Equal price: higher rating first.
 */
export function applyRules(stays: Stay[]): Stay[] {
  return stays
    .filter(
      (s) =>
        Number.isFinite(s.rating) &&
        s.rating >= MIN_RATING &&
        Number.isFinite(s.totalPrice) &&
        s.totalPrice > 0 &&
        s.currency === "INR" &&
        !isSharedOrHostel(s.name),
    )
    .sort((a, b) => a.totalPrice - b.totalPrice || b.rating - a.rating)
    .slice(0, MAX_PER_SOURCE);
}
