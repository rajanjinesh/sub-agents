import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, getModel } from "../anthropic";
import { formatINR } from "../format";
import { rank } from "../rank";
import type { SearchInput, SearchResult, SourceResult, SseEvent, Stay, TraceEvent } from "../types";
import { runAirbnbAgent } from "./airbnbAgent";
import { runBookingAgent } from "./bookingAgent";
import { compareParams, plural, searchSchema, type AgentRun } from "./subagent";

type Source = "booking" | "airbnb";
export type Emit = (event: SseEvent) => void;
export type OrchestratorOptions = { failSource?: Source };

const SOURCES: Source[] = ["booking", "airbnb"];
const MAX_STAYS = 6;
const MAX_REASON_CHARS = 90;

const SYSTEM =
  "You coordinate two subagents. Call both tools in the same turn. " +
  "Later, when you are given the ranked top two stays, reply with ONLY the Best pick reason: " +
  "one line, max 90 characters, comparing the price and rating of #1 with #2. " +
  'Example: "Only ₹350 more than the cheapest, but rated 9.2 vs 7.4." No quotes, no extra text.';

const TOOL_FOR: Record<Source, string> = { booking: "call_booking_agent", airbnb: "call_airbnb_agent" };
const SOURCE_FOR: Record<string, Source> = { call_booking_agent: "booking", call_airbnb_agent: "airbnb" };

// Exactly 2 tools: one per subagent.
const TOOLS: Anthropic.Tool[] = [
  { name: TOOL_FOR.booking, description: "Run the Booking.com subagent for this search.", input_schema: searchSchema },
  { name: TOOL_FOR.airbnb, description: "Run the Airbnb subagent for this search.", input_schema: searchSchema },
];

const RUNNERS: Record<Source, (input: SearchInput) => Promise<AgentRun>> = {
  booking: runBookingAgent,
  airbnb: runAirbnbAgent,
};

/** A failed AgentRun with a minimal trace (forced test failures, or a subagent that threw). */
function failedRun(source: Source, error: string, started = Date.now()): AgentRun {
  const now = Date.now();
  const ms = now - started;
  return {
    source,
    status: "failed",
    error,
    ms,
    trace: [
      { t: 0, at: started, agent: source, type: "agent_started", message: `${source} agent started` },
      { t: ms, at: now, agent: source, type: "error", message: `✗ ${error}` },
      { t: ms, at: now, agent: source, type: "agent_finished", message: `${source} agent finished in ${(ms / 1000).toFixed(1)}s` },
    ],
  };
}

/** Code-written reason, used when the model's line is empty or longer than 90 characters. */
export function fallbackReason(best: Stay, runnerUp: Stay): string {
  const diff = best.totalPrice - runnerUp.totalPrice;
  const ratings = `rated ${best.rating.toFixed(1)} vs ${runnerUp.rating.toFixed(1)}`;
  if (diff > 0) return `Only ${formatINR(diff)} more than the runner-up, but ${ratings}.`;
  if (diff < 0) return `${formatINR(-diff)} cheaper than the runner-up, ${ratings}.`;
  return `Same price as the runner-up, ${ratings}.`;
}

