#!/usr/bin/env python3
"""Gear Deal Tracker: watches GSA Auctions (federal surplus) for event-production gear.

Daily run:
  1. Pull every open lot from the GSA Auctions API.
  2. Keep lots that match the watchlist in config.json (keywords, states, price caps).
  3. Skip lots already sent (seen.json).
  4. Post a digest to Slack (SLACK_WEBHOOK_URL) and write digest.md.

Needs: Python 3.9+, no third-party packages.
Env:   GSA_API_KEY (free from https://api.data.gov/signup/), SLACK_WEBHOOK_URL (optional)
Usage: python gear_tracker.py [--dry-run] [--fixture sample.json]
"""
import argparse, datetime as dt, json, os, re, sys, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://api.gsa.gov/assets/gsaauctions/v2/auctions"


def load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except FileNotFoundError:
        return default


def fetch_lots(api_key):
    q = urllib.parse.urlencode({"api_key": api_key, "format": "JSON"})
    with urllib.request.urlopen(f"{API}?{q}", timeout=60) as r:
        data = json.load(r)
    # The API wraps lots in "Results"; accept a bare list too.
    return data.get("Results", data) if isinstance(data, dict) else data


def money(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def match(lot, cfg):
    """Return (category, reason) if the lot is wanted, else None."""
    text = f"{lot.get('ItemName','')} {lot.get('LotDescript','')}".lower()
    state = (lot.get("PropertyState") or lot.get("LocationST") or "").upper()
    if cfg.get("states") and state not in cfg["states"]:
        return None
    if any(re.search(rf"\b{re.escape(x.lower())}\b", text) for x in cfg.get("exclude", [])):
        return None
    for cat in cfg["categories"]:
        if any(re.search(rf"\b{re.escape(k.lower())}\b", text) for k in cat["keywords"]):
            bid = money(lot.get("HighBidAmount"))
            cap = cat.get("max_bid")
            if cap is not None and bid > cap:
                return None
            deal = cat.get("deal_under")
            flag = deal is not None and bid <= deal
            return cat["name"], flag
    return None


def lot_id(lot):
    return f"{lot.get('SaleNo','')}-{lot.get('LotNo','')}"


def fmt_line(lot, cat, flag):
    bid = money(lot.get("HighBidAmount"))
    city = lot.get("PropertyCity") or lot.get("LocationCity") or "?"
    st = lot.get("PropertyState") or lot.get("LocationST") or ""
    ends = lot.get("AucEndDt", "?")
    star = "🔥 " if flag else ""
    name = (lot.get("ItemName") or "Untitled").strip().title()
    url = lot.get("ItemDescURL") or "https://gsaauctions.gov"
    return f"{star}*{cat}* · <{url}|{name}> · ${bid:,.0f} · {city.title()}, {st} · ends {ends}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print, don't post or mark seen")
    ap.add_argument("--fixture", help="read lots from a local JSON file instead of the API")
    args = ap.parse_args()

    cfg = load_json(HERE / "config.json", None)
    if not cfg:
        sys.exit("config.json missing")
    seen = set(load_json(HERE / "seen.json", []))

    if args.fixture:
        raw = json.loads(Path(args.fixture).read_text())
        lots = raw.get("Results", raw) if isinstance(raw, dict) else raw
    else:
        key = os.environ.get("GSA_API_KEY")
        if not key:
            sys.exit("Set GSA_API_KEY (free at https://api.data.gov/signup/)")
        lots = fetch_lots(key)

    hits = []
    for lot in lots:
        m = match(lot, cfg)
        if m and lot_id(lot) not in seen:
            hits.append((lot, *m))
    hits.sort(key=lambda h: (not h[2], h[0].get("AucEndDt", "")))  # deals first, then soonest closing

    today = dt.date.today().isoformat()
    if hits:
        body = "\n".join(fmt_line(*h) for h in hits)
        text = f"*Gear deals: {len(hits)} new lot(s), {today}*\n{body}"
    else:
        text = f"Gear deals: nothing new today ({today})."
    (HERE / "digest.md").write_text(text + "\n")
    print(text)

    if args.dry_run:
        return
    hook = os.environ.get("SLACK_WEBHOOK_URL")
    if hook and (hits or cfg.get("post_when_empty")):
        req = urllib.request.Request(hook, json.dumps({"text": text}).encode(), {"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=30)
    seen.update(lot_id(h[0]) for h in hits)
    (HERE / "seen.json").write_text(json.dumps(sorted(seen)))


if __name__ == "__main__":
    main()
