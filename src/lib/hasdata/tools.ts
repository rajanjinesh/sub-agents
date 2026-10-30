import { readFile } from "node:fs/promises";
import path from "node:path";
import { fixturesEnabled } from "../config";
import { applyRules } from "../rules";
import type { SearchInput, Stay } from "../types";
import { fetchAirbnbRaw, normalizeAirbnb } from "./airbnb";
import { fetchBookingRaw, normalizeBooking } from "./booking";

async function readFixture(source: "booking" | "airbnb"): Promise<unknown> {
  return JSON.parse(await readFile(path.join(process.cwd(), "fixtures", `${source}-raw.json`), "utf8"));
}

/** The code behind the search_booking tool: fetch (or fixture) → normalize → product rules → top 3. */
export async function searchBooking(input: SearchInput): Promise<Stay[]> {
  const raw = fixturesEnabled() ? await readFixture("booking") : await fetchBookingRaw(input);
  return applyRules(normalizeBooking(raw));
}

/** The code behind the search_airbnb tool. */
export async function searchAirbnb(input: SearchInput): Promise<Stay[]> {
  const raw = fixturesEnabled() ? await readFixture("airbnb") : await fetchAirbnbRaw(input);
  return applyRules(normalizeAirbnb(raw));
}
