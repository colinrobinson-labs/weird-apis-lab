import json, urllib.request, os
OUT = os.path.join(os.path.dirname(__file__), "caseload_probe.txt")
lines = []
def walk(o, path, out):
    if isinstance(o, dict):
        if o.get("type") == "inNeed" and isinstance(o.get("value"), (int, float)):
            out.append((o["value"], path))
        for k, v in o.items(): walk(v, path + [k], out)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            tag = ""
            if isinstance(v, dict):
                tag = v.get("objectType") or v.get("type") or ""
                tag += ":" + str(v.get("objectId") or v.get("id") or "")
                nm = v.get("name") or (v.get("attachmentVersion") or {}).get("value", {}).get("description") if isinstance(v.get("attachmentVersion"), dict) else v.get("name")
                tag += ":" + str(nm)[:40]
            walk(v, path + [f"[{i}]{tag}"], out)
for pid in (1601, 1510, 1568, 1524, 1514):
    req = urllib.request.Request(f"https://api.hpc.tools/v1/public/plan/id/{pid}?content=entities", headers={"User-Agent": "forgotten-tracker"})
    d = json.loads(urllib.request.urlopen(req, timeout=90).read())
    found = walk(d, [], []) or []
    out = []; walk(d, [], out)
    lines.append(f"== plan {pid}: {len(out)} inNeed values; top-level keys {list(d.get('data', {}).keys())[:30]}")
    for v, p in sorted(out, key=lambda x: -x[0])[:12]:
        lines.append(f"{v:>12,}  {' > '.join(p)[-260:]}")
open(OUT, "w").write("\n".join(lines))
print("\n".join(lines))
