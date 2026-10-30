import { describe, expect, it } from "vitest";
import { parseSearchParams, toSearchParams } from "./searchParams";
import { describeResult, initialSearchState, searchReducer } from "./searchState";
import { parseSseBuffer } from "./sse";
import type { SearchInput, SearchResult, SourceResult, Stay } from "./types";

const stay: Stay = {
  source: "booking",
  name: "Hotel",
  totalPrice: 1000,
  pricePerNight: 1000,
  currency: "INR",
  rating: 8,
  reviewCount: null,
  url: "https://x",
  feesMayBeExtra: false,
};
const okSrc = (source: "booking" | "airbnb", n = 3): SourceResult => ({ source, status: "ok", stays: Array(n).fill(stay), ms: 1 });
const badSrc = (source: "booking" | "airbnb"): SourceResult => ({ source, status: "failed", error: "x", ms: 1 });
const res = (stays: Stay[], sources: SourceResult[]): SearchResult => ({ stays, bestPickReason: null, sources, trace: [] });

describe("searchReducer", () => {
  it("starts with both sources searching", () => {
    expect(initialSearchState.sources.booking.status).toBe("searching");
    expect(initialSearchState.sources.airbnb.status).toBe("searching");
  });

  it("ticks each source independently, then ranking, then result", () => {
    let s = searchReducer(initialSearchState, { type: "source_done", source: "airbnb", count: 3 });
    expect(s.sources.airbnb).toEqual({ status: "done", count: 3 });
    expect(s.sources.booking.status).toBe("searching");
    s = searchReducer(s, { type: "source_failed", source: "booking", error: "x" });
    expect(s.sources.booking.status).toBe("failed");
    s = searchReducer(s, { type: "ranking_started" });
    expect(s.ranking).toBe(true);
    const result = res([stay], [okSrc("airbnb"), badSrc("booking")]);
    s = searchReducer(s, { type: "result", result });
    expect(s.phase).toBe("done");
    expect(s.result).toBe(result);
  });

  it("a transport error before the result → error; after the result → ignored", () => {
    expect(searchReducer(initialSearchState, { type: "fetch_error" }).phase).toBe("error");
    const done = searchReducer(initialSearchState, { type: "result", result: res([], []) });
    expect(searchReducer(done, { type: "fetch_error" }).phase).toBe("done");
  });
});

describe("describeResult", () => {
  it("ok", () => expect(describeResult(res([stay], [okSrc("booking"), okSrc("airbnb")]))).toEqual({ kind: "ok", failed: null }));
  it("empty: both ok, no stays", () =>
    expect(describeResult(res([], [okSrc("booking", 0), okSrc("airbnb", 0)]))).toEqual({ kind: "empty", failed: null }));
  it("partial: names the failed source", () => {
    expect(describeResult(res([stay], [okSrc("booking"), badSrc("airbnb")]))).toEqual({ kind: "partial", failed: "airbnb" });
    expect(describeResult(res([stay], [badSrc("booking"), okSrc("airbnb")]))).toEqual({ kind: "partial", failed: "booking" });
  });
  it("error: both failed", () =>
    expect(describeResult(res([], [badSrc("booking"), badSrc("airbnb")]))).toEqual({ kind: "error", failed: null }));
});

describe("search params", () => {
  const input: SearchInput = { destination: "Goa", checkIn: "2026-11-13", checkOut: "2026-11-14", adults: 2, children: 2, childAges: [1, 5] };

  it("round-trips a SearchInput", () => {
    const q = toSearchParams(input);
    expect(parseSearchParams((k) => q.get(k))).toEqual(input);
  });
  it("is lenient about missing or bad values", () => {
    const p = parseSearchParams(() => undefined);
    expect(p.destination).toBe("");
    expect(Number.isNaN(p.adults)).toBe(true);
    expect(p.childAges).toEqual([]);
  });
});

describe("parseSseBuffer", () => {
  it("returns complete events and keeps the unfinished tail", () => {
    const a = 'event: source_started\ndata: {"type":"source_started","source":"booking"}\n\n';
    const b = 'event: ranking_started\ndata: {"type":"ranking_started"}\n\n';
    const { events, rest } = parseSseBuffer(a + b + 'event: result\ndata: {"type":"res');
    expect(events.map((e) => e.type)).toEqual(["source_started", "ranking_started"]);
    expect(rest).toBe('event: result\ndata: {"type":"res');
  });
  it("skips malformed blocks", () => {
    expect(parseSseBuffer("data: nope\n\n").events).toEqual([]);
  });
});
