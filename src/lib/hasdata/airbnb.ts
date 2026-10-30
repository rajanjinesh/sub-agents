import { USD_TO_INR } from "../config";
import { isSharedOrHostel } from "../rules";
import type { SearchInput, Stay } from "../types";
import { hasdataGet } from "./http";

/**
 * Raw call: GET /scrape/airbnb/listing.
 * The endpoint documents no currency param (prices are USD) and no child-age param (count only).
 */
export function fetchAirbnbRaw(input: SearchInput): Promise<unknown> {
  const params: Record<string, string> = {
    location: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: String(input.adults),
    children: String(input.children),
  };
  return hasdataGet("/scrape/airbnb/listing", params);
}

type AirbnbProperty = {
  id?: string;
  url?: string;
  title?: string;
  description?: string;
  rating?: number | null;
  reviews?: number | null;
  price?: { breakdown?: { description?: string; price?: string }[] };
};

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** "1 night x $94.60" / "3 nights x $1,094.60" → { nights, usd } */
function parseNightly(description: string | undefined): { nights: number; usd: number } | null {
  const m = description?.match(/(\d+)\s+nights?\s*x\s*\$([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const usd = Number(m[2].replace(/,/g, ""));
  return n > 0 && usd > 0 ? { nights: n, usd } : null;
}

/** Carry the search dates/guests onto the listing link, taken from HasData's own search URL. */
function listingUrl(rawUrl: string, searchUrl: string | undefined): string {
  try {
    const q = new URL(searchUrl ?? "").searchParams;
    const out = new URL(rawUrl);
    const map = { checkin: "check_in", checkout: "check_out", adults: "adults", children: "children" };
    for (const [from, to] of Object.entries(map)) {
      const v = q.get(from);
      if (v) out.searchParams.set(to, v);
    }
    return out.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Raw Airbnb response → Stay[]. Total = nights × nightly USD (from the price breakdown) × USD_TO_INR.
 * Special-offer discounts are ignored. Rating × 2 → /10. Airbnb totals may exclude fees and are
 * converted at a fixed rate, so feesMayBeExtra is always true.
 * Drops listings with no parseable price, no rating, or a hostel/dorm/shared room.
 */
export function normalizeAirbnb(raw: unknown): Stay[] {
  const root = raw as { requestMetadata?: { url?: string }; properties?: AirbnbProperty[] };
  const props = Array.isArray(root?.properties) ? root.properties : [];

  const stays: Stay[] = [];
  for (const p of props) {
    const nightly = parseNightly(p.price?.breakdown?.[0]?.description);
    if (!nightly || !p.url || !p.title) continue;
    if (!isNum(p.rating) || p.rating <= 0) continue;
    if (isSharedOrHostel(`${p.title} ${p.description ?? ""}`)) continue;

    const totalPrice = Math.round(nightly.nights * nightly.usd * USD_TO_INR);
    stays.push({
      source: "airbnb",
      name: p.description?.trim() ? `${p.title}: ${p.description.trim()}` : p.title,
      totalPrice,
      pricePerNight: Math.round(totalPrice / nightly.nights),
      currency: "INR",
      rating: Math.round(p.rating * 2 * 100) / 100,
      reviewCount: isNum(p.reviews) ? p.reviews : null,
      url: listingUrl(p.url, root.requestMetadata?.url),
      feesMayBeExtra: true,
    });
  }
  return stays;
}
