/* Settings, Privacy and About. */
import { S, save, store, t, esc, $, ico, toast, LANG, VERSION, dateFmt } from "./core.js";
import { foot, showWelcome, applyTheme, locForm, bindLoc } from "./app.js";
import { region } from "./region.js";
import { CONFIG } from "./config.js";
import { AS_OF } from "./benefits.js";

function settings(main) {
  main.innerHTML = `
    <h1 class="disp">${esc(t("settings"))}</h1>
    <div class="card pad stack gap-t">
      <div class="row between"><span><b>${esc(t("language"))}</b><br><span class="mute small" lang="${S.lang}">${esc(LANG[S.lang].name)}</span></span>
        <button class="btn sm" type="button" id="chlang">${ico("globe", "i sm")} ${esc(t("change"))}</button></div>
      <hr class="hr">
      <div><b>${esc(t("your_area"))}</b><p class="mute small">${esc(S.loc ? (S.loc.src === "gps" ? t("loc_here") + (S.loc.zip ? " (" + S.loc.zip + ")" : "") : S.loc.label) : t("no_area"))}</p></div>
      ${locForm("st", "")}
      <p class="small mute" id="st-msg" role="status"></p>
      ${S.loc ? `<button class="link" type="button" id="clrloc">${esc(t("forget_area"))}</button>` : ""}
      <hr class="hr">
      <label class="switch"><span><b>${esc(t("senior_q"))}</b><br><span class="mute small">${esc(t("senior_hint"))}</span></span><input type="checkbox" role="switch" id="senior" ${S.senior ? "checked" : ""}></label>
      <hr class="hr">
      <div><span class="lbl" id="l-th"><b>${esc(t("theme"))}</b></span>
        <div class="chips wrap" role="group" aria-labelledby="l-th">${["auto", "light", "dark"].map(x => `<button class="chip" type="button" data-th="${x}" aria-pressed="${S.theme === x}">${esc(t("theme_" + x))}</button>`).join("")}</div></div>
    </div>
    <div class="card pad stack gap-t">
      <h2>${esc(t("your_data"))}</h2>
      <p class="mute">${esc(t("your_data_p"))}</p>
      <button class="btn" type="button" id="wipe">${ico("trash", "i sm")} ${esc(t("erase_all"))}</button>
    </div>
    ${foot()}`;
  $("#chlang").onclick = () => showWelcome(true);
  bindLoc("st", () => { toast(t("area_saved")); settings(main); });
  $("#clrloc")?.addEventListener("click", () => { S.loc = null; store.del("loc"); toast(t("area_forgot")); settings(main); });
  $("#senior").onchange = e => { S.senior = e.target.checked; save("senior"); };
  main.querySelectorAll("[data-th]").forEach(b => b.onclick = () => {
    S.theme = b.dataset.th; save("theme"); applyTheme();
    main.querySelectorAll("[data-th]").forEach(x => x.setAttribute("aria-pressed", x === b));
  });
  $("#wipe").onclick = () => {
    const btn = $("#wipe");
    if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.innerHTML = `${ico("trash", "i sm")} ${esc(t("erase_sure"))}`; btn.classList.add("pri"); return; }
    store.clear();
    try { caches?.keys().then(k => k.forEach(n => caches.delete(n))); } catch {}
    location.hash = ""; location.reload();
  };
}

function privacy(main) {
  const li = k => `<li>${esc(t(k))}</li>`;
  main.innerHTML = `<div class="prose">
    <h1 class="disp">${esc(t("privacy"))}</h1>
    <p class="lead">${esc(t("pv_lead"))}</p>
    <h2>${esc(t("pv_h1"))}</h2>
    <ul>${["pv_1", "pv_2", "pv_3", "pv_4"].map(li).join("")}</ul>
    <h2>${esc(t("pv_h2"))}</h2>
    <ul>${["pv_5", "pv_6", "pv_7"].map(li).join("")}</ul>
    <h2>${esc(t("pv_h3"))}</h2>
    <ul>${["pv_8", "pv_9"].map(li).join("")}</ul>
    <h2>${esc(t("pv_h4"))}</h2>
    <p>${esc(t("pv_10"))} <a href="mailto:${CONFIG.contact}">${CONFIG.contact}</a></p>
    <p class="small mute">${esc(t("pv_updated", { d: "2026-11-18" }))}</p>
  </div>${foot()}`;
}

async function about(main) {
  const R = await region();
  const built = dateFmt(new Date(R.built), { year: "numeric", month: "long", day: "numeric" });
  main.innerHTML = `<div class="prose">
    <h1 class="disp">${esc(t("about"))}</h1>
    <p class="lead">${esc(t("ab_lead"))}</p>
    <h2>${esc(t("ab_h1"))}</h2>
    <ul>
      <li>${esc(t("ab_sites", { d: built }))} <a href="https://www.sandiegofoodbank.org/get-food/" target="_blank" rel="noopener noreferrer">San Diego Food Bank</a> · <a href="https://feedingsandiego.org/find-food/" target="_blank" rel="noopener noreferrer">Feeding San Diego</a></li>
      <li>${esc(t("ab_stores"))} <a href="https://www.fns.usda.gov/snap/retailer-locator" target="_blank" rel="noopener noreferrer">USDA SNAP Retailer Locator</a></li>
      <li>${esc(t("ab_osm"))} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>, Protomaps.</li>
      <li>${esc(t("ab_prices"))}</li>
      <li>${esc(t("ab_benefits", { d: AS_OF }))}</li>
      <li>${esc(t("ab_recipes"))}</li>
    </ul>
    <h2>${esc(t("ab_h2"))}</h2>
    <p>${esc(t("ab_wrong"))} <a href="mailto:${CONFIG.contact}">${CONFIG.contact}</a></p>
    <h2>${esc(t("ab_h3"))}</h2>
    <p>${esc(t("ab_translate"))}</p>
    <p class="small mute">Plenty Map ${esc(VERSION)} · MapLibre GL, PMTiles, Protomaps basemaps (BSD-3-Clause). Fonts: Caprasimo, Figtree, Noto Sans (SIL Open Font License).</p>
  </div>${foot()}`;
}

export async function render(main, { view }) {
  if (view === "settings") return settings(main);
  if (view === "privacy") return privacy(main);
  return about(main);
}
