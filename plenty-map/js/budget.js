/* Budget: a week of meals for your household, what it costs, and a shopping list by aisle. */
import { S, save, t, esc, $, $$, ico, money, num, rt, dayName, shareThing, toast, announce, activeCuisine } from "./core.js";
import { food, canCook, dietOk, perServing, price, name, pkgLabel, cuisineMatch } from "./food.js";
import { SNAP } from "./benefits.js";
import { foot } from "./app.js";

let FD;
const AISLES = ["prod", "pantry", "cans", "dairy", "meat", "frozen", "bread", "spice"];
const portions = () => S.hh.a + S.hh.k * 0.7;
const people = () => S.hh.a + S.hh.k;
const planKey = () => [2, S.hh.a, S.hh.k, S.diet, S.kit.join("+"), S.comfort, activeCuisine(), S.meals.b, S.meals.l, S.meals.d].join("|");

function pools() {
  const ok = r => canCook(r) && dietOk(r) && r.lvl <= S.comfort;
  const dinner = r => r.serves >= 4 && !FD.slotB.has(r.id);
  return {
    b: FD.slots.b.map(i => FD.byId[i]).filter(Boolean).filter(ok),
    l: FD.slots.l.map(i => FD.byId[i]).filter(Boolean).filter(ok),
    d: FD.recipes.filter(dinner).filter(ok),
  };
}
/* Cheaper meals, home cooking, and meals that reuse what's already on the list come up more often. */
function pick(pool, avoid, onList = new Set()) {
  if (!pool.length) return null;
  let cand = pool.filter(r => !avoid.has(r.id)); if (!cand.length) cand = pool;
  const sorted = [...cand].sort((a, b) => perServing(a) - perServing(b));
  const overlap = r => { const main = r.ing.filter(([id]) => FD.ing[id].aisle !== "spice"); return main.length ? main.filter(([id]) => onList.has(id)).length / main.length : 0; };
  const w = sorted.map((r, i) => (1 / (i + 1.6)) * (cuisineMatch(r) ? 2.2 : 1) * (1 + 2 * overlap(r)));
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < sorted.length; i++) { x -= w[i]; if (x <= 0) return sorted[i].id; }
  return sorted[0].id;
}
/* Cook once, eat twice: a dinner pot feeds the next day's lunch and sometimes a second dinner.
   Each slot is {id, pot, lo}: pot numbers a cooked batch, lo marks leftovers. */
function makePlan() {
  const p = pools(), por = portions(), days = [], onList = new Set(), used = { b: new Set(), l: new Set(), d: new Set() };
  const note = id => FD.byId[id]?.ing.forEach(([i]) => onList.add(i));
  let pot = null, potN = 0;
  const bfast = [];
  for (let i = 0; i < 2 && p.b.length; i++) { const id = pick(p.b, new Set(bfast), onList); if (id) { bfast.push(id); note(id); } }
  for (let i = 0; i < 7; i++) {
    const day = {};
    if (S.meals.b && bfast.length) day.b = { id: bfast[i % bfast.length] };
    if (S.meals.l) {
      if (pot && pot.left >= por) { day.l = { id: pot.id, pot: pot.n, lo: 1 }; pot.left -= por; }
      else if (p.l.length) {
        const avoid = new Set([...used.l, pot?.id].filter(Boolean));
        if (used.l.size >= p.l.length) used.l.clear();
        const id = pick(p.l, avoid, onList); if (id) { day.l = { id }; used.l.add(id); note(id); }
      }
    }
    if (S.meals.d) {
      if (pot && pot.left >= por && pot.dinners < 2) { day.d = { id: pot.id, pot: pot.n, lo: 1 }; pot.left -= por; pot.dinners++; }
      else if (p.d.length) {
        if (used.d.size >= p.d.length) used.d.clear();
        const avoid = new Set([...used.d, day.l?.id].filter(Boolean));
        const id = pick(p.d, avoid, onList);
        if (id) {
          const r = FD.byId[id], batch = r.serves * Math.max(1, Math.ceil(por / r.serves));
          pot = { id, n: ++potN, left: batch - por, dinners: 1, batch };
          day.d = { id, pot: pot.n, batch }; used.d.add(id); note(id);
        }
      }
    }
    days.push(day);
  }
  S.plan = { v: 2, days, key: planKey() }; save("plan");
}

