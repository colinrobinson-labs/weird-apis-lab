/* Cook: recipes that fit your kitchen, budget, comfort level and home cooking. */
import { S, save, t, esc, $, $$, ico, money, num, rt, recipeInLang, activeCuisine, langDefaultCuisine, shareThing, toast, announce } from "./core.js";
import { food, canCook, dietOk, facts, perServing, missing, qty, name, rank, CUISINES, price, cuisineMatch } from "./food.js";
import { foot } from "./app.js";

let FD;
const BUDGETS = [0, 1, 1.5, 2.5];
const KIT = ["stove", "hotplate", "micro"];
const PANTRY = ["rice", "pasta", "dbeans", "cbeans", "lentils", "oats", "ctom", "tuna", "pb", "eggs", "potato", "ftort", "onion", "cheddar", "milk", "bread", "ramen", "chleg", "tofu", "cabbage", "banana", "flour"];

function visible() {
  return FD.recipes.filter(r => canCook(r) && dietOk(r) && r.lvl <= S.comfort && (!S.maxCost || perServing(r) <= S.maxCost));
}

function card(r) {
  const tx = rt(r.id), f = facts(r), miss = S.have.size ? missing(r) : -1;
  const saved = S.saved.has(r.id);
  return `<li><button class="rcard" type="button" data-r="${r.id}">
    <span class="art">${ico(r.icon)}</span>
    <span>
      <h3>${esc(tx.t)}${saved ? ` <span class="sr">(${esc(t("saved"))})</span>` : ""}</h3>
      <span class="meta">
        <span class="tag">${esc(money(perServing(r)))}<small>${esc(t("per_serving"))}</small></span>
        <span>${ico("clock", "i sm")} ${esc(t("mins", { n: r.mins }))}</span>
        <span>${esc(t("serves", { n: r.serves }))}</span>
        ${f.vegan ? `<span class="badge ok">${esc(t("diet_vegan"))}</span>` : f.veg ? `<span class="badge ok">${esc(t("diet_veg"))}</span>` : ""}
        ${r.kid ? `<span class="badge">${esc(t("kid_ok"))}</span>` : ""}
        ${saved ? `<span class="badge yolk">${ico("heart", "i sm")}</span>` : ""}
      </span>
      ${miss >= 0 ? `<span class="miss">${esc(miss ? t("need_n", { n: miss }) : t("have_all"))}</span>` : ""}
    </span>
  </button></li>`;
}

function paint() {
  const vis = visible();
  const mine = rank(vis.filter(cuisineMatch)), rest = rank(vis.filter(r => !cuisineMatch(r)));
  const saved = vis.filter(r => S.saved.has(r.id));
  const cu = activeCuisine();
  $("#rcount").textContent = t("recipes_n", { n: vis.length });
  $("#rlist").innerHTML = !vis.length
    ? `<div class="card empty">${ico("pot")}<p><b>${esc(t("no_recipes"))}</b></p><p class="mute">${esc(t("no_recipes_p"))}</p></div>`
    : [
      saved.length ? `<div class="sec"><h2>${esc(t("saved_h"))}</h2></div><ul class="rgrid">${saved.map(card).join("")}</ul>` : "",
      mine.length ? `<div class="sec"><h2>${esc(t("cu_h", { c: t("cu_" + cu) }))}</h2></div><ul class="rgrid">${mine.map(card).join("")}</ul>` : "",
      rest.length ? `<div class="sec"><h2>${esc(mine.length ? t("more_ideas") : t("all_recipes"))}</h2></div><ul class="rgrid">${rest.map(card).join("")}</ul>` : "",
    ].join("");
  $$("[data-r]").forEach(b => b.onclick = () => { location.hash = "#/cook/" + b.dataset.r; });
}

function chip(attr, v, label, on, role = "") {
  return `<button class="chip" type="button" ${attr}="${v}" aria-pressed="${on}" ${role}>${label}</button>`;
}

