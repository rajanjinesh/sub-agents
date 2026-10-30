---
name: step-check
description: End-of-step quality gate for the Sub-Agents project. Run after each build step (or when resuming a session) to verify the step against CLAUDE.md and the design spec, and get a go/no-go for the next step. Use when the user types /step-check, optionally with a step number (e.g. /step-check 2).
---

# Step check

A read-only review of the current build step. You **check and report**; you do not fix,
refactor or build anything. If something fails, report it and stop.

## 0. Ground rules
- Do not edit, create or delete any project files during the check.
- Never print, log or open the contents of `.env.local` or any env file. Only check that
  they exist and are not tracked by git.
- Never call the live HasData or Anthropic APIs during a check (they cost credits).
  Use fixtures in `fixtures/` if a check needs data. If a check truly needs a live call,
  ask the user first.
- Stop any dev server you start before you finish.

## 1. Work out which step to check
- If the user gave a number (`/step-check 3`), check that step.
- Otherwise, infer it from CLAUDE.md section 13 and what exists in the repo
  (files, git log). State which step you're checking and why.
- Read CLAUDE.md and `docs/design-spec-v3.md` fresh before checking.

## 2. Checks for every step
Run each and record ✅ pass, ❌ fail or ⚠️ warning, with a short reason.

1. **Runs:** `npm run dev` starts without errors and the main page loads (start it, check, stop it).
2. **Builds:** `npm run build` succeeds.
3. **Lint and types:** `npm run lint` passes, no TypeScript errors.
4. **Tests:** if tests exist, `npm test` passes.
5. **Keys safe:**
   - `git ls-files` shows no `.env`, `.env.local` or other env file (only `.env.example`).
   - `.gitignore` covers `.env*` except `.env.example`.
   - No API keys are hard-coded in source (search for `sk-ant`, `x-api-key` values, long tokens).
   - No client component (`"use client"`) imports `process.env` keys or `src/lib/anthropic.ts`.
6. **Naming:** the name "Hotel Finder" appears nowhere in the app (code, UI text, package.json).
   Project, package and title use "Sub-Agents" / `sub-agents`.
7. **Scope:** nothing from a later step has been built. List anything that was built ahead.
8. **Protected files:** CLAUDE.md and `docs/design-spec-v3.md` are unchanged
   (check `git diff` / `git status`).
9. **Git:** report `git status`. Note uncommitted changes.

## 3. Step-specific checks (from CLAUDE.md)

