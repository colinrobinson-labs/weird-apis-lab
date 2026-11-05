#!/usr/bin/env python3
"""Gear Deal Tracker: federal surplus (GSA Auctions) -> Slack, for event-production gear.

Each run:
  1. Pulls every open lot from the GSA Auctions API.
  2. Keeps lots matching config.json (keywords, states, distance, price caps, exclusions).
  3. For each lot works out: rough used value, all-in cost (bid + hauling), deal score,
     suggested max bid, condition signals, distance and drive time, time left,
     how the auction works, the buying steps, and who to contact.
  4. Posts one Slack card per new lot (photo, numbers, buttons) and remembers it in seen.json.
     Lots you've already seen get one "ending soon" reminder if they're still a good deal.

Modes:
  python gear_tracker.py                 normal run. The very first run (no seen.json yet) is
                                         automatically a first scan: summary + top lots.
  python gear_tracker.py --initial       force a first scan again
  python gear_tracker.py --preview F     render the Slack cards to an HTML file, post nothing
  add --fixture sample.json to use test data instead of the live API
  add --dump F to save the raw API response (for debugging)

Env: GSA_API_KEY (free: https://api.data.gov/signup/), SLACK_WEBHOOK_URL
No third-party packages. Python 3.9+.
"""
import argparse, datetime as dt, html, json, math, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://api.gsa.gov/assets/gsaauctions/v2/auctions"
UA = {"User-Agent": "gear-deal-tracker/3.0 (+https://github.com/colinrobinson-labs/weird-apis-lab)"}
PACIFIC = dt.timezone(dt.timedelta(hours=-8))  # display only; close enough year-round for "Fri Nov 14"


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def http_json(url, timeout=60, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (401, 403):
                raise SystemExit(f"GSA API refused the key (HTTP {e.code}). Check the GSA_API_KEY secret.")
            if e.code == 429:
                time.sleep(20 * (i + 1))
                continue
            time.sleep(3 * (i + 1))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last = e
            time.sleep(3 * (i + 1))
    raise last


def fetch_lots(api_key):
    q = urllib.parse.urlencode({"api_key": api_key, "format": "JSON"})
    data = http_json(f"{API}?{q}", timeout=120)
    return unwrap(data)


def unwrap(data):
    if isinstance(data, dict):
        for k in ("Results", "results", "lots", "data", "items"):
            if isinstance(data.get(k), list):
                return data[k]
        return []
    return data if isinstance(data, list) else []


def s(v):
    """Any API value -> clean string (the API mixes numbers and strings)."""
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r"\s+", " ", str(v)).strip()


def money(v):
    try:
        return float(s(v).replace(",", "").replace("$", "") or 0)
    except ValueError:
        return 0.0


def num(v):
    try:
        return int(float(s(v).replace(",", "")))
    except ValueError:
        return None


def text_of(lot):
    return f"{s(lot.get('itemname'))} {s(lot.get('lotdescript'))} {lot.get('_info', '')[:1500]}".lower()


def state_of(lot):
    return s(lot.get("propertystate")).upper()


def zip5(v):
    z = re.sub(r"\D", "", s(v))
    if len(z) in (4, 8):  # numeric ZIPs lose their leading zero
        z = "0" + z
    return z[:5] if len(z) >= 5 else ""


def normalize(lot):
    """The live feed uses camelCase keys (itemName) while GSA's docs say ItemName. Lower-case them all,
    and turn the HTML lotInfo (the full description) into plain text."""
    if not isinstance(lot, dict):
        return None
    out = {str(k).lower(): v for k, v in lot.items()}
    out["_info"] = html_text(out.get("lotinfo"))
    return out


def html_text(h):
    t = s(h)
    if not t:
        return ""
    t = re.sub(r"(?i)<br\s*/?>|</p>|</li>|</div>|</h\d>", "\n", t)
    t = re.sub(r"(?i)<li[^>]*>", "\n• ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t).replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", x).strip() for x in t.split("\n")]
    return "\n".join(x for x in lines if x)


BOILER = re.compile(r"(?i)appointment|inspect|removal|remove|payment|pay |contact|business hours|working days|terms|bidder|"
                    r"buyer|sold as|as-is|as is|where is|liability|warrant|government|gsa|loading|forklift on site|title|sf-?97|"
                    r"note:|disclaimer|mandatory|must |shall |responsib")


def summary_of(lot):
    """A short, useful description: the first lines of lotInfo that describe the item, not the rules."""
    keep = []
    for line in lot.get("_info", "").split("\n"):
        line = line.strip(" •")
        if len(line) < 8 or BOILER.search(line):
            continue
        keep.append(line.rstrip(".") + ".")
        if sum(len(x) for x in keep) > 260:
            break
    txt = " ".join(keep) or s(lot.get("lotdescript"))
    txt = sentence_case(txt)
    return txt[:300].rsplit(" ", 1)[0] + "…" if len(txt) > 300 else txt


