// Builds data/regions/san-diego.json from the raw public sources.
// Usage: node build-region.mjs <rawDir> <outDir> [--report]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSchedule, parseNotes, resolveYears } from "../js/hours.js";

const here = dirname(fileURLToPath(import.meta.url));
const [raw = "raw", outDir = join(here, "../data/regions")] = process.argv.slice(2);
const REPORT = process.argv.includes("--report");
const rd = async f => existsSync(join(raw, f)) ? JSON.parse(await readFile(join(raw, f), "utf8")) : null;
const fetched = (await rd("report.json"))?.fetched || new Date().toISOString();
const REF = new Date(fetched);
const BBOX = [-117.62, 32.53, -116.08, 33.51];
const inBox = (lat, lon) => lon >= BBOX[0] && lon <= BBOX[2] && lat >= BBOX[1] && lat <= BBOX[3];
const r5 = x => Math.round(x * 1e5) / 1e5;
const clean = s => (s ?? "").toString().replace(/\s+/g, " ").replace(/\s+([,.;])/g, "$1").trim();
const none = s => !s || /^(none|n\/a|na|-)$/i.test(s.trim());

// Title-case names that arrive in ALL CAPS ("FOOD 4 LESS 318" -> "Food 4 Less")
function tidyName(n) {
  n = clean(n).replace(/\s+(#?\s?[A-Z]{0,3}-?\d{2,6}|\d{1,3})(\s+\d+)*$/i, "").replace(/\s+(Llc|Inc\.?|LLC|INC\.?)$/i, "").replace(/\s+NAFMNP$/i, "").replace(/\s+CFM\s*\d*$/i, "").trim();
  if (n === n.toUpperCase() && /[A-Z]{3}/.test(n)) n = n.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Of|And|De|La|Del)\b/g, w => w === "La" || w === "De" || w === "Del" ? w : w.toLowerCase());
  return n.replace(/^Ralph'?s Grocery$/i, "Ralphs").replace(/^Vons$/i, "Vons").replace(/'S\b/g, "'s").replace(/\bMkt\b/i, "Market");
}
function splitAddr(a) {
  // "5901 Rancho Hills Drive, San Diego, CA 92139" (+ ", US")
  a = clean(a).replace(/,?\s*(US|USA|United States)$/i, "");
  const m = a.match(/^(.*?),\s*([^,]+),\s*CA\s*(9\d{4})?/i);
  if (!m) return { a, c: "", z: (a.match(/\b9\d{4}\b/) || [""])[0] };
  return { a: m[1].trim(), c: m[2].trim(), z: m[3] || "" };
}
const phoneOf = s => { const d = (s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : ""; };
const firstPhoneIn = s => { const m = (s || "").match(/\(?\b(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})\b/); return m ? `${m[1]}-${m[2]}-${m[3]}` : ""; };
const urlOk = u => { try { const x = new URL(/^https?:/i.test(u) ? u : "https://" + u); return /\./.test(x.hostname) ? x.href : ""; } catch { return ""; } };

/* Short, translatable facts pulled from the food banks' English notes. The English stays visible too. */
function flagsFrom(...texts) {
  const s = texts.filter(Boolean).join(" ").toLowerCase();
  const f = [];
  if (/all are welcome|open to (the )?(public|all)|no eligibility|anyone/.test(s)) f.push("open");
  if (/appointment/.test(s)) f.push("appt");
  if (/call first|call ahead|call before/.test(s)) f.push("call");
  if (/\bid\b|identification/.test(s) && !/food bank id card/.test(s.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")) || /\bid (and|is|required)|photo id|id required/.test(s)) f.push("id");
  if (/proof of (address|residen)|utility bill|residents of|residents only|serves zip|zip codes?:/.test(s)) f.push("area");
  if (/income guidelines|proof of income|income/.test(s)) f.push("income");
  if (/senior|60\+|60 and older|65 and older/.test(s) && /only|senior food program/.test(s)) f.push("senior");
  if (/student/.test(s) && /only|current students|enrollment/.test(s)) f.push("student");
  if (/military|veteran/.test(s) && /only|required|families only/.test(s)) f.push("military");
  if (/drive[- ]?thr(u|ough)/.test(s)) f.push("drive");
  if (/walk[- ]?up/.test(s)) f.push("walk");
  if (/register|registration|intake/.test(s)) f.push("register");
  if (/food bank id card/.test(s)) f.push("fbid");
  if (/produce/.test(s)) f.push("produce");
  if (/diaper/.test(s)) f.push("diapers");
  return [...new Set(f)];
}

const sites = [];
const stats = { sdfb: 0, fsd: 0, conf: {} };
// ---- San Diego Food Bank ----
const sdfb = (await rd("sdfb.json"))?.results?.locations || [];
for (const l of sdfb) {
  const cf = JSON.parse(l.custom_fields || "{}");
  const when = clean(cf.neci8m1ih2), notes = clean(cf["6hqa392kmt"]), food = clean(cf.r9lac8vy2c), who = clean(cf.cooifgou2h), tips = clean(cf.t79gvzzldl);
  const tags = (l.tags || "").toLowerCase().split(",").map(s => s.trim());
  if (!l.loc_lat || !inBox(l.loc_lat, l.loc_long)) continue;
  const sch = parseSchedule(when, {}, REF);
  const nt = resolveYears(parseNotes(notes, "sdfb", REF), sch, REF);
  if (nt.unclear && sch.conf === "ok") sch.conf = "notes";
  const kind = tags.includes("senior") ? "senior" : "pantry";
  const ad = splitAddr(l.streetaddress);
  const prog = tags.includes("efap") ? "tefap" : tags.includes("senior") ? "csfp" : tags.includes("neighborhood distribution") ? "nd" : tags.includes("food to nonprofit") ? "agency" : "";
  sites.push({
    id: "sdfb-" + l.id, k: kind, n: clean(l.name), ...ad, lat: r5(l.loc_lat), lon: r5(l.loc_long),
    ph: phoneOf(l.phone) || firstPhoneIn(when), w: urlOk(l.website || ""),
    d: [{ src: "sdfb", prog, when, notes: none(notes) ? "" : notes, food: none(food) ? "" : food, who: none(who) ? "" : who.replace(/\s*\((click|Click) [Bb]elow\)?\.?/g, "").trim(), tips: none(tips) ? "" : tips,
      f: flagsFrom(who, tips, when, prog === "csfp" ? "senior food program only" : ""),
      sc: { rules: sch.rules, once: sch.once, except: sch.except, skip: nt.skip, add: nt.add, moved: nt.moved, skipMonths: nt.skipMonths }, conf: sch.conf }],
  });
  stats.sdfb++; stats.conf[sch.conf] = (stats.conf[sch.conf] || 0) + 1;
  if (REPORT) console.log(`[sdfb ${sch.conf}] ${when} || ${notes}\n   -> ${JSON.stringify({ r: sch.rules, o: sch.once, x: sch.except })} ${JSON.stringify(nt)}`);
}
// ---- Feeding San Diego ----
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const fsd = (await rd("fsd.json"))?.results?.locations || [];
for (const l of fsd) {
  const cf = JSON.parse(l.custom_fields || "{}");
  const when = clean(cf.l9y291xrn5), who = clean(cf.ppmuccyqra), notes = clean(cf.bqk2r0h4g4j);
  if (!l.loc_lat || !inBox(l.loc_lat, l.loc_long)) continue;
  const fields = Object.fromEntries(DAYS.map(d => [d, l[d] || ""]));
  const sch = parseSchedule(when, fields, REF);
  const nt = resolveYears(parseNotes(notes, "fsd", REF), sch, REF);
  if (nt.unclear && sch.conf === "ok") sch.conf = "notes";
  const ad = splitAddr(l.streetaddress);
  const tags = (l.tags || "").toLowerCase();
  const hoursText = DAYS.filter(d => l[d]).map(d => `${d[0].toUpperCase() + d.slice(1, 3)} ${clean(l[d])}`).join("; ");
  const whenText = /^weekly$/i.test(when) ? hoursText : [when, sch.rules.length && hoursText && !/^\d|of the month/i.test(when) ? hoursText : ""].filter(Boolean).join(". ");
  sites.push({
    id: "fsd-" + l.id, k: /senior/i.test(who) && /only/i.test(who) ? "senior" : "pantry", n: clean(l.name).replace(/\s+/g, " "), ...ad, lat: r5(l.loc_lat), lon: r5(l.loc_long),
    ph: phoneOf(l.phone), w: urlOk(l.website || ""),
    d: [{ src: "fsd", prog: "", when: whenText, notes, food: "", who, tips: tags.includes("call first") ? "Call first" : "",
      f: flagsFrom(who, tags, notes ? "" : ""),
      sc: { rules: sch.rules, once: sch.once, except: sch.except, skip: nt.skip, add: nt.add, moved: nt.moved, skipMonths: nt.skipMonths }, conf: sch.conf }],
  });
  stats.fsd++; stats.conf[sch.conf] = (stats.conf[sch.conf] || 0) + 1;
  if (REPORT) console.log(`[fsd ${sch.conf}] ${when} | ${JSON.stringify(fields).replace(/"[a-z]+":"",?/g, "")} || ${notes}\n   -> ${JSON.stringify({ r: sch.rules, o: sch.once })} ${JSON.stringify(nt)}`);
}
// The same place listed by both food banks: keep one place with both distributions.
const merged = [];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
for (const s of sites) {
  const near = merged.find(m => Math.abs(m.lat - s.lat) < 0.0006 && Math.abs(m.lon - s.lon) < 0.0007 && (norm(m.a).slice(0, 6) === norm(s.a).slice(0, 6) || norm(m.n).slice(0, 8) === norm(s.n).slice(0, 8)));
  if (near) { near.d.push(...s.d); near.ph ||= s.ph; near.w ||= s.w; if (s.k === "pantry") near.k = "pantry"; }
  else merged.push(s);
}

// ---- OpenStreetMap: free meals, community fridges, place names ----
const osm = (await rd("osm.json"))?.elements || [];
const places = [];
for (const e of osm) {
  const t = e.tags || {};
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
  if (lat == null || !inBox(lat, lon)) continue;
  if (t.place) { if (t.name) places.push([t.name, r5(lat), r5(lon)]); continue; }
  const kind = t.amenity === "community_fridge" || t.amenity === "food_sharing" ? "fridge" : (t.amenity === "soup_kitchen" || t.social_facility === "soup_kitchen") ? "meal" : (t.social_facility === "food_bank" || t.amenity === "food_bank") ? "pantry" : null;
  if (!kind || !t.name) continue;
  if (merged.some(m => Math.abs(m.lat - lat) < 0.001 && Math.abs(m.lon - lon) < 0.001)) continue;
  const a = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const oh = t.opening_hours || "";
  merged.push({ id: `osm-${e.type[0]}${e.id}`, k: kind, n: clean(t.name), a, c: t["addr:city"] || "", z: t["addr:postcode"] || "", lat: r5(lat), lon: r5(lon), ph: phoneOf(t.phone || t["contact:phone"]), w: urlOk(t.website || t["contact:website"] || ""),
    d: [{ src: "osm", prog: "", when: oh, notes: "", food: "", who: "", tips: "", f: [], sc: null, conf: oh ? "osm" : "call" }] });
}

// ---- USDA SNAP retailers: grocery stores and farmers markets that take EBT (CalFresh) ----
const BUDGET = /\b(winco|food 4 less|grocery outlet|aldi|walmart|smart (&|and) final|el super|northgate|vallarta|cardenas|superior|food ?maxx|costco|sam'?s club|99 ranch|seafood city|island pacific|vien dong|lucky seafood|zion market|h mart|manolo|carnival supermarket|valley farm market|balboa international|north park produce|otay farms|stater bros|la bodeg|tropicana|sf supermarket|minh huong|vinh hung|world foods|major market(?!place)|food bowl|garden farms|harvest international|liva|valleymax|vine ripe|ranch market|mercado|carniceria|meat market|produce)\b/i;
const PREMIUM = /\b(whole foods|gelson|pavilions|bristol farms|jimbo|lazy acres|jensen|keil|barons|cardiff seaside|frazier farms|ocean beach people|origins grocer|krisp|suncoast|sprouts|trader joe|seaside)\b/i;
const SKIP = /\b(cvs|walgreens|dollar ?tree|dollar general|family dollar|99 cents|liquor|nutrition(al)?( center)?|commissary|cash (&|and) carry|7-eleven|circle k|arco|chevron|shell|mobil|mini ?mart|stagecoach|resort|properties|exports|distributors|book|sweets|bakery|beverages|spice(s)? market)\b/i;
const CUISINE = [
  ["latin", /\b(northgate|vallarta|el super|cardenas|superior grocers|mercado|super ?mercado|carniceria|tortilleria|la posta|la perla|michoacana|mex|azteca|latin|el torito|el toro|el vecino|paisano|puebla|novillos|rodeo|bodeg|mi pueblo|cheran|la palapa|la favorita|la mexicana|manolo|otay farms|tropicana|tecate|el picador|la presa|vaquita|el puerto|fairmount|leon produce|pepe'?s|mi angel|garcia)\b/i],
  ["chinese", /\b(99 ranch|88 ranch|sf supermarket|sin lee|hoa hing|world foods)\b/i],
  ["vietnamese", /\b(vien dong|lucky seafood|minh huong|vinh hung|hoa hing|trang'?s|saigon|a mart)\b/i],
  ["filipino", /\b(seafood city|island pacific|manila|lita'?s|fil-?am|valleymax)\b/i],
  ["korean", /\b(zion market|h mart|chan dong)\b/i],
  ["middleeast", /\b(halal|balboa international|valley farm market|babylon|alrafidain|al ?rafidain|sawaya|alattar|safa|sams international|harvest international|habibi|saray|selecta|arman|bolbol|amoda|carnival)\b/i],
  ["afghan", /\b(afghan|kabul|ariana|arman|halal)\b/i],
  ["somali", /\b(halal|axum|addis|blue nile|african|kupanda|motherland|somali|bakaro)\b/i],
  ["haitian", /\b(caribbean|kiskeya|motherland|kupanda|haiti)\b/i],
  ["easteuro", /\b(european|continent deli|euro|russian|ukrain)\b/i],
];
const snap = (await rd("snap.json")) || [];
const stores = [];
for (const s of snap) {
  const a = s.attributes || s;
  const t = a.Store_Type;
  if (!["Supermarket", "Super Store", "Grocery Store", "Farmers and Markets", "Specialty Store", "Other", "Restaurant Meals Program"].includes(t)) continue;
  const lat = a.Latitude, lon = a.Longitude;
  if (!lat || !inBox(lat, lon)) continue;
  const raw = clean(a.Store_Name);
  if (t !== "Farmers and Markets" && t !== "Restaurant Meals Program" && SKIP.test(raw)) continue;
  if (t === "Other" && !CUISINE.some(([, rx]) => rx.test(raw)) && !BUDGET.test(raw)) continue;
  const n = tidyName(raw);
  if (t === "Restaurant Meals Program") {
    stores.push({ id: "rmp-" + a.Record_ID, k: "rmp", n, a: clean(a.Store_Street_Address), c: clean(a.City), z: a.Zip_Code || "", lat: r5(lat), lon: r5(lon) });
    continue;
  }
  const isMkt = t === "Farmers and Markets" || /farmers'? market|certified farm/i.test(raw);
  const cu = CUISINE.filter(([, rx]) => rx.test(raw)).map(([c]) => c);
  const tier = isMkt ? "mkt" : PREMIUM.test(raw) ? "premium" : BUDGET.test(raw) || cu.length ? "budget" : "standard";
  stores.push({ id: "snap-" + a.Record_ID, k: isMkt ? "market" : "store", n, a: clean(a.Store_Street_Address), c: clean(a.City), z: a.Zip_Code || "", lat: r5(lat), lon: r5(lon), tier, cu });
}

// ---- ZIP codes (Census ZCTA centroids) ----
const zips = {};
if (existsSync(join(raw, "zcta.tsv"))) {
  const lines = (await readFile(join(raw, "zcta.tsv"), "utf8")).split(/\r?\n/);
  const head = lines[0].split(/[|\t]/).map(h => h.trim());
  const iz = head.indexOf("GEOID"), ila = head.findIndex(h => /INTPTLAT/.test(h)), ilo = head.findIndex(h => /INTPTLONG/.test(h));
  for (const l of lines.slice(1)) {
    const c = l.split(/[|\t]/).map(x => x.trim());
    if (!c[iz]) continue;
    const la = +c[ila], lo = +c[ilo];
    if (inBox(la, lo)) zips[c[iz]] = [r5(la), r5(lo)];
  }
}
// ZIPs we saw on listings but that the gazetteer doesn't have (PO boxes): use the listing location
for (const s of [...merged, ...stores]) if (s.z && /^9\d{4}$/.test(s.z) && !zips[s.z]) zips[s.z] = [s.lat, s.lon];

// city names for each ZIP, from the listings (most common city)
const zc = {};
for (const s of [...merged, ...stores]) if (s.z && s.c) { zc[s.z] ||= {}; zc[s.z][s.c] = (zc[s.z][s.c] || 0) + 1; }
for (const z in zips) { const c = zc[z] && Object.entries(zc[z]).sort((a, b) => b[1] - a[1])[0][0]; if (c) zips[z].push(c); }

const out = {
  v: 1, region: "san-diego", name: "San Diego County", bbox: BBOX, built: fetched,
  sources: {
    sdfb: { name: "San Diego Food Bank", url: "https://www.sandiegofoodbank.org/get-food/", phone: "866-350-3663" },
    fsd: { name: "Feeding San Diego", url: "https://feedingsandiego.org/find-food/", phone: "858-452-3663" },
    snap: { name: "USDA SNAP Retailer Locator", url: "https://www.fns.usda.gov/snap/retailer-locator" },
    osm: { name: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
    zcta: { name: "U.S. Census Bureau, ZIP Code Tabulation Areas", url: "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html" },
  },
  sites: merged.sort((a, b) => a.n.localeCompare(b.n)),
  stores: stores.sort((a, b) => a.n.localeCompare(b.n)),
  zips, places: places.sort((a, b) => a[0].localeCompare(b[0])),
};
await mkdir(outDir, { recursive: true });
const json = JSON.stringify(out);
await writeFile(join(outDir, "san-diego.json"), json);
await writeFile(join(outDir, "index.json"), JSON.stringify({ v: 1, regions: [{ id: "san-diego", name: "San Diego County", bbox: BBOX, file: "san-diego.json", built: fetched, sites: merged.length, stores: stores.length }] }));
console.log(`[build] sites ${merged.length} (sdfb ${stats.sdfb}, fsd ${stats.fsd}), stores ${stores.length}, zips ${Object.keys(zips).length}, places ${places.length}, ${(json.length / 1024).toFixed(0)} KB`, stats.conf);
