#!/usr/bin/env python3
"""Gear Deal Tracker: federal surplus (GSA Auctions) → Slack, for event-production gear.

Each run:
  1. Pulls every open lot from the GSA Auctions API.
  2. Keeps lots matching config.json (keywords, states, distance, price caps, exclusions).
  3. For each lot works out: rough market value, deal score, condition signals,
     distance from home, time left, how bidding and pickup work, and who to call.
  4. Posts one rich Slack card per new lot (photo, numbers, buttons) and remembers it in seen.json.

Modes:
  python gear_tracker.py                     daily run: post only lots not seen before
  python gear_tracker.py --initial           first run: post a ranked summary + the top lots, mark all seen
  python gear_tracker.py --preview out.html  render the Slack cards to an HTML file, post nothing
  add --fixture sample.json to use test data instead of the live API

Env: GSA_API_KEY (free: https://api.data.gov/signup/), SLACK_WEBHOOK_URL
No third-party packages. Python 3.9+.
"""
import argparse, datetime as dt, html, json, math, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://api.gsa.gov/assets/gsaauctions/v2/auctions"
UA = {"User-Agent": "gear-deal-tracker/2.0"}


def load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def http_json(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def fetch_lots(api_key):
    q = urllib.parse.urlencode({"api_key": api_key, "format": "JSON"})
    data = http_json(f"{API}?{q}")
    return data.get("Results", data) if isinstance(data, dict) else data


def money(v):
    try:
        return float(str(v or 0).replace(",", "").replace("$", ""))
    except ValueError:
        return 0.0


def clean(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def text_of(lot):
    return f"{lot.get('ItemName','')} {lot.get('LotDescript','')}".lower()


# ---------- location ----------
_zip_cache = {}


def zip_latlon(z):
    z = (z or "")[:5]
    if not re.fullmatch(r"\d{5}", z):
        return None
    if z in _zip_cache:
        return _zip_cache[z]
    try:
        j = http_json(f"https://api.zippopotam.us/us/{z}", timeout=15)
        p = j["places"][0]
        _zip_cache[z] = (float(p["latitude"]), float(p["longitude"]))
    except Exception:
        _zip_cache[z] = None
    return _zip_cache[z]


def miles(a, b):
    r = 3958.8
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


# ---------- matching ----------
def match(lot, cfg):
    text = text_of(lot)
    state = (lot.get("PropertyState") or lot.get("LocationST") or "").upper()
    if cfg.get("states") and state not in cfg["states"]:
        return None
    if any(re.search(rf"\b{re.escape(x.lower())}\b", text) for x in cfg.get("exclude", [])):
        return None
    for cat in cfg["categories"]:
        if any(re.search(rf"\b{re.escape(k.lower())}\b", text) for k in cat["keywords"]):
            if cat.get("max_bid") is not None and money(lot.get("HighBidAmount")) > cat["max_bid"]:
                return None
            return cat
    return None


# ---------- appraisal ----------
def parse_kw(text):
    m = re.search(r"(\d{1,4}(?:\.\d+)?)\s*-?\s*(kw|kilowatt)", text)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d{1,4})\s*kva", text)
    return float(m.group(1)) * 0.8 if m else None


def parse_qty(text):
    for pat in (r"qty[:\s]*(\d+)", r"quantity[:\s]*(\d+)", r"\((\d+)\)", r"(\d+)\s*(?:ea|each|pcs|pieces|units)\b", r"lot of (\d+)"):
        m = re.search(pat, text)
        if m and 1 < int(m.group(1)) < 5000:
            return int(m.group(1))
    return None


def estimate_value(lot, cat):
    """Rough used-market range for working gear. Returns (lo, hi, basis)."""
    v, text = cat.get("value", {}), text_of(lot)
    if "per_kw" in v:
        kw = parse_kw(text)
        if kw:
            return v["per_kw"][0] * kw, v["per_kw"][1] * kw, f"{kw:g} kW × ${v['per_kw'][0]}–{v['per_kw'][1]}/kW"
    if "per_qty" in v:
        q = parse_qty(text)
        if q:
            return v["per_qty"][0] * q, v["per_qty"][1] * q, f"{q} units × ${v['per_qty'][0]}–{v['per_qty'][1]} each"
    rng = v.get("fixed") or v.get("fallback")
    if rng:
        return rng[0], rng[1], f"typical used {cat['name'].lower()}"
    return None, None, ""


GOOD = [r"\bruns\b", r"\bstarts\b", r"operational", r"in working (?:order|condition)", r"\bworks\b", r"good condition", r"low hours", r"serviceable", r"drives"]
BAD = [r"does not (?:run|start|work)", r"won'?t start", r"\bno key", r"missing", r"damage", r"\bleak", r"cracked", r"needs (?:repair|work|battery)", r"condition unknown", r"untested", r"not tested", r"flat tire", r"rust"]


def condition(lot):
    t = text_of(lot)
    good = sorted({re.search(p, t).group(0) for p in GOOD if re.search(p, t)})
    bad = sorted({re.search(p, t).group(0) for p in BAD if re.search(p, t)})
    hrs = re.search(r"(\d[\d,]{1,6})\s*(?:hrs|hours)\b", t)
    miles_ = re.search(r"(\d[\d,]{2,7})\s*(?:miles|mi)\b", t)
    yr = re.search(r"\b(19[89]\d|20[0-3]\d)\b", t)
    if bad and not good:
        grade = "⚠️ Risky"
    elif good and not bad:
        grade = "✅ Reported working"
    elif good and bad:
        grade = "🟡 Mixed"
    else:
        grade = "❔ Not stated"
    facts = []
    if yr:
        facts.append(f"year {yr.group(1)}")
    if hrs:
        facts.append(f"{hrs.group(1)} hrs")
    if miles_:
        facts.append(f"{miles_.group(1)} mi")
    return grade, good, bad, facts


def deal_score(bid, lo, hi):
    """0–5 flames from current bid vs low end of market range."""
    if not lo:
        return 0, "no estimate"
    r = bid / lo if lo else 1
    s = 5 if r <= .15 else 4 if r <= .3 else 3 if r <= .5 else 2 if r <= .75 else 1 if r <= 1 else 0
    pct = max(0, round((1 - bid / ((lo + hi) / 2)) * 100))
    return s, f"{pct}% under typical" if pct else "at or above typical"


def ends_in(lot):
    d = lot.get("AucEndDt") or ""
    for fmt in ("%m/%d/%Y %H:%M:%S", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            end = dt.datetime.strptime(d[:19], fmt)
            hrs = (end - dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)).total_seconds() / 3600
            if hrs < 0:
                return end, "ended"
            return end, f"{int(hrs)}h left" if hrs < 48 else f"{int(hrs // 24)} days left"
        except ValueError:
            continue
    return None, d or "?"


def appraise(lot, cat, cfg):
    bid = money(lot.get("HighBidAmount"))
    lo, hi, basis = estimate_value(lot, cat)
    score, vs = deal_score(bid, lo, hi)
    grade, good, bad, facts = condition(lot)
    city = clean(lot.get("PropertyCity") or lot.get("LocationCity")).title()
    st = (lot.get("PropertyState") or lot.get("LocationST") or "").upper()
    zp = lot.get("PropertyZip") or lot.get("LocationZip")
    ll = zip_latlon(zp)
    home = cfg.get("home")
    dist = round(miles((home["lat"], home["lon"]), ll)) if (ll and home) else None
    end, left = ends_in(lot)
    if bad and score:
        score = max(0, score - 1)  # condition risk costs a flame
    return {
        "id": lot_id(lot), "cat": cat, "lot": lot, "bid": bid, "lo": lo, "hi": hi, "basis": basis,
        "score": score, "vs": vs, "grade": grade, "good": good, "bad": bad, "facts": facts,
        "city": city, "st": st, "zip": zp, "dist": dist, "end": end, "left": left,
        "name": nice(lot.get("ItemName")) or "Untitled lot",
        "desc": clean(lot.get("LotDescript")),
        "url": lot.get("ItemDescURL") or "https://gsaauctions.gov",
        "img": lot.get("ImageURL") or "",
        "reserve": money(lot.get("Reserve")), "inc": money(lot.get("AucIncrement")),
        "bidders": lot.get("BiddersCount"), "inactivity": lot.get("InactivityTime"),
        "inspect": " ".join(clean(lot.get(f"Instruction{i}")) for i in (1, 2, 3)).strip(),
        "co": clean(lot.get("ContractOfficer")), "co_email": clean(lot.get("COEmail")), "co_phone": clean(lot.get("COPhone")),
        "agency": clean(lot.get("AgencyName") or lot.get("PropertyAddr1")).title(),
        "addr": ", ".join(x for x in [clean(lot.get("PropertyAddr3")).title(), city, st, (zp or "")[:5]] if x),
        "status": {"A": "Active", "P": "Preview"}.get((lot.get("AuctionStatus") or "").upper(), "Scheduled"),
    }


def nice(s):
    s = clean(s).title()
    s = re.sub(r"(\d)\s*Kw\b", r"\1 kW", s)
    s = re.sub(r"\b(Kva|Lb|Lbs|Ft|Hp)\b", lambda m: m.group(1).lower(), s)
    return re.sub(r"\b(Pa|Mep|Led|Ac|Dc|Gsa|Usa)\b", lambda m: m.group(1).upper(), s)


def lot_id(lot):
    return f"{lot.get('SaleNo','')}-{lot.get('LotNo','')}"


# ---------- Slack Block Kit ----------
def flames(n):
    return "🔥" * n if n else "·"


def money_s(v):
    return f"${v:,.0f}" if v is not None else "?"


def blocks_for(a):
    c = a["cat"]
    value = f"{money_s(a['lo'])}–{money_s(a['hi'])}" if a["lo"] else "no estimate"
    where = f"{a['city']}, {a['st']}" + (f" · {a['dist']} mi from {a.get('home','home')}" if a["dist"] is not None else "")
    cond = a["grade"] + (f" ({', '.join(a['facts'])})" if a["facts"] else "")
    flags = []
    if a["good"]:
        flags.append("👍 " + ", ".join(a["good"]))
    if a["bad"]:
        flags.append("👎 " + ", ".join(a["bad"]))
    how = [f"*Online auction* ({a['status'].lower()}), sold as-is, where-is. Highest bid at close wins."]
    if a["inc"]:
        how.append(f"Bid increment {money_s(a['inc'])}.")
    how.append(f"Reserve {money_s(a['reserve'])}." if a["reserve"] else "No reserve listed.")
    if a["inactivity"]:
        how.append(f"Soft close: bidding stays open until {a['inactivity']} min pass with no new bids.")
    how.append("You arrange pickup or freight. Payment and removal deadlines are in the lot's Terms of Sale, and they're short.")
    head = f"{c.get('emoji','')} {a['name']}"[:150]
    main = {
        "type": "section",
        "text": {"type": "mrkdwn", "text": f"*<{a['url']}|{a['name']}>*\n{c['name']} · {where}\n{a['desc'][:280]}{'…' if len(a['desc'])>280 else ''}"},
    }
    if a["img"].startswith("http"):
        main["accessory"] = {"type": "image", "image_url": a["img"], "alt_text": a["name"][:100]}
    return [
        {"type": "header", "text": {"type": "plain_text", "text": head, "emoji": True}},
        main,
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": f"*Current bid*\n{money_s(a['bid'])}" + (f" · {a['bidders']} bidders" if a["bidders"] else "")},
            {"type": "mrkdwn", "text": f"*Deal*\n{flames(a['score'])} {a['vs']}"},
            {"type": "mrkdwn", "text": f"*Typical used value*\n{value}"},
            {"type": "mrkdwn", "text": f"*Condition*\n{cond}"},
            {"type": "mrkdwn", "text": f"*Ends*\n{a['end'].strftime('%a %b %d') if a['end'] else '?'} ({a['left']})"},
            {"type": "mrkdwn", "text": f"*Pickup*\n{a['addr'] or where}"},
        ]},
        {"type": "context", "elements": [{"type": "mrkdwn", "text": " · ".join(flags + [f"value basis: {a['basis']}"]) if (flags or a["basis"]) else " "}]},
        {"type": "section", "text": {"type": "mrkdwn", "text": "*How to buy* " + " ".join(how)
            + (f"\n*Inspection:* {a['inspect'][:300]}" if a["inspect"] else "")
            + (f"\n*Contact:* {a['co']} · {a['co_email']} · {a['co_phone']}" if a["co"] or a["co_email"] else "")}},
        {"type": "actions", "elements": [
            {"type": "button", "text": {"type": "plain_text", "text": "Open lot"}, "url": a["url"], "style": "primary"},
            {"type": "button", "text": {"type": "plain_text", "text": "Compare sold prices"}, "url": "https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw=" + urllib.parse.quote(a["name"][:60])},
            {"type": "button", "text": {"type": "plain_text", "text": "Directions"}, "url": "https://www.google.com/maps/dir/?api=1&destination=" + urllib.parse.quote(a["addr"] or where)},
        ]},
        {"type": "divider"},
    ]


