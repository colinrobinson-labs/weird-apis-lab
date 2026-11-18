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
    c = crises.setdefault(iso, {"iso3": iso, "country": CUR["display"].get(iso, p["countries"][0]), "fts_country": p["countries"][0],
                                "short": CUR["short"].get(iso, CUR["display"].get(iso, p["countries"][0])), "lat": p["lat"], "lon": p["lon"], "plans": []})
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
# Fallback: the plan-level caseload in the HPC API (flash appeals and refugee plans are not in HAPI).
# Only data.attachments (plan level) is used: cluster caseloads overlap and can contain entry errors.
def find_in_need(o, out):
    if isinstance(o, dict):
        if o.get("type") == "inNeed" and isinstance(o.get("value"), (int, float)): out.append(o["value"])
        for v in o.values(): find_in_need(v, out)
    elif isinstance(o, list):
        for v in o: find_in_need(v, out)
    return out
for iso, c in crises.items():
    if c["pin"] is not None: continue
    for pl in c["plans"]:
        try:
            d = jget(f"https://api.hpc.tools/v1/public/plan/id/{pl['id']}?content=entities", tries=2)["data"]
            vals = []
            for a in d.get("attachments", []):
                if a.get("type") == "caseLoad": find_in_need(a, vals)
            if vals:
                c["pin"] = int(max(vals)); c["pin_year"] = str(YEAR); c["pin_src"] = "plan caseload"
                log("PIN from plan", iso, c["pin"]); break
        except Exception as e:
            log("plan caseload miss", iso, e)
        time.sleep(0.5)
log("no PIN for", sorted(iso for iso, c in crises.items() if c["pin"] is None))

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
    time.sleep(8)
    raw = get(u, tries=2, wait=15)
    return json.loads(raw) if raw and raw.strip().startswith(b"{") else {}

# GDELT is slow (often 30-90 s per query) and throttles shared runner IPs, so each run spends at most
# 18 minutes here, refreshes the stalest crises first, and carries earlier values forward for the rest.
PREV = {}
try:
    PREV = {c["iso3"]: c for c in json.load(open(OUT)).get("crises", [])}
except Exception:
    pass
today = dt.date.today().isoformat()
gdelt_ok = 0; gdelt_fail = 0; gdelt_deadline = time.time() + 18 * 60
def staleness(iso):
    p = PREV.get(iso) or {}
    return p.get("news_asof") or "0000"
order = sorted(crises, key=lambda iso: (staleness(iso), -crises[iso]["requirements"]))
for iso in order:
    c = crises[iso]; p = PREV.get(iso) or {}
    for k in ("news_30d", "news_daily", "headlines", "news_asof"):
        c[k] = p.get(k)
    c["headlines"] = c["headlines"] or []
    if (gdelt_fail >= 6 and gdelt_ok == 0) or time.time() > gdelt_deadline:
        continue
    name = CUR.get("names", {}).get(iso, c["short"])
    q = f'"{name}" (humanitarian OR famine OR displaced OR refugees OR aid OR crisis) sourcelang:english'
    try:
        d = gdelt(q, "timelinevolraw")
        series = d.get("timeline", [{}])[0].get("data", [])
        if series:
            c["news_daily"] = [int(x["value"]) for x in series]
            c["news_30d"] = sum(c["news_daily"]); c["news_asof"] = today
            gdelt_ok += 1
    except Exception as e:
        gdelt_fail += 1; log("GDELT vol failed", iso, e); continue
    if time.time() > gdelt_deadline: continue
    try:
        d = gdelt(q, "artlist", "&maxrecords=40&sort=datedesc")
        seen, hl = set(), []
        for a in d.get("articles", []):
            t = a.get("title", "").strip()
            if not t or t.lower() in seen: continue
            if not re.search(r"\b" + re.escape(name.split()[0]), t, re.I): continue  # headline must name the place
            seen.add(t.lower())
            hl.append({"title": t, "url": a.get("url"), "source": a.get("domain"), "date": a.get("seendate", "")[:8]})
            if len(hl) == 4: break
        if hl: c["headlines"] = hl
    except Exception as e:
        gdelt_fail += 1; log("GDELT art failed", iso, e)
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
            name = CUR.get("hot_names", {}).get(iso, c["fts_country"])
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
    "sources_ok": {"fts": True, "hapi": bool(pin), "gdelt": sum(1 for c in L if c.get("news_30d") is not None), "gdelt_fresh": gdelt_ok, "wikipedia": sum(1 for c in L if c.get("wiki")), "hot": hot_ok},
    "totals": {"requirements": sum(c["requirements"] for c in L), "funding": sum(c["funding"] for c in L),
               "pin": sum(c["pin"] or 0 for c in L), "news": sum(c["news_30d"] or 0 for c in L)},
    "crises": sorted(L, key=lambda c: c.get("rank", 999)), "regional": regional, "log": LOG[-60:],
}
json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
log("wrote", OUT, os.path.getsize(OUT), "bytes;", len(ranked), "ranked")

# ---------- 8. Ways to help: match recipients to vetted directory, check every link ----------
HELP = json.load(open(os.path.join(HERE, "help.json")))
BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
_checked = {}
def check(url):
    if url in _checked: return _checked[url]
    st = None
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": BROWSER_UA, "Accept": "text/html,*/*"})
            with urllib.request.urlopen(req, timeout=30) as r: st = r.status
            break
        except urllib.error.HTTPError as e:
            st = e.code
            if method == "GET" or e.code not in (403, 405, 400, 429, 501): break
        except Exception as e:
            st = "err:" + type(e).__name__
    # 401/403/429 = a bot wall, the page exists for people; 404/410/DNS errors = dead
    ok = isinstance(st, int) and (st < 400 or st in (401, 403, 429))
    _checked[url] = (ok, st); return ok, st

org_url = {}
for o in HELP["orgs"]:
    o["rx"] = re.compile(o["match"], re.I)
    for u in o["urls"]:
        ok, st = check(u)
        if ok: org_url[o["key"]] = u; break
        log("dead link", o["key"], u, st)
for c in out["crises"]:
    give, seen = [], set()
    for r in c.get("recipients", []):
        for o in HELP["orgs"]:
            if o["key"] in seen or o["key"] not in org_url: continue
            if o["rx"].search(r["name"]):
                seen.add(o["key"]); give.append({"key": o["key"], "name": o["name"], "what": o["what"], "url": org_url[o["key"]], "usd": r["usd"], "fts_name": r["name"]}); break
    c["give"] = give[:8]
links = {}
for grp in ("pooled", "volunteer", "speak", "learn"):
    links[grp] = []
    for x in HELP[grp]:
        ok = False
        for cand in x.get("urls") or [x["url"]]:
            test = cand.replace("{country}", "Sudan").replace("{iso3l}", "sdn").replace("{plan}", "1514")
            ok, st = check(test)
            if ok: x = dict(x, url=cand); break
            log("dead link", x["key"], test, st)
        x = {k: v for k, v in x.items() if k != "urls"}
        links[grp].append(dict(x, ok=ok))
out["links"] = links
out["link_checks"] = {u: s for u, (ok, s) in _checked.items()}
out["log"] = LOG[-80:]
json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
log("help matched; wrote again", os.path.getsize(OUT))