function cleanReason(text: string): string {
  const line = text.split("\n").find((l) => l.trim()) ?? "";
  return line.trim().replace(/^["“”']+|["“”']+$/g, "").trim();
}

const describe = (s: Stay) =>
  `${s.name} (${s.source}): ${formatINR(s.totalPrice)} total, rated ${s.rating.toFixed(1)}/10`;

function summary(run: AgentRun): { content: string; isError: boolean } {
  if (run.status === "failed") return { content: `Subagent failed: ${run.error}`, isError: true };
  return {
    isError: false,
    content: JSON.stringify({
      count: run.stays.length,
      stays: run.stays.map((s) => ({ name: s.name, totalPrice: s.totalPrice, rating: s.rating })),
    }),
  };
}

/**
 * The main agent. One Claude call decides to call both subagent tools; our code runs the subagents
 * in parallel; code filters/ranks (rank()); the model only writes the Best pick reason.
 */
export async function runOrchestrator(
  input: SearchInput,
  emit: Emit,
  options: OrchestratorOptions = {},
): Promise<SearchResult> {
  const started = Date.now();
  const orchTrace: TraceEvent[] = [];
  const log = (type: TraceEvent["type"], message: string) =>
    orchTrace.push({ t: Date.now() - started, at: Date.now(), agent: "orchestrator", type, message });

  log("agent_started", "orchestrator started");
  const client = getAnthropic(); // throws a clear error if the key/model is missing
  const model = getModel();

  // 1. The model decides which subagents to call.
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Find the best stays for this search: ${JSON.stringify(input)}` },
  ];
  let toolUses: Anthropic.ToolUseBlock[] = [];
  let modelAnswered = false;
  try {
    const res = await client.messages.create({ model, max_tokens: 512, system: SYSTEM, tools: TOOLS, messages });
    messages.push({ role: "assistant", content: res.content });
    modelAnswered = true;
    toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name in SOURCE_FOR);
  } catch (err) {
    log("warning", `orchestrator model call failed (${err instanceof Error ? err.message : String(err)}); running both subagents in code`);
  }

  const requested = [...new Set(toolUses.map((u) => SOURCE_FOR[u.name]))];
  if (requested.length > 0) log("tool_called", `→ model called ${requested.map((s) => TOOL_FOR[s]).join(", ")} in one turn`);
  for (const use of toolUses) {
    // Same rule as Step 3: subagent input is always the user's SearchInput.
    const { asked, differs } = compareParams(input, use.input);
    if (differs.length > 0) {
      const detail = differs.map((k) => `${k}: ${JSON.stringify(asked[k])} → ${JSON.stringify(input[k])}`).join("; ");
      log("warning", `params corrected in ${use.name} (${detail})`);
    }
  }
  const missing = SOURCES.filter((s) => !requested.includes(s));
  if (missing.length > 0) log("warning", `model did not call ${missing.map((s) => TOOL_FOR[s]).join(", ")}; calling in code`);

  // 2. Both subagents run IN PARALLEL. Events are emitted as each one actually starts and finishes.
  const runSource = async (source: Source): Promise<AgentRun> => {
    emit({ type: "source_started", source });
    const t0 = Date.now();
    const run =
      options.failSource === source
        ? failedRun(source, "forced failure (test)", t0)
        : await RUNNERS[source](input).catch((err) => failedRun(source, err instanceof Error ? err.message : String(err), t0));
    emit(
      run.status === "ok"
        ? { type: "source_done", source, count: run.stays.length }
        : { type: "source_failed", source, error: run.error },
    );
    return run;
  };
  const settled = await Promise.allSettled(SOURCES.map(runSource));
  const runs = settled.map((r, i) =>
    r.status === "fulfilled" ? r.value : failedRun(SOURCES[i], r.reason instanceof Error ? r.reason.message : String(r.reason)),
  );

  // 3. Code (not the model) combines and ranks.
  emit({ type: "ranking_started" });
  const ranked = rank(runs.flatMap((r) => (r.status === "ok" ? r.stays : []))).slice(0, MAX_STAYS);
  log("tool_returned", `rank() ordered ${plural(ranked.length, "stay")} (code)`);

  // 4. The model writes the Best pick reason only (needs a #1 and a #2).
  let bestPickReason: string | null = null;
  if (ranked.length >= 2) {
    const [best, runnerUp] = ranked;
    const text = `Code ranked the combined stays. #1: ${describe(best)}. #2: ${describe(runnerUp)}. Write the Best pick reason now.`;
    const results: Anthropic.ToolResultBlockParam[] = toolUses.map((u) => {
      const { content, isError } = summary(runs[SOURCES.indexOf(SOURCE_FOR[u.name])]);
      return { type: "tool_result", tool_use_id: u.id, content, is_error: isError };
    });
    // Return the subagent results to the model as tool_results, plus the ranked top two.
    const reasonMessages: Anthropic.MessageParam[] =
      modelAnswered && toolUses.length > 0
        ? [...messages, { role: "user", content: [...results, { type: "text", text }] }]
        : [{ role: "user", content: text }];
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 200,
        system: SYSTEM,
        tools: TOOLS,
        tool_choice: { type: "none" },
        messages: reasonMessages,
      });
      const line = cleanReason(res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n"));
      if (line && line.length <= MAX_REASON_CHARS) {
        bestPickReason = line;
        log("tool_returned", `best pick reason written by the model (${line.length} chars)`);
      } else {
        bestPickReason = fallbackReason(best, runnerUp);
        log("warning", `model reason ${line ? `too long (${line.length} chars)` : "empty"}; used code-written line`);
      }
    } catch (err) {
      bestPickReason = fallbackReason(best, runnerUp);
      log("warning", `reason call failed (${err instanceof Error ? err.message : String(err)}); used code-written line`);
    }
  } else {
    log("warning", ranked.length === 1 ? "only 1 stay: no Best pick reason" : "no stays: no Best pick");
  }

  const ms = Date.now() - started;
  log("agent_finished", `orchestrator finished in ${(ms / 1000).toFixed(1)}s`);

  // 5. Merge every agent's trace in time order, tagged by agent.
  const trace = [...orchTrace, ...runs.flatMap((r) => r.trace)]
    .sort((a, b) => a.at - b.at)
    .map((e) => ({ ...e, t: e.at - started }));
  const sources: SourceResult[] = runs.map((r) =>
    r.status === "ok"
      ? { source: r.source, status: "ok", stays: r.stays, ms: r.ms }
      : { source: r.source, status: "failed", error: r.error, ms: r.ms },
  );

  const result: SearchResult = { stays: ranked, bestPickReason, sources, trace };
  emit({ type: "result", result });
  return result;
}
