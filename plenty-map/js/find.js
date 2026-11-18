/* Find food: free groceries, senior boxes, meals, fridges, cheap grocery stores, farmers markets
   and CalFresh restaurants near a ZIP or the phone's location. All from the region file. */
import { S, save, t, esc, $, $$, ico, money, num, dateFmt, timeFmt, miles, dist, telHref, safeUrl, shareThing, openOut, activeCuisine, announce, store } from "./core.js";
import { region } from "./region.js";
import { nextTimes, todayISO } from "./hours.js";
import { locForm, bindLoc, foot } from "./app.js";

const FREE = ["pantry", "senior", "meal", "fridge"];
const CATS = [
  { id: "free", kinds: FREE },
  { id: "pantry", kinds: ["pantry"] },
  { id: "senior", kinds: ["senior"] },
  { id: "meal", kinds: ["meal"] },
  { id: "fridge", kinds: ["fridge"] },
  { id: "store", kinds: ["store"] },
  { id: "market", kinds: ["market"] },
  { id: "rmp", kinds: ["rmp"] },
];
const KDOT = { pantry: "k-pantry", senior: "k-senior", meal: "k-meal", fridge: "k-fridge", store: "k-store", market: "k-market", rmp: "k-meal" };
const PAGE = 20;
// county middle, used only to sort when no location is set
const MID = { lat: 32.85, lon: -117.0 };

const F = {
  cat: store.get("fcat", "free"),
  today: false, walk: false, drive: false,
  sort: "near",
  shown: PAGE,
  view: "list",
};

let R, mapApi = null, mapMod = null, focusId = null;