function totals() {
  const need = {}, por = portions();
  const addR = (r, servings) => { for (const [id, q] of r.ing) need[id] = (need[id] || 0) + q * servings / r.serves; };
  let eat = 0;
  for (const day of S.plan.days) for (const m in day) {
    const x = day[m], r = FD.byId[x.id]; if (!r) continue;
    eat += perServing(r) * por;
    if (x.lo) continue;                       // leftovers were bought with the pot
    addR(r, x.batch || por);
  }
  for (const [id, sv] of Object.entries(S.extra)) { const r = FD.byId[id]; if (r) { addR(r, sv); eat += perServing(r) * sv; } }
  let trip = 0; const items = [];
  for (const id in need) {
    const x = FD.ing[id]; if (!x) continue;
    const n = Math.max(1, Math.ceil(need[id] / x.per - 0.03));
    const have = S.have.has(id), c = n * x.per * price(id);
    if (!have) trip += c;
    items.push({ id, n, c, have, aisle: x.aisle });
  }
  return { eat, trip, items };
}

/* Swap one meal. Swapping a pot changes every meal made from it. */
function swap(i, m) {
  const p = pools(), x = S.plan.days[i][m];
  const avoid = new Set(S.plan.days.flatMap(d => Object.values(d).map(v => v.id)));
  if (m === "b") {
    const id = pick(p.b, avoid); if (!id) return;
    const old = x.id; S.plan.days.forEach(d => { if (d.b?.id === old) d.b = { id }; });
  } else if (x.pot) {
    // keep the same number of servings so the leftovers still work out
    const old = S.plan.days.flatMap(d => ["d"].map(k => d[k])).find(v => v?.pot === x.pot && v.batch)?.batch || 0;
    const fits = p.d.filter(r => r.serves * Math.max(1, Math.ceil(portions() / r.serves)) >= old);
    const id = pick(fits.length ? fits : p.d, avoid); if (!id) return;
    S.plan.days.forEach(d => ["l", "d"].forEach(k => { if (d[k]?.pot === x.pot) d[k] = { ...d[k], id, batch: d[k].batch ? FD.byId[id].serves * Math.max(1, Math.ceil(portions() / FD.byId[id].serves)) : undefined }; }));
  } else {
    const id = pick(p[m], avoid); if (id) S.plan.days[i][m] = { id };
  }
  save("plan");
}

function stepper(k, v, label, min) {
  return `<div class="row between"><span id="lb-${k}"><b>${esc(label)}</b></span>
    <span class="stepper" role="group" aria-labelledby="lb-${k}"><button type="button" data-hh="${k}" data-v="-1" aria-label="${esc(t("fewer"))}" ${v <= min ? "disabled" : ""}>−</button><output aria-live="polite">${num(v)}</output><button type="button" data-hh="${k}" data-v="1" aria-label="${esc(t("more"))}">+</button></span></div>`;
}

