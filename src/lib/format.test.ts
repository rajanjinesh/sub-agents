import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  formatDateRange,
  formatGuests,
  formatINR,
  formatNights,
  formatRating,
  nights,
} from "./format";

describe("formatINR", () => {
  it("uses Indian grouping", () => {
    expect(formatINR(4200)).toBe("₹4,200");
    expect(formatINR(125000)).toBe("₹1,25,000");
  });
});

describe("dates", () => {
  it("formatDate", () => expect(formatDate("2026-10-29")).toBe("29 Oct 2026"));
  it("nights / addDays", () => {
    expect(nights("2026-10-29", "2026-10-30")).toBe(1);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("formatNights", () => {
    expect(formatNights(1)).toBe("1 night");
    expect(formatNights(3)).toBe("3 nights");
  });
  it("formatDateRange: same month, across months, across years", () => {
    expect(formatDateRange("2026-10-29", "2026-10-30")).toBe("29–30 Oct 2026");
    expect(formatDateRange("2026-10-29", "2026-11-02")).toBe("29 Oct – 2 Nov 2026");
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027");
  });
});

describe("formatGuests", () => {
  it("pluralises adults and children", () => {
    expect(formatGuests(1, 0)).toBe("1 adult");
    expect(formatGuests(2, 1)).toBe("2 adults, 1 child");
    expect(formatGuests(2, 3)).toBe("2 adults, 3 children");
  });
});

describe("formatRating", () => {
  it("shows one decimal, dropping a trailing .0", () => {
    expect(formatRating(9.52)).toBe("9.5");
    expect(formatRating(10)).toBe("10");
    expect(formatRating(8.7)).toBe("8.7");
    expect(formatRating(9)).toBe("9");
    expect(formatRating(9.96)).toBe("10");
    expect(formatRating(7.04)).toBe("7");
  });
});
