import type { Stay } from "./types";

/** B may jump ahead of A when it is at most 10% pricier AND rated at least 1.0 higher. */
const MAX_PRICE_PREMIUM = 0.1;
const MIN_RATING_GAIN = 1.0;

function shouldSwap(a: Stay, b: Stay): boolean {
  // Integer-safe comparisons: no float edge cases at exactly 10% / exactly 1.0.
  const withinPrice = b.totalPrice * 10 <= a.totalPrice * (10 + MAX_PRICE_PREMIUM * 10);
  const ratingGain = Math.round((b.rating - a.rating) * 100) >= MIN_RATING_GAIN * 100;
  return withinPrice && ratingGain;
}

/**
 * Value ranking (CLAUDE.md section 5). Pure: returns a new array, input untouched.
 * 1. Sort by totalPrice ascending (equal price: higher rating first).
 * 2. Repeat until no swaps: swap adjacent A,B when shouldSwap(A, B).
 * The first item is the Best pick.
 */
export function rank(stays: Stay[]): Stay[] {
  const out = [...stays].sort((a, b) => a.totalPrice - b.totalPrice || b.rating - a.rating);

  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let i = 0; i < out.length - 1; i++) {
      if (shouldSwap(out[i], out[i + 1])) {
        [out[i], out[i + 1]] = [out[i + 1], out[i]];
        swapped = true;
      }
    }
  }
  return out;
}
