/**
 * Fixed USD→INR rate for Airbnb prices (HasData's Airbnb endpoint has no currency
 * param and always returns USD). Airbnb totals are therefore approximate.
 * Update this one constant to change the rate everywhere.
 */
export const USD_TO_INR = 88;
