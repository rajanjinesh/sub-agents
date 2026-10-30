"use client";

import { useEffect, useReducer, useRef } from "react";
import { runSearch } from "@/lib/searchClient";
import { initialSearchState, searchReducer } from "@/lib/searchState";
import type { SearchInput } from "@/lib/types";
import { LoadingView } from "./LoadingView";
import { ErrorView, ResultsView } from "./ResultsView";

/** Runs the search on mount (POST + SSE) and shows Loading → Results / Error. */
export function ResultsClient({ input, debug }: { input: SearchInput; debug: boolean }) {
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const started = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    // Start once: React Strict Mode runs effects twice in dev, and a search costs real model calls.
    if (!started.current) {
      started.current = true;
      void runSearch(input, (action) => {
        if (mounted.current) dispatch(action);
      });
    }
    return () => {
      mounted.current = false;
    };
  }, [input]);

  if (state.phase === "error") return <ErrorView input={input} />;
  if (state.phase === "done" && state.result) return <ResultsView input={input} result={state.result} debug={debug} />;
  return <LoadingView input={input} state={state} />;
}
