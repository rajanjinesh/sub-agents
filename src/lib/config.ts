/**
 * Fixed USD→INR rate for Airbnb prices (HasData's Airbnb endpoint has no currency
 * param and always returns USD). Airbnb totals are therefore approximate.
 * Update this one constant to change the rate everywhere.
 */
export const USD_TO_INR = 88;

/** USE_FIXTURES=true (or unset, for local work) → search tools return saved fixtures, not HasData. */
export function fixturesEnabled(): boolean {
  return (process.env.USE_FIXTURES ?? "true").trim().toLowerCase() !== "false";
}
