import { nights } from "../format";
import { isSharedOrHostel } from "../rules";
import type { SearchInput, Stay } from "../types";
import { hasdataGet } from "./http";

/** Raw call: GET /scrape/booking/search. 1 room, INR (the currency enum is lowercase). */
export function fetchBookingRaw(input: SearchInput): Promise<unknown> {
  const params: Record<string, string> = {
    keyword: input.destination,
    checkInDate: input.checkIn,
    checkOutDate: input.checkOut,
    rooms: "1",
    adults: String(input.adults),
    children: String(input.children),
    currency: "inr",
  };
  if (input.children > 0) params.childrenAges = input.childAges.join(",");
  return hasdataGet("/scrape/booking/search", params);
}

type BookingResult = {
  title?: string;
  url?: string;
  room?: string;
  bedTypes?: string[];
  price?: { pricePerStayParsed?: number; excludedChargesParsed?: number; currency?: string };
  reviews?: { score?: number | null; count?: number | null };
};

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/**
 * Raw Booking response → Stay[]. Total = pricePerStayParsed + excludedChargesParsed
 * (taxes & fees). Rating = reviews.score (/10), not the star class.
 * Drops listings with no parseable price, no rating, non-INR price, or a hostel/dorm/shared room.
 */
export function normalizeBooking(raw: unknown): Stay[] {
  const root = raw as { searchInformation?: { checkInDate?: string; checkOutDate?: string }; results?: BookingResult[] };
  const results = Array.isArray(root?.results) ? root.results : [];
  const n = Math.max(1, nights(root.searchInformation?.checkInDate ?? "", root.searchInformation?.checkOutDate ?? ""));

  const stays: Stay[] = [];
  for (const r of results) {
    const base = r.price?.pricePerStayParsed;
    const score = r.reviews?.score;
    if (!isNum(base) || base <= 0 || r.price?.currency !== "INR") continue;
    if (!isNum(score) || !r.title || !r.url) continue;
    if (isSharedOrHostel(`${r.title} ${r.room ?? ""} ${(r.bedTypes ?? []).join(" ")}`)) continue;

    const extra = r.price?.excludedChargesParsed;
    const totalPrice = Math.round(base + (isNum(extra) ? extra : 0));
    stays.push({
      source: "booking",
      name: r.title,
      totalPrice,
      pricePerNight: Math.round(totalPrice / n),
      currency: "INR",
      rating: score,
      reviewCount: isNum(r.reviews?.count) ? r.reviews.count : null,
      url: r.url,
      feesMayBeExtra: false,
    });
  }
  return stays;
}