def sentence_case(t):
    """GSA text is often ALL CAPS. Make it readable without wrecking model numbers like MEP-806B."""
    letters = [c for c in t if c.isalpha()]
    if not letters or sum(c.isupper() for c in letters) / len(letters) < 0.7:
        return t
    t = re.sub(r"[A-Za-z0-9][A-Za-z0-9'/-]*", lambda m: m.group(0) if re.search(r"\d", m.group(0)) else m.group(0).lower(), t)
    t = re.sub(r"(^|[.!?:]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)
    t = re.sub(r"\b(gsa|usa|usmc|usaf|vin|pto|hvac|am|pm|pst|pdt|mst|ups|led|mep|ac|dc|ca|az|nv|or|ut)\b(?=[\s.,;:)]|$)",
               lambda m: m.group(1).upper() if m.group(1) not in ("or",) else "or", t)
    return re.sub(r"(?i)\b(\d+(?:\.\d+)?)\s?(kw|kva)\b", lambda m: m.group(1) + " " + {"kw": "kW", "kva": "kVA"}[m.group(2).lower()], t)


def status_of(lot):
    st = s(lot.get("auctionstatus")).lower()
    if st in ("a", "active"):
        return "live now, taking bids"
    if st in ("p", "preview"):
        return "preview, bidding opens soon"
    return st or "scheduled"


# ---------- location ----------
_zip_cache = None
_geo_fail = 0
ZIP_CACHE = HERE / "zipcache.json"


def zip_latlon(z):
    """ZIP -> (lat, lon) via zippopotam.us, cached in zipcache.json. Gives up after 3 straight failures."""
    global _zip_cache, _geo_fail
    if _zip_cache is None:
        _zip_cache = load_json(ZIP_CACHE, {})
    z = zip5(z)
    if not z:
        return None
    if z in _zip_cache:
        return tuple(_zip_cache[z]) if _zip_cache[z] else None
    if _geo_fail >= 3 or os.environ.get("GEAR_NO_GEO"):
        return None
    try:
        p = http_json(f"https://api.zippopotam.us/us/{z}", timeout=10, tries=1)["places"][0]
        _zip_cache[z] = [round(float(p["latitude"]), 4), round(float(p["longitude"]), 4)]
        _geo_fail = 0
    except urllib.error.HTTPError as e:
        if e.code == 404:
            _zip_cache[z] = None
        else:
            _geo_fail += 1
    except Exception:
        _geo_fail += 1
    v = _zip_cache.get(z)
    return tuple(v) if v else None


def save_zip_cache():
    if _zip_cache:
        ZIP_CACHE.write_text(json.dumps(_zip_cache, sort_keys=True, separators=(",", ":")))


def miles(a, b):
    r = 3958.8
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


# ---------- matching ----------
def has(text, words):
    return any(re.search(rf"\b{re.escape(w.lower())}\b", text) for w in words)


def match(lot, cfg):
    text = text_of(lot)
    name = s(lot.get("itemname")).lower() + " " + s(lot.get("lotdescript")).lower()
    if cfg.get("states") and state_of(lot) not in cfg["states"]:
        return None
    if has(text, cfg.get("exclude", [])):
        return None
    for cat in cfg["categories"]:
        if has(name, cat["keywords"]) and not has(name, cat.get("not", [])):
            if cat.get("max_bid") is not None and money(lot.get("highbidamount")) > cat["max_bid"]:
                return None
            return cat
    return None


# ---------- appraisal ----------
def parse_kw(text):
    m = re.search(r"(\d{1,4}(?:\.\d+)?)\s*-?\s*(kw|kilowatt)\b", text)
    if m and 1 <= float(m.group(1)) <= 2500:
        return float(m.group(1))
    m = re.search(r"(\d{1,4})\s*-?\s*kva\b", text)
    return float(m.group(1)) * 0.8 if m else None


def parse_qty(text):
    for pat in (r"qty[:.\s]*(\d+)", r"quantity[:\s]*(\d+)", r"\((\d+)\)", r"(\d+)\s*(?:ea|each|pcs|pieces|units|sets)\b", r"lot of (\d+)"):
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


GOOD = [r"\bruns\b", r"\bstarts\b", r"\boperational\b", r"\boperable\b", r"in working (?:order|condition)", r"\bworks\b",
        r"good condition", r"excellent condition", r"low hours", r"\bserviceable\b", r"runs and drives", r"\bdrives\b",
        r"like new", r"no known (?:major )?issues", r"recently serviced", r"new battery"]
BAD = [r"does not (?:run|start|work|operate)", r"won'?t start", r"\bno key", r"parts (?:are )?missing", r"\bdamaged?\b",
       r"\bleaks?\b", r"\bleaking\b", r"\bcracked\b", r"needs (?:repair|work|battery|tires?)", r"\binoperable\b",
       r"(?:operating )?condition (?:is unknown|has not been (?:determined|verified))", r"\buntested\b", r"not (?:been )?tested",
       r"flat tires?", r"\brust(?:y|ed)?\b", r"\bno title\b", r"dead batter(?:y|ies)", r"engine (?:issue|problem|knock)",
       r"transmission (?:issue|problem|slips)", r"check engine"]
GRADES = [  # GSA's own condition wording -> (label, risk)
    (r"new/unused|\bunused\b|\bnew\b", "New / unused", 0),
    (r"usable|\bused\b|\bgood\b", "Used", 0),
    (r"repairable", "Repairable (needs work)", 1),
    (r"salvage|scrap", "Salvage", 2),
]


def gsa_grade(info):
    t = info.lower()
    m = (re.search(r"\b(?:is|are) (?:listed as |in )?(new/unused|unused|new|used|usable(?:/good)?|repairable|salvage|scrap)(?: condition)?\b", t)
         or re.search(r"condition(?: is|:)\s*(new/unused|unused|new|used|usable|repairable|salvage|scrap)\b", t))
    if not m:
        return None, 0
    for pat, label, risk in GRADES:
        if re.search(pat, m.group(1)):
            return label, risk
    return None, 0


def condition(lot):
    t = text_of(lot)
    # GSA boilerplate ("working condition not guaranteed", "condition of the property is not warranted") is on nearly
    # every lot, so it is stripped before reading signals.
    t = re.sub(r"working condition not guaranteed|condition of the property is not warranted|evaluate its condition", " ", t)
    good = sorted({re.search(p, t).group(0) for p in GOOD if re.search(p, t)})
    bad = sorted({re.search(p, t).group(0) for p in BAD if re.search(p, t)})
    official, risk = gsa_grade(lot.get("_info", "") + " " + s(lot.get("lotdescript")))
    hrs = re.search(r"(?:hour meter(?: reads)?|hours?)[:\s]+(\d[\d,.]*)|(\d[\d,]{1,6})\s*(?:hrs|hours)\b", t)
    mi = re.search(r"(?:mileage|odometer(?: reads)?)[:\s]+(\d[\d,]*)|(\d[\d,]{2,7})\s*(?:miles)\b", t)
    yr = re.search(r"\b(19[5-9]\d|20[0-3]\d)\b", s(lot.get("itemname"))) or re.search(r"\b(19[5-9]\d|20[0-3]\d)\b", t)
    if risk >= 2 or (bad and not good and risk >= 1):
        grade = "⚠️ Risky"
    elif bad and good:
        grade = "🟡 Mixed signals"
    elif bad or risk == 1:
        grade = "🟡 Needs work"
    elif good:
        grade = "✅ Reported working"
    else:
        grade = "❔ Not stated, inspect it"
    if official:
        grade += f" · GSA grade: {official}"
    facts = []
    if yr:
        facts.append(f"year {yr.group(1)}")
    if hrs:
        facts.append(f"{(hrs.group(1) or hrs.group(2)).rstrip('.,')} hrs")
    if mi:
        facts.append(f"{(mi.group(1) or mi.group(2)).rstrip('.,')} mi")
    return grade, good, bad, facts, risk


DATE = r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"


def deadlines(lot):
    """Pull 'PAYMENT DUE BY 11-09-2026 & REMOVAL BY 11-20-2026' style dates out of the instructions."""
    t = (s(lot.get("instruction")) + " " + lot.get("_info", "")).lower()
    pay = re.search(r"payment[^.;]{0,40}?(?:due|by|no later than)[^0-9]{0,15}" + DATE, t)
    rem = re.search(r"removal[^.;]{0,40}?(?:by|due|no later than|completed by)[^0-9]{0,15}" + DATE, t)
    return (pay.group(1) if pay else ""), (rem.group(1) if rem else "")


def local_contact(lot):
    m = re.search(r"(?:local )?poc[:\s]+([A-Za-z.' -]{3,40}),?\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})?[,;\s]*([\w.+-]+@[\w-]+\.[\w.]+)?", lot.get("_info", ""), re.I)
    if not m:
        return ""
    return " · ".join(x.strip() for x in m.groups() if x and x.strip())


def name_from_email(email, fallback):
    local = email.split("@")[0] if "@" in email else ""
    parts = [p for p in re.split(r"[._]", local) if p.isalpha()]
    if len(parts) >= 2:
        return " ".join(p.capitalize() for p in parts[:3])
    f = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", s(fallback))
    return f.title() if f.isupper() else f


def deal_score(cost, lo, hi):
    """0–5 flames from all-in cost vs the low end of the used range."""
    if not lo:
        return 0, "no estimate"
    r = cost / lo
    sc = 5 if r <= .15 else 4 if r <= .3 else 3 if r <= .5 else 2 if r <= .75 else 1 if r <= 1 else 0
    pct = round((1 - cost / ((lo + hi) / 2)) * 100)
    return sc, (f"{pct}% under typical, all-in" if pct > 0 else "at or above typical")


def parse_end(v):
    """AucEndDt -> (aware datetime, has_time). Handles ISO 8601 (documented) and US formats."""
    d = s(v)
    if not d:
        return None, False
    x, has_time = None, True
    try:
        x = dt.datetime.fromisoformat(d.replace("Z", "+00:00"))
        has_time = "T" in d or " " in d.strip()
    except ValueError:
        for fmt in ("%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y %I:%M %p", "%m/%d/%Y %H:%M", "%m/%d/%Y"):
            try:
                x = dt.datetime.strptime(d, fmt)
                has_time = fmt != "%m/%d/%Y"
                break
            except ValueError:
                continue
    if x is None:
        return None, False
    if not has_time:  # date only: assume it closes late that day, Pacific
        return x.replace(hour=23, minute=59, tzinfo=PACIFIC), False
    if x.tzinfo is None:
        x = x.replace(tzinfo=dt.timezone.utc)
    return x, True


def ends_in(lot, now):
    end, has_time = parse_end(lot.get("aucenddt"))
    if not end:
        return None, s(lot.get("aucenddt")) or "?", None, has_time
    hrs = (end - now).total_seconds() / 3600
    if hrs < 0:
        return end, "ended", hrs, has_time
    if not has_time:  # the feed only gives a date; the exact closing time is on the lot page
        days = (end.date() - now.astimezone(PACIFIC).date()).days
        return end, ("closes today" if days <= 0 else "closes tomorrow" if days == 1 else f"{days} days left"), hrs, has_time
    if hrs < 1:
        left = "under 1h left"
    elif hrs < 48:
        left = f"{int(hrs)}h left"
    else:
        left = f"{int(hrs // 24)} days left"
    return end, left, hrs, has_time


def nice(x):
    x = s(x).title()
    x = re.sub(r"(\d)\s*Kw\b", r"\1 kW", x)
    x = re.sub(r"(\d)\s*Kva\b", r"\1 kVA", x)
    x = re.sub(r"\b(Lb|Lbs|Ft|Hp)\b", lambda m: m.group(1).lower(), x)
    return re.sub(r"\b(Pa|Mep|Led|Ac|Dc|Gsa|Usa|Usmc|Usaf|Ups|Atv|Utv|Hvac)\b", lambda m: m.group(1).upper(), x)


def phone(p):
    d = re.sub(r"\D", "", s(p))
    return f"({d[:3]}) {d[3:6]}-{d[6:10]}" if len(d) == 10 else s(p)


def lot_id(lot):
    return f"{s(lot.get('saleno'))}-{s(lot.get('lotno'))}"


def appraise(lot, cat, cfg, now):
    bid = money(lot.get("highbidamount"))
    inc = money(lot.get("aucincrement"))
    lo, hi, basis = estimate_value(lot, cat)
    grade, good, bad, facts, risk = condition(lot)
    pay_by, remove_by = deadlines(lot)
    city = nice(lot.get("propertycity"))
    st = state_of(lot)
    zp = zip5(lot.get("propertyzip"))
    home = cfg.get("home")
    ll = zip_latlon(zp)
    dist = round(miles((home["lat"], home["lon"]), ll)) if (ll and home) else None

    haul_kind = cat.get("haul", "pickup")
    rate = cfg.get("haul_per_mile", {}).get(haul_kind, 0)
    haul = round(dist * 2 * rate) if (dist is not None and rate) else None  # round trip
    reserve_amt = money(lot.get("reserve")) if not isinstance(lot.get("reserve"), bool) else 0
    next_bid = bid + inc if bid else (reserve_amt or inc or None)
    cost = (next_bid or bid) + (haul or 0)
    score, vs = deal_score(cost, lo, hi)
    if (bad or risk) and score:
        score = max(0, score - max(1, risk))  # condition risk costs flames
    early = bid <= 0
    if early and lo:
        score, vs = min(score, 3), "no bids yet, price will climb"
    max_pct = cfg.get("max_bid_pct_of_low", 0.6)
    walk_away = max(0, round((lo * max_pct - (haul or 0)) / 25) * 25) if lo else None

    end, left, hrs_left, has_time = ends_in(lot, now)
    agency = nice(lot.get("agencyname")) or nice(lot.get("propertyaddr1"))
    bureau = nice(lot.get("bureauname"))
    street = next((nice(lot.get(k)) for k in ("propertyaddr2", "propertyaddr3") if re.match(r"\s*\d", s(lot.get(k)))), "")
    addr = ", ".join(x for x in [nice(lot.get("propertyaddr1")), street, city, st, zp] if x)
    img = s(lot.get("imageurl"))
    if img.startswith("//"):
        img = "https:" + img
    url = s(lot.get("itemdescurl")) or "https://www.gsaauctions.gov"
    if url.startswith("http://"):
        url = "https://" + url[7:]
    return {
        "id": lot_id(lot), "cat": cat, "bid": bid, "inc": inc, "next_bid": next_bid, "lo": lo, "hi": hi, "basis": basis,
        "haul": haul, "haul_kind": haul_kind, "cost": cost, "score": score, "vs": vs, "walk_away": walk_away,
        "grade": grade, "good": good, "bad": bad, "facts": facts,
        "city": city, "st": st, "zip": zp, "dist": dist, "drive_h": round(dist / 55, 1) if dist is not None else None,
        "end": end, "left": left, "hrs_left": hrs_left, "end_has_time": has_time,
        "name": nice(lot.get("itemname")) or "Untitled lot",
        "desc": summary_of(lot),
        "url": url, "img": img if img.startswith("https://") else "",
        "reserve": reserve_amt, "has_reserve": bool(lot.get("reserve")), "bidders": num(lot.get("bidderscount")),
        "inactivity": num(lot.get("inactivitytime")),
        "inspect": sentence_case(" ".join(s(lot.get(k)) for k in ("instruction", "instruction1", "instruction2", "instruction3")).strip()),
        "co": name_from_email(s(lot.get("coemail")), lot.get("contractofficer")), "co_email": s(lot.get("coemail")).lower(), "co_phone": phone(lot.get("cophone")),
        "agency": agency + (f" · {bureau}" if bureau and bureau.lower() not in agency.lower() else ""),
        "site": nice(lot.get("propertyaddr1")), "addr": addr,
        "sale": s(lot.get("saleno")), "lotno": s(lot.get("lotno")),
        "status": status_of(lot), "early": early, "pay_by": pay_by, "remove_by": remove_by, "poc": local_contact(lot),
    }


# ---------- Slack Block Kit ----------
def flames(n):
    return "🔥" * n if n else "—"


def money_s(v):
    return f"${v:,.0f}" if v is not None else "?"


def esc(x):
    """Escape for Slack mrkdwn."""
    return s(x).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def end_s(a):
    if not a["end"]:
        return a["left"]
    loc = a["end"].astimezone(PACIFIC)
    when = loc.strftime("%a %b ") + str(loc.day) + (loc.strftime(", %-I:%M %p PT") if a["end_has_time"] else "")
    return f"{when} ({a['left']})"


def verdict(a):
    if a["early"] and a["walk_away"]:
        return f"🆕 *No bids yet.* A good target if it stays under {money_s(a['walk_away'])}."
    if a["score"] >= 4:
        return "🟢 *Strong deal.* Worth bidding."
    if a["score"] == 3:
        return "🟢 *Good deal* at today's price."
    if a["score"] == 2:
        return "🟡 *Fair.* Only if you need it."
    if a["score"] == 1:
        return "🟠 *Thin margin.* Watch, don't chase."
    return "⚪ *No edge* at this price." if a["lo"] else "⚪ *No value estimate* for this one."


def blocks_for(a, reminder=False):
    c = a["cat"]
    value = f"{money_s(a['lo'])}–{money_s(a['hi'])}" if a["lo"] else "no estimate"
    where = f"{a['city']}, {a['st']}" if a["city"] else (a["st"] or "location not listed")
    dist = f"{a['dist']:,} mi from {a['home']} (~{a['drive_h']:g}h drive)" if a["dist"] is not None else "distance unknown"
    cond = a["grade"] + (f" · {', '.join(a['facts'])}" if a["facts"] else "")
    bidline = (money_s(a["bid"]) if a["bid"] else "No bids yet") + (f" · {a['bidders']} bidders" if a["bidders"] else "")
    haul = (f"{money_s(a['haul'])} est. round trip ({a['haul_kind']})" if a["haul"] is not None else "unknown")
    allin = f"*{money_s(a['cost'])}*" + (f"\nnext bid {money_s(a['next_bid'])} + hauling" if a["haul"] else "")

    head_prefix = "⏰ Ending soon: " if reminder else f"{c.get('emoji', '')} "
    head = (head_prefix + a["name"])[:150]
    desc = esc(a["desc"])
    main = {"type": "section", "text": {"type": "mrkdwn", "text":
            f"*<{a['url']}|{esc(a['name'])}>*\n{c['name']} · {where} · {flames(a['score'])}\n{verdict(a)}"
            + (f"\n_“{desc}”_" if desc else "")}}

    flags = []
    if a["good"]:
        flags.append("👍 " + ", ".join(a["good"]))
    if a["bad"]:
        flags.append("👎 " + ", ".join(a["bad"]))
    if a["basis"]:
        flags.append(f"value basis: {a['basis']}")

    fmt = ["*Format:* timed online auction, *bid only* (GSA has no Buy Now). Highest bid at close wins. Sold as-is, where-is, no returns."]
    if a["inc"]:
        fmt.append(f"Bid increment {money_s(a['inc'])}.")
    if a["reserve"]:
        fmt.append(f"Reserve {money_s(a['reserve'])}: below that it won't sell.")
    elif a["has_reserve"]:
        fmt.append("*Hidden reserve:* there's a minimum price GSA doesn't show, so a low bid may not win it.")
    else:
        fmt.append("No reserve.")
    if a["inactivity"]:
        fmt.append(f"*Soft close:* it only ends after {a['inactivity']} min with no new bids, so sniping doesn't work. Set your max and stick to it.")

    steps = [
        "1. Register free at gsaauctions.gov (one-time ID check, do it before you need it).",
        f"2. Inspect: {esc(a['inspect'][:300])}" if a["inspect"] else "2. Inspect if you can. Ask the contact below for an appointment, and ask for more photos or a run video.",
        f"3. Bid. Next bid is {money_s(a['next_bid'])}. Suggested walk-away: *{money_s(a['walk_away'])}*." if a["walk_away"] else f"3. Bid. Next bid is {money_s(a['next_bid'])}.",
        (f"4. If you win, *pay by {a['pay_by']}*" if a["pay_by"] else "4. If you win, pay by the deadline in the lot's Terms of Sale (usually a few business days)")
        + ". GSA emails the award and takes payment online.",
        (f"5. *Remove it by {a['remove_by']}*" if a["remove_by"] else "5. Pick it up before the removal deadline")
        + f" from {esc(a['addr'] or where)}. You bring the truck, trailer or freight, plus loading help if the site has none.",
    ]
    contact = " · ".join(x for x in [esc(a["co"]), a["co_email"], a["co_phone"]] if x)
    if a["poc"]:
        contact = (f"{contact}\n*On site:* " if contact else "") + esc(a["poc"])

    out = [{"type": "header", "text": {"type": "plain_text", "text": head, "emoji": True}}]
    if a["img"]:
        out.append({"type": "image", "image_url": a["img"], "alt_text": a["name"][:100] or "lot photo"})
    out += [
        main,
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": f"*Current bid*\n{bidline}"},
            {"type": "mrkdwn", "text": f"*Typical used value*\n{value}"},
            {"type": "mrkdwn", "text": f"*All-in cost*\n{allin}"},
            {"type": "mrkdwn", "text": f"*Deal*\n{flames(a['score'])} {a['vs']}"},
            {"type": "mrkdwn", "text": f"*Condition*\n{cond}"},
            {"type": "mrkdwn", "text": f"*Ends*\n{end_s(a)}"},
            {"type": "mrkdwn", "text": f"*Located*\n{esc(a['addr'] or where)}\n{dist}"},
            {"type": "mrkdwn", "text": f"*Hauling*\n{haul}"},
            {"type": "mrkdwn", "text": f"*Selling agency*\n{esc(a['agency'] or 'GSA')}"},
            {"type": "mrkdwn", "text": f"*Auction status*\n{a['status'].capitalize()}"},
        ]},
    ]
    if flags:
        out.append({"type": "context", "elements": [{"type": "mrkdwn", "text": esc(" · ".join(flags))}]})
    out += [
        {"type": "section", "text": {"type": "mrkdwn", "text": " ".join(fmt)}},
        {"type": "section", "text": {"type": "mrkdwn", "text": "*How to buy it*\n" + "\n".join(steps)
                                     + (f"\n*GSA contact:* {contact}" if contact else "")}},
        {"type": "actions", "elements": [
            {"type": "button", "text": {"type": "plain_text", "text": "Open lot"}, "url": a["url"], "style": "primary"},
            {"type": "button", "text": {"type": "plain_text", "text": "Sold prices on eBay"},
             "url": "https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw=" + urllib.parse.quote(a["name"][:60])},
            {"type": "button", "text": {"type": "plain_text", "text": "Directions"},
             "url": "https://www.google.com/maps/dir/?api=1&destination=" + urllib.parse.quote(a["addr"] or where)},
        ] + ([{"type": "button", "text": {"type": "plain_text", "text": "Email contact"},
               "url": f"mailto:{a['co_email']}?subject=" + urllib.parse.quote(f"Sale {a['sale']} lot {a['lotno']}: {a['name']}")}]
             if a["co_email"] and "@" in a["co_email"] else [])},
        {"type": "context", "elements": [{"type": "mrkdwn", "text": f"Sale {a['sale']} · Lot {a['lotno']} · Values are rules of thumb, check sold prices before you bid big."}]},
    ]
    return out


