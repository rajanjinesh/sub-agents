import { formatINR, formatRating } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/sources";
import type { Stay } from "@/lib/types";

/** Result card (Screen 3). The first card is the ⭐ Best pick: 2px blue border, light-blue fill, reason line. */
export function StayCard({ stay, best = false, reason = null }: { stay: Stay; best?: boolean; reason?: string | null }) {
  const source = SOURCE_LABEL[stay.source];
  return (
    <article
      className={`flex flex-col gap-2 rounded-ui ${best ? "border-2 border-primary bg-tint-blue p-[15px]" : "border border-border bg-white p-4"}`}
    >
      <div className="flex flex-wrap gap-1.5">
        {best && <span className="pill bg-primary text-white">⭐ Best pick</span>}
        <span className="pill bg-tint-grey text-label">{source}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-words text-base font-bold leading-[22px] text-strong">{stay.name}</h2>
        <div className="shrink-0 text-right">
          <span className="text-lg font-bold leading-[22px] text-strong">{formatINR(stay.totalPrice)}</span>
          <span className="text-xs text-muted"> total stay</span>
          {stay.feesMayBeExtra && <p className="text-xs leading-4 text-muted">Fees may be extra</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-5 text-label">{formatRating(stay.rating)} / 10 rating</p>
        <a
          href={stay.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center rounded-ui bg-primary px-3 text-sm font-medium text-white"
        >
          View on {source}
        </a>
      </div>

      {best && reason && <p className="text-[13px] leading-[18px] text-label">{reason}</p>}
    </article>
  );
}
