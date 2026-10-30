# CLAUDE.md: Sub-Agents (PRD)

This file is the product spec. It wins on **product behaviour**.
`docs/design-spec-v3.md` wins on **UI, copy, tokens and states**.
If the two conflict, or something is ambiguous, stop and ask. Don't guess.

---

## 1. What we're building
Project name: **Sub-Agents** (folder D:\Projects\Sub-Agents, package name and GitHub repo `sub-agents`).
The on-screen app title is also "Sub-Agents". Do not use the old name "Hotel Finder" anywhere.

A learning prototype that compares stays on Booking.com and Airbnb and shows the best value.
The real goal is to learn **how a main orchestrator agent creates and manages subagents**.
Keep the product simple. Make the agent flow clear and visible.

## 2. User flow
1. Search page: destination, check-in, check-out, adults, children, one age per child.
2. User clicks **Search**. This activates the orchestrator.
3. Loading screen shows both subagents working in parallel (live status per source).
4. Results page shows up to 6 stays (max 3 per source), ranked by value.
   The first card is the ⭐ Best pick, with a one-line reason.

## 3. Agent architecture (core of the exercise)

```
User → POST /api/search (streams progress)
          │
     Orchestrator agent
       ├── call_booking_agent ──► Booking subagent ──► search_booking ──► HasData Booking API
       └── call_airbnb_agent  ──► Airbnb subagent  ──► search_airbnb  ──► HasData Airbnb API
          │
     rank() in code → orchestrator LLM writes Best pick reason → results
```

### Which API key powers what
| Part | Runs on | Key used |
|---|---|---|
| Orchestrator agent | Claude (Anthropic Messages API, tool use) | `ANTHROPIC_API_KEY` |
| Booking subagent | Claude (separate call, own system prompt) | `ANTHROPIC_API_KEY` |
| Airbnb subagent | Claude (separate call, own system prompt) | `ANTHROPIC_API_KEY` |
| `search_booking` / `search_airbnb` tools | HasData REST API | `HASDATA_API_KEY` |
| Rules filter, top 3, `rank()` | Plain TypeScript | none |

- All 3 agents share one Anthropic client (`src/lib/anthropic.ts`) created with
  `ANTHROPIC_API_KEY` and the model from `ANTHROPIC_MODEL`.
- The HasData key is only used inside the two tool functions, never by the agents directly.
- If `ANTHROPIC_API_KEY` is missing, `/api/search` fails fast with a clear error.

### Hard rules
- **1 orchestrator + exactly 2 subagents.** Never add a third.
- Subagents never call each other. Only the orchestrator talks to them.
- The orchestrator calls both subagents **in the same turn, in parallel**.
- Each subagent is a separate Claude call with its own system prompt and exactly one tool.
- **The LLM never filters, sorts or picks results.** Filtering, top-3 selection and `rank()`
  are deterministic code. The orchestrator LLM only writes the Best pick reason.
- If one subagent fails, the other's results still show (partial state).

### Orchestrator
- Input: `SearchInput`.
- Tools: `call_booking_agent`, `call_airbnb_agent`.
- After both return: combine → `rank()` → ask the LLM for the Best pick reason
  (max ~90 characters, compares price and rating with the runner-up, e.g.
  "Only ₹350 more than the cheapest, but rated 9.2 vs 7.4.").

### Booking subagent
- Tool `search_booking` → `GET https://api.hasdata.com/scrape/booking/search`
- Params: `keyword`, `checkInDate`, `checkOutDate`, `rooms=1`, `adults`, `children`,
  `childrenAges` (comma-separated, e.g. `5,8`), currency INR.
- Total price = `pricePerStayParsed` + `excludedChargesParsed` (taxes & fees).
- Rating = `reviews.score` (/10). The top-level `rating` is the star class; don't use it.
- Returns up to 3 `Stay` objects after product rules are applied.

