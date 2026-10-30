# Sub-Agents: Build Prompts (Steps 0–6)

Progress so far:
- ✅ GitHub repo created: https://github.com/rajanjinesh/sub-agents (public)
- ✅ Vercel project created and connected: https://sub-agents-three.vercel.app (4 env vars added)
- ⬜ Step 0 → Step 6 below

How to use:
1. Open code mode in `D:\Projects\Sub-Agents`.
2. Paste one step's prompt. Let it finish.
3. Run `/step-check`. Paste the report into the chat before starting the next step.

Every prompt assumes CLAUDE.md and docs/design-spec-v3.md are in the folder and up to date.
Only paste what's inside each code block. The Purpose and Outcome notes are for you.

## The steps at a glance

| Step | What it builds | What you can see when it's done | Agent lesson |
|---|---|---|---|
| 0 | GitHub repo | Public `sub-agents` repo on GitHub with your docs | None (setup) |
| 1 | Empty app + search form + Vercel | Search form in your browser and on your Vercel link | None yet (foundation) |
| 2 | Data from Booking & Airbnb | A list of 3 real stays per source, as raw data | Tools are just code |
| 3 | The 2 subagents | Each subagent returns 3 stays + a log of what it did | What a subagent is |
| 4 | The main agent (orchestrator) | Both subagents run at the same time; 6 stays ranked + Best pick reason | How a main agent manages subagents |
| 5 | The real screens | The full app: search → live loading → results with Best pick | Making agents visible |
| 6 | Go live with real data | Vercel link runs real Booking & Airbnb searches; README | Shipping |

From Step 1 on, every step ends with a push to GitHub and Vercel redeploys automatically,
so you can check each step on your live link.

Think of it as building a team: Step 2 gives the workers their tools, Step 3 hires the
2 workers (subagents), Step 4 hires the manager (orchestrator), Step 5 builds the shop
front, Step 6 opens the shop.

---

## Step 0: GitHub repo

**Purpose:** Set up source control before any code exists, so every step is saved and
backed up from day one. You create an empty public repo on GitHub, then code mode connects
your folder to it and pushes your docs.

**Public repo = anyone can see the code.** That's fine, because your keys live only in
`.env.local` (never committed) and in Vercel. Code mode checks this before every push.

**Before you run it:**
1. Move the `step-check` folder into `.claude\skills\`, so it goes into the repo too.
2. ✅ Done: create the empty repo on GitHub:
   - Go to github.com, sign in, click **+** (top right) → **New repository**.
   - Repository name: `sub-agents`. Description (optional): "Orchestrator + 2 subagents learning prototype".
   - Choose **Public**.
   - Leave **Add a README**, **.gitignore** and **license** all OFF (an empty repo avoids push conflicts).
   - Click **Create repository** and copy the URL, e.g. `https://github.com/rajanjinesh/sub-agents.git`.
3. The URL is already filled into the prompt below.

**What you'll see when it's done:**
- Your public repo at `https://github.com/rajanjinesh/sub-agents` shows
  `CLAUDE.md`, `docs/`, `.claude/skills/step-check/` and `.gitignore`.
- No `.env.local` in the repo. Code mode shows you `git status` to prove it.

```
## Context
This folder is the "Sub-Agents" project (D:\Projects\Sub-Agents).
This is STEP 0 ONLY: set up git and connect it to my GitHub repo. Don't scaffold the app
or write any code.

I've already created an EMPTY PUBLIC repo on GitHub: https://github.com/rajanjinesh/sub-agents.git

Protected (DO NOT modify or delete): CLAUDE.md, docs/, .claude/, .env.local.
Never print, log or commit .env.local. The repo is public, so anything committed is visible
to everyone.

## Tasks
1. Create .gitignore with: node_modules, .next, .vercel, .env*, !.env.example, .DS_Store
2. git init with default branch "main".
3. Run `git status` and show me. Confirm .env.local is NOT listed.
4. Scan the files to be committed for anything that looks like an API key. If found, stop.
5. Commit CLAUDE.md, docs/, .claude/ and .gitignore with the message "chore: project docs".
6. git remote add origin https://github.com/rajanjinesh/sub-agents.git, then git push -u origin main.
   If the push asks me to sign in, tell me what to do. Never ask me for a password or token in chat.
7. Show me `git log --oneline` and `git remote -v`.

## Done when
- The public repo "sub-agents" on my GitHub has CLAUDE.md, docs/, .claude/skills/step-check
  and .gitignore, and no env file.
- Stop; don't start Step 1.
```