function dirUrl(s) {
  const q = `${s.lat},${s.lon}`;
  return /iPhone|iPad|Macintosh/.test(navigator.userAgent)
    ? `https://maps.apple.com/?daddr=${q}&q=${encodeURIComponent(s.n)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/* ---------- next open times ---------- */
const nowCache = { at: 0, today: "" };
function soon(s) {
  if (s._soonAt === nowCache.at) return s._soon;
  let all = [];
  for (const d of s.d || []) {
    if (!d.sc || d.conf === "call" || d.conf === "none") continue;
    for (const x of nextTimes(d.sc, new Date(nowCache.at), 3)) all.push({ ...x, d });
  }
  all.sort((a, b) => (a.date + (a.t[0] || "")).localeCompare(b.date + (b.t[0] || "")));
  s._soonAt = nowCache.at; s._soon = all.slice(0, 3);
  return s._soon;
}
function whenText(x) {
  const today = nowCache.today;
  const [y, m, d] = x.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 20));
  const tomorrow = new Date(Date.UTC(...today.split("-").map((v, i) => i === 1 ? v - 1 : +v), 20) + 864e5).toISOString().slice(0, 10);
  const day = x.date === today ? t("today") : x.date === tomorrow ? t("tomorrow") : dateFmt(dt, { weekday: "short", month: "short", day: "numeric" });
  const [a, b] = x.t;
  const time = a && b ? t("time_range", { a: timeFmt(a), b: timeFmt(b) }) : a ? t("time_from", { a: timeFmt(a) }) : "";
  return [day, time].filter(Boolean).join(" · ");
}

/* ---------- filtering and ranking ---------- */
function candidates() {
  const cat = CATS.find(c => c.id === F.cat) || CATS[0];
  const here = S.loc || MID;
  const pool = cat.kinds.some(k => FREE.includes(k)) ? R.sites : R.stores;
  let list = pool.filter(s => cat.kinds.includes(s.k));
  // seniors-only sites stay out of the general list unless the person said they're 60+
  if (F.cat === "free" && !S.senior) list = list.filter(s => s.k !== "senior");
  for (const s of list) s._m = dist(here.lat, here.lon, s.lat, s.lon);
  const freeCat = cat.kinds.some(k => FREE.includes(k));
  if (freeCat) {
    if (F.today) list = list.filter(s => soon(s).some(x => x.date === nowCache.today));
    if (F.walk) list = list.filter(s => s.d.some(d => d.f?.includes("walk")));
    if (F.drive) list = list.filter(s => s.d.some(d => d.f?.includes("drive")));
    if (F.sort === "soon") {
      const key = s => { const x = soon(s)[0]; return x ? x.date + (x.t[0] || "99") : "9999"; };
      list.sort((a, b) => key(a).localeCompare(key(b)) || a._m - b._m);
    } else list.sort((a, b) => a._m - b._m);
  } else if (F.cat === "store") {
    const cu = activeCuisine();
    const w = { budget: 1, standard: 1.35, premium: 2.2 };
    for (const s of list) s._score = s._m * (w[s.tier] || 1.5) * (s.cu?.includes(cu) ? 0.6 : 1);
    list.sort((a, b) => a._score - b._score);
  } else list.sort((a, b) => a._m - b._m);
  return list;
}

/* ---------- rendering ---------- */
function flagBadges(d) {
  const f = d.f || [];
  const order = ["open", "walk", "drive", "senior", "student", "military", "income", "fbid", "id", "area", "appt", "register", "call", "diapers", "produce"];
  const tone = { open: "ok", walk: "", drive: "", senior: "warn", student: "warn", military: "warn", income: "", fbid: "", id: "", area: "warn", appt: "warn", register: "", call: "warn", diapers: "yolk", produce: "yolk" };
  return order.filter(k => f.includes(k)).map(k => `<span class="badge ${tone[k]}">${esc(t("f_" + k))}</span>`).join("");
}
const srcName = src => R.sources?.[src]?.name || "";

function siteCard(s) {
  const free = FREE.includes(s.k);
  const next = free ? soon(s) : [];
  const d0 = s.d?.[0];
  const callFirst = free && !next.length;
  const isEn = S.lang === "en";
  const addr = [s.a, s.c].filter(Boolean).join(", ");
  const when = free
    ? (next.length
      ? `<p class="when">${ico("clock", "i sm")}<span>${next.map((x, i) => `${i ? "<br>" : ""}${esc(whenText(x))}${s.d.length > 1 && (x.d.prog === "csfp" || x.d.f?.includes("senior")) ? " · " + esc(t("f_senior")) : ""}${x.now ? ` <span class="badge ok">${esc(t("open_now"))}</span>` : ""}`).join("")}</span></p>`
      : `<p class="when">${ico("phone", "i sm")}<span>${esc(t(s.d?.some(d => d.when) ? "call_check" : "call_hours"))}</span></p>`)
    : "";
  const kindNote = s.k === "store" ? [s.tier === "budget" ? `<span class="badge ok">${esc(t("low_prices"))}</span>` : "", ...(s.cu || []).slice(0, 2).map(c => `<span class="badge yolk">${esc(t("cu_" + c))}</span>`)].join("")
    : s.k === "market" ? `<span class="badge yolk">${esc(t("market_match"))}</span>`
    : s.k === "rmp" ? `<span class="badge">${esc(t("rmp_badge"))}</span>` : "";
  const details = free ? s.d.map(d => {
    const rows = [
      d.prog && [t("prog"), t("prog_" + d.prog)],
      d.food && [t("d_food"), d.food, true],
      d.who && [t("d_who"), d.who, true],
      d.tips && [t("d_tips"), d.tips, true],
      d.notes && [t("d_notes"), d.notes, true],
      d.when && [t("d_when"), d.when, true],
    ].filter(Boolean);
    return `${s.d.length > 1 ? `<p class="small"><b>${esc(srcName(d.src))}</b></p>` : ""}<dl>${rows.map(([k, v, en]) => `<div><dt>${esc(k)}</dt><dd${en && !isEn ? ' lang="en"' : ""}>${esc(v)}</dd></div>`).join("")}</dl>`;
  }).join("") : "";
  let flags = free ? [...new Set(s.d.flatMap(d => d.f || []))] : [];
  // a 60+ box at a pantry that also serves everyone shouldn't mark the whole place "60+ only"
  if (s.d.some(d => !(d.f || []).includes("senior") && d.prog !== "csfp")) flags = flags.filter(f => f !== "senior");
  const tel = telHref(s.ph), web = safeUrl(s.w);
  return `<li class="card site${s.id === focusId ? " hl" : ""}" id="s-${esc(s.id)}" data-id="${esc(s.id)}">
    <h3><span class="kdot ${KDOT[s.k]}" aria-hidden="true"></span> ${esc(s.n)}</h3>
    <p class="meta"><span>${esc(t("kind_" + s.k))}</span>${S.loc ? `<span aria-hidden="true">·</span><span>${esc(miles(s._m))}</span>` : ""}<span aria-hidden="true">·</span><span>${esc(addr)}</span></p>
    ${when}
    ${free ? `<div class="row">${flagBadges({ f: flags })}</div>` : kindNote ? `<div class="row">${kindNote}</div>` : ""}
    <div class="acts">
      <a class="btn sm pri" href="${esc(dirUrl(s))}" target="_blank" rel="noopener noreferrer" data-out>${ico("route", "i sm")} ${esc(t("directions"))}</a>
      ${tel ? `<a class="btn sm" href="${esc(tel)}">${ico("phone", "i sm")} ${esc(t("call"))}</a>` : ""}
      ${web ? `<a class="btn sm ghost" href="${esc(web)}" target="_blank" rel="noopener noreferrer" data-out>${ico("ext", "i sm")} ${esc(t("website"))}</a>` : ""}
      <button class="btn sm ghost" type="button" data-share="${esc(s.id)}">${ico("share", "i sm")} ${esc(t("share"))}</button>
    </div>
    ${details ? `<details><summary>${ico("chev", "i sm")} ${esc(t("details"))}</summary>${!isEn ? `<p class="src">${esc(t("src_english"))}</p>` : ""}${details}</details>` : ""}
    ${free ? `<p class="src">${esc(t("src_by", { s: [...new Set(s.d.map(d => srcName(d.src)))].filter(Boolean).join(", ") || "OpenStreetMap" }))}${callFirst ? "" : " · " + esc(t("times_change"))}</p>` : ""}
  </li>`;
}

function catNote() {
  const n = {
    store: t("note_store"),
    market: t("note_market"),
    rmp: t("note_rmp"),
    senior: t("note_senior"),
    meal: t("note_meal"),
    fridge: t("note_fridge"),
  }[F.cat];
  return n ? `<div class="notice info">${ico("info")}<p>${esc(n)}</p></div>` : "";
}

function paintList() {
  nowCache.at = Math.floor(Date.now() / 60000) * 60000; nowCache.today = todayISO(new Date(nowCache.at));
  const list = candidates();
  const box = $("#flist");
  if (!box) return;
  if (focusId) { const i = list.findIndex(x => x.id === focusId); if (i >= F.shown) F.shown = Math.ceil((i + 1) / PAGE) * PAGE; }
  const shown = list.slice(0, F.shown);
  const freeCat = CATS.find(c => c.id === F.cat).kinds.some(k => FREE.includes(k));
  $("#fcount").textContent = t("results", { n: list.length });
  box.innerHTML = shown.length ? shown.map(siteCard).join("") :
    `<li class="card empty">${ico("search")}<p><b>${esc(t("none_h"))}</b></p><p class="mute">${esc(t(freeCat && (F.today || F.walk || F.drive) ? "none_filters" : "none_p"))}</p></li>`;
  $("#fmore").innerHTML = list.length > F.shown ? `<button class="btn" type="button" id="more">${esc(t("show_more", { n: Math.min(PAGE, list.length - F.shown) }))}</button>` : "";
  $("#more")?.addEventListener("click", () => { F.shown += PAGE; paintList(); $(`#flist li:nth-child(${F.shown - PAGE + 1}) a, #flist li:nth-child(${F.shown - PAGE + 1}) button`)?.focus(); });
  $$("[data-share]", box).forEach(b => b.onclick = () => shareSite(R.byId.get(b.dataset.share)));
  $$("a[data-out]", box).forEach(a => a.addEventListener("click", e => { e.preventDefault(); openOut(a.href); }));
  if (mapApi) mapApi.update(list.slice(0, 150), S.loc);
}