def summary_blocks(items, cfg, initial, shown):
    by = {}
    for a in items:
        by.setdefault(a["cat"]["name"], []).append(a)
    lines = [f"{v[0]['cat'].get('emoji', '')} *{k}*: {len(v)}" for k, v in sorted(by.items(), key=lambda kv: -len(kv[1]))]
    hot = sum(1 for a in items if a["score"] >= 3)
    near = sum(1 for a in items if a["dist"] is not None and a["dist"] <= 150)
    title = "🛰️ Gear Tracker is live: first scan" if initial else f"🛰️ {len(items)} new surplus lots"
    intro = (f"I checked every open federal surplus auction (GSA) in {', '.join(cfg['states'])}. "
             f"*{len(items)}* lots match event gear. *{hot}* look like good deals (🔥🔥🔥 or better) and *{near}* are within 150 miles. "
             + (f"Here are the top {shown}, best deal first." if shown else ""))
    out = [
        {"type": "header", "text": {"type": "plain_text", "text": title, "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": intro}},
        {"type": "section", "text": {"type": "mrkdwn", "text": "\n".join(lines) or "Nothing matched today."}},
    ]
    if initial:
        out.append({"type": "context", "elements": [{"type": "mrkdwn", "text":
            "From now on I post new lots at about 7am and 5pm Pacific, plus one reminder when a good deal is about to close. "
            "🔥 compares the all-in cost (next bid + hauling) with a rough used-market range. Bids jump in the last hours, so the score is today's snapshot."}]})
    return out


