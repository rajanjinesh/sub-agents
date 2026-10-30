import { Suspense } from "react";
import { ResultsClient } from "@/components/ResultsClient";
import { parseSearchParams } from "@/lib/searchParams";

type Params = Record<string, string | string[] | undefined>;

async function ResultsContent({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  // /api/search validates again; an invalid search ends in the Error state.
  return <ResultsClient input={parseSearchParams(get)} debug={get("debug") === "1"} />;
}

export default function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="page-column">
      <Suspense fallback={null}>
        <ResultsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
