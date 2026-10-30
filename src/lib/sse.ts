import type { SseEvent } from "./types";

/** Split a streamed SSE buffer into complete events plus the unfinished remainder. */
export function parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() ?? "";
  const events: SseEvent[] = [];
  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as SseEvent);
    } catch {
      // ignore a malformed block
    }
  }
  return { events, rest };
}