---

## Vercel setup ✅ Done (for reference; you did this in the browser)

Project `sub-agents`, live URL **https://sub-agents-three.vercel.app**, tracking the `main` branch.
To see env vars later: project page → left menu **Environment Variables** (not inside Settings).
1. vercel.com → **Continue with GitHub**.
2. **Add New… → Project**.
3. Under **Import Git Repository**, click **Import** next to `sub-agents`. If it's not listed,
   click **Adjust GitHub App Permissions** and give Vercel access to `sub-agents`.
4. Project name `sub-agents`; Framework Preset **Next.js** (pick it manually if it shows "Other");
   Root Directory `./`.
5. **Environment Variables:** add ANTHROPIC_API_KEY, ANTHROPIC_MODEL, HASDATA_API_KEY (copy values
   from your `.env.local`) and USE_FIXTURES = `false` (live data on Vercel; keep `true` in your `.env.local`).
6. **Deploy.** The first deploy is expected to fail ("No Next.js version detected"), because
   there's no app yet. Step 1's push fixes it automatically.
7. Your project URL: `https://sub-agents-three.vercel.app`.

---

## Step 1: Setup + Search page

**Purpose:** Lay the foundation. Create the empty Next.js app, set up your design (colors,
fonts, spacing) and build the first screen: the search form. No agents, no data, no APIs yet.
This step is about getting the base right so every later step builds on it.

**What you'll see when it's done:**
- Run `npm run dev` and open `http://localhost:3000`.
- The **Sub-Agents** search form: destination, check-in (today), check-out (tomorrow),
  "1 night", adults, children, and an age dropdown appears for each child.
- Leave the destination empty and click Search → "Please enter a destination".
- Fill it in and click Search → a plain `/results` page that just shows back what you entered,
  e.g. `destination: Goa, checkIn: 2026-10-30, checkOut: 2026-10-31, adults: 2, children: 1, childAges: 5`.
- The code is pushed to GitHub and Vercel deploys it: your live link
  `https://sub-agents-three.vercel.app` now shows the same search form. From now on, every push redeploys it.
- Your keys stay out of git; you already added them to Vercel.

```
## Context
This folder is the "Sub-Agents" project (D:\Projects\Sub-Agents), a learning prototype:
1 orchestrator agent + exactly 2 subagents (Booking.com, Airbnb).
Use "Sub-Agents" everywhere: package name "sub-agents", on-screen title "Sub-Agents",
GitHub repo https://github.com/rajanjinesh/sub-agents (public, connected to Vercel).
Never use the name "Hotel Finder".

Already in this folder (DO NOT modify, overwrite or delete):
- CLAUDE.md: the PRD. Read it fully first and follow it.
- docs/design-spec-v3.md: the UI spec. Read it fully first.
- .env.local with my real API keys. Never print, log, commit or overwrite it.
- .claude/skills/step-check: my review skill. Don't touch it.

This is STEP 1 ONLY (see CLAUDE.md section 13): project setup + Search page.
No API calls, no agents, no HasData, no Anthropic SDK yet.

## Tasks

### 1. Scaffold Next.js
- Next.js App Router, TypeScript, Tailwind, ESLint, src/ dir, Inter via next/font.
- create-next-app may refuse because the folder isn't empty. If so, scaffold into a temp
  folder and move the generated files in. Keep CLAUDE.md, docs/, .claude/ and .env.local untouched.
- Git and the GitHub repo already exist (Step 0). Keep the existing .gitignore and add any
  Next.js entries it's missing.
- Create .env.example with these variable names and empty values:
  ANTHROPIC_API_KEY, ANTHROPIC_MODEL, HASDATA_API_KEY, USE_FIXTURES
- Before committing, show me `git status` and confirm no env file is staged.

### 2. Design tokens
From docs/design-spec-v3.md: all colors (including #eff6ff and #f3f4f6), 8px radius,
999px pill radius, Inter 400/500/600/700, 550px centered column, 21px top padding,
16px side padding under 600px, inputs 36px high with 8px 12px padding.
Put them in Tailwind theme / CSS variables so later steps reuse them.

### 3. Search page (Screen 1), exactly per the spec
- Title "Sub-Agents" + subtitle "Compare stays on Booking.com and Airbnb".
- Destination field, placeholder "e.g. Goa", error "Please enter a destination".
- Check-in defaults to today, displayed like "29 Oct 2026 (Today)". Can't be in the past.
- Check-out defaults to tomorrow. Error "Check-out must be after check-in" (#ef4444).
- "{n} night(s)" updates live.
- Adults (default 1, min 1), Children (default 0, min 0).
- One age dropdown (0–17) per child, added and removed with the count. Required.
- Search button. "Searching…" + disabled (opacity 0.6) state ready for later.
- On valid submit, go to /results?destination=&checkIn=&checkOut=&adults=&children=&childAges=1,5
- /results is a placeholder for now. Just show the parsed params.

### 4. Files to create now
src/lib/types.ts    SearchInput (from CLAUDE.md section 6)
src/lib/format.ts   formatINR (₹4,200, Indian grouping), formatDate, nights()
src/lib/validate.ts validateSearchInput(), shared by client now and server later
src/components/     small form field components

## Done when
- npm run dev works. The Search page matches the spec at desktop and mobile (<600px) widths.
- All validation errors show correctly. Submitting lands on /results with the right params.
- No env file is in git. Commit and push to GitHub.
- Vercel is already connected to the repo (no production deployment yet, because there was no app).
  This push triggers the first real deploy to https://sub-agents-three.vercel.app. Make sure `npm run build` passes locally first.
- Once I confirm it's deployed, check the Vercel URL shows the search form.
- Give me a short summary and a list of anything ambiguous or not matched.
  Don't silently guess. Stop; don't start Step 2.
```

