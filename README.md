# Sub-Agents

Compare stays on **Booking.com** and **Airbnb** and see the best value. It is a learning prototype:
the real goal is to see **how a main orchestrator agent creates and manages subagents**, so the
agent flow is kept simple and made visible in the UI.

- Live: https://sub-agents-three.vercel.app
- Add `?debug=1` to a results URL to see the "Agent activity" timeline (every agent's trace).

## How it works

```
User → POST /api/search (streams progress)
          │
     Orchestrator agent
       ├── call_booking_agent ──► Booking subagent ──► search_booking ──► HasData Booking API
       └── call_airbnb_agent  ──► Airbnb subagent  ──► search_airbnb  ──► HasData Airbnb API
          │
     rank() in code → orchestrator LLM writes Best pick reason → results
```

**1 orchestrator + exactly 2 subagents.** Each one is its own Claude Messages API call with its own
system prompt (all three share one client in `src/lib/anthropic.ts`).

1. **Orchestrator** (`src/lib/agents/orchestrator.ts`). One Claude call with exactly two tools,
   `call_booking_agent` and `call_airbnb_agent`. The model is asked to call both **in the same turn**.
2. **Parallel subagents.** When the model returns its `tool_use` blocks, our code runs both
   subagents at once with `Promise.allSettled`. If the model only calls one, code calls the other and
   logs a warning. The subagents' input is always the user's search, never what the model typed.
   Subagents never call each other; only the orchestrator talks to them.
3. **Subagent** (`bookingAgent.ts`, `airbnbAgent.ts`, shared loop in `subagent.ts`). Each has exactly
   one tool (`search_booking` / `search_airbnb`). The model decides to call it, our code fetches the
   data, and the model replies with one line. The returned stays come from the tool code, never from
   the model's text. The loop is capped at 3 turns.
4. **Where code takes over from the LLM.** The tool functions fetch → normalize → apply the product
   rules (`src/lib/rules.ts`: rating 7.0+/10, no hostels/dorms/shared rooms, total price incl. taxes
   and fees in INR, 3 cheapest per source). Then `rank()` (`src/lib/rank.ts`) orders the combined stays by
   value: cheapest first, but a stay moves up if it is at most 10% pricier and rated at least 1.0 higher.
   **The LLM never filters, sorts or picks results.** It only writes the one-line Best pick reason
   (max ~90 characters, with a code-written fallback).
5. **Partial results.** If one subagent fails, the other's stays still show, with a muted note.
6. **Streaming.** `/api/search` streams Server-Sent Events (`source_started`, `source_done`,
   `source_failed`, `ranking_started`, `result`), which power the live loading screen.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Other scripts: `npm test` (vitest), `npm run lint`, `npm run build`.

### Environment variables (names only; keys stay server-side)

| Name | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | all 3 agents (orchestrator + 2 subagents) |
| `ANTHROPIC_MODEL` | Claude model ID used by all 3 agents |
| `HASDATA_API_KEY` | only the `search_booking` / `search_airbnb` tools |
| `USE_FIXTURES` | `true` = tools return saved fixtures; `false` = live HasData |

Set the same variables in the Vercel project settings, with `USE_FIXTURES=false`.

## Fixture mode vs live mode

- **Fixture mode** (`USE_FIXTURES=true`, the default when unset): the tools read the saved HasData
  responses in `fixtures/`. The agents still call Claude, but no HasData credits are spent.
- **Live mode** (`USE_FIXTURES=false`): the tools call HasData.
- **Credits:** one live search makes one HasData call per source. Per HasData's docs a Booking.com
  search costs **10 credits** and an Airbnb listing search **5 credits**, so **about 15 credits per
  live search**. HasData's API returns no usage figure; check the dashboard for the exact balance.

Airbnb notes: HasData returns Airbnb prices in USD with no currency option, so they are converted at
a fixed rate (`USD_TO_INR` in `src/lib/config.ts`) and are approximate; Airbnb cards show
"Fees may be extra". Airbnb does not accept child ages (count only). Field mapping for both sources
is in `docs/hasdata-fields.md`.

## Dev-only routes (404 in production)

`/api/dev/stays?source=booking|airbnb` (normalized stays), `/api/dev/agent?source=…` (one subagent
+ trace) and `/api/dev/search?fail=booking|airbnb` (one full orchestrator run). In development,
`DEBUG_FAIL_SOURCE` and `DEBUG_EMPTY_SOURCE` (`booking`, `airbnb` or `both`) force the Partial /
Empty / Error states on `/api/search`; they are ignored in production.

## Project layout

```
src/app/page.tsx                Search page
src/app/results/page.tsx        Loading + Results + states
src/app/api/search/route.ts     Orchestrator entry (SSE)
src/lib/agents/                 orchestrator, bookingAgent, airbnbAgent, shared subagent loop
src/lib/hasdata/                raw HasData calls + normalize, and the search tools
src/lib/rules.ts, rank.ts       product rules and ranking (plain TypeScript, unit-tested)
src/lib/anthropic.ts            the one shared Anthropic client
fixtures/                       saved HasData responses
docs/                           product spec (CLAUDE.md), design spec, field map
```

Built with Next.js (App Router, TypeScript), Tailwind and the Anthropic Messages API with tool use.
No database, no auth.
