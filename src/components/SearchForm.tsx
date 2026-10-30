"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { addDays, formatDate, formatNights, nights, todayISO } from "@/lib/format";
import { parseSearchParams, toSearchParams } from "@/lib/searchParams";
import type { SearchInput } from "@/lib/types";
import { validateSearchInput, type SearchErrors } from "@/lib/validate";
import { Field, inputClass } from "./Field";
import { NumberField } from "./NumberField";

const subscribeNoop = () => () => {};
const readSearch = () => window.location.search;

type Picked = Partial<{
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  ages: string[];
}>;

export function SearchForm() {
  const router = useRouter();
  // "" on the server/prerender, the visitor's local date / URL query on the client.
  const today = useSyncExternalStore(subscribeNoop, todayISO, () => "");
  const search = useSyncExternalStore(subscribeNoop, readSearch, () => "");

  // "← New search" lands here with the previous inputs in the URL: use them as the starting values.
  const params = new URLSearchParams(search);
  const prefill = params.get("destination") !== null ? parseSearchParams((k) => params.get(k)) : null;
  const finite = (n: number | undefined, fallback: number) => (n !== undefined && Number.isFinite(n) ? n : fallback);

  const [picked, setPicked] = useState<Picked>({});
  const set = (patch: Picked) => setPicked((p) => ({ ...p, ...patch }));

  const destination = picked.destination ?? prefill?.destination ?? "";
  const checkIn = picked.checkIn ?? (prefill?.checkIn || today);
  const checkOut = picked.checkOut ?? (prefill?.checkOut || (today ? addDays(today, 1) : ""));
  const adults = picked.adults ?? finite(prefill?.adults, 1);
  const children = picked.children ?? finite(prefill?.children, 0);
  const prefillAges = (prefill?.childAges ?? []).map((a) => (Number.isFinite(a) ? String(a) : ""));
  const count = Number.isInteger(children) && children > 0 ? Math.min(children, 10) : 0;
  const ages = Array.from({ length: count }, (_, i) => (picked.ages ?? prefillAges)[i] ?? "");

  const [errors, setErrors] = useState<SearchErrors>({});
  const [searching, setSearching] = useState(false);
  // Next keeps this page alive behind /results, so clear "Searching…" when we navigate away
  // (otherwise "← New search" would come back to a disabled button).
  useEffect(() => () => setSearching(false), []);

  const n = nights(checkIn, checkOut);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searching) return;
    const input: SearchInput = {
      destination: destination.trim(),
      checkIn,
      checkOut,
      adults,
      children,
      childAges: ages.map((a) => (a === "" ? NaN : Number(a))),
    };
    const found = validateSearchInput(input, today || todayISO());
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSearching(true);
    router.push(`/results?${toSearchParams(input).toString()}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Destination" htmlFor="destination" error={errors.destination}>
        <input
          id="destination"
          type="text"
          placeholder="e.g. Goa"
          value={destination}
          onChange={(e) => set({ destination: e.target.value })}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in" htmlFor="checkIn" error={errors.checkIn}>
          <input
            id="checkIn"
            type="date"
            min={today || undefined}
            value={checkIn}
            onChange={(e) => set({ checkIn: e.target.value })}
            className={inputClass}
          />
          <span className="text-xs leading-4 text-muted">
            {checkIn ? `${formatDate(checkIn)}${checkIn === today ? " (Today)" : ""}` : ""}
          </span>
        </Field>
        <Field label="Check-out" htmlFor="checkOut" error={errors.checkOut}>
          <input
            id="checkOut"
            type="date"
            min={checkIn || today || undefined}
            value={checkOut}
            onChange={(e) => set({ checkOut: e.target.value })}
            className={inputClass}
          />
          <span className="text-xs leading-4 text-muted">{checkOut ? formatDate(checkOut) : ""}</span>
        </Field>
      </div>

      <p className="text-sm leading-5 text-muted">{formatNights(n)}</p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField id="adults" label="Adults" min={1} value={adults} onChange={(v) => set({ adults: v })} error={errors.adults} />
        <NumberField
          id="children"
          label="Children"
          min={0}
          value={children}
          onChange={(v) => set({ children: v, ages })}
          error={errors.children}
        />
      </div>

      {ages.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {ages.map((age, i) => (
              <Field key={i} label={`Child ${i + 1} age`} htmlFor={`age-${i}`}>
                <select
                  id={`age-${i}`}
                  value={age}
                  onChange={(e) => set({ ages: ages.map((a, j) => (j === i ? e.target.value : a)) })}
                  className={`${inputClass} ${age === "" ? "text-placeholder" : ""}`}
                >
                  <option value="">Select age</option>
                  {Array.from({ length: 18 }, (_, a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          {errors.childAges && (
            <p role="alert" className="text-xs leading-4 text-error">
              {errors.childAges}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={searching}
        className="h-10 w-full rounded-ui bg-primary text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {searching ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