---

## Step 2: HasData data layer

**Purpose:** Prove we can get real stays from Booking.com and Airbnb, and clean them up to
your product rules (rating 7.0+, no hostels, total price in ₹, 3 cheapest). Still no AI.
These fetch-and-clean functions become the **tools** the subagents use in Step 3.
It also saves one real response per source, so later steps don't spend HasData credits.

**What you'll see when it's done:**
- Open `http://localhost:3000/api/dev/stays?source=booking` → raw data (JSON) with 3 stays, e.g.
  `{ "name": "Sea Breeze Resort", "totalPrice": 4200, "rating": 8.2, "source": "booking", "url": "…" }`
- Same for `?source=airbnb`, with ratings already converted to /10.
- New files: `fixtures/booking-raw.json`, `fixtures/airbnb-raw.json` (saved real responses) and
  `docs/hasdata-fields.md` (which API field maps to which of our fields).
- A summary like "Booking returned 25 listings, 11 passed the rules, kept the 3 cheapest".
- The search form looks the same; nothing new on screen yet.

```
## Context
Sub-Agents project. Step 1 is done and passed /step-check.
This is STEP 2 ONLY (CLAUDE.md section 13): the HasData data layer.
No Anthropic SDK, no agents, no UI changes yet. Re-read CLAUDE.md sections 3, 4 and 6 first.

## Credit rule (important)
HasData calls cost credits. Make EXACTLY ONE live call per source in this step, to capture
real responses. After that, everything (tests, dev route) runs on saved fixtures.
Sample search for the live calls: destination "Goa", check-in 14 days from today,
1 night, 2 adults, 1 child age 5.

## Tasks

### 1. Raw API clients
- src/lib/hasdata/booking.ts: GET https://api.hasdata.com/scrape/booking/search
  with keyword, checkInDate, checkOutDate, rooms=1, adults, children (with ages), INR currency.
- src/lib/hasdata/airbnb.ts: GET https://api.hasdata.com/scrape/airbnb/listing
  with location, checkIn, checkOut, adults, children, INR if supported.
- Header x-api-key from HASDATA_API_KEY (server-side only). Clear errors for a missing key,
  401, non-200 and timeouts (15s).
- Check the HasData docs for each endpoint's exact param names and how child ages are passed.
  Don't guess param names.

### 2. Capture real responses
- Make the one live call per source. Save to fixtures/booking-raw.json and fixtures/airbnb-raw.json.
- Write docs/hasdata-fields.md: which raw fields map to each Stay field, per source, and
  whether the total price includes taxes and fees.
- Confirm whether Airbnb supports INR. If not, tell me and stop before converting currencies.

### 3. Normalize + product rules
- normalizeBooking(raw) and normalizeAirbnb(raw) → Stay[] (exact shape from CLAUDE.md section 6).
- Airbnb rating × 2 to /10. Set feesMayBeExtra for Airbnb when the total may exclude fees.
- src/lib/rules.ts applyRules(stays) → top 3: rating 7.0+/10, unrated excluded, no
  hostels/dorms/shared rooms, total incl. taxes & fees in INR, 1 room, unparseable price
  skipped, 3 cheapest.
- Add vitest. Unit tests for normalize and rules using the fixtures.

### 4. Dev test route
- GET /api/dev/stays?source=booking|airbnb returns the normalized top 3 from fixtures.
- Add &live=1 to call the real API. Return 404 for this route in production.

## Done when
- Both fixtures saved, field map written, tests pass, dev route returns 3 valid stays per source.
- Commit and push to GitHub (Vercel redeploys automatically).
- Summarize, including: how many raw listings each source returned, how many passed the rules, and anything ambiguous in the field mapping. Stop; don't start Step 3.
```

