import Link from "next/link";
import { Suspense } from "react";

type Params = Record<string, string | string[] | undefined>;

async function ParsedParams({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const rows = Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : (v ?? "")]);

  return (
    <dl className="flex flex-col gap-1 text-sm leading-5 text-label">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="font-medium">{k}:</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="page-column flex flex-col gap-4">
      <h1 className="text-[28px] font-bold leading-[34px] text-strong">Results</h1>
      <p className="text-sm leading-5 text-muted">Placeholder: parsed search params (agents arrive in a later step).</p>
      <Suspense fallback={null}>
        <ParsedParams searchParams={searchParams} />
      </Suspense>
      <Link href="/" className="text-sm font-medium leading-5 text-primary">
        ← New search
      </Link>
    </main>
  );
}
