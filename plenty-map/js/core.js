/* Plenty Map core: state, device-only storage, i18n, formatting, icons, small UI helpers.
   Nothing here talks to any server except our own static files. */

export const VERSION = "1.0.0";

export const LANGS = [
  { code: "en", name: "English", dir: "ltr", cuisine: "american" },
  { code: "es", name: "Español", dir: "ltr", cuisine: "latin" },
  { code: "zh-Hans", name: "简体中文", dir: "ltr", cuisine: "chinese" },
  { code: "zh-Hant", name: "繁體中文", dir: "ltr", cuisine: "chinese" },
  { code: "vi", name: "Tiếng Việt", dir: "ltr", cuisine: "vietnamese" },
  { code: "fil", name: "Tagalog", dir: "ltr", cuisine: "filipino" },
  { code: "ar", name: "العربية", dir: "rtl", cuisine: "middleeast" },
  { code: "ht", name: "Kreyòl ayisyen", dir: "ltr", cuisine: "haitian" },
  { code: "ko", name: "한국어", dir: "ltr", cuisine: "korean" },
  { code: "ru", name: "Русский", dir: "ltr", cuisine: "easteuro" },
  { code: "pt", name: "Português", dir: "ltr", cuisine: "brazilian" },
  { code: "fa-AF", name: "دری", dir: "rtl", cuisine: "afghan" },
  { code: "ps", name: "پښتو", dir: "rtl", cuisine: "afghan" },
  { code: "so", name: "Soomaali", dir: "ltr", cuisine: "somali" },
  { code: "uk", name: "Українська", dir: "ltr", cuisine: "easteuro" },
];
export const LANG = Object.fromEntries(LANGS.map(l => [l.code, l]));

/* ---------- device-only storage ---------- */
const P = "pm.";
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { /* storage full or blocked: app still works */ } },
  del(k) { try { localStorage.removeItem(P + k); } catch {} },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k)); } catch {} },
};

/* ---------- state ---------- */
export const S = {
  lang: store.get("lang"),
  loc: store.get("loc"),                // {zip, lat, lon, label, src: "zip"|"gps"|"place"}
  kit: store.get("kit", ["stove", "micro"]), // stove (stove + oven), hotplate, micro. [] = no heat
  maxCost: store.get("maxCost", 0),     // per serving, 0 = any
  comfort: store.get("comfort", 2),     // 1 easy, 2 some cooking, 3 likes to cook
  cuisine: store.get("cuisine", null),  // null = use the language default
  diet: store.get("diet", "any"),       // any, veg, vegan
  have: new Set(store.get("have", [])),
  saved: new Set(store.get("saved", [])),
  hh: store.get("hh", { a: 1, k: 0 }),
  weekly: store.get("weekly", null),    // weekly food budget in dollars, null = suggest
  meals: store.get("meals", { b: 1, l: 1, d: 1 }),
  plan: store.get("plan", null),
  got: new Set(store.get("got", [])),
  extra: store.get("extra", {}),        // shopping-list items added from recipes: {id: qty}
  prices: store.get("prices", {}),
  senior: store.get("senior", false),
  theme: store.get("theme", "auto"),
};
export function save(k) {
  const v = S[k];
  store.set(k, v instanceof Set ? [...v] : v);
}
export const langDefaultCuisine = () => LANG[S.lang]?.cuisine || "american";
export const activeCuisine = () => S.cuisine || langDefaultCuisine();

/* ---------- i18n ---------- */
let STR = {}, EN = {}, REC = {}, REC_EN = {};
const cache = {};
async function getJSON(url) {
  if (cache[url]) return cache[url];
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return (cache[url] = await r.json());
}
export async function loadLang(code) {
  if (!LANG[code]) code = "en";
  const [en, cur, ren, rcur] = await Promise.all([
    getJSON("i18n/en.json"), code === "en" ? null : getJSON(`i18n/${code}.json`).catch(() => null),
    getJSON("i18n/recipes/en.json"), code === "en" ? null : getJSON(`i18n/recipes/${code}.json`).catch(() => null),
  ]);
  EN = en; STR = cur || en; REC_EN = ren; REC = rcur || ren;
  S.lang = code;
  const l = LANG[code];
  document.documentElement.lang = code;
  document.documentElement.dir = l.dir;
}
const PR = {};
const plural = (n) => (PR[S.lang] ||= new Intl.PluralRules(S.lang)).select(n);
export function t(k, v) {
  let s;
  if (v && typeof v.n === "number") {
    const f = k + "_" + plural(v.n);
    s = STR[f] ?? STR[k + "_other"] ?? EN[f] ?? EN[k + "_other"];
  }
  s ??= STR[k] ?? EN[k] ?? k;
  if (v) for (const x in v) s = s.split("{" + x + "}").join(x === "n" ? num(v[x]) : v[x]);
  return s;
}
export const hasT = k => k in STR || k in EN;
/* recipe text: {t: title, s: [steps], tip} */
export const rt = id => REC[id] || REC_EN[id] || { t: id, s: [], tip: "" };
export const ingName = id => REC.ing?.[id] ?? REC_EN.ing?.[id] ?? id;
export const unitName = (u, n) => {
  const tbl = REC.units?.[u] ?? REC_EN.units?.[u];
  if (!tbl) return u;
  return typeof tbl === "string" ? tbl : (tbl[plural(n)] ?? tbl.other ?? tbl.one);
};
/* Is the current language's recipe text complete for this recipe? */
export const recipeInLang = id => !!REC[id];