---

## Step 3: The two subagents

**Purpose:** Create the 2 workers. Each subagent is its own Claude AI call with its own
instructions and exactly one tool (the Step 2 function). You'll see what a subagent really is:
the AI decides to call its tool, our code fetches and cleans the data, and the AI reports back.
The stays always come from the tool, never from the AI's own text.

**What you'll see when it's done:**
- Open `http://localhost:3000/api/dev/agent?source=airbnb` → 3 stays plus a log (trace), e.g.
  ```
  airbnb agent started
  → called search_airbnb (Goa, 2026-11-13 → 2026-11-14, 2 adults, 1 child)
  ← tool returned 3 stays
  airbnb agent finished in 4.2s
  ```
- Same for `?source=booking`.
- This uses your Anthropic key, but runs on the saved data, so no HasData credits are spent.
- Still nothing new on screen.

```
## Context
Sub-Agents project. Steps 1–2 done and passed /step-check.
This is STEP 3 ONLY (CLAUDE.md section 13): the Booking and Airbnb subagents.
No orchestrator, no UI changes yet. Re-read CLAUDE.md section 3 first.

## Tasks

### 1. Shared Anthropic client
- Install @anthropic-ai/sdk.
- src/lib/anthropic.ts: the ONLY place the client is created, using ANTHROPIC_API_KEY and
  ANTHROPIC_MODEL. Throw a clear error if either is missing. Server-side only.

### 2. Fixture switch
- USE_FIXTURES is already in .env.example (Step 1) and set to true in my .env.local.
  When true, the search tools return the Step 2 fixtures instead of calling HasData.
  Treat a missing value as true locally.

### 3. Subagents
- src/lib/agents/bookingAgent.ts and airbnbAgent.ts, each exporting
  runBookingAgent(input: SearchInput) / runAirbnbAgent(input).
- Each is its own Claude Messages API call with:
  - its own short system prompt (role: "You find stays on {source}. Use your tool once.
    Don't rank or filter, just report what the tool returned.")
  - exactly ONE tool: search_booking / search_airbnb, with a JSON schema for the search params.
- Tool-use loop: the model calls the tool → our code runs fetch → normalize → applyRules →
  the result goes back to the model as the tool_result → the model replies with one short line.
- IMPORTANT: the returned stays come from our tool code, never parsed from the model's text.
- Return { stays: Stay[], ms, trace } where trace logs: agent started, tool called (params),
  tool returned (count), agent finished.
- Cap the loop (max 3 turns). Errors become a failed SourceResult, not a crash.

### 4. Dev route
- GET /api/dev/agent?source=booking|airbnb runs one subagent on a sample input
  and returns { stays, ms, trace }. 404 in production.

## Done when
- Both subagents run in fixture mode and return 3 stays plus a readable trace.
- One live run of each in Anthropic (USE_FIXTURES=true, so no HasData credits) works.
- Commit and push to GitHub (Vercel redeploys automatically). Summarize, with an example trace. Stop; don't start Step 4.
```

---

## Step 4: Orchestrator, rank() and streaming

**Purpose:** Create the manager. The orchestrator is the main agent: it receives the search,
calls **both subagents at the same time**, waits for both, copes if one fails, runs `rank()`
(code) to order the 6 stays, and writes the one-line Best pick reason. It also streams progress
live, which is what will power the loading screen in Step 5. This is the core lesson of the project.

