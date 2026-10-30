import { SOURCES, SOURCE_LABEL } from "@/lib/sources";
import type { SearchState } from "@/lib/searchState";
import type { SearchInput } from "@/lib/types";
import { summaryLine } from "./ResultsHeader";
import { Spinner } from "./Spinner";

/** Screen 2: one live row per subagent, then "Picking the best stay…". */
export function LoadingView({ input, state }: { input: SearchInput; state: SearchState }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-[34px] text-strong">Finding your stays…</h1>
        {summaryLine(input) && <p className="text-sm leading-5 text-muted">{summaryLine(input)}</p>}
      </header>

      <ul className="flex flex-col gap-2" aria-live="polite">
        {SOURCES.map((source) => {
          const { status, count } = state.sources[source];
          const label = SOURCE_LABEL[source];
          if (status === "failed") {
            return (
              <li key={source} className="text-sm leading-5 text-muted">
                ✗ {label}: unavailable
              </li>
            );
          }
          if (status === "done") {
            return (
              <li key={source} className="text-sm leading-5 text-label">
                ✓ {label}: {count} {count === 1 ? "stay" : "stays"} found
              </li>
            );
          }
          return (
            <li key={source} className="flex items-center gap-2 text-sm leading-5 text-label">
              <Spinner />
              Searching {label}…
            </li>
          );
        })}
        {state.ranking && (
          <li className="flex items-center gap-2 text-sm leading-5 text-label">
            <Spinner />
            Picking the best stay…
          </li>
        )}
      </ul>
    </div>
  );
}
