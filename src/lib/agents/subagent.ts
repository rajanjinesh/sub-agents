import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, getModel } from "../anthropic";
import type { SearchInput, SourceResult, Stay, TraceEvent } from "../types";
import { validateSearchInput } from "../validate";

const MAX_TURNS = 3;

export type SubagentConfig = {
  source: "booking" | "airbnb";
  system: string;
  toolName: string;
  toolDescription: string;
  /** Our code: fetch → normalize → rules. The stays come from here, never from the model's text. */
  execute: (input: SearchInput) => Promise<Stay[]>;
};

export type AgentRun = SourceResult & { trace: TraceEvent[] };

const searchSchema: Anthropic.Tool["input_schema"] = {
  type: "object",
  properties: {
    destination: { type: "string", description: "City or region, e.g. Goa" },
    checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD" },
    checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD" },
    adults: { type: "integer", minimum: 1 },
    children: { type: "integer", minimum: 0 },
    childAges: { type: "array", items: { type: "integer", minimum: 0, maximum: 17 }, description: "One age per child" },
  },
  required: ["destination", "checkIn", "checkOut", "adults", "children", "childAges"],
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One subagent = one Claude Messages API conversation with its own system prompt and exactly one tool. */
export async function runSubagent(cfg: SubagentConfig, input: SearchInput): Promise<AgentRun> {
  const started = Date.now();
  const trace: TraceEvent[] = [];
  const log = (type: TraceEvent["type"], message: string) =>
    trace.push({ t: Date.now() - started, agent: cfg.source, type, message });
  const finish = () => {
    const ms = Date.now() - started;
    log("agent_finished", `${cfg.source} agent finished in ${(ms / 1000).toFixed(1)}s`);
    return ms;
  };

  log("agent_started", `${cfg.source} agent started`);

  try {
    const client = getAnthropic();
    const tool: Anthropic.Tool = { name: cfg.toolName, description: cfg.toolDescription, input_schema: searchSchema };
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: `Find stays for this search: ${JSON.stringify(input)}` },
    ];
    let stays: Stay[] | null = null;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await client.messages.create({
        model: getModel(),
        max_tokens: 512,
        system: cfg.system,
        tools: [tool],
        messages,
      });
      messages.push({ role: "assistant", content: res.content });

      const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) break; // the model's closing line; we ignore its text for data

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        if (stays !== null) {
          log("warning", `${cfg.toolName} called more than once; extra call refused`);
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: "Already searched. Just report the result." });
          continue;
        }
        const p = use.input as Partial<SearchInput>;
        const asked: SearchInput = {
          destination: String(p.destination ?? ""),
          checkIn: String(p.checkIn ?? ""),
          checkOut: String(p.checkOut ?? ""),
          adults: Number(p.adults),
          children: Number(p.children),
          childAges: Array.isArray(p.childAges) ? p.childAges.map(Number) : [],
        };
        // The user's SearchInput is the source of truth: the model's params are only checked against it.
        const differs = (Object.keys(input) as (keyof SearchInput)[]).filter(
          (k) => JSON.stringify(asked[k]) !== JSON.stringify(input[k]),
        );
        const params: SearchInput = { ...input, childAges: [...input.childAges] };
        log(
          "tool_called",
          `→ called ${cfg.toolName} (${params.destination}, ${params.checkIn} → ${params.checkOut}, ${plural(params.adults, "adult")}, ${plural(params.children, "child").replace("childs", "children")})`,
        );
        if (differs.length > 0) {
          const detail = differs.map((k) => `${k}: ${JSON.stringify(asked[k])} → ${JSON.stringify(input[k])}`).join("; ");
          log("warning", `params corrected (${detail})`);
        }
        const invalid = Object.values(validateSearchInput(params));
        if (invalid.length > 0) {
          log("warning", `tool params rejected: ${invalid.join("; ")}`);
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: `Invalid search params: ${invalid.join("; ")}` });
          continue;
        }
        stays = await cfg.execute(params);
        log("tool_returned", `← tool returned ${plural(stays.length, "stay")}`);
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify({
            count: stays.length,
            stays: stays.map((s) => ({ name: s.name, totalPrice: s.totalPrice, rating: s.rating })),
          }),
        });
      }
      messages.push({ role: "user", content: results });
    }

    if (stays === null) throw new Error(`${cfg.source} agent never got a result from ${cfg.toolName}`);
    return { source: cfg.source, status: "ok", stays, ms: finish(), trace };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log("error", `✗ ${error}`);
    return { source: cfg.source, status: "failed", error, ms: finish(), trace };
  }
}
