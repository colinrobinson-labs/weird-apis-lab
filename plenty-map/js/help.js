/* Help: urgent numbers, a private quick check for CalFresh, WIC and more, and plain-language program cards. */
import { S, t, esc, $, $$, ico, money, num, telHref, openOut, announce } from "./core.js";
import { SNAP, WIC, SUN_BUCKS, LINKS, PHONES, AS_OF } from "./benefits.js";
import { foot } from "./app.js";

// Kept in memory only. Income is never written to the phone's storage.
let Q = null;

const tel = (num, label, cls = "btn sm") => `<a class="${cls}" href="${telHref(num)}">${ico("phone", "i sm")} ${esc(label)}</a>`;
const out = (href, label, cls = "btn sm ghost") => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-out>${esc(label)} ${ico("ext", "i sm")}</a>`;
const odds = k => k ? `<span class="badge ${k === "likely" ? "ok" : k === "maybe" ? "warn" : ""}">${esc(t("odds_" + k))}</span>` : "";

function prog(id, title, odd, body, acts, note) {
  return `<article class="card prog" id="p-${id}">
    <h3>${esc(title)} ${odds(odd)}</h3>
    <p>${body}</p>
    ${note ? `<p class="small mute">${note}</p>` : ""}
    ${acts ? `<div class="row">${acts}</div>` : ""}
  </article>`;
}

function results() {
  if (!Q) return "";
  const n = Math.max(1, Q.n), inc = Q.inc, w = Q.w;
  const gross = SNAP.grossLimit(n), max = SNAP.max(n);
  const older = w.senior || w.dis;
  const cf = inc <= gross ? "likely" : older ? "maybe" : "ask";
  const outp = [];
  outp.push(prog("calfresh", t("cf_h"), cf,
    esc(t(cf === "likely" ? "cf_likely" : cf === "maybe" ? "cf_maybe" : "cf_ask", { g: money(gross, false), n })) + " " + esc(t("cf_max", { m: money(max, false), n })),
    out(LINKS.calfresh_apply, t("apply_online"), "btn sm pri") + out(LINKS.getcalfresh, "GetCalFresh") + tel(PHONES.county, t("call_county")),
    esc(t(inc < 150 ? "cf_fast" : "cf_note"))));
  if (w.preg || w.baby) {
    const ok = inc <= WIC.limit(n) || cf === "likely";
    outp.push(prog("wic", t("wic_h"), ok ? "likely" : "ask", esc(t("wic_p", { g: money(WIC.limit(n), false) })), out(LINKS.wic, t("apply_online"), "btn sm pri") + tel(PHONES.wic, t("call"))));
  }
  if (w.school) {
    outp.push(prog("school", t("school_h"), "likely", esc(t("school_p"))));
    outp.push(prog("sunbucks", t("sun_h"), inc <= WIC.limit(n) ? "likely" : "ask", esc(t("sun_p", { m: money(SUN_BUCKS, false) })), out(LINKS.sunbucks, t("learn_more")) + tel(PHONES.sunbucks, t("call"))));
  }
  if (w.senior) {
    outp.push(prog("csfp", t("csfp_h"), inc <= Math.round(SNAP.grossLimit(n) * 0.75) ? "likely" : "ask", esc(t("csfp_p")), `<a class="btn sm" href="#/find">${ico("basket", "i sm")} ${esc(t("cat_senior"))}</a>`));
    outp.push(prog("ais", t("ais_h"), "likely", esc(t("ais_p")), tel(PHONES.ais, t("call_ais")) + out(LINKS.ais, t("learn_more"))));
  }
  if (w.senior || w.dis || w.home) outp.push(prog("rmp", t("rmp_h"), cf === "ask" ? "maybe" : "likely", esc(t("rmp_p")), `<a class="btn sm" href="#/find">${esc(t("cat_rmp"))}</a>` + out(LINKS.rmp, t("learn_more"))));
  if (w.home) outp.push(prog("home", t("home_h"), "likely", esc(t("home_p")), tel(PHONES.sd211, t("call_211"), "btn sm pri")));
  outp.push(prog("pantry", t("pantry_h"), "likely", esc(t("pantry_p")), `<a class="btn sm" href="#/find">${ico("basket", "i sm")} ${esc(t("tab_find"))}</a>`));
  return `<div class="sec"><h2 id="res-h" tabindex="-1">${esc(t("results_h"))}</h2></div>
    <p class="notice">${ico("info")}<span>${esc(t("results_note"))}</span></p>
    <div class="grid2">${outp.join("")}</div>`;
}

export async function render(main) {
  const q = Q || { n: Math.max(1, S.hh.a + S.hh.k), inc: "", w: { senior: S.senior } };
  const ck = k => `<label class="check"><input type="checkbox" data-w="${k}" ${q.w[k] ? "checked" : ""}><span>${esc(t("w_" + k))}</span></label>`;
  main.innerHTML = `
    <h1 class="disp">${esc(t("help_h"))}</h1>
    <p class="lead">${esc(t("help_p"))}</p>
    <section class="urgent gap-t" aria-labelledby="urg-h">
      <h2 id="urg-h">${esc(t("urgent_h"))}</h2>
      <p>${esc(t("urgent_p"))}</p>
      <div class="row">
        ${tel(PHONES.sd211, t("call_211"), "btn pri")}
        ${tel(PHONES.sdfb, t("call_sdfb"), "btn")}
        ${tel(PHONES.fsd, t("call_fsd"), "btn")}
        <a class="btn" href="#/find">${ico("basket", "i sm")} ${esc(t("free_near"))}</a>
      </div>
    </section>

    <div class="sec"><h2>${esc(t("check_h"))}</h2></div>
    <form class="card qs" id="qs" novalidate>
      <p class="small mute">${ico("lock", "i sm")} ${esc(t("check_private"))}</p>
      <div class="row between"><span id="l-n"><b>${esc(t("hh_size"))}</b></span>
        <span class="stepper" role="group" aria-labelledby="l-n"><button type="button" data-n="-1" aria-label="${esc(t("fewer"))}">−</button><output id="qn" aria-live="polite">${num(q.n)}</output><button type="button" data-n="1" aria-label="${esc(t("more"))}">+</button></span></div>
      <label class="field"><span>${esc(t("income_q"))}</span>
        <input class="in" id="inc" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(q.inc)}">
        <small>${esc(t("income_hint"))}</small></label>
      <fieldset class="field"><legend><b>${esc(t("who_q"))}</b></legend>
        ${["preg", "baby", "school", "senior", "dis", "home"].map(ck).join("")}
      </fieldset>
      <button class="btn pri block" type="submit">${esc(t("check_btn"))}</button>
    </form>
    <div id="res">${results()}</div>

    <div class="sec"><h2>${esc(t("more_h"))}</h2></div>
    <div class="grid2">
      ${prog("mm", t("mm_h"), "", esc(t("mm_p")), `<a class="btn sm" href="#/find">${esc(t("cat_market"))}</a>` + out(LINKS.marketmatch, t("learn_more")))}
      ${prog("imm", t("imm_h"), "", esc(t("imm_p")), tel(PHONES.sd211, t("call_211")) + out(LINKS.hr1, t("learn_more")))}
      ${prog("work", t("work_h"), "", esc(t("work_p")), out(LINKS.hr1, t("learn_more")))}
      ${prog("scam", t("scam_h"), "", esc(t("scam_p")))}
    </div>
    <p class="tiny mute gap-t">${esc(t("figures_asof", { d: AS_OF }))}</p>
    ${foot()}`;

  $$("[data-n]").forEach(b => b.onclick = () => { q.n = Math.max(1, Math.min(16, q.n + +b.dataset.n)); $("#qn").textContent = num(q.n); });
  $("#qs").onsubmit = e => {
    e.preventDefault();
    const raw = $("#inc").value;
    q.inc = raw; q.w = {};
    $$("[data-w]").forEach(c => { if (c.checked) q.w[c.dataset.w] = 1; });
    Q = { n: q.n, inc: parseFloat(String(raw).replace(/[^0-9.]/g, "")) || 0, w: q.w, raw };
    $("#res").innerHTML = results(); bindOut($("#res"));
    $("#res-h")?.focus(); announce(t("results_h"));
  };
  if (Q) $("#inc").value = Q.raw;
  bindOut(main);
}
function bindOut(root) {
  $$("a[data-out]", root).forEach(a => a.addEventListener("click", e => { e.preventDefault(); openOut(a.href); }));
}
