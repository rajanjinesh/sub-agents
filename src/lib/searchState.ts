import type { SearchResult, SseEvent } from "./types";
import { SOURCE_LABEL, type Source } from "./sources";

export type SourceStatus = "searching" | "done" | "failed";

export type SearchState = {
  phase: "loading" | "done" | "error";
  sources: Record<Source, { status: SourceStatus; count?: number }>;
  ranking: boolean;
  result: SearchResult | null;
};

export type SearchAction = SseEvent | { type: "fetch_error" };

export const initialSearchState: SearchState = {
  phase: "loading",
  sources: { booking: { status: "searching" }, airbnb: { status: "searching" } },
  ranking: false,
  result: null,
};

/** Folds the SSE events (and a transport failure) into what the Loading screen shows. */
export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "source_started":
      return { ...state, sources: { ...state.sources, [action.source]: { status: "searching" } } };
    case "source_done":
      return { ...state, sources: { ...state.sources, [action.source]: { status: "done", count: action.count } } };
    case "source_failed":
      return { ...state, sources: { ...state.sources, [action.source]: { status: "failed" } } };
    case "ranking_started":
      return { ...state, ranking: true };
    case "result":
      return { ...state, phase: "done", result: action.result };
    case "fetch_error":
      return state.phase === "done" ? state : { ...state, phase: "error" };
  }
}

export type ResultKind = "ok" | "partial" | "empty" | "error";

/** Which Screen 3/4 state a result is in. Pure, so the copy rules are testable. */
export function describeResult(result: SearchResult): { kind: ResultKind; failed: Source | null } {
  const failed = result.sources.filter((s) => s.status === "failed").map((s) => s.source);
  if (failed.length >= 2) return { kind: "error", failed: null };
  if (failed.length === 1) return { kind: "partial", failed: failed[0] };
  return { kind: result.stays.length === 0 ? "empty" : "ok", failed: null };
}

/** "{n} stays compared from Booking.com and Airbnb": names only the sources that succeeded. */
export function compareSubLine(result: SearchResult): string | undefined {
  const n = result.stays.length;
  if (n === 0) return undefined;
  const names = result.sources.filter((s) => s.status === "ok").map((s) => SOURCE_LABEL[s.source]);
  return `${n} ${n === 1 ? "stay" : "stays"} compared from ${names.join(" and ")}`;
}