### Airbnb subagent
- Tool `search_airbnb` → `GET https://api.hasdata.com/scrape/airbnb/listing`
- Params: `location`, `checkIn`, `checkOut`, `adults`, `children` (count only; Airbnb
  doesn't accept child ages).
- Prices come back in **USD** with no currency parameter. Decision (simple route): convert
  with one fixed constant `USD_TO_INR` in `src/lib/config.ts`. Airbnb prices are approximate.
- Airbnb has no total field: total = nights × nightly price (from the "N nights x $X"
  breakdown), then × `USD_TO_INR`. `feesMayBeExtra` is always `true` for Airbnb.
- Returns up to 3 `Stay` objects after product rules are applied.

### HasData notes
- Auth header: `x-api-key: HASDATA_API_KEY`.
- Each call costs credits (Airbnb listing = 5 credits). Use saved fixture responses
  for UI work and tests. Only hit the live API when testing the data layer.
- Field mapping for both sources is documented in `docs/hasdata-fields.md` (from real responses).

## 4. Product rules (enforced in code, per source, before top 3)
1. Rating **7.0+ out of 10**. Unrated listings are excluded.
2. Airbnb ratings are converted to /10 (rating × 2, e.g. 4.6 → 9.2).
3. No hostels, dorms or shared rooms.
4. Price = **total stay price incl. taxes and fees**, in **INR**.
   - Airbnb: converted from USD at a fixed rate and may exclude fees, so `feesMayBeExtra: true`
     (the UI shows "Fees may be extra").
5. 1 room only.
6. Skip listings with no parseable price.
7. Take the **3 cheapest** that pass all rules.

## 5. Ranking: `rank()`
"Best" means best value: lower price and higher rating both count.
1. Sort all stays by `totalPrice` ascending. Equal price: higher rating first.
2. Repeat until no swaps happen: for each adjacent pair (A before B), swap if B is
   **at most 10% more expensive** than A **and** rated **at least 1.0 higher**.
3. First item = ⭐ Best pick.

`rank()` must be a pure function with unit tests, including: no swaps, one swap,
chain swaps, ties, a single stay, and an empty list.

## 6. Data shapes
```ts
type SearchInput = {
  destination: string;
  checkIn: string;     // YYYY-MM-DD
  checkOut: string;    // YYYY-MM-DD
  adults: number;      // min 1
  children: number;    // min 0
  childAges: number[]; // length === children, each 0–17
};

type Stay = {
  source: "booking" | "airbnb";
  name: string;
  totalPrice: number;     // INR, incl. taxes & fees
  pricePerNight: number;  // INR
  currency: "INR";
  rating: number;         // /10, already converted
  reviewCount: number | null;
  url: string;
  feesMayBeExtra: boolean; // Airbnb only, else false
};

type SourceResult =
  | { source: "booking" | "airbnb"; status: "ok"; stays: Stay[]; ms: number }
  | { source: "booking" | "airbnb"; status: "failed"; error: string; ms: number };

type SearchResult = {
  stays: Stay[];               // ranked, max 6
  bestPickReason: string | null;
  sources: SourceResult[];
  trace: TraceEvent[];         // for learning/debugging
};
```

## 7. Streaming progress (powers the Loading screen)
`POST /api/search` streams Server-Sent Events so the UI can update each source live:
- `source_started` `{ source }`
- `source_done` `{ source, count }`
- `source_failed` `{ source, error }`
- `ranking_started`
- `result` `{ SearchResult }` (final event)

## 8. States (copy lives in the design spec)
- **OK**: up to 6 cards, Best pick first.
- **Partial**: one source failed. Show the other source's cards plus a muted note.
- **Empty**: both sources returned 0 stays.
- **Error**: both sources failed.
- **1–5 stays**: show what was found; the sub-line uses the real count.

## 9. Validation
- Destination required.
- Check-in can't be in the past. Default = today.
- Check-out must be after check-in. Default = tomorrow.
- Adults ≥ 1. Children ≥ 0. One age (0–17) required per child.
- Validate on the client **and** again in `/api/search`.

## 10. Tech stack & conventions
- Next.js (App Router, TypeScript, `src/` dir), Tailwind, Inter via `next/font`.
- Anthropic Messages API with tool use for all agents. Model from `ANTHROPIC_MODEL`.
- GitHub for source control, Vercel for deploy.
- No database, no auth, no extra pages, filters, maps or photos.
- Currency formatting: `₹4,200` (Indian grouping) via `formatINR`.
- Keep files small and named by role. No new dependencies without a reason.

## 11. Environment
```
ANTHROPIC_API_KEY=   # powers all 3 agents (orchestrator + 2 subagents)
ANTHROPIC_MODEL=     # Claude model ID used by all 3 agents
HASDATA_API_KEY=     # used only by the search_booking / search_airbnb tools
USE_FIXTURES=true    # true = tools return saved fixtures (no HasData credits); false in production
```
- Keys are **server-side only**. Never import them in client components.
- `.env.local` is gitignored. `.env.example` is committed.
- Same vars set in Vercel project settings.

## 12. Folder structure
```
CLAUDE.md
docs/design-spec-v3.md
src/app/page.tsx                  Search page
src/app/results/page.tsx          Loading + Results + states
src/app/api/search/route.ts       Orchestrator entry (SSE)
src/lib/anthropic.ts              shared Anthropic client (ANTHROPIC_API_KEY)
src/lib/agents/orchestrator.ts
src/lib/agents/bookingAgent.ts
src/lib/agents/airbnbAgent.ts
src/lib/hasdata/booking.ts        raw call + normalize
src/lib/hasdata/airbnb.ts         raw call + normalize
src/lib/rules.ts                  product rules filter + top 3
src/lib/rank.ts                   rank() + tests
src/lib/format.ts                 formatINR, formatDate, nights()
src/lib/types.ts
src/components/
fixtures/                         saved HasData responses
```

## 13. Build order (one step at a time; don't build ahead)
| Step | Builds | Purpose | Done = |
|---|---|---|---|
| 0. GitHub repo | git, .gitignore, public `sub-agents` repo, docs pushed | Source control from day one | Repo has docs, no env file |
| 1. Setup + Search page | scaffold, tokens, Screen 1, validation, Vercel connected | Foundation, no agents | Search form works locally and on the Vercel URL |
| 2. Data layer | HasData calls, normalize to `Stay`, `rules.ts`, fixtures | Real data + rules in code; becomes the subagents' tools | `/api/dev/stays?source=…` returns 3 valid stays per source |
| 3. Subagents | Booking + Airbnb Claude subagents, one tool each, `anthropic.ts`, `USE_FIXTURES` | Learn what a subagent is | `/api/dev/agent?source=…` returns 3 stays + trace |
| 4. Orchestrator | parallel subagent calls, `rank()` + tests, Best pick reason, SSE | Learn how a main agent manages subagents | `/api/search` streams events in order and ends with a ranked result |
| 5. UI states | Loading, Results, Best pick card, Partial, Empty, Error, `?debug=1` trace | Make the agents visible | Full app works locally end to end |
| 6. Ship | `USE_FIXTURES=false` on Vercel, README, final checks | Go live with real data | Live URL runs a real search |

From Step 1 on, every step ends with commit + push; Vercel redeploys automatically.

Full prompts for each step: `docs/build-prompts.md`. Run `/step-check` after each step.

At the end of every step: summarize what was built, list anything ambiguous or not matched,
and confirm it runs with `npm run dev`.
