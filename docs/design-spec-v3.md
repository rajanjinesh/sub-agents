# Sub-Agents: Design Spec (Booking.com vs Airbnb)

Based on prototype-2 design spec (Figma "SearchHotel"). Same simple look; only the changes below are new.
Rule: CLAUDE.md holds the product rules (it acts as the PRD) and wins on product behaviour.
This file wins on UI, copy, tokens and states.

## Global tokens (unchanged from prototype-2)
- Font: Inter (400, 500, 600, 700)
- Page: white background, content column 550px, centred, top padding 21px
- Mobile: on screens under 600px, the column is full width with 16px side padding
- Colors: text strong `#111827`; label `#374151`; muted `#6b7280`; placeholder `#9ca3af`;
  border `#d1d5db`; error `#ef4444`; primary blue `#2563eb`; white `#ffffff`
- Radius 8px for inputs, buttons, cards
- Inputs: height 36px, padding 8px 12px, 1px border `#d1d5db`, text 14/20
- Currency: INR (₹), Indian number format (₹4,200)

### New tokens (only for the new pieces)
- Light blue tint `#eff6ff` (Best pick card background)
- Light grey tint `#f3f4f6` (source tag background)
- Pill: height 22px, padding 0 8px, radius 999px, text Medium 12/16

Note: values in quotes marked "e.g." are examples. Text in {braces} is filled in with real data at runtime.

---

## Screen 1: Search Page (same as prototype-2, one text change)
1. Header
   - Title "Sub-Agents": Bold 28/34, `#111827`
   - Subtitle: **"Compare stays on Booking.com and Airbnb"**: Regular 14/20, `#6b7280`
2. Destination field: unchanged (label, placeholder "e.g. Goa", error "Please enter a destination")
3. Dates row: unchanged
   - Check-in default = today's date, shown as "{date} (Today)", e.g. "29 Oct 2026 (Today)"
   - Check-out default = next day
   - Check-out must be after check-in (error text: "Check-out must be after check-in", `#ef4444`)
4. Stay details: "{n} night(s)" (computed), unchanged
5. Guests row: Adults (default 1), Children (default 0), unchanged
6. Child age fields: one dropdown per child (0–17), unchanged
7. Search button: unchanged, label "Search"
   - While searching: label "Searching…", button disabled (opacity 0.6)

## Screen 2: Loading State (new)
Shown on the results page while the agents work.
- Title "Finding your stays…": Bold 28/34, `#111827`
- Summary line (same as results page): Regular 14/20, `#6b7280`
- Two status rows, gap 8px, Regular 14/20, `#374151`, each with a small spinner (16px, `#2563eb`)
  - "Searching Booking.com…" → on success "✓ Booking.com: {n} stays found"
  - "Searching Airbnb…" → on success "✓ Airbnb: {n} stays found"
  - On failure, the row becomes "✗ {Source}: unavailable" in muted `#6b7280` (no spinner)
  - Then: "Picking the best stay…"
- Why: shows the user that both searches run at the same time (the subagents, made visible).

## Screen 3: Results Page (prototype-2 cards, small additions)
Container: vertical stack, gap 16px, content column 550px.

1. Results header, gap 8px
   - Title: **"Best stays for your trip"**: Bold 28/34, `#111827`
   - Summary line: "{destination} · {dates} · {n} night(s) · {guests}",
     e.g. "Goa · 29–30 Oct 2026 · 1 night · 2 adults, 1 child": Regular 14/20, `#6b7280`
   - Sub-line: **"{n} stays compared from Booking.com and Airbnb"**, e.g. "6 stays compared…": Regular 12/16, `#6b7280`
   - Link "← New search": Medium 14/20, `#2563eb`

2. Result list: vertical, gap 12px, up to 6 cards, ranked by rank() (best first)

3. Hotel card: same as prototype-2 (white, 1px border `#d1d5db`, radius 8px, padding 16px, gap 8px)
   - **Row 0 (new): Tags**, left-aligned, gap 6px
     - Source pill: "Booking.com" or "Airbnb", bg `#f3f4f6`, text `#374151`
   - Row 1: Name (Bold 16/22) + Price (Bold 18/22, e.g. "₹4,200" + " total stay" Regular 12 `#6b7280`), unchanged
   - Row 2: Rating (e.g. "8.2 / 10 rating") + View button, unchanged
     - Button text changes by source: "View on Booking.com" / "View on Airbnb"
   - Airbnb only, if the total doesn't include all fees: note under the price,
     "Fees may be extra": Regular 12/16, `#6b7280`
   - Airbnb ratings are shown already converted to /10 (e.g. 4.6/5 → 9.2 / 10)

4. **Best pick card (new: the first card only)**
   - Border 2px `#2563eb`, background `#eff6ff`
   - Extra pill before the source pill: "⭐ Best pick", bg `#2563eb`, text white
   - Reason line at the bottom (written by the main agent, max ~90 characters):
     Regular 13/18, `#374151`, e.g. "Only ₹350 more than the cheapest, but rated 9.2 vs 7.4."

## Screen 4: Other states
- Empty (both sources found nothing): "No stays found. Try different dates or a different destination."
- Error (both sources failed): "Something went wrong. Please try again."
- **Partial (new)**, one source failed: show the other source's cards, plus a muted note above the list
  (Regular 12/16, `#6b7280`):
  - Airbnb failed: "Airbnb results are unavailable right now. Showing Booking.com only."
  - Booking.com failed: "Booking.com results are unavailable right now. Showing Airbnb only."
- Only 1–5 stays found: show what was found; sub-line says the real number (e.g. "4 stays compared…").

---

## Ranking rule ("best" = best value)
- Both sources apply the product rules first (in code): rating 7.0+/10, no hostels/dorms/shared rooms,
  total price incl. taxes and fees, INR, 1 room, unrated listings excluded, top 3 each.
- rank() orders the combined list by **value**: lower price and higher rating both count.
  - Default: cheapest first, but a stay can move up if it's at most ~10% more expensive
    and rated at least 1.0 point higher.
  - Ties: higher rating first.
- The main agent writes the one-line reason for the ⭐ Best pick only.

## What's deliberately NOT changed
- No new pages, filters, maps, photos or sorting controls; keep it a simple two-screen flow.
- Same fonts, colours, spacing, card layout and button style as prototype-2.
