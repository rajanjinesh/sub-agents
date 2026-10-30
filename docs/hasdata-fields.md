# HasData field map

Captured from one live call per source (saved in `fixtures/`): Goa, 2026-11-13 → 2026-11-14,
2 adults, 1 child aged 5. Code: `src/lib/hasdata/booking.ts`, `airbnb.ts`, `src/lib/rules.ts`.

## Booking: `GET /scrape/booking/search`

Request: `keyword`, `checkInDate`, `checkOutDate`, `rooms=1`, `adults`, `children`,
`childrenAges` (comma-separated, e.g. `5`; sent only when children > 0), `currency=inr`.
The `currency` enum is **lowercase** (`inr`); `INR` returns HTTP 422.

Response: `{ requestMetadata, searchInformation, results[], pagination }` (25 results per page).

| Stay field | Raw field | Notes |
|---|---|---|
| `source` | n/a | `"booking"` |
| `name` | `title` | Property name (`room` holds the room type, not used in the name) |
| `totalPrice` | `price.pricePerStayParsed` + `price.excludedChargesParsed` | **Total incl. taxes & fees.** The headline price excludes taxes/charges (about 18%), which are listed separately in `excludedChargesParsed`. Rounded to whole ₹ |
| `pricePerNight` | `totalPrice` ÷ nights | Nights from `searchInformation` dates |
| `currency` | `price.currency` | Must be `"INR"`, otherwise the listing is skipped |
| `rating` | `reviews.score` | Already /10. **Not** `rating`, which is the star class (1–5) |
| `reviewCount` | `reviews.count` | |
| `url` | `url` | Already carries dates, guests and child age |
| `feesMayBeExtra` | n/a | `false` |

Dropped by the normalizer: no/zero price, non-INR price, no review score, or a hostel/dorm/shared-room
match on `title` + `room` + `bedTypes`.

## Airbnb: `GET /scrape/airbnb/listing`

Request: `location`, `checkIn`, `checkOut`, `adults`, `children`.
- **No currency param exists. Prices are always USD.**
- **No child-age param exists.** Only the children count is sent.

Response: `{ requestMetadata, properties[], pagination }` (18 properties per page).

| Stay field | Raw field | Notes |
|---|---|---|
| `source` | n/a | `"airbnb"` |
| `name` | `title` + `description` | e.g. "Apartment in Canacona: Glow By Palolem" |
| `totalPrice` | `price.breakdown[0]` | Parsed from `"N night(s) x $X"`: N × X × `USD_TO_INR`, rounded. Special-offer lines and `discountedPrice` are ignored |
| `pricePerNight` | `totalPrice` ÷ N | |
| `currency` | n/a | `"INR"` after conversion |
| `rating` | `rating` × 2 | 4.81 → 9.62. Null/0 means unrated and is dropped |
| `reviewCount` | `reviews` | A number (count), may be null |
| `url` | `url` | `/rooms/{id}` plus `check_in`, `check_out`, `adults`, `children` taken from `requestMetadata.url` |
| `feesMayBeExtra` | n/a | **Always `true`**: the fee inclusion is not documented, and the INR figure is converted at a fixed rate |

`USD_TO_INR` lives in `src/lib/config.ts` (currently **88**). Airbnb INR prices are approximate.

Dropped by the normalizer: no parseable breakdown, no rating, or a hostel/dorm/shared-room match
on `title` + `description`.

## Product rules (`applyRules`, per source)

Rating ≥ 7.0 /10, unrated out, no hostel/dorm/shared room (`hostel|dorm|shared room|shared dorm|bunk|bed in`;
"shared bathroom" is allowed), finite positive INR total, then the 3 cheapest (ties: higher rating first).
The 1-room rule is enforced by the request (`rooms=1` on Booking; Airbnb listings are whole homes).

## Fixture results (sample search)

| Source | Raw listings | Normalized | Rating ≥ 7.0 | Top 3 returned |
|---|---|---|---|---|
| Booking | 25 | 25 | 24 | 3 |
| Airbnb | 18 | 18 | 18 | 3 |

## Ambiguities

- Booking `excludedChargesParsed` is assumed to be taxes & fees. The raw value has no label.
- Airbnb: whether the nightly price includes cleaning/service fees is unknown.
- Airbnb: discounts ("Special offer") are ignored, so totals can be slightly high.
- Airbnb: child ages cannot be passed, so availability/pricing for children is by count only.
