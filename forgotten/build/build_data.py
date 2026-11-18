"""Forgotten: builds ../data.json from live public sources.

Sources
- UN OCHA Financial Tracking Service (api.hpc.tools): 2026 appeals, requirements, funding, recipient orgs
- HDX HAPI (hapi.humdata.org): people in need, intersectoral, national level
- GDELT DOC 2.0: English-language news articles in the last 30 days, and recent headlines
- Wikimedia pageviews: 30-day reads of each crisis's Wikipedia article
- HOT Tasking Manager: open remote-mapping tasks per country
Stdlib only. Every source is optional except FTS; missing data is written as null, never guessed.
"""
import base64, datetime as dt, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data.json")
YEAR = dt.date.today().year
UA = "forgotten-tracker/0.2 (+https://colinrobinson-labs.github.io/weird-apis-lab/forgotten/)"
APP = base64.b64encode(b"forgotten-tracker:forgotten-tracker@users.noreply.github.com").decode()
LOG = []

def log(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); LOG.append(s)

def get(url, tries=4, wait=6, accept="application/json"):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(wait * (i + 1) * 2); continue
            break
        except Exception as e:
            last = repr(e); time.sleep(wait * (i + 1))
    raise RuntimeError(f"{last} for {url[:140]}")

def jget(url, **kw):
    return json.loads(get(url, **kw))

CUR = json.load(open(os.path.join(HERE, "curation.json")))

# ---------- 1. FTS plans + funding ----------
plans_raw = jget(f"https://api.hpc.tools/v1/public/plan/year/{YEAR}")["data"]
flow = jget(f"https://api.hpc.tools/v1/public/fts/flow?year={YEAR}&groupby=plan")["data"]
funded = {}
for o in flow["report3"]["fundingTotals"]["objects"][0]["singleFundingObjects"]:
    if o.get("id"): funded[o["id"]] = o.get("totalFunding") or 0

def plan_type(p):
    for c in p.get("categories", []):
        if c.get("group") == "planType": return c.get("name")
    return None

plans = []
for p in plans_raw:
    v = p.get("planVersion") or {}
    locs = [l for l in p.get("locations", []) if l.get("adminLevel") == 0 and not l.get("isRegion") and l.get("iso3")]
    req = p.get("revisedRequirements") or p.get("origRequirements") or 0
    plans.append({
        "id": p["id"], "name": v.get("name"), "short": v.get("shortName"), "code": v.get("code"),
        "type": plan_type(p), "iso3": [l["iso3"] for l in locs], "countries": [l["name"] for l in locs],
        "lat": locs[0].get("latitude") if len(locs) == 1 else None,
        "lon": locs[0].get("longitude") if len(locs) == 1 else None,
        "requirements": req, "funding": funded.get(p["id"], 0),
        "start": v.get("startDate"), "end": v.get("endDate"), "gho": v.get("isPartOfGHO"),
    })
log("FTS plans", len(plans), "types", sorted({str(p["type"]) for p in plans}))

# A crisis = a single-country plan (HNRP / HRP / flash appeal). Regional refugee plans are kept separately.
crises = {}
for p in plans:
    if len(p["iso3"]) != 1 or not p["requirements"]: continue
    iso = p["iso3"][0]
    c = crises.setdefault(iso, {"iso3": iso, "country": p["countries"][0], "lat": p["lat"], "lon": p["lon"], "plans": []})
    c["plans"].append({k: p[k] for k in ("id", "name", "type", "requirements", "funding", "code")})
regional = [ {k: p[k] for k in ("id","name","type","requirements","funding","countries")} for p in plans if len(p["iso3"]) != 1 and p["requirements"] ]
for c in crises.values():
    c["requirements"] = sum(x["requirements"] for x in c["plans"])
    c["funding"] = sum(x["funding"] for x in c["plans"])
    c["coverage"] = round(min(c["funding"] / c["requirements"], 1.5), 4) if c["requirements"] else None
    c["gap"] = max(c["requirements"] - c["funding"], 0)
