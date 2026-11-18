/* Region data: food help sites, stores, ZIPs and place names, all from one static file
   built nightly on GitHub. Searching a ZIP or neighborhood happens on the phone. */
import { fetchJSON, S, save, dist } from "./core.js";

let R = null;
export async function region() {
  if (R) return R;
  const r = await fetchJSON("data/regions/san-diego.json");
  const byId = new Map();
  for (const s of r.sites) byId.set(s.id, s);
  for (const s of r.stores) byId.set(s.id, s);
  r.byId = byId;
  // a few extra words people type for the county's bigger areas
  r.placeIdx = buildPlaces(r);
  return (R = r);
}

const fold = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

function buildPlaces(r) {
  const out = new Map();
  const add = (name, lat, lon, zip) => { const k = fold(name); if (k && !out.has(k)) out.set(k, { name, lat, lon, zip }); };
  // ZIP centroids give one point per city name: use the ZIP whose center is nearest the city's middle
  const cities = {};
  for (const [z, [lat, lon, city]] of Object.entries(r.zips)) (cities[city] ||= []).push([lat, lon, z]);
  for (const [city, pts] of Object.entries(cities)) {
    const la = pts.reduce((a, p) => a + p[0], 0) / pts.length, lo = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    add(city, +la.toFixed(5), +lo.toFixed(5), null);
  }
  for (const [name, lat, lon] of r.places || []) add(name, lat, lon, null);
  return out;
}

export const inRegion = (lat, lon, r = R) => r && lat >= r.bbox[1] && lat <= r.bbox[3] && lon >= r.bbox[0] && lon <= r.bbox[2];

/* Returns {lat, lon, label, zip, src} or {error: "notfound"|"outside"} */
export async function findPlace(q) {
  const r = await region();
  const s = String(q || "").trim();
  if (!s) return { error: "notfound" };
  const zip = s.match(/^\d{5}$/)?.[0];
  if (zip) {
    const z = r.zips[zip];
    if (z) return { lat: z[0], lon: z[1], label: zip, zip, src: "zip" };
    return { error: /^9(19|20|21)/.test(zip) ? "notfound" : "outside" };
  }
  const k = fold(s);
  if (!k) return { error: "notfound" };
  const exact = r.placeIdx.get(k);
  if (exact) return { lat: exact.lat, lon: exact.lon, label: exact.name, zip: null, src: "place" };
  // starts-with, then contains
  let best = null;
  for (const [key, p] of r.placeIdx) {
    if (key.startsWith(k)) { best = p; break; }
  }
  if (!best && k.length >= 4) for (const [key, p] of r.placeIdx) if (key.includes(k)) { best = p; break; }
  if (best) return { lat: best.lat, lon: best.lon, label: best.name, zip: null, src: "place" };
  return { error: "notfound" };
}

/* Suggestions for the search box (datalist) */
export async function placeNames() {
  const r = await region();
  return [...new Set([...r.placeIdx.values()].map(p => p.name))].sort((a, b) => a.localeCompare(b));
}

export function setLoc(loc) {
  S.loc = loc; save("loc");
  window.dispatchEvent(new CustomEvent("pm:loc"));
}

/* Nearest ZIP for a GPS point, so the label is something people recognize */
export function nearestZip(lat, lon, r = R) {
  let best = null, bd = Infinity;
  for (const [z, [a, b]] of Object.entries(r.zips)) { const d = dist(lat, lon, a, b); if (d < bd) { bd = d; best = z; } }
  return best;
}
