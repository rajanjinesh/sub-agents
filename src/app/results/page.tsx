import { Suspense } from "react";
import { ResultsRoute } from "@/components/ResultsRoute";

export default function ResultsPage() {
  return (
    <main className="page-column">
      <Suspense fallback={null}>
        <ResultsRoute />
      </Suspense>
    </main>
  );
}