function filters() {
  const cu = activeCuisine();
  return `<div class="card filters" id="filters">
    <div><span class="lbl" id="l-kit">${esc(t("kit_q"))}</span>
      <div class="chips wrap" role="group" aria-labelledby="l-kit">
        ${chip("data-kit", "stove", ico("flame", "i sm") + esc(t("kit_stove")), S.kit.includes("stove"))}
        ${chip("data-kit", "hotplate", ico("plug", "i sm") + esc(t("kit_hotplate")), S.kit.includes("hotplate"))}
        ${chip("data-kit", "micro", ico("micro", "i sm") + esc(t("kit_micro")), S.kit.includes("micro"))}
        ${chip("data-kit", "none", esc(t("kit_none")), !S.kit.length)}
      </div></div>
    <div><span class="lbl" id="l-cost">${esc(t("budget_q"))}</span>
      <div class="chips wrap" role="group" aria-labelledby="l-cost">
        ${BUDGETS.map(b => chip("data-cost", b, esc(b ? t("under", { m: money(b) }) : t("any_cost")), S.maxCost === b)).join("")}
      </div></div>
    <details class="morefl" ${matchMedia("(min-width: 760px)").matches ? "open" : ""}><summary class="link">${esc(t("more_filters"))}</summary><div class="filters inner">
    <div><span class="lbl" id="l-lvl">${esc(t("comfort_q"))}</span>
      <div class="chips wrap" role="group" aria-labelledby="l-lvl">
        ${[1, 2, 3].map(l => chip("data-lvl", l, esc(t("lvl_" + l)), S.comfort === l)).join("")}
      </div></div>
    <div><span class="lbl" id="l-diet">${esc(t("diet_q"))}</span>
      <div class="chips wrap" role="group" aria-labelledby="l-diet">
        ${["any", "veg", "vegan"].map(d => chip("data-diet", d, esc(t("diet_" + d)), S.diet === d)).join("")}
      </div></div>
    <div><label class="lbl" for="cusel">${esc(t("cu_q"))}</label>
      <select class="in" id="cusel">${CUISINES.map(c => `<option value="${c}" ${c === cu ? "selected" : ""}>${esc(t("cu_" + c))}${c === langDefaultCuisine() ? " ✓" : ""}</option>`).join("")}</select>
    </div>
    </div></details>
    <details><summary class="link">${esc(t("have_q"))}${S.have.size ? ` (${num(S.have.size)})` : ""}</summary>
      <div class="chips wrap" role="group" aria-label="${esc(t("have_q"))}">
        ${PANTRY.filter(id => FD.ing[id]).map(id => chip("data-have", id, esc(name(id)), S.have.has(id))).join("")}
      </div></details>
  </div>`;
}

function bindFilters() {
  $$("[data-kit]").forEach(b => b.onclick = () => {
    const k = b.dataset.kit;
    if (k === "none") S.kit = [];
    else S.kit = S.kit.includes(k) ? S.kit.filter(x => x !== k) : [...S.kit, k];
    save("kit");
    $$("[data-kit]").forEach(x => x.setAttribute("aria-pressed", x.dataset.kit === "none" ? !S.kit.length : S.kit.includes(x.dataset.kit)));
    paint();
  });
  $$("[data-cost]").forEach(b => b.onclick = () => { S.maxCost = +b.dataset.cost; save("maxCost"); $$("[data-cost]").forEach(x => x.setAttribute("aria-pressed", x === b)); paint(); });
  $$("[data-lvl]").forEach(b => b.onclick = () => { S.comfort = +b.dataset.lvl; save("comfort"); $$("[data-lvl]").forEach(x => x.setAttribute("aria-pressed", x === b)); paint(); });
  $$("[data-diet]").forEach(b => b.onclick = () => { S.diet = b.dataset.diet; save("diet"); $$("[data-diet]").forEach(x => x.setAttribute("aria-pressed", x === b)); paint(); });
  $("#cusel").onchange = e => { S.cuisine = e.target.value === langDefaultCuisine() ? null : e.target.value; save("cuisine"); paint(); };
  $$("[data-have]").forEach(b => b.onclick = () => {
    const id = b.dataset.have; S.have.has(id) ? S.have.delete(id) : S.have.add(id); save("have");
    b.setAttribute("aria-pressed", S.have.has(id)); paint();
  });
}

/* ---------- the recipe sheet ---------- */
let wake = null, lastFocus = null;
async function setWake(on, btn) {
  try {
    if (on && "wakeLock" in navigator) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => btn?.setAttribute("aria-pressed", "false")); }
    else { await wake?.release(); wake = null; }
    btn?.setAttribute("aria-pressed", String(!!wake));
  } catch { toast(t("wake_failed")); }
}

