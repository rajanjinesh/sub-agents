import Link from "next/link";
import { formatDateRange, formatGuests, formatNights, nights } from "@/lib/format";
import { toSearchParams } from "@/lib/searchParams";
import type { SearchInput } from "@/lib/types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** False for a hand-edited or broken /results URL: we then skip the summary and the keep-inputs link. */
export function hasUsableInput(input: SearchInput): boolean {
  return (
    input.destination.length > 0 &&
    ISO.test(input.checkIn) &&
    ISO.test(input.checkOut) &&
    Number.isFinite(input.adults) &&
    Number.isFinite(input.children)
  );
}

/** "{destination} · {dates} · {n} night(s) · {guests}" */
export function summaryLine(input: SearchInput): string | null {
  if (!hasUsableInput(input)) return null;
  return [
    input.destination,
    formatDateRange(input.checkIn, input.checkOut),
    formatNights(nights(input.checkIn, input.checkOut)),
    formatGuests(input.adults, input.children),
  ].join(" · ");
}

export function NewSearchLink({ input }: { input: SearchInput }) {
  const href = hasUsableInput(input) ? `/?${toSearchParams(input).toString()}` : "/";
  return (
    <Link href={href} className="text-sm font-medium leading-5 text-primary">
      ← New search
    </Link>
  );
}

/** Results header (Screen 3): title, summary, optional sub-line, "← New search". */
export function ResultsHeader({ input, subLine }: { input: SearchInput; subLine?: string }) {
  const summary = summaryLine(input);
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-[28px] font-bold leading-[34px] text-strong">Best stays for your trip</h1>
      {summary && <p className="text-sm leading-5 text-muted">{summary}</p>}
      {subLine && <p className="text-xs leading-4 text-muted">{subLine}</p>}
      <NewSearchLink input={input} />
    </header>
  );
}