log("crises", len(crises))

# ---------- 2. People in need (HDX HAPI) ----------
pin = {}
try:
    off = 0
    while True:
        u = ("https://hapi.humdata.org/api/v2/affected-people/humanitarian-needs?" + urllib.parse.urlencode({
            "app_identifier": APP, "admin_level": 0, "population_status": "INN", "sector_code": "Intersectoral",
            "output_format": "json", "limit": 10000, "offset": off}))
        rows = jget(u)["data"]
        for r in rows:
            if r.get("category") not in ("", None, "total", "Total"): continue
            iso, ref = r["location_code"], r["reference_period_start"] or ""
            if iso not in pin or ref > pin[iso]["ref"]:
                pin[iso] = {"n": r["population"], "ref": ref, "end": r.get("reference_period_end")}
        if len(rows) < 10000: break
        off += 10000; time.sleep(1.2)
    log("HAPI PIN countries", len(pin))
except Exception as e:
    log("HAPI failed", e)
for iso, c in crises.items():
    p = pin.get(iso)
    c["pin"] = p["n"] if p else None
    c["pin_year"] = p["ref"][:4] if p else None

# ---------- 3. Recipient organisations per crisis (FTS) ----------
for iso, c in crises.items():
    orgs = {}
    for pl in c["plans"]:
        try:
            d = jget(f"https://api.hpc.tools/v1/public/fts/flow?planId={pl['id']}&groupby=organization")["data"]
            for o in d["report3"]["fundingTotals"]["objects"][0]["singleFundingObjects"]:
                if o.get("id"): orgs[o["name"]] = orgs.get(o["name"], 0) + (o.get("totalFunding") or 0)
        except Exception as e:
            log("FTS orgs failed", iso, e)
        time.sleep(0.6)
    c["recipients"] = [{"name": n, "usd": v} for n, v in sorted(orgs.items(), key=lambda x: -x[1])[:15]]

# ---------- 4. News attention (GDELT) ----------
def gdelt(q, mode, extra=""):
    u = "https://api.gdeltproject.org/api/v2/doc/doc?" + urllib.parse.urlencode({"query": q, "mode": mode, "format": "json", "timespan": "30d"}) + extra
    time.sleep(6)
    return json.loads(get(u, tries=5, wait=8) or b"{}")

gdelt_ok = 0
for iso, c in crises.items():
    name = CUR.get("names", {}).get(iso, c["country"])
    q = f'"{name}" (humanitarian OR famine OR displaced OR refugees OR aid OR crisis) sourcelang:english'
    c["news_30d"] = None; c["news_daily"] = None; c["headlines"] = []
    try:
        d = gdelt(q, "timelinevolraw")
        series = d.get("timeline", [{}])[0].get("data", [])
        c["news_daily"] = [int(x["value"]) for x in series]
        c["news_30d"] = sum(c["news_daily"])
        gdelt_ok += 1
    except Exception as e:
        log("GDELT vol failed", iso, e)
    try:
        d = gdelt(q, "artlist", "&maxrecords=8&sort=datedesc")
        seen = set()
        for a in d.get("articles", []):
            t = a.get("title", "").strip()
            if not t or t.lower() in seen: continue
            seen.add(t.lower())
            c["headlines"].append({"title": t, "url": a.get("url"), "source": a.get("domain"), "date": a.get("seendate", "")[:8]})
            if len(c["headlines"]) == 4: break
    except Exception as e:
        log("GDELT art failed", iso, e)
log("GDELT ok", gdelt_ok, "of", len(crises))

# ---------- 5. Wikipedia reads ----------
end = dt.date.today() - dt.timedelta(days=1); start = end - dt.timedelta(days=29)
for iso, c in crises.items():
    c["wiki"] = None
    for title in CUR.get("wiki", {}).get(iso, []):
        u = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/"
             + urllib.parse.quote(title.replace(" ", "_"), safe="") + f"/daily/{start:%Y%m%d}/{end:%Y%m%d}")
        try:
            items = jget(u, tries=2)["items"]
            c["wiki"] = {"title": title, "views_30d": sum(i["views"] for i in items)}
            break
        except Exception as e:
            log("wiki miss", iso, title, e)
        time.sleep(0.3)

