import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { USD_TO_INR } from "../config";
import { applyRules } from "../rules";
import type { Stay } from "../types";
import { airbnbParams, normalizeAirbnb } from "./airbnb";
import { normalizeBooking } from "./booking";

const fixture = (name: string) => JSON.parse(readFileSync(path.join(process.cwd(), "fixtures", name), "utf8"));
const bookingRaw = fixture("booking-raw.json");
const airbnbRaw = fixture("airbnb-raw.json");

function expectValidStay(s: Stay, source: Stay["source"]) {
  expect(s.source).toBe(source);
  expect(s.name.length).toBeGreaterThan(0);
  expect(Number.isFinite(s.totalPrice) && s.totalPrice > 0).toBe(true);
  expect(Number.isFinite(s.pricePerNight) && s.pricePerNight > 0).toBe(true);
  expect(s.currency).toBe("INR");
  expect(s.rating).toBeGreaterThan(0);
  expect(s.rating).toBeLessThanOrEqual(10);
  expect(s.reviewCount === null || Number.isFinite(s.reviewCount)).toBe(true);
  expect(s.url).toMatch(/^https:\/\//);
  expect(typeof s.feesMayBeExtra).toBe("boolean");
  expect(Object.keys(s).sort()).toEqual(
    ["currency", "feesMayBeExtra", "name", "pricePerNight", "rating", "reviewCount", "source", "totalPrice", "url"],
  );
}

describe("normalizeBooking (fixture)", () => {
  const stays = normalizeBooking(bookingRaw);

  it("maps listings to valid Stay objects", () => {
    expect(stays.length).toBeGreaterThan(0);
    stays.forEach((s) => expectValidStay(s, "booking"));
  });

  it("total = pricePerStayParsed + excludedChargesParsed, rating = reviews.score", () => {
    const r = bookingRaw.results[0];
    const s = stays.find((x) => x.name === r.title)!;
    expect(s.totalPrice).toBe(r.price.pricePerStayParsed + r.price.excludedChargesParsed);
    expect(s.rating).toBe(r.reviews.score);
    expect(s.feesMayBeExtra).toBe(false);
  });

  it("applyRules gives 3 cheapest passing stays", () => {
    const top = applyRules(stays);
    expect(top).toHaveLength(3);
    expect(top.every((s) => s.rating >= 7)).toBe(true);
    const sorted = [...top].sort((a, b) => a.totalPrice - b.totalPrice);
    expect(top).toEqual(sorted);
  });

  it("drops listings without a price or score", () => {
    const raw = {
      searchInformation: { checkInDate: "2026-11-13", checkOutDate: "2026-11-14" },
      results: [
        { title: "A", url: "https://x", price: { currency: "INR" }, reviews: { score: 8 } },
        { title: "B", url: "https://x", price: { pricePerStayParsed: 100, currency: "INR" }, reviews: {} },
      ],
    };
    expect(normalizeBooking(raw)).toEqual([]);
  });

  it("returns [] for an empty or malformed response", () => {
    expect(normalizeBooking({})).toEqual([]);
    expect(normalizeBooking({ results: [] })).toEqual([]);
  });
});

describe("normalizeAirbnb (fixture)", () => {
  const stays = normalizeAirbnb(airbnbRaw);

  it("maps listings to valid Stay objects", () => {
    expect(stays.length).toBeGreaterThan(0);
    stays.forEach((s) => expectValidStay(s, "airbnb"));
  });

  it("total = nights × nightly USD × USD_TO_INR, rating × 2, fees flagged", () => {
    const p = airbnbRaw.properties[0];
    const m = p.price.breakdown[0].description.match(/(\d+) nights? x \$([\d,.]+)/);
    const s = stays[0];
    expect(s.totalPrice).toBe(Math.round(Number(m[1]) * Number(m[2]) * USD_TO_INR));
    expect(s.rating).toBeCloseTo(p.rating * 2, 2);
    expect(s.feesMayBeExtra).toBe(true);
    expect(s.url).toContain("/rooms/");
    expect(s.url).toContain("check_in=");
  });

  it("applyRules gives 3 cheapest passing stays", () => {
    const top = applyRules(stays);
    expect(top).toHaveLength(3);
    expect(top.every((s) => s.rating >= 7)).toBe(true);
  });

  it("handles multi-night breakdowns", () => {
    const raw = {
      properties: [
        { url: "https://www.airbnb.com/rooms/1", title: "Villa in X", rating: 4.5, reviews: 3, price: { breakdown: [{ description: "3 nights x $1,000.50" }] } },
      ],
    };
    const [s] = normalizeAirbnb(raw);
    expect(s.totalPrice).toBe(Math.round(3 * 1000.5 * USD_TO_INR));
    expect(s.pricePerNight).toBe(Math.round(1000.5 * USD_TO_INR));
    expect(s.rating).toBe(9);
  });

  it("drops unrated listings and unparseable prices", () => {
    const raw = {
      properties: [
        { url: "https://a", title: "A", rating: null, price: { breakdown: [{ description: "1 night x $10" }] } },
        { url: "https://b", title: "B", rating: 4.8, price: { breakdown: [] } },
      ],
    };
    expect(normalizeAirbnb(raw)).toEqual([]);
  });
});

describe("airbnbParams", () => {
  const base = { destination: "Madurai", checkIn: "2026-11-13", checkOut: "2026-11-14", adults: 1 };

  it("omits children when there are none (HasData returns 422 for children=0)", () => {
    const p = airbnbParams({ ...base, children: 0, childAges: [] });
    expect("children" in p).toBe(false);
    expect(p).toEqual({ location: "Madurai", checkIn: "2026-11-13", checkOut: "2026-11-14", adults: "1" });
  });

  it("sends the children count when there are children", () => {
    expect(airbnbParams({ ...base, adults: 2, children: 2, childAges: [1, 5] }).children).toBe("2");
  });
});
