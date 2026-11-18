/* The map: MapLibre + a San Diego County PMTiles file and glyphs, all served from our own site.
   Loaded only when someone opens the map, so the app shell stays small. */
import { t, esc } from "./core.js";
import { CONFIG } from "./config.js";

const KCOL = { pantry: "#E0664F", senior: "#6FA3DE", meal: "#B987C7", fridge: "#3FB8BC", store: "#7FC796", market: "#F5C04A", rmp: "#B987C7" };
let loaded = null;

function script(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("load " + src));
    document.head.appendChild(s);
  });
}
function css(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
}
async function libs() {
  if (loaded) return loaded;
  css("vendor/maplibre-gl.css");
  loaded = Promise.all([script("vendor/maplibre-gl-csp.js"), script("vendor/pmtiles.js"), script("vendor/basemaps.js")]).then(() => {
    const ml = window.maplibregl;
    ml.setWorkerUrl(new URL("vendor/maplibre-gl-csp-worker.js", location.href).href);
    const p = new window.pmtiles.Protocol();
    ml.addProtocol("pmtiles", p.tile);
    return ml;
  });
  return loaded;
}

/* Chalkboard colors over the Protomaps dark flavor */
function flavor() {
  const f = { ...window.basemaps.namedFlavor("dark") };
  Object.assign(f, {
    background: "#1F3B2D", earth: "#1F3B2D", water: "#122219",
    park_a: "#24452F", park_b: "#24452F", wood_a: "#24452F", wood_b: "#24452F", scrub_a: "#22412E", scrub_b: "#22412E",
    hospital: "#2B4D3B", school: "#2B4D3B", industrial: "#223F30", pedestrian: "#2B4D3B", aerodrome: "#223F30", runway: "#2E5240",
    sand: "#2A4734", beach: "#2A4734", zoo: "#24452F", military: "#223F30", glacier: "#2B4D3B", pier: "#2B4D3B",
    buildings: "#2A4A39",
    other: "#3A5C4A", minor_service: "#36584A", minor_a: "#46695A", minor_b: "#46695A", link: "#557868", major: "#6B8A79", highway: "#8EA597",
    minor_casing: "#1F3B2D", minor_service_casing: "#1F3B2D", link_casing: "#1F3B2D", major_casing_early: "#1F3B2D", major_casing_late: "#1F3B2D", highway_casing_early: "#1F3B2D", highway_casing_late: "#1F3B2D",
    railway: "#46695A", boundaries: "#6B8A79",
    roads_label_minor: "#C9C3B4", roads_label_minor_halo: "#1F3B2D", roads_label_major: "#E4DECF", roads_label_major_halo: "#1F3B2D",
    ocean_label: "#7FA08F", subplace_label: "#C9C3B4", subplace_label_halo: "#1F3B2D", city_label: "#F1EBDD", city_label_halo: "#1F3B2D",
    state_label: "#B4BCAE", state_label_halo: "#1F3B2D", country_label: "#B4BCAE", address_label: "#B4BCAE", address_label_halo: "#1F3B2D",
  });
  delete f.pois; // our own pins carry the meaning; shop icons would only add noise
  return f;
}

export async function mountMap(el, { center, onSelect }) {
  const ml = await libs();
  el.innerHTML = "";
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", t("map_label"));
  const base = CONFIG.dataBase;
  let file = "san-diego.pmtiles";
  try { const r = await fetch(base + "data/tiles/tiles.json", { cache: "no-cache" }); if (r.ok) file = (await r.json()).file || file; } catch {}
  if (!/^[\w.-]+\.pmtiles$/.test(file)) file = "san-diego.pmtiles";
  const tiles = new URL(base + "data/tiles/" + file, location.href).href;
  navigator.serviceWorker?.controller?.postMessage({ type: "tiles-file", path: new URL(tiles).pathname });
  const glyphs = new URL(base + "data/tiles/fonts/", location.href).href + "{fontstack}/{range}.pbf";
  const layers = window.basemaps.layers("protomaps", flavor(), { lang: "en" }).filter(l => !/^pois|landuse_pedestrian/.test(l.id) && !l.layout?.["icon-image"]);
  const map = new ml.Map({
    container: el,
    style: {
      version: 8, glyphs,
      sources: { protomaps: { type: "vector", url: "pmtiles://" + tiles, attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · Protomaps' } },
      layers,
    },
    center: [center.lon, center.lat], zoom: 12, minZoom: 8, maxZoom: 17,
    maxBounds: [[-118.3, 32.3], [-115.6, 33.8]],
    attributionControl: { compact: true }, cooperativeGestures: false, pitchWithRotate: false, dragRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");

  let pending = null, me = center;
  const ready = new Promise(res => map.on("load", res));
  ready.then(() => {
    map.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("me", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 14, "circle-color": "#F5C04A", "circle-opacity": 0.25 } });
    map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 6, "circle-color": "#F5C04A", "circle-stroke-color": "#1F3B2D", "circle-stroke-width": 2 } });
    map.addLayer({
      id: "pts", type: "circle", source: "pts",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 13, 8, 16, 11],
        "circle-color": ["match", ["get", "k"], ...Object.entries(KCOL).flat(), "#F1EBDD"],
        "circle-stroke-color": "#F1EBDD", "circle-stroke-width": 1.6,
      },
    });
    map.on("click", "pts", e => {
      const f = e.features?.[0]; if (!f) return;
      new ml.Popup({ closeButton: true, maxWidth: "260px" }).setLngLat(f.geometry.coordinates).setHTML(`<b>${esc(f.properties.n)}</b>`).addTo(map);
      onSelect?.(f.properties.id);
    });
    map.on("mouseenter", "pts", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "pts", () => (map.getCanvas().style.cursor = ""));
    if (pending) api.update(...pending);
    setMe(me);
  });
  function setMe(c) {
    me = c;
    if (!map.getSource("me")) return;
    map.getSource("me").setData({ type: "FeatureCollection", features: c?.src ? [{ type: "Feature", geometry: { type: "Point", coordinates: [c.lon, c.lat] }, properties: {} }] : [] });
  }
  let fitted = false;
  const api = {
    update(items, loc) {
      if (!map.getSource("pts")) { pending = [items, loc]; return; }
      map.getSource("pts").setData({ type: "FeatureCollection", features: items.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lon, s.lat] }, properties: { id: s.id, k: s.k, n: s.n } })) });
      if (loc) setMe(loc);
      if (!fitted && items.length) {
        fitted = true;
        const near = items.slice(0, 12), b = new ml.LngLatBounds();
        near.forEach(s => b.extend([s.lon, s.lat])); if (loc) b.extend([loc.lon, loc.lat]);
        map.fitBounds(b, { padding: 40, maxZoom: 14, duration: 0 });
      }
    },
    recenter(loc) { fitted = false; setMe(loc); map.easeTo({ center: [loc.lon, loc.lat], zoom: 12.5, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600 }); },
    resize() { map.resize(); },
    destroy() { map.remove(); },
  };
  return api;
}
