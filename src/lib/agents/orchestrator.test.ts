import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchInput, SseEvent, Stay } from "../types";

const create = vi.fn();
let failFirstModelCall = false;
let modelCalls = 0;
vi.mock("../anthropic", () => ({
  getAnthropic: () => ({
    messages: {
      // plain async wrapper: vitest flags vi.fn()s that return rejections
      create: async (...args: unknown[]) => {
        modelCalls++;
        if (failFirstModelCall && modelCalls === 1) throw new Error("model down");
        return create(...args);
      },
    },
  }),
  getModel: () => "test-model",
}));

const runBooking = vi.fn();
const runAirbnb = vi.fn();
vi.mock("./bookingAgent", () => ({ runBookingAgent: (i: SearchInput) => runBooking(i) }));
vi.mock("./airbnbAgent", () => ({ runAirbnbAgent: (i: SearchInput) => runAirbnb(i) }));

import { fallbackReason, runOrchestrator } from "./orchestrator";
import type { AgentRun } from "./subagent";

const input: SearchInput = { destination: "Goa", checkIn: "2099-01-01", checkOut: "2099-01-02", adults: 2, children: 1, childAges: [5] };

const stay = (source: Stay["source"], name: string, totalPrice: number, rating: number): Stay => ({
  source,
  name,
  totalPrice,
  pricePerNight: totalPrice,
  currency: "INR",
  rating,
  reviewCount: null,
  url: "https://x",
  feesMayBeExtra: source === "airbnb",
});

const ok = (source: Stay["source"], stays: Stay[]): AgentRun => ({
  source,
  status: "ok",
  stays,
  ms: 5,
  trace: [
    { t: 0, at: Date.now(), agent: source, type: "agent_started", message: `${source} agent started` },
    { t: 5, at: Date.now() + 1, agent: source, type: "agent_finished", message: `${source} agent finished in 0.0s` },
  ],
});
const bad = (source: Stay["source"], error: string): AgentRun => ({ source, status: "failed", error, ms: 5, trace: [] });

const bothTools = {
  content: [
    { type: "tool_use", id: "tb", name: "call_booking_agent", input },
    { type: "tool_use", id: "ta", name: "call_airbnb_agent", input },
  ],
};
const reply = (text: string) => ({ content: [{ type: "text", text }] });

const bookingStays = [stay("booking", "B1", 4000, 8.5), stay("booking", "B2", 5000, 7.5)];
const airbnbStays = [stay("airbnb", "A1", 3000, 7.2), stay("airbnb", "A2", 6000, 9)];

function collect() {
  const events: SseEvent[] = [];
  return { events, emit: (e: SseEvent) => events.push(e) };
}

beforeEach(() => {
  create.mockReset();
  runBooking.mockReset();
  runAirbnb.mockReset();
  failFirstModelCall = false;
  modelCalls = 0;
});