**What you'll see when it's done:**
- No new screen yet. Open `http://localhost:3000/api/dev/search` (tick Pretty-print) to watch
  one full orchestrator run, with events arriving in order:
  ```
  source_started  booking
  source_started  airbnb          ← both start together (parallel)
  source_done     airbnb  3 stays
  source_done     booking 3 stays
  ranking_started
  result  6 stays ranked, Best pick: "Sea Breeze Resort"
          reason: "Only ₹350 more than the cheapest, but rated 9.2 vs 7.4."
  ```
- A failure test: open `/api/dev/search?fail=airbnb` and you still get Booking's 3 stays and "airbnb failed".
- Passing tests that prove `rank()` orders stays exactly per your rule.

```
## Context
Sub-Agents project. Steps 1–3 done and passed /step-check.
This is STEP 4 ONLY (CLAUDE.md section 13): orchestrator, rank(), Best pick reason, SSE.
No UI changes yet. Re-read CLAUDE.md sections 3, 5, 6 and 7 first.

## Tasks

### 1. rank()
- src/lib/rank.ts, a pure function exactly per CLAUDE.md section 5:
  sort by totalPrice asc (equal price: higher rating first), then repeatedly swap adjacent
  A,B when B is at most 10% pricier AND rated at least 1.0 higher, until no swaps.
- Vitest tests: no swaps, one swap, chain swaps, ties, single stay, empty list,
  exactly 10% / exactly 1.0 boundaries.

### 2. Orchestrator
- src/lib/agents/orchestrator.ts, runOrchestrator(input, emit).
- Its own Claude call with a system prompt ("You coordinate two subagents. Call both tools in
  the same turn.") and exactly 2 tools: call_booking_agent, call_airbnb_agent.
- The tool handlers call the existing runBookingAgent / runAirbnbAgent (Step 3). Each already
  returns a SourceResult plus its own trace; merge those traces into the orchestrator trace
  in time order, tagged by agent.
- When the model returns the tool_use blocks, run both subagents IN PARALLEL with
  Promise.allSettled. If the model only calls one, call the other in code and log a warning
  in the trace.
- The subagents' input always comes from the user's SearchInput (same rule as Step 3), not
  from what the orchestrator model writes in its tool calls.
- Return both results to the model as tool_results.
- Code combines the stays → rank() → max 6.
- Then the model writes the Best pick reason only: give it the #1 and #2 stays, ask for one line,
  max ~90 chars, comparing price and rating (e.g. "Only ₹350 more than the cheapest, but rated
  9.2 vs 7.4."). If it's longer than 90 chars or empty, fall back to a code-written line.
- Fewer than 2 stays: reason is null (1 stay) or no Best pick (0 stays).
- Build SearchResult { stays, bestPickReason, sources, trace }.

### 3. POST /api/search (SSE)
- Validate the body with validateSearchInput() (400 on bad input).
- Stream events: source_started, source_done {count}, source_failed {error},
  ranking_started, result {SearchResult}. Emit source events as each subagent actually
  starts and finishes.
- Node runtime, export maxDuration = 60.
- One subagent failing → partial result. Both failing → result with empty stays and both failed.

### 4. Browser view for learning
- GET /api/dev/search?fail=booking|airbnb (fail is optional) runs the orchestrator on a sample
  input (Goa, 14 days from today, 1 night, 2 adults, 1 child age 5) and returns JSON:
  { events: [every SSE event in order, with time], result: SearchResult, lines: [readable trace] }.
  The optional fail param forces that subagent to fail, to show the partial state.
  404 in production.

## Done when
- rank() tests pass.
- A curl POST to /api/search in fixture mode streams all events in order and ends with a valid
  result (show me the output).
- Forcing one source to fail (e.g. a temporary env flag) still returns the other's stays.
- Commit and push to GitHub (Vercel redeploys automatically). Summarize, with the full trace of one run.
- Leave the dev server running so I can open /api/dev/search in my browser. Stop; don't start Step 5.
```

---

## Step 5: Loading, Results and all states

**Purpose:** Make it real for the user. Connect the search form to the orchestrator and build
the screens from your design spec: the live loading screen, the results with the ⭐ Best pick
card, and the Partial / Empty / Error states. This is where the agents become visible.

