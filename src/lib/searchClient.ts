import { parseSseBuffer } from "./sse";
import type { SearchAction } from "./searchState";
import type { SearchInput } from "./types";

/**
 * POST /api/search and feed each SSE event to onAction as it arrives.
 * fetch + ReadableStream, because EventSource can't POST.
 */
export async function runSearch(input: SearchInput, onAction: (action: SearchAction) => void): Promise<void> {
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok || !res.body) {
      onAction({ type: "fetch_error" });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotResult = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseBuffer(buffer);
      buffer = rest;
      for (const event of events) {
        if (event.type === "result") gotResult = true;
        onAction(event);
      }
    }
    if (!gotResult) onAction({ type: "fetch_error" });
  } catch {
    onAction({ type: "fetch_error" });
  }
}
