# Gear Deal Tracker

A Slack channel that posts federal surplus auction lots for event-production gear, such as generators, light towers, trucks, trailers, lifts, barricades, staging, radios, power distro and sanitation. Each post is a card with:

- **Photo**, when GSA has one
- **Current bid**, plus how many bidders
- **Deal score** (🔥 to 🔥🔥🔥🔥🔥), which compares the bid with a rough used-market range. Generators are valued per kW and barricades and radios per unit, and the ranges live in `config.json`.
- **Condition**, read from the listing ("runs", "operational", "untested", "rust", hours, year). A bad sign costs one 🔥.
- **Location and distance** from La Mesa, with a Directions button
- **How to buy**: online auction, bid increment, reserve, soft-close rules, inspection instructions and the contracting officer's contact details
- **Compare sold prices**, which opens eBay sold listings for the same item

It runs twice a day and only posts lots it hasn't posted before. The first run (`--initial`) posts a ranked summary plus the top 15 lots.

See [preview.html](preview.html) for what the cards look like. It's rendered from `sample.json`.

## Setup (about 15 minutes)

1. **Get the API key.** Sign up free at https://api.data.gov/signup/. The key arrives by email.
2. **Create the Slack channel.** In Slack, make a channel such as `#gear-deals` and invite anyone you want in it.
3. **Create the Slack app.** Go to https://api.slack.com/apps → Create New App → From an app manifest → pick your workspace → paste this:
   ```yaml
   display_information:
     name: Gear Tracker
     description: Event gear deals from government surplus auctions
     background_color: "#1a1d21"
   features:
     bot_user:
       display_name: Gear Tracker
   oauth_config:
     scopes:
       bot:
         - incoming-webhook
   ```
   Then go to Install to Workspace → choose `#gear-deals` → Allow. Under **Incoming Webhooks**, copy the webhook URL.
4. **Add the secrets to GitHub.** In this repo, go to Settings → Secrets and variables → Actions:
   - Under Secrets, add `GSA_API_KEY` and `SLACK_WEBHOOK_URL`.
   - Under Variables, add `GEAR_TRACKER_ENABLED` = `true`. This turns on the twice-daily schedule.
5. **Run the first scan.** Go to Actions → Gear tracker → Run workflow, tick "First run", and click Run. The channel gets the summary and the top lots within about a minute.

## Tune it (`config.json`)
- `home`: where distance is measured from.
- `states`, `max_miles`: where to look.
- `exclude`: words that drop a lot (for example "parts only").
- Each category has `keywords`, a `max_bid` cap, and a `value` range used for the deal score.

## Test without keys
```
python gear_tracker.py --fixture sample.json --initial --preview preview.html
```

## Limits
- Federal surplus only (GSA Auctions). State and city surplus (GovDeals, PublicSurplus) has no public API.
- Values are rules of thumb, not appraisals. The "Compare sold prices" button is the reality check.
- Bids usually climb in the final hours, so the score is a snapshot of right now.