def summary_blocks(items, cfg, initial):
    by = {}
    for a in items:
        by.setdefault(a["cat"]["name"], []).append(a)
    lines = [f"{v[0]['cat'].get('emoji','')} *{k}*: {len(v)}" for k, v in sorted(by.items(), key=lambda kv: -len(kv[1]))]
    hot = sum(1 for a in items if a["score"] >= 3)
    title = "🛰️ Gear tracker is live: first scan" if initial else f"🛰️ {len(items)} new surplus lots"
    intro = (f"Scanned every open GSA federal surplus auction in {', '.join(cfg['states'])}. "
             f"*{len(items)}* lots match event gear, and *{hot}* look like strong deals (🔥🔥🔥+). Top picks below, best deal first.")
    return [
        {"type": "header", "text": {"type": "plain_text", "text": title, "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": intro}},
        {"type": "section", "text": {"type": "mrkdwn", "text": "\n".join(lines) or "Nothing matched."}},
        {"type": "context", "elements": [{"type": "mrkdwn", "text": "🔥 = current bid vs a rough used-market range (tune in config.json). Bids usually jump in the final hours, so treat the score as today's snapshot."}]},
        {"type": "divider"},
    ]


def post_slack(url, blocks, fallback):
    for i in range(0, len(blocks), 48):  # Slack caps 50 blocks per message
        body = json.dumps({"text": fallback, "blocks": blocks[i:i + 48], "unfurl_links": False}).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=30).read()
        time.sleep(1.1)