function paint() {
  if (!S.plan || S.plan.key !== planKey()) makePlan();
  const tot = totals();
  const n = Math.max(1, people());
  const snapMonth = SNAP.max(n);
  const weekly = S.weekly ?? Math.round(snapMonth / 4.33);
  const pct = weekly ? tot.eat / weekly : 0;
  $("#kpis").innerHTML = `
    <div class="card kpi"><b>${esc(money(tot.eat, false))}</b><span>${esc(t("week_cost"))}</span></div>
    <div class="card kpi"><b>${esc(money(tot.eat / Math.max(1, n) / 7))}</b><span>${esc(t("per_person_day"))}</span></div>
    <div class="card kpi"><b>${esc(money(tot.trip, false))}</b><span>${esc(t("trip_cost"))}</span><span class="tiny mute">${esc(t("trip_note"))}</span></div>
    <div class="card kpi"><b>${esc(money(weekly, false))}</b><span>${esc(t(S.weekly == null ? "budget_suggest" : "your_budget"))}</span>
      <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(1, pct) * 100)}" aria-label="${esc(t("of_budget", { p: num(Math.round(pct * 100)) }))}"><i class="${pct > 1 ? "over" : ""}"></i></div>
      <span class="small">${esc(pct > 1 ? t("over_budget", { m: money(tot.eat - weekly, false) }) : t("under_budget", { m: money(weekly - tot.eat, false) }))}</span></div>`;
  $("#kpis .meter i").style.width = Math.min(100, Math.round(pct * 100)) + "%";

  $("#week").innerHTML = S.plan.days.map((d, i) => `<div class="card day"><h3>${esc(dayName((i + 1) % 7))}</h3>
    ${["b", "l", "d"].filter(m => d[m]).map(m => { const x = d[m], nm = rt(x.id).t; return `<div class="meal"><span class="k">${esc(t("meal_" + m))}</span>
      <button class="name" type="button" data-open="${x.id}">${esc(nm)}${x.lo ? ` <span class="badge">${esc(t("leftovers"))}</span>` : x.batch ? ` <span class="badge yolk">${esc(t("cook_n", { n: x.batch }))}</span>` : ""}</button>
      <button class="iconbtn" type="button" data-swap="${i}${m}" aria-label="${esc(t("swap_meal", { m: nm }))}">${ico("swap")}</button></div>`; }).join("") || `<p class="mute small">${esc(t("no_meals"))}</p>`}</div>`).join("");
  $$("[data-open]").forEach(b => b.onclick = () => { location.hash = "#/cook/" + b.dataset.open; });
  $$("[data-swap]").forEach(b => b.onclick = () => {
    const i = +b.dataset.swap[0], m = b.dataset.swap[1];
    swap(i, m); paint(); $(`[data-swap="${i}${m}"]`)?.focus(); announce(rt(S.plan.days[i][m].id).t);
  });

  const by = {}; for (const it of tot.items) (by[it.aisle] ||= []).push(it);
  $("#shop").innerHTML = AISLES.filter(a => by[a]).map(a => `<h3>${esc(t("aisle_" + a))}</h3>${by[a].sort((x, y) => name(x.id).localeCompare(name(y.id), S.lang)).map(it => `
    <div class="check ${S.got.has(it.id) ? "done" : ""}">
      <input type="checkbox" id="g-${it.id}" data-got="${it.id}" ${S.got.has(it.id) ? "checked" : ""}>
      <label class="nm" for="g-${it.id}">${esc(name(it.id))}<small>${esc(it.have ? t("have_it") : `${num(it.n)} × ${pkgLabel(it.id)}`)}</small></label>
      <button class="link small" type="button" data-have="${it.id}">${esc(it.have ? t("need_it") : t("have_it_btn"))}</button>
      ${it.have ? "" : `<button class="price" type="button" data-price="${it.id}" aria-label="${esc(t("edit_price", { i: name(it.id), m: money(it.c) }))}">${esc(money(it.c))}</button>`}
    </div>`).join("")}`).join("") || `<p class="mute">${esc(t("list_empty"))}</p>`;
  $$("[data-got]").forEach(c => c.onchange = () => { c.checked ? S.got.add(c.dataset.got) : S.got.delete(c.dataset.got); save("got"); c.parentElement.classList.toggle("done", c.checked); });
  $$("[data-have]").forEach(b => b.onclick = () => { const id = b.dataset.have; S.have.has(id) ? S.have.delete(id) : S.have.add(id); save("have"); paint(); $(`[data-have="${id}"]`)?.focus(); });
  $$("[data-price]").forEach(b => b.onclick = () => editPrice(b.dataset.price, b));
  $("#extras").innerHTML = Object.keys(S.extra).length ? `<p class="small">${esc(t("extras", { n: Object.keys(S.extra).length }))} <button class="link" type="button" id="clrx">${esc(t("clear"))}</button></p>` : "";
  $("#clrx")?.addEventListener("click", () => { S.extra = {}; save("extra"); paint(); });
}

function editPrice(id, btn) {
  const x = FD.ing[id];
  const f = document.createElement("form"); f.className = "row";
  f.innerHTML = `<label class="sr" for="pe">${esc(t("price_for", { p: pkgLabel(id) }))}</label>
    <input class="in" id="pe" inputmode="decimal" size="6" value="${(price(id) * x.per).toFixed(2)}">
    <button class="btn sm" type="submit">${esc(t("save"))}</button>
    ${S.prices[id] != null ? `<button class="link small" type="button" id="prs">${esc(t("reset"))}</button>` : ""}`;
  btn.replaceWith(f); const inp = $("#pe", f); inp.focus(); inp.select();
  f.onsubmit = e => { e.preventDefault(); const v = parseFloat(inp.value.replace(/[^0-9.]/g, "")); if (v > 0 && v < 500) { S.prices[id] = v / x.per; save("prices"); } paint(); $(`[data-price="${id}"]`)?.focus(); };
  $("#prs", f)?.addEventListener("click", () => { delete S.prices[id]; save("prices"); paint(); });
  inp.onkeydown = e => { if (e.key === "Escape") paint(); };
}

