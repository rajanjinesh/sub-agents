import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { addDays, todayISO } from "@/lib/format";
import { fetchAirbnbRaw, normalizeAirbnb } from "@/lib/hasdata/airbnb";
import { fetchBookingRaw, normalizeBooking } from "@/lib/hasdata/booking";
import { applyRules } from "@/lib/rules";
import type { SearchInput } from "@/lib/types";

// Dev-only: normalized top 3 per source. Fixtures by default, &live=1 calls HasData (costs credits).
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });

  const q = req.nextUrl.searchParams;
  const source = q.get("source");
  if (source !== "booking" && source !== "airbnb") {
    return NextResponse.json({ error: "source must be booking or airbnb" }, { status: 400 });
  }

  const live = q.get("live") === "1";
  const checkIn = q.get("checkIn") ?? addDays(todayISO(), 14);
  const input: SearchInput = {
    destination: q.get("destination") ?? "Goa",
    checkIn,
    checkOut: q.get("checkOut") ?? addDays(checkIn, 1),
    adults: Number(q.get("adults") ?? 2),
    children: 1,
    childAges: [5],
  };

  try {
    const raw = live
      ? await (source === "booking" ? fetchBookingRaw(input) : fetchAirbnbRaw(input))
      : JSON.parse(await readFile(path.join(process.cwd(), "fixtures", `${source}-raw.json`), "utf8"));
    const all = source === "booking" ? normalizeBooking(raw) : normalizeAirbnb(raw);
    const stays = applyRules(all);
    return NextResponse.json({ source, live, normalizedCount: all.length, count: stays.length, stays });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
