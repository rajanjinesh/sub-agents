import { describe, expect, it } from "vitest";
import type { SearchInput } from "./types";
import { serverEarliestCheckIn, validateSearchInput } from "./validate";

const base: SearchInput = { destination: "Goa", checkIn: "2026-11-13", checkOut: "2026-11-14", adults: 2, children: 0, childAges: [] };

describe("validateSearchInput (client rule: not before the visitor's today)", () => {
  it("accepts today and later, rejects the past", () => {
    expect(validateSearchInput(base, "2026-11-13")).toEqual({});
    expect(validateSearchInput(base, "2026-11-14").checkIn).toBe("Check-in can't be in the past");
  });
  it("keeps the other messages", () => {
    const errors = validateSearchInput({ ...base, destination: " ", checkOut: "2026-11-13", adults: 0, children: 1 }, "2026-11-13");
    expect(errors.destination).toBe("Please enter a destination");
    expect(errors.checkOut).toBe("Check-out must be after check-in");
    expect(errors.adults).toBeDefined();
    expect(errors.childAges).toBe("Please select an age for each child");
  });
});

describe("serverEarliestCheckIn (server rule: up to 1 day before the server's UTC date)", () => {
  it("is the UTC date minus one day", () => {
    expect(serverEarliestCheckIn(new Date("2026-11-13T10:00:00Z"))).toBe("2026-11-12");
  });
  it("handles month and year boundaries", () => {
    expect(serverEarliestCheckIn(new Date("2026-12-01T00:30:00Z"))).toBe("2026-11-30");
    expect(serverEarliestCheckIn(new Date("2027-01-01T23:59:00Z"))).toBe("2026-12-31");
  });

  it("a visitor west of UTC (their today is the UTC date - 1) is accepted", () => {
    const now = new Date("2026-11-13T02:00:00Z"); // UTC is already the 13th; in Los Angeles it is still the 12th
    const visitorToday = "2026-11-12";
    const input = { ...base, checkIn: visitorToday, checkOut: "2026-11-13" };
    expect(validateSearchInput(input, serverEarliestCheckIn(now))).toEqual({});
  });

  it("two days before the UTC date is still rejected", () => {
    const now = new Date("2026-11-13T02:00:00Z");
    const input = { ...base, checkIn: "2026-11-11", checkOut: "2026-11-12" };
    expect(validateSearchInput(input, serverEarliestCheckIn(now)).checkIn).toBe("Check-in can't be in the past");
  });

  it("the strict client rule still rejects that same date", () => {
    const input = { ...base, checkIn: "2026-11-12", checkOut: "2026-11-13" };
    expect(validateSearchInput(input, "2026-11-13").checkIn).toBe("Check-in can't be in the past");
  });
});
