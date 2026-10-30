import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchInput, Stay } from "../types";

const create = vi.fn();
// A plain (non-mock) failing client: vitest flags vi.fn()s that return rejections.
let failWith: Error | null = null;
vi.mock("../anthropic", () => ({
  getAnthropic: () => ({
    messages: {
      create: async (...args: unknown[]) => {
        if (failWith) throw failWith;
        return create(...args);
      },
    },
  }),
  getModel: () => "test-model",
}));

import { runSubagent, type SubagentConfig } from "./subagent";

const input: SearchInput = { destination: "Goa", checkIn: "2099-01-01", checkOut: "2099-01-02", adults: 2, children: 1, childAges: [5] };
const stay: Stay = {
  source: "booking",
  name: "Real Hotel",
  totalPrice: 5000,
  pricePerNight: 5000,
  currency: "INR",
  rating: 8,
  reviewCount: 3,
  url: "https://x",
  feesMayBeExtra: false,
};
const cfg = (execute: SubagentConfig["execute"]): SubagentConfig => ({
  source: "booking",
  system: "test",
  toolName: "search_booking",
  toolDescription: "test",
  execute,
});
const toolUse = { type: "tool_use", id: "t1", name: "search_booking", input };

beforeEach(() => {
  create.mockReset();
  failWith = null;
});

describe("runSubagent", () => {
  it("returns the stays from our tool code, not the model's text", async () => {
    create
      .mockResolvedValueOnce({ content: [toolUse] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "I found Fake Hotel for ₹1." }] });
    const run = await runSubagent(cfg(async () => [stay]), input);
    expect(run.status).toBe("ok");
    if (run.status === "ok") expect(run.stays).toEqual([stay]);
    expect(run.trace.map((e) => e.type)).toEqual(["agent_started", "tool_called", "tool_returned", "agent_finished"]);
    expect(create.mock.calls[0][0].tools).toHaveLength(1);
  });

  it("fails (does not throw) when the model never calls the tool", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "no" }] });
    const run = await runSubagent(cfg(async () => [stay]), input);
    expect(run.status).toBe("failed");
  });

  it("turns a tool error into a failed result", async () => {
    create.mockResolvedValueOnce({ content: [toolUse] });
    const run = await runSubagent(cfg(async () => Promise.reject(new Error("HasData down"))), input);
    expect(run).toMatchObject({ status: "failed", error: "HasData down" });
  });

  it("turns an API error into a failed result", async () => {
    failWith = new Error("401");
    const run = await runSubagent(cfg(async () => [stay]), input);
    expect(run).toMatchObject({ status: "failed", error: "401" });
  });

  it("refuses a second tool call", async () => {
    create
      .mockResolvedValueOnce({ content: [toolUse, { ...toolUse, id: "t2" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "done" }] });
    const execute = vi.fn(async () => [stay]);
    const run = await runSubagent(cfg(execute), input);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(run.status).toBe("ok");
  });
});