function shareSite(s) {
  if (!s) return;
  const next = FREE.includes(s.k) ? soon(s)[0] : null;
  const text = [s.n, [s.a, s.c].filter(Boolean).join(", "), next ? whenText(next) : "", s.ph].filter(Boolean).join("\n");
  shareThing({ title: s.n, text, url: location.origin + location.pathname + "#/find/" + encodeURIComponent(s.id) });
}

function chip(id, label, on, attr = "data-cat") {
  return `<button class="chip" type="button" ${attr}="${id}" aria-pressed="${on}">${label}</button>`;
}

async function loadMap() {
  const box = $("#fmap");
  if (!box || mapApi) return;
  box.hidden = false;
  box.innerHTML = `<div class="loading">${esc(t("map_loading"))}</div>`;
  try {
    mapMod ||= await import("./map.js");
    mapApi = await mapMod.mountMap(box, {
      center: S.loc || MID,
      onSelect: id => {
        if (matchMedia("(max-width: 959px)").matches) setView("list");
        focusId = id; const el = $(`#s-${CSS.escape(id)}`);
        $$(".site.hl").forEach(x => x.classList.remove("hl"));
        if (el) { el.classList.add("hl"); el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); el.querySelector("a,button")?.focus({ preventScroll: true }); }
      },
      label: s => s.n,
    });
    paintList();
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="loading"><p>${esc(t("map_failed"))}</p></div>`;
  }
}
function setView(v) {
  F.view = v;
  $$("[data-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v));
  const phone = matchMedia("(max-width: 959px)").matches;
  if (phone) { $("#fmap").hidden = v !== "map"; $("#flistwrap").hidden = v === "map"; }
  if (v === "map") loadMap().then(() => { mapApi?.resize(); if (phone) $("#fmap").scrollIntoView({ block: "end" }); });
}

export async function render(main, { args }) {
  main.innerHTML = `<p class="mute">${esc(t("loading"))}</p>`;
  R = await region();
  if (args[0]) {
    const s = R.byId.get(args[0]);
    if (s) { focusId = s.id; F.cat = !FREE.includes(s.k) ? s.k : s.k === "senior" && !S.senior ? "senior" : "free"; F.today = F.walk = F.drive = false; }
  }
  const built = new Date(R.built);
  const wide = matchMedia("(min-width: 960px)");
  main.innerHTML = `
  <section class="hero" aria-labelledby="find-h">
    <h1 class="disp" id="find-h">${esc(S.loc ? t("find_h_near", { p: S.loc.label }) : t("find_h"))}</h1>
    <p>${esc(t("find_p"))}</p>
    ${locForm("f", S.loc?.src === "gps" ? "" : S.loc?.label || "")}
    <p class="small" id="f-msg" role="status"></p>
  </section>
  <div class="chips" role="group" aria-label="${esc(t("show"))}" id="fcats">
    ${CATS.map(c => chip(c.id, `<span class="dot ${KDOT[c.kinds[0]]}" aria-hidden="true"></span>${esc(t("cat_" + c.id))}`, F.cat === c.id)).join("")}
  </div>
  <div class="row between">
    <div class="chips wrap" role="group" aria-label="${esc(t("filters"))}" id="fflt"></div>
    <div class="viewtoggle" role="group" aria-label="${esc(t("view"))}">
      <button type="button" data-view="list" aria-pressed="true">${ico("list", "i sm")} ${esc(t("view_list"))}</button>
      <button type="button" data-view="map" aria-pressed="false">${ico("map", "i sm")} ${esc(t("view_map"))}</button>
    </div>
  </div>
  <div class="findwrap withmap">
    <div id="flistwrap" class="stack">
      <div id="fnote"></div>
      <p class="mute small" id="fcount" role="status"></p>
      <ul class="list" id="flist"></ul>
      <div class="more" id="fmore"></div>
    </div>
    <div class="mapbox" id="fmap" hidden></div>
  </div>
  <div class="notice info">${ico("info")}<p>${esc(t("data_note", { d: dateFmt(built, { month: "long", day: "numeric" }) }))}</p></div>
  ${foot()}`;

  bindLoc("f", () => { F.shown = PAGE; $("#find-h").textContent = t("find_h_near", { p: S.loc.label }); paintList(); mapApi?.recenter(S.loc); });
  const paintFilters = () => {
    const freeCat = CATS.find(c => c.id === F.cat).kinds.some(k => FREE.includes(k));
    $("#fflt").innerHTML = freeCat ? [
      chip("today", ico("cal", "i sm") + esc(t("flt_today")), F.today, "data-flt"),
      chip("walk", esc(t("f_walk")), F.walk, "data-flt"),
      chip("drive", esc(t("f_drive")), F.drive, "data-flt"),
      chip("soon", ico("clock", "i sm") + esc(t("sort_soon")), F.sort === "soon", "data-flt"),
    ].join("") : "";
    $$("[data-flt]").forEach(b => b.onclick = () => {
      const k = b.dataset.flt;
      if (k === "soon") F.sort = F.sort === "soon" ? "near" : "soon"; else F[k] = !F[k];
      b.setAttribute("aria-pressed", k === "soon" ? F.sort === "soon" : F[k]);
      F.shown = PAGE; paintList();
    });
    $("#fnote").innerHTML = catNote();
  };
  $$("[data-cat]").forEach(b => b.onclick = () => {
    F.cat = b.dataset.cat; store.set("fcat", F.cat); F.shown = PAGE;
    $$("[data-cat]").forEach(x => x.setAttribute("aria-pressed", x === b));
    paintFilters(); paintList(); announce($("#fcount").textContent);
  });
  $$("[data-view]").forEach(b => b.onclick = () => setView(b.dataset.view));
  paintFilters(); paintList();
  mapApi = null;
  if (wide.matches) loadMap(); else setView(F.view);
  const onWide = () => { if (wide.matches) { $("#flistwrap").hidden = false; loadMap(); } else setView(F.view); };
  wide.addEventListener("change", onWide);
  const onLoc = () => paintList();
  addEventListener("pm:loc", onLoc);
  if (focusId) requestAnimationFrame(() => { const el = $(`#s-${CSS.escape(focusId)}`); el?.scrollIntoView({ block: "center" }); });
  const timer = setInterval(paintList, 5 * 60000); // "open now" stays honest if the app sits open
  return () => { clearInterval(timer); wide.removeEventListener("change", onWide); removeEventListener("pm:loc", onLoc); mapApi?.destroy(); mapApi = null; focusId = null; };
}