### Step 0: GitHub repo
- For this step, skip the Runs, Build, Lint and Tests checks (there's no app yet); mark them "n/a".
- `git remote -v` points to a GitHub repo named `sub-agents`; the repo is **public** on GitHub.
- `.gitignore` covers node_modules, .next, .vercel, `.env*` (except `.env.example`).
- The repo contains CLAUDE.md, docs/ and .claude/skills/step-check, and no env file.
- Local main is pushed (no commits ahead of origin).

### Step 1: Setup + Search page
- Design tokens from the spec are in Tailwind/CSS (colors, 8px radius, 999px pill, Inter
  400–700, 550px column, 21px top padding, 16px side padding under 600px).
- Title "Sub-Agents" and subtitle "Compare stays on Booking.com and Airbnb".
- Destination placeholder "e.g. Goa"; empty submit shows "Please enter a destination".
- Check-in defaults to today, shown like "29 Oct 2026 (Today)", and can't be in the past.
- Check-out defaults to tomorrow; "Check-out must be after check-in" in #ef4444.
- "{n} night(s)" updates live.
- Adults default 1 (min 1), Children default 0; one 0–17 age dropdown per child, required.
- Valid submit goes to `/results` with all params, including `childAges`.
- `src/lib/types.ts`, `format.ts` (formatINR gives ₹4,200 / ₹1,25,000), `validate.ts` exist.
- `.env.example` lists ANTHROPIC_API_KEY, ANTHROPIC_MODEL, HASDATA_API_KEY, USE_FIXTURES with empty values.
- Pushed to GitHub. Vercel is connected and the deployed URL shows the search form
  (ask the user for the URL if you don't have it; Vercel/GitHub being set up is in scope for Step 1).

### Step 2: Data layer
- `src/lib/hasdata/booking.ts` and `airbnb.ts` call the endpoints in CLAUDE.md with `x-api-key`.
- One raw response per source saved in `fixtures/`; field mapping matches the real fields.
- Normalized output matches the `Stay` type exactly.
- `src/lib/rules.ts`: rating 7.0+/10, unrated excluded, Airbnb rating ×2, no hostels/dorms/shared
  rooms, total price incl. taxes & fees in INR, 1 room, unparseable prices skipped, 3 cheapest.
- `feesMayBeExtra` set correctly for Airbnb. INR support on Airbnb confirmed or flagged.
- A dev test route returns normalized results from fixtures.

### Step 3: Subagents
- `src/lib/anthropic.ts` is the only place the Anthropic client is created.
- Booking and Airbnb subagents: separate Claude calls, own system prompt, exactly one tool each.
- Subagents return `Stay[]` (max 3) and never call each other.
- The LLM does not filter or sort; rules come from `rules.ts`.

### Step 4: Orchestrator
- Exactly 2 tools: `call_booking_agent`, `call_airbnb_agent`, called in parallel in one turn.
- `rank()` in `src/lib/rank.ts` is pure and matches CLAUDE.md section 5.
- Unit tests cover: no swaps, one swap, chain swaps, ties, single stay, empty list. All pass.
- LLM writes only the Best pick reason (~90 chars max).
- `/api/search` validates input server-side and streams SSE events: `source_started`,
  `source_done`, `source_failed`, `ranking_started`, `result`.
- One subagent failing still returns the other's results. Missing ANTHROPIC_API_KEY fails fast.

### Step 5: UI states
- Loading screen: live per-source rows with spinner → "✓ {Source}: {n} stays found" or
  "✗ {Source}: unavailable", then "Picking the best stay…".
- Results: title, summary line, sub-line with real count, "← New search".
- Cards: source pill, name, price "₹x total stay", rating "/ 10 rating", source-specific
  View button, "Fees may be extra" when relevant.
- Best pick card: 2px #2563eb border, #eff6ff background, "⭐ Best pick" pill, reason line.
- Partial, Empty and Error states use the exact copy from the spec.
- Checked at desktop and under 600px width.

### Steps 2–5: deployment
- Work is committed and pushed; the latest Vercel deployment succeeded (ask the user to confirm
  if you can't check). The deployed app still loads.

### Step 6: Ship
- GitHub repo `sub-agents` is public, pushed, and has no env files anywhere in history.
- `USE_FIXTURES` is false on Vercel (ask the user to confirm; never show env values).
- README explains the orchestrator, how subagents are invoked, and the agent flow diagram.
- Deployed app completes one search end to end.

## 4. Report format
Reply with exactly this structure:

```
## Step {n} of 0–6: {step name}

### ✅ Built
- {what exists for this step, 3–6 bullets}
- Key files: {paths}

### Checks
| Check | Result | Note |
|---|---|---|
| Runs (npm run dev) | ✅/❌/⚠️ | … |
| Build | … | … |
| Lint / types | … | … |
| Tests | … | … |
| Keys safe | … | … |
| Naming (Sub-Agents) | … | … |
| Scope (no build-ahead) | … | … |
| Protected files unchanged | … | … |
| {each step-specific check} | … | … |

### ⚠️ Open questions / not matched
- {anything ambiguous, not matching the spec, or guessed; "None" if none}

### Git
{short git status}

### ➡️ Ready for Step {n+1}?
**Yes** / **No**: {one line why; if No, list the must-fix items}
```

Keep the report short and factual. A ❌ on Runs, Build, Keys safe or Scope means **No**.