# ---------- 6. Remote volunteering: HOT Tasking Manager ----------
hot_ok = False
for iso, c in crises.items():
    c["map_tasks"] = []
for base in ("https://tasking-manager-production-api.hotosm.org/api/v2", "https://tasks.hotosm.org/api/v2"):
    try:
        for iso, c in crises.items():
            name = CUR.get("hot_names", {}).get(iso, c["country"])
            d = jget(f"{base}/projects/?" + urllib.parse.urlencode({"country": name, "projectStatuses": "PUBLISHED", "orderBy": "priority"}), tries=2)
            for pr in d.get("results", [])[:4]:
                c["map_tasks"].append({"id": pr["projectId"], "name": pr.get("name"), "priority": pr.get("priority"),
                    "mapped": pr.get("percentMapped"), "url": f"https://tasks.hotosm.org/projects/{pr['projectId']}"})
            time.sleep(0.5)
        hot_ok = True; log("HOT ok via", base); break
    except Exception as e:
        log("HOT failed via", base, e)

# ---------- 7. Forgotten index ----------
# Two neglect signals, each turned into a percentile among crises that have it (1 = most neglected):
#   funding: share of the appeal still unfunded
#   attention: news articles (30 days) per million people in need; Wikipedia reads per 1,000 people in need as fallback
L = list(crises.values())
for c in L:
    c["news_per_m"] = round(c["news_30d"] / (c["pin"] / 1e6), 1) if c.get("news_30d") is not None and c.get("pin") else None
    c["wiki_per_k"] = round(c["wiki"]["views_30d"] / (c["pin"] / 1e3), 2) if c.get("wiki") and c.get("pin") else None

def pct(vals, higher_is_worse):
    xs = sorted(v for v in vals if v is not None)
    def f(v):
        if v is None or not xs: return None
        below = sum(1 for x in xs if x < v); eq = sum(1 for x in xs if x == v)
        p = (below + 0.5 * eq) / len(xs)
        return round(p if higher_is_worse else 1 - p, 4)
    return f

f_fund = pct([1 - c["coverage"] for c in L if c["coverage"] is not None], True)
f_news = pct([c["news_per_m"] for c in L], False)
f_wiki = pct([c["wiki_per_k"] for c in L], False)
for c in L:
    c["s_funding"] = f_fund(1 - c["coverage"]) if c["coverage"] is not None else None
    att = [x for x in (f_news(c["news_per_m"]), f_wiki(c["wiki_per_k"])) if x is not None]
    c["s_attention"] = round(sum(att) / len(att), 4) if att else None
    parts = [x for x in (c["s_funding"], c["s_attention"]) if x is not None]
    c["index"] = round(100 * sum(parts) / len(parts)) if len(parts) == 2 else None
ranked = sorted([c for c in L if c["index"] is not None and (c.get("pin") or 0) >= 100000], key=lambda c: (-c["index"], -(c["pin"] or 0)))
for i, c in enumerate(ranked, 1): c["rank"] = i

out = {
    "generated": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z", "year": YEAR,
    "sources_ok": {"fts": True, "hapi": bool(pin), "gdelt": gdelt_ok, "wikipedia": sum(1 for c in L if c.get("wiki")), "hot": hot_ok},
    "totals": {"requirements": sum(c["requirements"] for c in L), "funding": sum(c["funding"] for c in L),
               "pin": sum(c["pin"] or 0 for c in L), "news": sum(c["news_30d"] or 0 for c in L)},
    "crises": sorted(L, key=lambda c: c.get("rank", 999)), "regional": regional, "log": LOG[-60:],
}
json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
log("wrote", OUT, os.path.getsize(OUT), "bytes;", len(ranked), "ranked")