/* ---------- formatting (Latin digits everywhere so prices, phones and addresses match) ---------- */
const NF = {};
const nfo = (o) => { const k = S.lang + JSON.stringify(o); return (NF[k] ||= new Intl.NumberFormat(S.lang + "-u-nu-latn", o)); };
export const num = (n, d = 0) => nfo({ maximumFractionDigits: d }).format(n);
export const money = (v, cents = true) => nfo({ style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(v);
export function dateFmt(d, o) { return new Intl.DateTimeFormat(S.lang + "-u-nu-latn", { timeZone: "America/Los_Angeles", ...o }).format(d); }
export const dayName = (wd, style = "long") => dateFmt(new Date(Date.UTC(2024, 0, 7 + wd, 20)), { weekday: style }); // 2024-01-07 was a Sunday
export function timeFmt(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return dateFmt(new Date(Date.UTC(2024, 0, 10, h + 8, m)), { hour: "numeric", minute: m ? "2-digit" : undefined });
}
export const miles = (m) => {
  const mi = m / 1609.34;
  return mi < 0.1 ? t("dist_here") : t("dist_mi", { d: num(mi, mi < 10 ? 1 : 0) });
};

/* ---------- html ---------- */
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
export const telHref = p => { const d = String(p || "").replace(/[^\d+]/g, ""); return d.length >= 7 ? "tel:" + d : ""; };

let toastT;
export function toast(msg) {
  document.querySelector(".toast")?.remove();
  const d = document.createElement("div");
  d.className = "toast"; d.setAttribute("role", "status"); d.textContent = msg;
  document.body.appendChild(d);
  clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 2600);
}
/* Announce to screen readers without a visual toast */
export function announce(msg) {
  const r = document.getElementById("live");
  if (!r) return;
  r.textContent = ""; setTimeout(() => (r.textContent = msg), 50);
}

/* ---------- icons (drawn on a 24px grid, round caps; nothing fancy) ---------- */
const IC = {
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  basket: '<path d="M3.5 10h17l-1.6 9.2a1.6 1.6 0 0 1-1.6 1.3H6.7a1.6 1.6 0 0 1-1.6-1.3z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3.5M12 14v3.5M15 14v3.5"/>',
  pot: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 11.5h2M20 11.5h2M9 6.5c0-1.2 1-1.2 1-2.5M13 6.5c0-1.2 1-1.2 1-2.5"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16.5" height="11" rx="2.5"/><path d="M16 13.5h2"/>',
  hand: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V5a1.5 1.5 0 0 1 3 0v5M13 10.5V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M7 11v-.5a1.5 1.5 0 0 0-3 0V14a7 7 0 0 0 7 7h1a6 6 0 0 0 6-6v-3.5a1.5 1.5 0 0 0-3 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
  locate: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/><circle cx="12" cy="12" r="7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h3.5l1.6 4.2-2.1 1.4a11 11 0 0 0 6.4 6.4l1.4-2.1L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
  route: '<path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M6 15V9.5A3.5 3.5 0 0 1 9.5 6H16M18 9v5.5a3.5 3.5 0 0 1-3.5 3.5H8"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  cart: '<path d="M3 4h2.5l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.4-1l1.9-6.4H6.5"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  print: '<path d="M7 9V3.5h10V9M7 17H4.5V9h15v8H17"/><path d="M7 14h10v6.5H7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  spoon: '<ellipse cx="12" cy="6.5" rx="3.5" ry="4.5"/><path d="M12 11v10"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-5.5-3.5-9.5C12 7 9.5 9.5 9.5 12c-1-1-1.5-2-1.5-3C6.5 10.5 6 12.6 6 15a6 6 0 0 0 6 6z"/>',
  micro: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><rect x="5.5" y="8" width="10" height="8" rx="1"/><path d="M18.5 9v.1M18.5 12v.1M18.5 15h.1"/>',
  plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 17v4"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  bowl: '<path d="M3.5 11h17a8.5 8 0 0 1-17 0z"/><path d="M9 21h6M9 7.5c0-1.5 1.2-1.5 1.2-3M13.5 7.5c0-1.5 1.2-1.5 1.2-3"/>',
  pan: '<circle cx="10" cy="13" r="6.5"/><path d="M16.5 13H22"/>',
  tray: '<rect x="2.5" y="8" width="19" height="9" rx="2"/><path d="M6 12.5h.1M10 11.5h.1M14 13h.1M17.5 11.5h.1"/>',
  wrap: '<path d="M5 18.5 18.5 5c1.5 1.5 1.5 4-.2 5.7L10.7 18.3c-1.7 1.7-4.2 1.7-5.7.2z"/><path d="M8 15.5l2.5 2.5M11 12.5l2.5 2.5M14 9.5l2.5 2.5"/>',
  mug: '<path d="M5 7h11v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>',
  jar: '<path d="M7 7.5h10v10.5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 18z"/><path d="M8 4h8v3.5H8z"/>',
  noodle: '<path d="M3.5 12h17a8.5 7.5 0 0 1-17 0z"/><path d="M8 12V4M11 12V5M14.5 10l5-6"/>',
  taco: '<path d="M3 17a9 9 0 0 1 18 0z"/><path d="M7.5 13.5c1-1 2-1 3 0s2 1 3 0 2-1 3 0"/>',
  sandwich: '<path d="M3 10.5 12 5l9 5.5z"/><path d="M4 13.5h16M3.5 16.5h17v2h-17z"/>',
  egg: '<path d="M12 3c3.6 0 6.5 6 6.5 10a6.5 6.5 0 0 1-13 0C5.5 9 8.4 3 12 3z"/>',
  baby: '<circle cx="12" cy="8" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  school: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c3.5 2.5 7.5 2.5 11 0v-4.5"/>',
  senior: '<circle cx="12" cy="5.5" r="2.2"/><path d="M12 8.5v6l-3 6.5M12 14.5l3 6.5M8.5 11l3.5-1 3.5 1"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  sprout: '<path d="M12 21v-9M12 12c0-4 3-6.5 7.5-6.5 0 4.5-3 6.5-7.5 6.5zM12 14.5c0-3-2.3-5-6-5 0 3.5 2.4 5 6 5z"/>',
  fridge: '<rect x="5.5" y="2.5" width="13" height="19" rx="2"/><path d="M5.5 10h13M9 6v1.5M9 13v3"/>',
  ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6h5"/>',
  msg: '<path d="M4 5.5h16v10.5H9l-5 4z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
};
export const ico = (n, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${IC[n] || ""}</svg>`;

/* The Plenty Map mark (main + small partner mark), drawn inline so it never needs a request. */
export const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 62 L14.45 38.76 A22 22 0 1 1 49.55 38.76 Z" fill="#F1EBDD"/><circle cx="32" cy="25.5" r="16.5" fill="#1F3B2D"/><g fill="none" stroke-width="2.8" stroke-linecap="round"><path d="M28.55 24.61 A4.5 4.5 0 0 1 35.45 24.61" stroke="#F5C04A"/><path d="M25.49 22.04 A8.5 8.5 0 0 1 38.51 22.04" stroke="#F7CF6E"/><path d="M22.42 19.46 A12.5 12.5 0 0 1 41.58 19.46" stroke="#F9DE9C"/></g><path d="M20.5 29.5 H43.5 A11.5 8.5 0 0 1 20.5 29.5 Z" fill="#F1EBDD"/><rect x="28" y="38.8" width="8" height="2" rx="1" fill="#F1EBDD"/></svg>`;

/* Geo */
export function dist(a, b, c, d) {
  const R0 = 6371e3, p = Math.PI / 180;
  const x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2;
  return 2 * R0 * Math.asin(Math.sqrt(x));
}

/* Data files (our own static files only) */
export const fetchJSON = getJSON;

/* Native bridges: Capacitor when inside the app, web APIs otherwise. */
export const native = () => window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null;
export async function shareThing({ title, text, url }) {
  try {
    const C = native();
    if (C?.Plugins?.Share) { await C.Plugins.Share.share({ title, text, url, dialogTitle: title }); return true; }
    if (navigator.share) { await navigator.share({ title, text, url }); return true; }
    await navigator.clipboard.writeText([text, url].filter(Boolean).join("\n"));
    toast(t("copied"));
    return true;
  } catch { return false; }
}
export async function getPosition() {
  const C = native();
  if (C?.Plugins?.Geolocation) {
    const p = await C.Plugins.Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
    return { lat: p.coords.latitude, lon: p.coords.longitude };
  }
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("nogeo"));
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      e => rej(e), { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  });
}
/* Links that leave the app (directions, program sites) open in the system browser/maps app. */
export function openOut(url) {
  const C = native();
  if (C?.Plugins?.Browser && /^https:/.test(url)) return C.Plugins.Browser.open({ url });
  window.open(url, "_blank", "noopener,noreferrer");
}
