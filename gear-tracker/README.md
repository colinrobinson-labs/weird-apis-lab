# Gear Tracker

A Slack bot that watches every open federal surplus auction (GSA Auctions) in CA, AZ, NV, OR and UT and posts event-production gear to a Slack channel: light towers, generators, UTVs and golf carts, forklifts, reefers and containers, water trailers and trucks, trailers, pickups and box trucks, barricades, staging, radios, power distro, cooling, concessions gear, seating and lighting.

**Set it up:** open [setup.html](https://colinrobinson-labs.github.io/weird-apis-lab/gear-tracker/setup.html). It's five steps in the browser, about 10 minutes.
**See the posts:** [preview.html](https://colinrobinson-labs.github.io/weird-apis-lab/gear-tracker/preview.html) is built from real GSA lots.

## What each post tells you

| | |
|---|---|
| Photo | GSA's lot photo |
| Current bid | plus bidder count, or "no bids yet" |
| Typical used value | a rough range for working gear. Generators are valued per kW, and barricades, radios and seating per unit |
| All-in cost | next bid plus round-trip hauling from La Mesa |
| Deal score | 🔥 to 🔥🔥🔥🔥🔥, all-in cost vs the value range. Condition risk costs flames |
| Walk-away bid | 60% of the low value, minus hauling. Bid up to this and it's still a good deal |
| Condition | GSA's own grade (new, used, repairable, salvage), plus what the listing says (runs, operable, hours, mileage, leaks, missing parts) |
| Location | address, miles and drive time from La Mesa, selling agency, Directions button |
| Format | bid only (GSA has no Buy Now), increment, reserve or hidden reserve, soft-close rule |
| How to buy | 5 steps: register, inspect (with the lot's own instructions), bid, pay by the real deadline, remove by the real deadline |
| Contacts | GSA sales officer and the on-site contact, with an Email button |

It checks at about 7am and 5pm Pacific and only posts lots it hasn't posted before. A good deal (🔥🔥🔥+) you've already seen gets one ⏰ reminder in its last 24 hours. The very first run posts a ranked summary plus the top 15.

## Files

- `gear_tracker.py`: the bot. Python 3.9+, no packages.
- `config.json`: what to look for. Edit `states`, `max_miles`, `exclude`, each category's `keywords`, `not` (false matches to skip), `max_bid` and `value`, and `haul_per_mile`.
- `seen.json`, `zipcache.json`: the bot's memory, saved by the workflow.
- `../.github/workflows/gear-tracker.yml`: the schedule. **Run workflow** has three modes: `post` (normal), `first-scan` (post the ranked scan again), `preview-only` (rebuild `live-preview.html` from live data, no Slack).

## Test locally
```
python gear_tracker.py --fixture sample.json --initial --preview out.html
python gear_tracker.py --preview out.html          # live data, uses DEMO_KEY if GSA_API_KEY isn't set
```

## Limits

- Federal surplus only. State and city surplus (GovDeals, PublicSurplus) has no public API.
- The feed gives the closing date but not the time. The exact time is on the lot page.
- Values are rules of thumb, not appraisals. The "Sold prices on eBay" button is the reality check.
- Bids usually climb in the last hours, so the score is a snapshot.
- GSA's documentation lists PascalCase field names (`ItemName`) but the live feed sends camelCase (`itemName`) and puts the full description in HTML (`lotInfo`). The bot handles both.