**What you'll see when it's done:** the full app working on your computer.
- Search "Goa" → **loading screen** "Finding your stays…" with two rows spinning:
  "Searching Booking.com…" and "Searching Airbnb…". Each ticks to
  "✓ Airbnb: 3 stays found" as it finishes, then "Picking the best stay…".
- **Results:** "Best stays for your trip", up to 6 cards, the first one blue with
  "⭐ Best pick" and the reason line. Each card has a source tag, ₹ total price, rating /10
  and a "View on Booking.com / Airbnb" button.
- If a source fails: "Airbnb results are unavailable right now. Showing Booking.com only."
- Add `?debug=1` to the results URL to see the agent activity timeline (the learning view).

```
## Context
Sub-Agents project. Steps 1–4 done and passed /step-check.
This is STEP 5 ONLY (CLAUDE.md section 13): the results experience.
Re-read docs/design-spec-v3.md Screens 2–4 and match copy, sizes and colors exactly.

## Tasks

### 1. Connect the search
- On Search submit: button shows "Searching…" (disabled, opacity 0.6), then go to /results.
- /results reads the params, POSTs to /api/search and reads the SSE stream with fetch +
  ReadableStream (EventSource can't POST).

### 2. Loading (Screen 2)
- "Finding your stays…" + summary line.
- Two rows with 16px #2563eb spinners: "Searching Booking.com…" / "Searching Airbnb…".
- Update each row live: "✓ Booking.com: {n} stays found", or muted "✗ Booking.com: unavailable".
- Then "Picking the best stay…" on ranking_started.

### 3. Results (Screen 3)
- Header: "Best stays for your trip", summary line
  "{destination} · {dates} · {n} night(s) · {guests}", sub-line
  "{n} stays compared from Booking.com and Airbnb", link "← New search" (keeps the inputs).
- Cards per spec: source pill, name, price "₹4,200 total stay", "8.2 / 10 rating",
  "View on Booking.com" / "View on Airbnb" (new tab), "Fees may be extra" when flagged.
- Best pick card (first only): 2px #2563eb border, #eff6ff background, "⭐ Best pick" pill
  before the source pill, reason line at the bottom.

### 4. Other states (Screen 4), exact copy
- Partial, Empty, Error, and 1–5 stays.

### 5. Agent activity (learning view)
- Not in the design spec, so hide it by default. Show a small "Agent activity" timeline under
  the results only when the URL has ?debug=1, using the trace.

## Done when
- A full search works in fixture mode: loading rows update live, results and Best pick render.
- Each state checked (force failures/empties in fixture mode). Desktop and <600px look right.
- Commit and push to GitHub (Vercel redeploys automatically). Summarize, with anything that doesn't match the spec. Stop; don't start Step 6.
```

---

## Step 6: Go live with real data

**Purpose:** Ship it. GitHub and Vercel are already connected from Steps 0–1, so this step
switches the live app from saved data to real data, writes a README that explains the agent
flow, and does a final check. The same end state as your Antigravity projects.

**What you'll see when it's done:**
- Your live link `https://sub-agents-three.vercel.app` runs a real search end to end
  with live Booking.com and Airbnb data.
- A public GitHub repo `sub-agents` with all the code and the README.
- A note of how many HasData credits one live search uses, so you know the cost per search.

```
## Context
Sub-Agents project. Steps 1–5 done and passed /step-check.
This is STEP 6 ONLY (CLAUDE.md section 13): ship it.

## Tasks

### 1. Pre-ship checks
- npm run build, lint and tests pass.
- Confirm no env file or key anywhere in git history (git log -p search). If found, stop and tell me.

### 2. README.md
- What it is, how to run locally, env vars (names only).
- How it works: the orchestrator, how the 2 subagents are invoked in parallel, where code
  (rules, rank) takes over from the LLM. Include the agent flow diagram from CLAUDE.md.
- Fixture mode vs live mode, and the credit cost per live search.

### 3. Go live with real data
- GitHub and Vercel are already connected (Steps 0–1). Commit and push main.
- USE_FIXTURES is already false on Vercel. Ask me to confirm it in Vercel settings; never show values.
- Confirm the /api/search route doesn't time out on Vercel.

## Done when
- Live URL works end to end with real data: one full search, Best pick shown.
- Dev routes return 404 in production.
- Give me: the live URL, the repo URL, and the credits one live search used. Done.
```