def post_slack(url, blocks, fallback):
    """Post one message. Retries on rate limits; if Slack rejects the photo, retries without it."""
    def send(bl):
        body = json.dumps({"text": fallback[:300], "blocks": bl, "unfurl_links": False, "unfurl_media": False}).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode()
    for attempt in range(4):
        try:
            send(blocks)
            return True
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="ignore")
            if e.code == 429:
                time.sleep(int(e.headers.get("Retry-After", "5")) + 1)
                continue
            if e.code in (404, 403, 410) or "no_service" in msg or "channel_not_found" in msg:
                raise SystemExit(f"Slack refused the webhook ({e.code} {msg}). Check the SLACK_WEBHOOK_URL secret.")
            no_img = [b for b in blocks if b["type"] != "image"]
            for b in no_img:
                b.pop("accessory", None)
            if no_img != blocks:
                log(f"Slack rejected the card ({msg}); retrying without the photo")
                blocks = no_img
                continue
            log(f"Slack rejected the card ({e.code} {msg}); skipping it")
            return False
        except (urllib.error.URLError, TimeoutError) as e:
            log(f"network error posting to Slack: {e}; retrying")
            time.sleep(3 * (attempt + 1))
    return False


# ---------- HTML preview (what Slack will show) ----------
def preview_html(groups, note=""):
    def md(x):
        x = html.escape(x, quote=False).replace("&amp;lt;", "&lt;").replace("&amp;gt;", "&gt;").replace("&amp;amp;", "&amp;")
        x = re.sub(r"&lt;(https?://[^|]+)\|(.+?)&gt;", r'<a href="\1">\2</a>', x)
        x = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<b>\1</b>", x)
        x = re.sub(r"(?<![\w_])_([^_\n]+)_(?![\w_])", r"<i>\1</i>", x)
        return x.replace("\n", "<br>")
    out = []
    for blocks in groups:
        out.append('<div class="msg"><div class="av">🛰️</div><div class="body"><div class="who">Gear Tracker <span>APP</span> <time>7:02 AM</time></div>')
        for b in blocks:
            t = b["type"]
            if t == "header":
                out.append(f'<h3>{html.escape(b["text"]["text"])}</h3>')
            elif t == "image":
                out.append(f'<img class="photo" src="{html.escape(b["image_url"])}" alt="{html.escape(b["alt_text"])}" loading="lazy">')
            elif t == "section":
                if "text" in b:
                    out.append(f'<div class="sec">{md(b["text"]["text"])}</div>')
                if "fields" in b:
                    out.append('<div class="fields">' + "".join(f"<div>{md(f['text'])}</div>" for f in b["fields"]) + "</div>")
            elif t == "context":
                out.append(f'<div class="ctx">{md(b["elements"][0]["text"])}</div>')
            elif t == "actions":
                out.append('<div class="btns">' + "".join(
                    f'<a class="btn{" p" if e.get("style") == "primary" else ""}" href="{html.escape(e["url"])}" target="_blank" rel="noopener">{html.escape(e["text"]["text"])}</a>'
                    for e in b["elements"]) + "</div>")
        out.append("</div></div>")
    css = """*{box-sizing:border-box}body{margin:0;background:#1a1d21;color:#d1d2d3;font:15px/1.46 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%}
.ch{position:sticky;top:0;z-index:2;background:#1a1d21;padding:12px 16px;border-bottom:1px solid #35373b;font-weight:800;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px}
.ch small{font-weight:400;color:#ababad;font-size:12px;text-align:right}
.note{margin:12px 16px 0;padding:10px 12px;border:1px solid #35373b;border-left:3px solid #e8912d;border-radius:6px;font-size:13px;color:#ababad;max-width:760px}
.wrap{max-width:800px;padding:8px 0 40px}
.msg{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid #222529}.body{min-width:0;flex:1}
.av{width:36px;height:36px;border-radius:8px;background:#2b2d31;display:grid;place-items:center;flex:none;font-size:18px}
.who{font-weight:800;color:#fff}.who span{font-size:10px;background:#35373b;padding:1px 4px;border-radius:3px;margin-left:4px;color:#ababad;font-weight:700}.who time{font-weight:400;color:#ababad;font-size:12px;margin-left:4px}
h3{margin:6px 0 6px;color:#fff;font-size:17px;line-height:1.3}
.photo{display:block;width:100%;max-width:460px;aspect-ratio:4/3;object-fit:cover;border-radius:8px;margin:6px 0;background:#222529}
.sec{margin:6px 0;overflow-wrap:anywhere}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px;margin:10px 0;overflow-wrap:anywhere}
.ctx{font-size:12.5px;color:#ababad;margin:6px 0;overflow-wrap:anywhere}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.btn{border:1px solid #565856;border-radius:6px;padding:6px 12px;color:#d1d2d3;text-decoration:none;font-weight:700;font-size:13px}.btn.p{background:#007a5a;border-color:#007a5a;color:#fff}
a{color:#1d9bd1}i{color:#ababad}
@media(max-width:480px){body{font-size:14.5px}.msg{padding:12px 12px;gap:8px}.av{width:30px;height:30px;font-size:15px}.fields{gap:8px 12px}h3{font-size:16px}}"""
    note_html = f'<div class="note">{note}</div>' if note else ""
    return (f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>Gear Tracker preview</title><style>{css}</style>'
            f'<div class="ch"># gear-deals <small>Preview of the Slack posts · <a href="setup.html">Set it up</a></small></div>{note_html}<div class="wrap">{"".join(out)}</div></html>')