describe("runOrchestrator", () => {
  it("runs both subagents in parallel, ranks in code, and the model writes only the reason", async () => {
    create.mockResolvedValueOnce(bothTools).mockResolvedValueOnce(reply("Cheapest and still rated 7.2."));
    let releaseBooking!: () => void;
    let releaseAirbnb!: () => void;
    runBooking.mockImplementation(() => new Promise((r) => (releaseBooking = () => r(ok("booking", bookingStays)))));
    runAirbnb.mockImplementation(() => new Promise((r) => (releaseAirbnb = () => r(ok("airbnb", airbnbStays)))));

    const { events, emit } = collect();
    const promise = runOrchestrator(input, emit);

    // both started while neither has finished → they run at the same time
    await vi.waitFor(() => expect(events.filter((e) => e.type === "source_started")).toHaveLength(2));
    expect(events.some((e) => e.type === "source_done")).toBe(false);

    releaseAirbnb();
    await vi.waitFor(() => expect(events.some((e) => e.type === "source_done")).toBe(true));
    releaseBooking();
    const result = await promise;

    expect(events.map((e) => e.type)).toEqual([
      "source_started",
      "source_started",
      "source_done",
      "source_done",
      "ranking_started",
      "result",
    ]);
    // code ranked: A1 (3000), B1 (4000), B2 (5000), A2 (6000)... rank() swaps A2/B2: 6000 is >10% pricier → no swap
    expect(result.stays.map((s) => s.name)).toEqual(["A1", "B1", "B2", "A2"]);
    expect(result.bestPickReason).toBe("Cheapest and still rated 7.2.");
    expect(result.sources.map((s) => s.status)).toEqual(["ok", "ok"]);

    // the 2nd model call got the subagent results back as tool_results
    const second = create.mock.calls[1][0];
    const lastUser = second.messages.at(-1);
    expect(lastUser.content.filter((b: { type: string }) => b.type === "tool_result")).toHaveLength(2);
    expect(create.mock.calls[0][0].tools.map((t: { name: string }) => t.name)).toEqual(["call_booking_agent", "call_airbnb_agent"]);
  });

  it("calls the other subagent in code, with a warning, if the model calls only one", async () => {
    create.mockResolvedValueOnce({ content: [bothTools.content[0]] }).mockResolvedValueOnce(reply("Fine."));
    runBooking.mockResolvedValue(ok("booking", bookingStays));
    runAirbnb.mockResolvedValue(ok("airbnb", airbnbStays));
    const { emit } = collect();
    const result = await runOrchestrator(input, emit);
    expect(runAirbnb).toHaveBeenCalledTimes(1);
    expect(result.trace.some((e) => e.type === "warning" && e.message.includes("call_airbnb_agent"))).toBe(true);
  });

  it("uses the user's SearchInput for subagents and warns when the model's params differ", async () => {
    create
      .mockResolvedValueOnce({ content: [{ ...bothTools.content[0], input: { ...input, destination: "Paris" } }, bothTools.content[1]] })
      .mockResolvedValueOnce(reply("ok"));
    runBooking.mockResolvedValue(ok("booking", bookingStays));
    runAirbnb.mockResolvedValue(ok("airbnb", airbnbStays));
    const result = await runOrchestrator(input, collect().emit);
    expect(runBooking).toHaveBeenCalledWith(input);
    expect(result.trace.some((e) => e.message.includes("params corrected") && e.message.includes("Paris"))).toBe(true);
  });

  it("one subagent failing → partial result with the other's stays", async () => {
    create.mockResolvedValueOnce(bothTools).mockResolvedValueOnce(reply("Best of Booking."));
    runBooking.mockResolvedValue(ok("booking", bookingStays));
    const { events, emit } = collect();
    const result = await runOrchestrator(input, emit, { failSource: "airbnb" });
    expect(runAirbnb).not.toHaveBeenCalled();
    expect(events.some((e) => e.type === "source_failed" && e.source === "airbnb")).toBe(true);
    expect(result.stays.map((s) => s.name)).toEqual(["B1", "B2"]);
    expect(result.sources.find((s) => s.source === "airbnb")?.status).toBe("failed");
  });

  it("a subagent that throws becomes a failed source, not a crash", async () => {
    create.mockResolvedValueOnce(bothTools).mockResolvedValueOnce(reply("ok"));
    runBooking.mockImplementation(() => {
      throw new Error("boom");
    });
    runAirbnb.mockResolvedValue(ok("airbnb", airbnbStays));
    const result = await runOrchestrator(input, collect().emit);
    expect(result.sources.find((s) => s.source === "booking")).toMatchObject({ status: "failed", error: "boom" });
    expect(result.stays.length).toBe(2);
  });

  it("both failing → empty stays, no reason, no second model call", async () => {
    create.mockResolvedValueOnce(bothTools);
    runBooking.mockResolvedValue(bad("booking", "x"));
    runAirbnb.mockResolvedValue(bad("airbnb", "y"));
    const { events, emit } = collect();
    const result = await runOrchestrator(input, emit);
    expect(result.stays).toEqual([]);
    expect(result.bestPickReason).toBeNull();
    expect(result.sources.every((s) => s.status === "failed")).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(events.at(-1)?.type).toBe("result");
  });

  it("exactly 1 stay → reason is null", async () => {
    create.mockResolvedValueOnce(bothTools);
    runBooking.mockResolvedValue(ok("booking", [bookingStays[0]]));
    runAirbnb.mockResolvedValue(bad("airbnb", "y"));
    const result = await runOrchestrator(input, collect().emit);
    expect(result.stays).toHaveLength(1);
    expect(result.bestPickReason).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("falls back to a code-written reason if the model's line is too long or empty", async () => {
    for (const text of ["x".repeat(91), "   "]) {
      create.mockReset();
      create.mockResolvedValueOnce(bothTools).mockResolvedValueOnce(reply(text));
      runBooking.mockResolvedValue(ok("booking", bookingStays));
      runAirbnb.mockResolvedValue(ok("airbnb", airbnbStays));
      const result = await runOrchestrator(input, collect().emit);
      expect(result.bestPickReason).toBe("₹1,000 cheaper than the runner-up, rated 7.2 vs 8.5.");
      expect(result.trace.some((e) => e.type === "warning" && e.message.includes("code-written"))).toBe(true);
    }
  });

  it("caps the list at 6 stays", async () => {
    const many = (src: Stay["source"]) => [1, 2, 3, 4].map((i) => stay(src, `${src}${i}`, 1000 * i + (src === "airbnb" ? 1 : 0), 8));
    create.mockResolvedValueOnce(bothTools).mockResolvedValueOnce(reply("ok"));
    runBooking.mockResolvedValue(ok("booking", many("booking")));
    runAirbnb.mockResolvedValue(ok("airbnb", many("airbnb")));
    const result = await runOrchestrator(input, collect().emit);
    expect(result.stays).toHaveLength(6);
  });

  it("still runs both subagents if the orchestrator's model call fails", async () => {
    failFirstModelCall = true;
    create.mockResolvedValueOnce(reply("Reason."));
    runBooking.mockResolvedValue(ok("booking", bookingStays));
    runAirbnb.mockResolvedValue(ok("airbnb", airbnbStays));
    const result = await runOrchestrator(input, collect().emit);
    expect(runBooking).toHaveBeenCalledTimes(1);
    expect(runAirbnb).toHaveBeenCalledTimes(1);
    expect(result.trace.some((e) => e.message.includes("model call failed"))).toBe(true);
    expect(result.bestPickReason).toBe("Reason.");
  });

  it("merges all traces in time order, tagged by agent", async () => {
    create.mockResolvedValueOnce(bothTools).mockResolvedValueOnce(reply("ok"));
    runBooking.mockResolvedValue(ok("booking", bookingStays));
    runAirbnb.mockResolvedValue(ok("airbnb", airbnbStays));
    const { trace } = await runOrchestrator(input, collect().emit);
    expect(new Set(trace.map((e) => e.agent))).toEqual(new Set(["orchestrator", "booking", "airbnb"]));
    expect(trace.map((e) => e.t)).toEqual([...trace.map((e) => e.t)].sort((a, b) => a - b));
  });
});

describe("fallbackReason", () => {
  it("pricier best pick", () => {
    expect(fallbackReason(stay("booking", "a", 5350, 9.2), stay("airbnb", "b", 5000, 7.4))).toBe(
      "Only ₹350 more than the runner-up, but rated 9.2 vs 7.4.",
    );
  });
  it("same price", () => {
    expect(fallbackReason(stay("booking", "a", 5000, 9), stay("airbnb", "b", 5000, 8))).toBe("Same price as the runner-up, rated 9.0 vs 8.0.");
  });
});
