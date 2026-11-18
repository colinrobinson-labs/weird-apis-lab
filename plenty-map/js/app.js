/* Plenty Map: start-up, language picker, first-run setup, tabs and routing, settings and privacy. */
import { S, save, store, LANGS, LANG, loadLang, t, esc, $, $$, ico, MARK, toast, announce, getPosition, native, VERSION } from "./core.js";
import { region, findPlace, setLoc, inRegion, nearestZip, placeNames } from "./region.js";

const TABS = [
  { id: "find", icon: "basket" },
  { id: "cook", icon: "pot" },
  { id: "budget", icon: "wallet" },
  { id: "help", icon: "hand" },
];
const VIEWS = {
  find: () => import("./find.js"),
  cook: () => import("./cook.js"),
  budget: () => import("./budget.js"),
  help: () => import("./help.js"),
  settings: () => import("./pages.js"),
  privacy: () => import("./pages.js"),
  about: () => import("./pages.js"),
};

/* ---------- theme ---------- */
export function applyTheme() {
  const r = document.documentElement;
  if (S.theme === "light" || S.theme === "dark") r.dataset.theme = S.theme; else delete r.dataset.theme;
  const dark = S.theme === "dark" || (S.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#16291F" : "#1F3B2D");
}

/* ---------- language picker (always first) ---------- */
function guessLang() {
  for (const l of navigator.languages || [navigator.language || "en"]) {
    const x = l.toLowerCase();
    if (x.startsWith("zh")) return /hant|tw|hk|mo/.test(x) ? "zh-Hant" : "zh-Hans";
    if (x.startsWith("fa") || x.startsWith("prs")) return "fa-AF";
    if (x.startsWith("tl") || x.startsWith("fil")) return "fil";
    const c = x.split("-")[0];
    if (LANG[c]) return c;
  }
  return "en";
}
const EN_NAMES = { en: "English", es: "Spanish", "zh-Hans": "Chinese, Simplified", "zh-Hant": "Chinese, Traditional", vi: "Vietnamese", fil: "Tagalog", ar: "Arabic", ht: "Haitian Creole", ko: "Korean", ru: "Russian", pt: "Portuguese", "fa-AF": "Dari", ps: "Pashto", so: "Somali", uk: "Ukrainian" };

function showWelcome(changing = false) {
  const w = $("#welcome"), app = $("#app");
  app.hidden = true; w.hidden = false;
  const g = changing ? S.lang : guessLang();
  const order = [LANG[g], ...LANGS.filter(l => l.code !== g)];
  w.innerHTML = `<div class="welcome">
    <div class="mark">${MARK}</div>
    <div class="name" lang="en">Plenty Map</div>
    <p class="tagline" lang="en">Find food. Cook cheap. Get help.</p>
    <p class="tagline2" lang="en">In your language.</p>
    <h1 class="sr" lang="en">Choose your language</h1>
    <ul class="langs" role="list">${order.map(l => `<li><button type="button" data-l="${l.code}" lang="${l.code}" dir="${l.dir}" ${l.code === g ? 'aria-current="true"' : ""}><b>${esc(l.name)}</b><small lang="en" dir="ltr">${EN_NAMES[l.code]}</small></button></li>`).join("")}</ul>
    <p class="note" lang="en">No account. No ads. What you type stays on your phone.</p>
  </div>`;
  $$("[data-l]", w).forEach(b => b.onclick = async () => {
    await loadLang(b.dataset.l); save("lang");
    if (changing) { lastView = null; hideWelcome(); shell(); route(); return; }
    if (S.loc || store.get("setupDone")) { hideWelcome(); shell(); route(); } else showSetup();
  });
  ($("[aria-current]", w) || $("button", w))?.focus({ preventScroll: true });
}
function hideWelcome() { $("#welcome").hidden = true; $("#welcome").innerHTML = ""; $("#app").hidden = false; }

/* ---------- first run: where are you? ---------- */
async function showSetup() {
  const w = $("#welcome");
  w.innerHTML = `<div class="welcome">
    <div class="mark">${MARK}</div>
    <div class="setup stack">
      <h1 class="disp" id="setup-h" tabindex="-1">${esc(t("setup_h"))}</h1>
      <p class="mute">${esc(t("setup_p"))}</p>
      ${locForm("s")}
      <p class="mute small" id="s-msg" role="status"></p>
      <button class="link" type="button" id="s-skip">${esc(t("setup_skip"))}</button>
      <p class="tiny mute">${ico("lock", "i sm")} ${esc(t("setup_private"))}</p>
    </div>
  </div>`;
  $("#setup-h", w).focus();
  bindLoc("s", () => done());
  $("#s-skip", w).onclick = () => done();
  function done() { store.set("setupDone", true); hideWelcome(); shell(); location.hash = "#/find"; route(); }
}

/* A ZIP / neighborhood box plus a GPS button. Used in setup and on Find food. */
export function locForm(p, value = "") {
  return `<div class="locbar">
    <form id="${p}-form" role="search" novalidate>
      <label class="sr" for="${p}-q">${esc(t("loc_label"))}</label>
      <input class="in" id="${p}-q" name="q" autocomplete="postal-code" inputmode="text" enterkeyhint="search" list="${p}-places" placeholder="${esc(t("loc_ph"))}" value="${esc(value)}" maxlength="60">
      <datalist id="${p}-places"></datalist>
      <button class="btn pri" type="submit">${esc(t("loc_go"))}</button>
    </form>
    <button class="btn" type="button" id="${p}-gps">${ico("locate")} ${esc(t("loc_gps"))}</button>
  </div>`;
}
export function bindLoc(p, after) {
  const form = $(`#${p}-form`), msg = () => $(`#${p}-msg`);
  const say = m => { const el = msg(); if (el) el.textContent = m; else toast(m); announce(m); };
  let filled = false;
  $(`#${p}-q`).addEventListener("focus", async () => {
    if (filled) return; filled = true;
    try { $(`#${p}-places`).innerHTML = (await placeNames()).map(n => `<option value="${esc(n)}">`).join(""); } catch {}
  });
  form.onsubmit = async e => {
    e.preventDefault();
    const q = $(`#${p}-q`).value;
    const r = await findPlace(q);
    if (r.error) return say(t(r.error === "outside" ? "loc_outside" : "loc_notfound"));
    setLoc(r); after?.(r);
  };
  $(`#${p}-gps`).onclick = async () => {
    const btn = $(`#${p}-gps`); btn.disabled = true; say(t("loc_finding"));
    try {
      const pos = await getPosition(); const R = await region();
      if (!inRegion(pos.lat, pos.lon, R)) { say(t("loc_outside")); return; }
      const z = nearestZip(pos.lat, pos.lon, R);
      // round to about 100 m: plenty for "near me", and less exact than the phone's fix
      const loc = { lat: +pos.lat.toFixed(3), lon: +pos.lon.toFixed(3), label: t("loc_here"), zip: z, src: "gps" };
      setLoc(loc); say(""); after?.(loc);
    } catch (err) {
      say(t(err?.code === 1 || /denied|permission/i.test(err?.message || "") ? "loc_denied" : "loc_failed"));
    } finally { btn.disabled = false; }
  };
}

/* ---------- app shell ---------- */
function shell() {
  $("#brand").innerHTML = `${MARK}<span lang="en">Plenty Map</span>`;
  $("#brand").setAttribute("aria-label", "Plenty Map, " + t("tab_find"));
  const tabHtml = TABS.map(x => `<a href="#/${x.id}" data-tab="${x.id}">${ico(x.icon)}<span>${esc(t("tab_" + x.id))}</span></a>`).join("");
  $("#tabs").innerHTML = tabHtml; $("#dtabs").innerHTML = tabHtml;
  $("#langbtn").innerHTML = `${ico("globe")}<span lang="${S.lang}">${esc(LANG[S.lang].name)}</span>`;
  $("#langbtn").setAttribute("aria-label", t("change_lang") + ": " + LANG[S.lang].name);
  $("#langbtn").onclick = () => showWelcome(true);
  $("#setbtn").innerHTML = `${ico("gear")}<span class="sr">${esc(t("settings"))}</span>`;
  $("#setbtn").setAttribute("aria-label", t("settings"));
  $("#skip").textContent = t("skip");
  $("#tabs").setAttribute("aria-label", t("nav_main")); $("#dtabs").setAttribute("aria-label", t("nav_main"));
  document.title = "Plenty Map: " + t("tagline");
}

let current = null, cleanup = null, lastView = null;
export async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  let view = parts[0] || "find";
  if (!VIEWS[view]) view = "find";
  $$("[data-tab]").forEach(a => a.dataset.tab === view ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  const token = {}; current = token;
  try { cleanup?.(); } catch {}
  cleanup = null;
  const main = $("#main");
  let mod;
  try { mod = await VIEWS[view](); }
  catch { main.innerHTML = `<div class="empty card">${ico("alert")}<p>${esc(t("load_failed"))}</p><p><button class="btn sm" type="button" id="retry">${esc(t("retry"))}</button></p></div>`; $("#retry").onclick = route; return; }
  if (current !== token) return;
  const changedView = view !== lastView; lastView = view;
  cleanup = await mod.render(main, { view, args: parts.slice(1), changedView });
  if (current !== token) return;
  if (changedView) {
    window.scrollTo(0, 0);
    const h = $("h1", main);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
}

/* shared footer */
export function foot() {
  return `<footer class="foot">
    <p>${esc(t("foot_a"))} <a href="#/privacy">${esc(t("privacy"))}</a> · <a href="#/about">${esc(t("about"))}</a></p>
    <p>${esc(t("foot_b"))}</p>
  </footer>`;
}

/* ---------- offline notice ---------- */
function net() {
  const o = $("#offline"); if (!o) return;
  o.hidden = navigator.onLine;
  o.textContent = t("offline");
}

/* ---------- start ---------- */
async function boot() {
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);
  if (!S.lang) { await loadLang(guessLang()); S.lang = null; showWelcome(); }
  else {
    await loadLang(S.lang);
    if (!S.loc && !store.get("setupDone")) showSetup();
    else { hideWelcome(); shell(); route(); }
  }
  addEventListener("hashchange", () => { if (!$("#app").hidden) route(); });
  addEventListener("online", net); addEventListener("offline", net); net();
  if ("serviceWorker" in navigator && !native() && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
boot().catch(err => {
  document.body.insertAdjacentHTML("beforeend", `<p class="pad">Something went wrong loading Plenty Map. Please reload. For food help now, call 2-1-1.</p>`);
  console.error(err);
});

export { shell, showWelcome, VERSION };