# ---------- seen state ----------
def load_seen(path):
    raw = load_json(path, None)
    if raw is None:
        return None
    if isinstance(raw, list):  # v2 format
        return {i: {"first": ""} for i in raw}
    return raw


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--initial", action="store_true", help="force a first scan: summary + top lots")
    ap.add_argument("--preview", metavar="HTML", help="write the Slack cards to an HTML file instead of posting")
    ap.add_argument("--fixture", help="read lots from a JSON file instead of the API")
    ap.add_argument("--dump", metavar="JSON", help="save the raw API response here")
    ap.add_argument("--dry-run", action="store_true", help="print, don't post or mark seen")
    ap.add_argument("--now", help="pretend it's this UTC time (ISO), for testing")
    args = ap.parse_args()

    cfg = load_json(HERE / "config.json", {})
    seen_path = HERE / "seen.json"
    seen = load_seen(seen_path)
    first_time = seen is None
    seen = seen or {}
    initial = args.initial or first_time
    now = dt.datetime.fromisoformat(args.now).replace(tzinfo=dt.timezone.utc) if args.now else dt.datetime.now(dt.timezone.utc)

    if args.fixture:
        lots = unwrap(load_json(args.fixture, {}))
    else:
        key = os.environ.get("GSA_API_KEY") or ("DEMO_KEY" if (args.preview or args.dry_run) else "")
        if not key:
            sys.exit("Set GSA_API_KEY (free at https://api.data.gov/signup/)")
        lots = fetch_lots(key)
        if args.dump:
            slim = [{**{k: v for k, v in l.items() if k != "lotInfo"}, "lotInfo": s(l.get("lotInfo"))[:6000]} for l in lots if isinstance(l, dict)]
            Path(args.dump).write_text(json.dumps({"fetched": now.isoformat(), "total": len(lots), "lots": slim}, indent=0))
    lots = [x for x in (normalize(l) for l in lots) if x]
    log(f"{len(lots)} open lots from GSA")

    items = []
    for lot in lots:
        try:
            cat = match(lot, cfg)
            if not cat:
                continue
            a = appraise(lot, cat, cfg, now)
        except Exception as e:  # one weird lot must never kill the run
            log(f"skipped a lot ({lot_id(lot)}): {e!r}")
            continue
        a["home"] = cfg.get("home", {}).get("name", "home")
        if a["left"] == "ended":
            continue
        if a["dist"] is not None and cfg.get("max_miles") and a["dist"] > cfg["max_miles"]:
            continue
        items.append(a)
    items.sort(key=lambda a: (-a["score"], a["dist"] if a["dist"] is not None else 9999))

    fresh = items if initial else [a for a in items if a["id"] not in seen]
    fresh_ids = {a["id"] for a in fresh}
    soon_h = cfg.get("reminder_hours", 24)
    reminders = [a for a in items if a["id"] in seen and a["id"] not in fresh_ids and not seen[a["id"]].get("reminded")
                 and a["hrs_left"] is not None and 0 < a["hrs_left"] <= soon_h and a["score"] >= cfg.get("reminder_min_score", 3)]

    limit = cfg.get("initial_scan_limit", 15) if initial else cfg.get("max_posts_per_run", 25)
    shown = fresh[:limit]
    groups = []
    if initial or len(fresh) > 1:
        groups.append(summary_blocks(fresh, cfg, initial, len(shown)))
    groups += [blocks_for(a) for a in shown]
    groups += [blocks_for(a, reminder=True) for a in reminders]

    digest = "\n".join(f"- {flames(a['score'])} {a['cat']['name']}: {a['name']} · bid {money_s(a['bid'])} · all-in {money_s(a['cost'])} · "
                       f"{a['city']}, {a['st']} · {a['left']} · {a['url']}" for a in fresh)
    print(f"{len(items)} matching lots, {len(fresh)} new, {len(reminders)} ending-soon reminders")
    print(digest)

    save_zip_cache()
    if args.preview:
        note = ("Built from live GSA data on " + now.strftime("%b %d, %Y") + ".") if not args.fixture else \
               "Sample data, so you can see the layout. Real posts use live GSA listings and their photos."
        Path(args.preview).write_text(preview_html(groups, note))
        print("preview written to", args.preview)
        return
    (HERE / "digest.md").write_text(f"# Gear deals {now.date()}\n\n{digest or 'Nothing new.'}\n")
    if args.dry_run:
        return

    hook = os.environ.get("SLACK_WEBHOOK_URL")
    if not hook:
        sys.exit("Set SLACK_WEBHOOK_URL to post to Slack.")
    if not groups and cfg.get("post_when_empty"):
        groups = [summary_blocks([], cfg, False, 0)]
    posted = 0
    for g in groups:
        fallback = next((b["text"]["text"] for b in g if b["type"] == "header"), "Gear deals")
        if post_slack(hook, g, fallback):
            posted += 1
        time.sleep(1.1)  # Slack allows about 1 message per second per webhook
    print(f"posted {posted}/{len(groups)} messages")

    stamp = now.strftime("%Y-%m-%d")
    for a in items:
        seen.setdefault(a["id"], {"first": stamp})
    for a in reminders:
        seen[a["id"]]["reminded"] = stamp
    # forget lots not seen for 120 days so the file stays small
    cutoff = (now - dt.timedelta(days=120)).strftime("%Y-%m-%d")
    live = {a["id"] for a in items}
    seen = {k: v for k, v in seen.items() if k in live or v.get("first", "9") >= cutoff}
    seen_path.write_text(json.dumps(seen, indent=0, sort_keys=True))


if __name__ == "__main__":
    main()