function openSheet(id) {
  const r = FD.byId[id];
  if (!r) { location.hash = "#/cook"; return; }
  lastFocus ||= document.activeElement;
  closeSheet(true);
  const tx = rt(id);
  let sv = r.serves;
  const el = document.createElement("div");
  el.className = "sheet"; el.id = "sheet";
  const paintBody = () => {
    const mult = sv / r.serves, f = facts(r);
    const total = perServing(r) * sv;
    el.querySelector(".body").innerHTML = `
      ${!recipeInLang(id) ? `<p class="notice info">${ico("globe")}<span>${esc(t("rec_english"))}</span></p>` : ""}
      <div class="facts">
        <div class="fact"><b>${esc(money(perServing(r)))}</b><span>${esc(t("per_serving"))}</span></div>
        <div class="fact"><b>${esc(money(total))}</b><span>${esc(t("total_for", { n: sv }))}</span></div>
        <div class="fact"><b>${esc(t("mins", { n: r.mins }))}</b><span>${esc(t("time"))}</span></div>
        <div class="fact"><b>${esc(num(f.kcal))}</b><span>${esc(t("kcal_serving"))}</span></div>
        <div class="fact"><b>${esc(num(f.pro))} g</b><span>${esc(t("protein"))}</span></div>
      </div>
      <div class="row between"><h3>${esc(t("ingredients"))}</h3>
        <span class="row"><span class="small mute" id="svl">${esc(t("servings"))}</span><span class="stepper" role="group" aria-labelledby="svl">
          <button type="button" data-sv="-1" aria-label="${esc(t("fewer"))}">−</button><output aria-live="polite">${num(sv)}</output><button type="button" data-sv="1" aria-label="${esc(t("more"))}">+</button></span></span></div>
      <ul class="ings">${r.ing.map(([iid, q]) => `<li><span><span class="q">${esc(qty(iid, q * mult))}</span> ${esc(name(iid))}${S.have.has(iid) ? ` <span class="badge ok">${esc(t("have_it"))}</span>` : ""}</span><span class="p">${esc(money(price(iid) * q * mult))}</span></li>`).join("")}</ul>
      <h3 class="sec">${esc(t("steps"))}</h3>
      <ol class="steps">${tx.s.map(s => `<li><span>${esc(s)}</span></li>`).join("")}</ol>
      ${tx.tip ? `<p class="tip"><b>${esc(t("tip"))}</b> ${esc(tx.tip)}</p>` : ""}
      ${r.frz ? `<p class="small mute">${ico("snow", "i sm")} ${esc(t("freezes"))}</p>` : ""}
      <div class="row gap-t">
        <button class="btn pri" type="button" id="addlist">${ico("cart")} ${esc(t("add_list"))}</button>
        <button class="btn" type="button" id="wake" aria-pressed="${!!wake}">${ico("screen")} ${esc(t("keep_on"))}</button>
        <button class="btn ghost" type="button" id="print">${ico("print")} ${esc(t("print"))}</button>
      </div>
      <p class="tiny mute">${esc(t("price_note"))}</p>`;
    $$("[data-sv]", el).forEach(b => b.onclick = () => { sv = Math.max(1, Math.min(24, sv + +b.dataset.sv)); paintBody(); el.querySelector(`[data-sv="${b.dataset.sv}"]`).focus(); });
    $("#addlist", el).onclick = () => { S.extra[id] = (S.extra[id] || 0) + sv; save("extra"); toast(t("added_list")); };
    $("#wake", el).onclick = e => setWake(!wake, e.currentTarget);
    $("#print", el).onclick = () => window.print();
  };
  el.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="sheet-h">
    <div class="bar">
      <button class="iconbtn" type="button" id="sclose" aria-label="${esc(t("close"))}">${ico("back", "i flip")}</button>
      <h2 id="sheet-h" tabindex="-1">${esc(tx.t)}</h2>
      <button class="iconbtn" type="button" id="ssave" aria-pressed="${S.saved.has(id)}" aria-label="${esc(t("save_recipe"))}">${ico("heart")}</button>
      <button class="iconbtn" type="button" id="sshare" aria-label="${esc(t("share"))}">${ico("share")}</button>
    </div>
    <div class="body"></div>
  </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = "hidden";
  $("#app").inert = true;
  paintBody();
  $("#sheet-h", el).focus();
  $("#sclose", el).onclick = () => history.length > 1 && /#\/cook\//.test(location.hash) ? history.back() : (location.hash = "#/cook");
  el.addEventListener("click", e => { if (e.target === el) $("#sclose", el).click(); });
  el.addEventListener("keydown", e => { if (e.key === "Escape") $("#sclose", el).click(); });
  $("#ssave", el).onclick = e => {
    S.saved.has(id) ? S.saved.delete(id) : S.saved.add(id); save("saved");
    e.currentTarget.setAttribute("aria-pressed", S.saved.has(id)); announce(t(S.saved.has(id) ? "saved" : "unsaved"));
  };
  $("#sshare", el).onclick = () => {
    const lines = [tx.t, "", ...r.ing.map(([iid, q]) => `• ${qty(iid, q)} ${name(iid)}`), "", ...tx.s.map((s, i) => `${i + 1}. ${s}`)];
    shareThing({ title: tx.t, text: lines.join("\n"), url: location.origin + location.pathname + "#/cook/" + id });
  };
}
function closeSheet(silent) {
  const el = $("#sheet");
  if (el) { el.remove(); document.body.style.overflow = ""; $("#app").inert = false; if (wake) setWake(false); }
  if (!silent && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  if (!silent) lastFocus = null;
}

export async function render(main, { args, changedView }) {
  FD = await food();
  if (changedView || !$("#rlist")) {
    main.innerHTML = `
      <h1 class="disp">${esc(t("cook_h"))}</h1>
      <p class="lead">${esc(t("cook_p"))}</p>
      ${filters()}
      <p class="mute small" id="rcount" role="status"></p>
      <div id="rlist"></div>
      ${foot()}`;
    bindFilters(); paint();
  }
  if (args[0]) openSheet(args[0]); else closeSheet(false);
  return () => closeSheet(true);
}
export { closeSheet };
