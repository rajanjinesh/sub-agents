import { NextResponse, type NextRequest } from "next/server";
import { getAnthropic, getModel } from "@/lib/anthropic";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import type { SearchInput, SearchResult, SseEvent } from "@/lib/types";
import { validateSearchInput } from "@/lib/validate";

// Node runtime is the default here (`export const runtime` is not allowed with cacheComponents).
export const maxDuration = 60;

function parseBody(body: unknown): SearchInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    destination: typeof b.destination === "string" ? b.destination.trim() : "",
    checkIn: typeof b.checkIn === "string" ? b.checkIn : "",
    checkOut: typeof b.checkOut === "string" ? b.checkOut : "",
    adults: Number(b.adults),
    children: Number(b.children),
    childAges: Array.isArray(b.childAges) ? b.childAges.map(Number) : [],
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const input = parseBody(body);
  const errors = validateSearchInput(input);
  if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });

  // Fail fast, before streaming, if the Anthropic key or model is missing.
  try {
    getAnthropic();
    getModel();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server is not configured" }, { status: 500 });
  }

  // Non-production test hooks (to see every UI state in fixture mode):
  // DEBUG_FAIL_SOURCE / DEBUG_EMPTY_SOURCE = booking | airbnb | both.
  const hook = (value: string | undefined) =>
    process.env.NODE_ENV !== "production" && (value === "booking" || value === "airbnb" || value === "both") ? value : undefined;
  const failSource = hook(process.env.DEBUG_FAIL_SOURCE);
  const emptySource = hook(process.env.DEBUG_EMPTY_SOURCE);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SseEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          // client disconnected: nothing to do
        }
      };
      try {
        await runOrchestrator(input, emit, { failSource, emptySource });
      } catch (err) {
        // Should not happen (the orchestrator turns failures into results), but never leave the stream hanging.
        const error = err instanceof Error ? err.message : String(err);
        const now = Date.now();
        const result: SearchResult = {
          stays: [],
          bestPickReason: null,
          sources: [
            { source: "booking", status: "failed", error, ms: 0 },
            { source: "airbnb", status: "failed", error, ms: 0 },
          ],
          trace: [{ t: 0, at: now, agent: "orchestrator", type: "error", message: `✗ ${error}` }],
        };
        emit({ type: "result", result });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
