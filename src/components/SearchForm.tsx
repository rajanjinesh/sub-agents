"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { addDays, formatDate, nights, todayISO } from "@/lib/format";
import type { SearchInput } from "@/lib/types";
import { validateSearchInput, type SearchErrors } from "@/lib/validate";
import { Field, inputClass } from "./Field";
import { NumberField } from "./NumberField";

const subscribeNoop = () => () => {};

export function SearchForm() {
  const router = useRouter();
  // "" on the server/prerender, the visitor's local date on the client.
  const today = useSyncExternalStore(subscribeNoop, todayISO, () => "");
  const [destination, setDestination] = useState("");
  const [pickedCheckIn, setCheckIn] = useState<string | null>(null);
  const [pickedCheckOut, setCheckOut] = useState<string | null>(null);
  const checkIn = pickedCheckIn ?? today;
  const checkOut = pickedCheckOut ?? (today ? addDays(today, 1) : "");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [ages, setAges] = useState<string[]>([]);
  const [errors, setErrors] = useState<SearchErrors>({});
  const [searching, setSearching] = useState(false);

  const n = nights(checkIn, checkOut);

  function changeChildren(value: number) {
    setChildren(value);
    const count = Number.isInteger(value) && value > 0 ? Math.min(value, 10) : 0;
    setAges((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ""));
  }

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
    const params = new URLSearchParams({
      destination: input.destination,
      checkIn,
      checkOut,
      adults: String(adults),
      children: String(children),
      childAges: input.childAges.join(","),
    });
    router.push(`/results?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Destination" htmlFor="destination" error={errors.destination}>
        <input
          id="destination"
          type="text"
          placeholder="e.g. Goa"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
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
            onChange={(e) => setCheckIn(e.target.value)}
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
            onChange={(e) => setCheckOut(e.target.value)}
            className={inputClass}
          />
          <span className="text-xs leading-4 text-muted">{checkOut ? formatDate(checkOut) : ""}</span>
        </Field>
      </div>

      <p className="text-sm leading-5 text-muted">{n === 1 ? "1 night" : `${n} nights`}</p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField id="adults" label="Adults" min={1} value={adults} onChange={setAdults} error={errors.adults} />
        <NumberField
          id="children"
          label="Children"
          min={0}
          value={children}
          onChange={changeChildren}
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
                  onChange={(e) => setAges((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))}
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
