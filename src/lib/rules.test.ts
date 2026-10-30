import { describe, expect, it } from "vitest";
import { applyRules, isSharedOrHostel } from "./rules";
import type { Stay } from "./types";

const stay = (over: Partial<Stay> = {}): Stay => ({
  source: "booking",
  name: "Hotel",
  totalPrice: 5000,
  pricePerNight: 5000,
  currency: "INR",
  rating: 8,
  reviewCount: 10,
  url: "https://example.com",
  feesMayBeExtra: false,
  ...over,
});

describe("applyRules", () => {
  it("keeps only ratings of 7.0 or more", () => {
    const out = applyRules([stay({ name: "a", rating: 6.9 }), stay({ name: "b", rating: 7.0 })]);
    expect(out.map((s) => s.name)).toEqual(["b"]);
  });

  it("excludes unrated (NaN) listings", () => {
    expect(applyRules([stay({ rating: NaN })])).toEqual([]);
  });

  it("excludes hostels, dorms and shared rooms by name", () => {
    const out = applyRules([
      stay({ name: "Sunny Hostel" }),
      stay({ name: "Bed in 6-Bed Dormitory" }),
      stay({ name: "Shared room in Goa" }),
      stay({ name: "Nice Resort" }),
    ]);
    expect(out.map((s) => s.name)).toEqual(["Nice Resort"]);
  });

  it("does not treat a shared bathroom as a shared room", () => {
    expect(isSharedOrHostel("Double Room with Shared Bathroom")).toBe(false);
  });

  it("skips unparseable or non-INR prices", () => {
    const out = applyRules([
      stay({ name: "nan", totalPrice: NaN }),
      stay({ name: "zero", totalPrice: 0 }),
      stay({ name: "usd", currency: "USD" as "INR" }),
      stay({ name: "ok" }),
    ]);
    expect(out.map((s) => s.name)).toEqual(["ok"]);
  });

  it("returns the 3 cheapest, cheapest first", () => {
    const prices = [900, 100, 500, 300, 700];
    const out = applyRules(prices.map((p) => stay({ name: `p${p}`, totalPrice: p })));
    expect(out.map((s) => s.totalPrice)).toEqual([100, 300, 500]);
  });

  it("breaks price ties by higher rating", () => {
    const out = applyRules([stay({ name: "low", rating: 7.5 }), stay({ name: "high", rating: 9 })]);
    expect(out.map((s) => s.name)).toEqual(["high", "low"]);
  });

  it("handles an empty list", () => {
    expect(applyRules([])).toEqual([]);
  });
});
