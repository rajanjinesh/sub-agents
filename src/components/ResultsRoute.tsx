"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { parseSearchParams } from "@/lib/searchParams";
import { ResultsClient } from "./ResultsClient";

/**
 * Reads the search from the URL in the browser. (Reading it on the server made /results depend on
 * Vercel resuming a pre-rendered shell, which left the page blank for ~30s in production.)
 * /api/search validates again; an invalid search ends in the Error state.
 */
export function ResultsRoute() {
  const params = useSearchParams();
  const input = useMemo(() => parseSearchParams((key) => params.get(key)), [params]);
  return <ResultsClient input={input} debug={params.get("debug") === "1"} />;
}
