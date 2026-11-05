# Gear Deal Tracker

This tool sends a daily Slack digest of federal government surplus lots that match event-production gear: generators, light towers, trucks, trailers, lifts, barricades, staging, audio and radios, power distribution, and sanitation.

## Setup (about 10 minutes)
1. Get a free API key at https://api.data.gov/signup/.
2. In Slack, create an Incoming Webhook for the channel you want and copy the URL.
3. Put this folder in a new GitHub repo. In **Settings → Secrets → Actions**, add `GSA_API_KEY` and `SLACK_WEBHOOK_URL`.
4. The workflow runs daily at about 7am Pacific. To run it now, go to **Actions → Gear deals → Run workflow**.

## Tune it
Edit `config.json`:
- `states`: which states to include.
- `exclude`: words that drop a lot (for example "parts only").
- Each category has `keywords`, a `max_bid` (above this the lot is hidden), and `deal_under` (at or below this the lot gets a 🔥 deal flag).

## Test locally without a key
```
python gear_tracker.py --dry-run --fixture sample.json
```

## Coverage
This covers federal surplus only (GSA Auctions API). State and city surplus (GovDeals, PublicSurplus) has no public API. Set up saved-search email alerts on those sites for the same keywords.
