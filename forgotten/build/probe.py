"""One-off probe: fetch sample responses from each source and save them for inspection."""
import json, os, base64, time, urllib.request, urllib.error
OUT = os.path.join(os.path.dirname(__file__), "probe")
os.makedirs(OUT, exist_ok=True)
APP = base64.b64encode(b"forgotten-tracker:forgotten-tracker@users.noreply.github.com").decode()
UA = {"User-Agent": "forgotten-tracker/0.1 (+https://colinrobinson-labs.github.io/weird-apis-lab/forgotten/)"}
URLS = {
  "fts_plans_2026": "https://api.hpc.tools/v1/public/plan/year/2026",
  "fts_flow_byplan_2026": "https://api.hpc.tools/v1/public/fts/flow?year=2026&groupby=plan",
  "fts_flow_country_sdn": "https://api.hpc.tools/v1/public/fts/flow?year=2026&countryISO3=SDN&groupby=organization",
  "hapi_needs": f"https://hapi.humdata.org/api/v2/affected-people/humanitarian-needs?app_identifier={APP}&admin_level=0&population_status=INN&sector_code=Intersectoral&output_format=json&limit=1000",
  "hapi_version": f"https://hapi.humdata.org/api/v2/util/version?app_identifier={APP}",
  "gdelt_sudan": "https://api.gdeltproject.org/api/v2/doc/doc?query=sudan%20humanitarian&mode=timelinevolraw&format=json&timespan=30d",
  "wiki_pv": "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/Sudanese_civil_war_(2023%E2%80%93present)/daily/20261001/20261031",
  "hot_tasks": "https://tasks.hotosm.org/api/v2/projects/?country=Sudan&projectStatuses=PUBLISHED",
  "reliefweb": "https://api.reliefweb.int/v2/disasters?appname=forgotten-tracker&limit=2",
  "globalgiving": "https://api.globalgiving.org/api/public/projectservice/countries/SD/projects/active",
  "crisisrelief": "https://crisisrelief.un.org/",
}
summary = {}
for name, url in URLS.items():
    try:
        req = urllib.request.Request(url, headers=dict(UA, Accept="application/json"))
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            summary[name] = {"status": r.status, "bytes": len(body)}
    except urllib.error.HTTPError as e:
        body = e.read(); summary[name] = {"status": e.code, "bytes": len(body)}
    except Exception as e:
        body = repr(e).encode(); summary[name] = {"error": repr(e)}
    open(os.path.join(OUT, name + ".txt"), "wb").write(body[:60000])
    time.sleep(6)
json.dump(summary, open(os.path.join(OUT, "_summary.json"), "w"), indent=1)
print(json.dumps(summary, indent=1))
