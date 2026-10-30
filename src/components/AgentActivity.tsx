import type { TraceEvent } from "@/lib/types";

/** Learning view, shown only with ?debug=1: the merged agent trace as a timeline. */
export function AgentActivity({ trace }: { trace: TraceEvent[] }) {
  return (
    <section aria-label="Agent activity" className="flex flex-col gap-2 border-t border-border pt-4">
      <h2 className="text-sm font-semibold leading-5 text-strong">Agent activity</h2>
      <ol className="flex flex-col gap-1">
        {trace.map((e, i) => (
          <li key={i} className={`flex gap-2 text-xs leading-4 ${e.type === "error" || e.type === "warning" ? "text-error" : "text-label"}`}>
            <span className="w-11 shrink-0 text-right tabular-nums text-muted">+{(e.t / 1000).toFixed(1)}s</span>
            <span className="w-[76px] shrink-0 font-medium text-muted">{e.agent}</span>
            <span className="min-w-0 break-words">{e.message}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
