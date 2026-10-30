import type { SearchInput } from "./types";

/** SearchInput → URL query (used for /results and for "← New search", which keeps the inputs). */
export function toSearchParams(input: SearchInput): URLSearchParams {
  return new URLSearchParams({
    destination: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: String(input.adults),
    children: String(input.children),
    childAges: input.childAges.join(","),
  });
}

/** Lenient parse of the query back into a SearchInput. Bad numbers become NaN; validation decides. */
export function parseSearchParams(get: (key: string) => string | undefined | null): SearchInput {
  const num = (key: string) => {
    const v = get(key);
    return v === undefined || v === null || v.trim() === "" ? NaN : Number(v);
  };
  const ages = (get("childAges") ?? "").split(",").filter((a) => a.trim() !== "").map(Number);
  return {
    destination: (get("destination") ?? "").trim(),
    checkIn: get("checkIn") ?? "",
    checkOut: get("checkOut") ?? "",
    adults: num("adults"),
    children: num("children"),
    childAges: ages,
  };
}
