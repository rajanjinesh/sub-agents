import { NextResponse, type NextRequest } from "next/server";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { addDays, todayISO } from "@/lib/format";
import type { SearchInput, SseEvent } from "@/lib/types";

export const maxDuration = 60;

// Dev-only: one full orchestrator run on a sample search, shown as JSON for learning.
// ?fail=booking|airbnb forces that subagent to fail (to show the partial state).
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });

  const failParam = req.nextUrl.searchParams.get("fail");
  const failSource = failParam === "booking" || failParam === "airbnb" ? failParam : undefined;

  const checkIn = addDays(todayISO(), 14);
  const input: SearchInput = {
    destination: "Goa",
    checkIn,
    checkOut: addDays(checkIn, 1),
    adults: 2,
    children: 1,
    childAges: [5],
  };

  const t0 = Date.now();
  const events: (SseEvent & { t: number })[] = [];
  try {
    const result = await runOrchestrator(input, (e) => events.push({ ...e, t: Date.now() - t0 }), { failSource });
    const lines = result.trace.map((e) => `+${(e.t / 1000).toFixed(1)}s [${e.agent}] ${e.message}`);
    return NextResponse.json({ events, result, lines });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), events }, { status: 500 });
  }
}
