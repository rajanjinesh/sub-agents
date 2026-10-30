import { SOURCES, SOURCE_LABEL } from "@/lib/sources";
import { compareSubLine, describeResult } from "@/lib/searchState";
import type { SearchInput, SearchResult } from "@/lib/types";
import { AgentActivity } from "./AgentActivity";
import { ResultsHeader } from "./ResultsHeader";
import { StayCard } from "./StayCard";

const EMPTY_COPY = "No stays found. Try different dates or a different destination.";
const ERROR_COPY = "Something went wrong. Please try again.";

/** Screens 3 and 4: ok / partial / empty / error, plus the optional ?debug=1 timeline. */
export function ResultsView({ input, result, debug }: { input: SearchInput; result: SearchResult; debug: boolean }) {
  const { kind, failed } = describeResult(result);
  const n = result.stays.length;

  if (kind === "error") return <MessageView input={input} message={ERROR_COPY} result={result} debug={debug} />;
  if (kind === "empty") return <MessageView input={input} message={EMPTY_COPY} result={result} debug={debug} />;

  const other = failed ? SOURCES.find((s) => s !== failed) : null;
  return (
    <div className="flex flex-col gap-4">
      <ResultsHeader input={input} subLine={compareSubLine(result)} />
      {failed && other && (
        <p className="text-xs leading-4 text-muted">
          {SOURCE_LABEL[failed]} results are unavailable right now. Showing {SOURCE_LABEL[other]} only.
        </p>
      )}
      {n === 0 ? (
        <p className="text-sm leading-5 text-label">{EMPTY_COPY}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.stays.map((stay, i) => (
            <li key={`${stay.source}-${stay.url}-${i}`}>
              <StayCard stay={stay} best={i === 0} reason={i === 0 ? result.bestPickReason : null} />
            </li>
          ))}
        </ul>
      )}
      {debug && <AgentActivity trace={result.trace} />}
    </div>
  );
}

function MessageView({ input, message, result, debug }: { input: SearchInput; message: string; result: SearchResult | null; debug: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <ResultsHeader input={input} />
      <p className="text-sm leading-5 text-label">{message}</p>
      {debug && result && <AgentActivity trace={result.trace} />}
    </div>
  );
}

/** Transport failure or invalid search (no result at all): the Error state without a trace. */
export function ErrorView({ input }: { input: SearchInput }) {
  return <MessageView input={input} message={ERROR_COPY} result={null} debug={false} />;
}
