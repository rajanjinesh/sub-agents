import { NextResponse, type NextRequest } from "next/server";
import { runAirbnbAgent } from "@/lib/agents/airbnbAgent";
import { runBookingAgent } from "@/lib/agents/bookingAgent";
import { addDays, todayISO } from "@/lib/format";
import type { SearchInput } from "@/lib/types";

// Dev-only: runs ONE subagent on a sample search and returns { stays, ms, trace }.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });

  const source = req.nextUrl.searchParams.get("source");
  if (source !== "booking" && source !== "airbnb") {
    return NextResponse.json({ error: "source must be booking or airbnb" }, { status: 400 });
  }

  const checkIn = addDays(todayISO(), 14);
  const input: SearchInput = {
    destination: "Goa",
    checkIn,
    checkOut: addDays(checkIn, 1),
    adults: 2,
    children: 1,
    childAges: [5],
  };

  const run = await (source === "booking" ? runBookingAgent(input) : runAirbnbAgent(input));
  const lines = run.trace.map((e) => e.message);
  return NextResponse.json({ ...run, lines }, { status: run.status === "ok" ? 200 : 502 });
}
