// Downloads the public source data for one region into a raw/ folder.
// Runs on GitHub Actions only (the phone never calls any of these).
// Usage: node fetch-sources.mjs <outDir>
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const out = process.argv[2] || "raw";
await mkdir(out, { recursive: true });

// San Diego County, with a small margin.
const BBOX = { s: 32.53, w: -117.62, n: 33.51, e: -116.08 };
const UA = "PlentyMapDataBot/1.0 (free food-help app; nightly region build)";

const log = (...a) => console.log("[fetch]", ...a);
async function get(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(180000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= tries) throw e;
      log(`retry ${i} ${url}: ${e.message}`);
      await new Promise(res => setTimeout(res, 5000 * i));
    }
  }
}
async function save(name, data) {
  const s = typeof data === "string" ? data : JSON.stringify(data);
  await writeFile(join(out, name), s);
  log(`saved ${name} (${(s.length / 1024).toFixed(0)} KB)`);
}
const report = {};
async function step(name, fn) {
  try { await fn(); report[name] = "ok"; }
  catch (e) { report[name] = "failed: " + e.message; log(`FAILED ${name}: ${e.message}`); }
}

// 1. San Diego Food Bank distribution sites (the feed its own Food Locator Map reads).
await step("sdfb", async () => {
  const j = await (await get("https://api.storepoint.co/v1/16597334723364/locations")).json();
  if (!j?.results?.locations?.length) throw new Error("no locations");
  await save("sdfb.json", j);
});

// 2. Feeding San Diego distribution sites (the feed its own Find Food map reads).
await step("fsd", async () => {
  const r = await get("https://api26.storepoint.co/v2/16765f3e46d5c1/locations");
  const j = await r.json();
  await save("fsd.json", j);
});

// 3. OpenStreetMap: food banks, soup kitchens, community fridges, and place names (for search).
await step("osm", async () => {
  const b = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
  const q = `[out:json][timeout:170];
(
  nwr["amenity"~"^(food_bank|community_fridge|food_sharing|soup_kitchen)$"](${b});
  nwr["amenity"="social_facility"]["social_facility"~"^(food_bank|soup_kitchen)$"](${b});
);
out center tags;
(
  node["place"~"^(city|town|village|suburb|neighbourhood|quarter|hamlet)$"](${b});
);
out body qt;`;
  const eps = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
  let last;
  for (const ep of eps) {
    try {
      const r = await get(ep, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 2);
      const j = await r.json();
      if (!j.elements?.length) throw new Error("empty");
      await save("osm.json", j);
      return;
    } catch (e) { last = e; log(`overpass ${ep} failed: ${e.message}`); }
  }
  throw last;
});

// 4. ZIP code centroids (U.S. Census Gazetteer, ZCTA). San Diego County ZIPs are 919xx-921xx.
await step("zcta", async () => {
  for (const yr of [2025, 2024, 2023]) {
    try {
      const url = `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/${yr}_Gazetteer/${yr}_Gaz_zcta_national.zip`;
      const buf = Buffer.from(await (await get(url, {}, 2)).arrayBuffer());
      await writeFile("/tmp/zcta.zip", buf);
      const txt = execFileSync("unzip", ["-p", "/tmp/zcta.zip"], { maxBuffer: 64 << 20 }).toString();
      const lines = txt.split(/\r?\n/);
      const keep = [lines[0], ...lines.slice(1).filter(l => /^9(19|20|21)\d\d[|\t]/.test(l))];
      if (keep.length < 50) throw new Error("too few San Diego ZIPs: " + keep.length);
      await save("zcta.tsv", keep.join("\n"));
      report.zcta_year = yr;
      return;
    } catch (e) { log(`zcta ${yr}: ${e.message}`); }
  }
  throw new Error("no gazetteer year worked");
});

// 5. USDA SNAP retailer locations in San Diego County (public ArcGIS layer behind the SNAP Retailer Locator).
await step("snap", async () => {
  const base = "https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/snap_retailer_location_data/FeatureServer/0/query";
  const feats = [];
  for (let off = 0; off < 20000; off += 1000) {
    const p = new URLSearchParams({ where: "State='CA' AND County='SAN DIEGO'", outFields: "*", f: "json", resultOffset: off, resultRecordCount: 1000, outSR: 4326 });
    const j = await (await get(`${base}?${p}`)).json();
    if (j.error) throw new Error(JSON.stringify(j.error));
    feats.push(...(j.features || []));
    if (!j.exceededTransferLimit && (j.features || []).length < 1000) break;
  }
  if (!feats.length) throw new Error("no SNAP retailers returned");
  await save("snap.json", feats);
});

await save("report.json", { fetched: new Date().toISOString(), ...report });
log(report);
if (report.sdfb !== "ok" && report.fsd !== "ok") process.exit(1);
