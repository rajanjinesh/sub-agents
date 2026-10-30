import { describe, expect, it } from "vitest";
import { rank } from "./rank";
import type { Stay } from "./types";

const s = (name: string, totalPrice: number, rating: number): Stay => ({
  source: "booking",
  name,
  totalPrice,
  pricePerNight: totalPrice,
  currency: "INR",
  rating,
  reviewCount: null,
  url: "https://x",
  feesMayBeExtra: false,
});
const names = (stays: Stay[]) => stays.map((x) => x.name);

describe("rank", () => {
  it("empty list → empty list", () => {
    expect(rank([])).toEqual([]);
  });

  it("single stay is returned as is", () => {
    const only = s("A", 1000, 8);
    expect(rank([only])).toEqual([only]);
  });

  it("no swaps: cheapest stays first when nothing is much better", () => {
    expect(names(rank([s("C", 3000, 9), s("A", 1000, 8), s("B", 2000, 8.5)]))).toEqual(["A", "B", "C"]);
  });

  it("one swap: a slightly pricier, clearly better stay moves up", () => {
    // B is 5% pricier and 1.5 higher → B before A
    expect(names(rank([s("A", 1000, 7.5), s("B", 1050, 9)]))).toEqual(["B", "A"]);
  });

  it("does not swap when the better stay is more than 10% pricier", () => {
    expect(names(rank([s("A", 1000, 7), s("B", 1200, 9.5)]))).toEqual(["A", "B"]);
  });

  it("does not swap when the rating gain is under 1.0", () => {
    expect(names(rank([s("A", 1000, 8), s("B", 1050, 8.9)]))).toEqual(["A", "B"]);
  });

  it("swaps at exactly 10% pricier", () => {
    expect(names(rank([s("A", 1000, 7), s("B", 1100, 8.5)]))).toEqual(["B", "A"]);
  });

  it("does not swap just over 10% pricier", () => {
    expect(names(rank([s("A", 1000, 7), s("B", 1101, 8.5)]))).toEqual(["A", "B"]);
  });

  it("swaps at exactly 1.0 higher", () => {
    expect(names(rank([s("A", 1000, 7.5), s("B", 1050, 8.5)]))).toEqual(["B", "A"]);
  });

  it("does not swap at 0.9 higher", () => {
    expect(names(rank([s("A", 1000, 7.5), s("B", 1050, 8.4)]))).toEqual(["A", "B"]);
  });

  it("chain swaps: the best-rated stay bubbles to the top", () => {
    // sorted: A(1000,6) B(1050,7) C(1100,8) → B,A,C → B,C,A → C,B,A
    expect(names(rank([s("A", 1000, 6), s("B", 1050, 7), s("C", 1100, 8)]))).toEqual(["C", "B", "A"]);
  });

  it("ties on price: higher rating first", () => {
    expect(names(rank([s("low", 1000, 7.5), s("high", 1000, 9)]))).toEqual(["high", "low"]);
  });

  it("full tie keeps both stays", () => {
    expect(rank([s("A", 1000, 8), s("B", 1000, 8)])).toHaveLength(2);
  });

  it("is pure: does not mutate the input", () => {
    const input = [s("B", 2000, 8), s("A", 1000, 8)];
    const copy = [...input];
    rank(input);
    expect(input).toEqual(copy);
  });
});