# ---------- HTML preview (what Slack will show) ----------
def preview_html(groups):
    def md(s):
        s = html.escape(s)
        s = re.sub(r"&lt;(https?://[^|]+)\|([^&]+)&gt;", r'<a href="\1">\2</a>', s)
        s = re.sub(r"\*([^*]+)\*", r"<b>\1</b>", s)
        return s.replace("\n", "<br>")
    out = []
    for blocks in groups:
        out.append('<div class="msg"><div class="av">🛰️</div><div class="body"><div class="who">Gear Tracker <span>APP</span></div>')
        for b in blocks:
            t = b["type"]
            if t == "header":
                out.append(f'<h3>{html.escape(b["text"]["text"])}</h3>')
            elif t == "section":
                img = b.get("accessory", {}).get("image_url")
                out.append('<div class="sec">' + (f'<div class="txt">{md(b["text"]["text"])}</div>' if "text" in b else "")
                           + (f'<img src="{html.escape(img)}" alt="">' if img else "") + "</div>")
                if "fields" in b:
                    out.append('<div class="fields">' + "".join(f"<div>{md(f['text'])}</div>" for f in b["fields"]) + "</div>")
            elif t == "context":
                out.append(f'<div class="ctx">{md(b["elements"][0]["text"])}</div>')
            elif t == "actions":
                out.append('<div class="btns">' + "".join(f'<a class="btn{" p" if e.get("style")=="primary" else ""}" href="{html.escape(e["url"])}">{html.escape(e["text"]["text"])}</a>' for e in b["elements"]) + "</div>")
            elif t == "divider":
                out.append("<hr>")
        out.append("</div></div>")
    css = """body{margin:0;background:#1a1d21;color:#d1d2d3;font:15px/1.46 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ch{padding:12px 20px;border-bottom:1px solid #35373b;font-weight:700;color:#fff}.wrap{max-width:780px;padding:8px 0}
.msg{display:flex;gap:10px;padding:10px 20px}.av{width:36px;height:36px;border-radius:6px;background:#2b2d31;display:grid;place-items:center;flex:none}
.who{font-weight:700;color:#fff}.who span{font-size:10px;background:#35373b;padding:1px 4px;border-radius:3px;margin-left:4px;color:#ababad}
h3{margin:8px 0 4px;color:#fff;font-size:17px}.sec{display:flex;gap:12px;justify-content:space-between;margin:4px 0}.sec img{width:88px;height:88px;object-fit:cover;border-radius:6px;flex:none}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin:8px 0}.ctx{font-size:12.5px;color:#ababad;margin:4px 0}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.btn{border:1px solid #565856;border-radius:4px;padding:4px 12px;color:#d1d2d3;text-decoration:none;font-weight:700;font-size:13px}.btn.p{background:#007a5a;border-color:#007a5a;color:#fff}
a{color:#1d9bd1}hr{border:0;border-top:1px solid #35373b;margin:10px 0}"""
    return f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>#gear-deals preview</title><style>{css}</style><div class="ch"># gear-deals</div><div class="wrap">{"".join(out)}</div>'


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--initial", action="store_true", help="first run: post ranked summary + top lots, mark everything seen")
    ap.add_argument("--preview", metavar="HTML", help="write the Slack cards to an HTML file instead of posting")
    ap.add_argument("--fixture", help="read lots from a JSON file instead of the API")
    ap.add_argument("--dry-run", action="store_true", help="print, don't post or mark seen")
    args = ap.parse_args()

    cfg = load_json(HERE / "config.json", {})
    seen_path = HERE / "seen.json"
    seen = set(load_json(seen_path, []))

    if args.fixture:
        lots = load_json(args.fixture, {})
        lots = lots.get("Results", lots) if isinstance(lots, dict) else lots
    else:
        key = os.environ.get("GSA_API_KEY")
        if not key:
            sys.exit("Set GSA_API_KEY (free at https://api.data.gov/signup/)")
        lots = fetch_lots(key)

    items = []
    for lot in lots:
        cat = match(lot, cfg)
        if not cat:
            continue
        a = appraise(lot, cat, cfg)
        a["home"] = cfg.get("home", {}).get("name", "home")
        if a["left"] == "ended":
            continue
        if a["dist"] is not None and cfg.get("max_miles") and a["dist"] > cfg["max_miles"]:
            continue
        items.append(a)
    items.sort(key=lambda a: (-a["score"], a["end"] or dt.datetime.max))

    fresh = items if args.initial else [a for a in items if a["id"] not in seen]
    limit = cfg.get("initial_scan_limit", 15) if args.initial else 40
    groups = [summary_blocks(fresh, cfg, args.initial)] if (args.initial or len(fresh) > 1) else []
    groups += [blocks_for(a) for a in fresh[:limit]]

    digest = "\n".join(f"- {flames(a['score'])} {a['cat']['name']}: {a['name']} · {money_s(a['bid'])} · {a['city']}, {a['st']} · {a['left']} · {a['url']}" for a in fresh)
    (HERE / "digest.md").write_text(f"# Gear deals {dt.date.today()}\n\n{digest or 'Nothing new.'}\n")
    print(f"{len(items)} matching lots, {len(fresh)} to post")
    print(digest)

    if args.preview:
        Path(args.preview).write_text(preview_html(groups))
        print("preview written to", args.preview)
        return
    if args.dry_run:
        return
    hook = os.environ.get("SLACK_WEBHOOK_URL")
    if hook and (fresh or cfg.get("post_when_empty")):
        for g in groups:
            post_slack(hook, g, g[0]["text"]["text"] if g and g[0]["type"] == "header" else "Gear deals")
    seen |= {a["id"] for a in items}
    seen_path.write_text(json.dumps(sorted(seen), indent=0))


if __name__ == "__main__":
    main()