function listText() {
  const tot = totals(), by = {};
  for (const it of tot.items) if (!it.have && !S.got.has(it.id)) (by[it.aisle] ||= []).push(it);
  return `Plenty Map · ${t("shop_h")}\n` + AISLES.filter(a => by[a]).map(a => `\n${t("aisle_" + a)}\n` + by[a].map(it => `☐ ${name(it.id)}: ${num(it.n)} × ${pkgLabel(it.id)} (${money(it.c)})`).join("\n")).join("\n") + `\n\n${t("total")}: ${money(tot.trip)}`;
}

export async function render(main) {
  FD = await food();
  main.innerHTML = `
    <h1 class="disp">${esc(t("budget_h"))}</h1>
    <p class="lead">${esc(t("budget_p"))}</p>
    <div class="grid2 gap-t">
      <div class="card pad stack">
        ${stepper("a", S.hh.a, t("adults"), 1)}
        ${stepper("k", S.hh.k, t("kids"), 0)}
        <div><span class="lbl small mute" id="l-meals"><b>${esc(t("meals_q"))}</b></span>
          <div class="chips wrap" role="group" aria-labelledby="l-meals">${["b", "l", "d"].map(m => `<button class="chip" type="button" data-m="${m}" aria-pressed="${!!S.meals[m]}">${esc(t("meal_" + m))}</button>`).join("")}</div></div>
        <label class="field"><span>${esc(t("weekly_q"))}</span>
          <input class="in" id="wk" inputmode="decimal" placeholder="${esc(t("weekly_ph"))}" value="${S.weekly ?? ""}">
          <small>${esc(t("weekly_hint"))}</small></label>
      </div>
      <div class="kpis" id="kpis"></div>
    </div>
    <div class="sec"><h2>${esc(t("week_h"))}</h2><button class="btn sm ghost" type="button" id="shuf">${ico("refresh", "i sm")} ${esc(t("reshuffle"))}</button></div>
    <div class="week grid2" id="week"></div>
    <div class="sec"><h2>${esc(t("shop_h"))}</h2>
      <span class="row"><button class="btn sm ghost" type="button" id="sharel">${ico("share", "i sm")} ${esc(t("share"))}</button><button class="btn sm ghost" type="button" id="printl">${ico("print", "i sm")} ${esc(t("print"))}</button></span></div>
    <div id="extras"></div>
    <div class="card shop" id="shop"></div>
    <p class="tiny mute">${esc(t("price_note"))} ${esc(t("price_edit_hint"))}</p>
    ${foot()}`;
  $$("[data-hh]").forEach(b => b.onclick = () => {
    const k = b.dataset.hh; S.hh[k] = Math.max(k === "a" ? 1 : 0, Math.min(12, S.hh[k] + +b.dataset.v)); save("hh");
    const row = b.parentElement; row.querySelector("output").textContent = num(S.hh[k]); row.querySelector('[data-v="-1"]').disabled = S.hh[k] <= (k === "a" ? 1 : 0);
    paint();
  });
  $$("[data-m]").forEach(b => b.onclick = () => {
    const m = b.dataset.m; S.meals[m] = S.meals[m] ? 0 : 1;
    if (!S.meals.b && !S.meals.l && !S.meals.d) S.meals[m] = 1;
    save("meals"); $$("[data-m]").forEach(x => x.setAttribute("aria-pressed", !!S.meals[x.dataset.m])); paint();
  });
  $("#wk").onchange = e => { const v = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); S.weekly = v > 0 ? Math.round(v) : null; save("weekly"); e.target.value = S.weekly ?? ""; paint(); };
  $("#shuf").onclick = () => { makePlan(); paint(); announce(t("reshuffled")); };
  $("#printl").onclick = () => window.print();
  $("#sharel").onclick = () => shareThing({ title: t("shop_h"), text: listText() });
  paint();
}
