/* Schedules for food distributions.
   parseSchedule() runs at build time (Node) on the food banks' own wording and turns it into rules.
   nextTimes() runs on the phone and works out the next dates, in San Diego time.
   Anything we can't read with confidence is left as the original text, never guessed. */

const WD = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
const DAYRX = "(sun|mon|tue|wed|thu|fri|sat)[a-z]*\\.?";
const ORD = { "1st": 1, first: 1, "2nd": 2, second: 2, "3rd": 3, third: 3, "4th": 4, fourth: 4, "5th": 5, fifth: 5, last: -1 };
const ORDRX = "(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last)";
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const MONRX = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";

const pad = n => String(n).padStart(2, "0");
const wdOf = s => WD[s.toLowerCase().replace(/\.$/, "").replace(/s$/, "").slice(0, 3)];

/* "9:00 am - 12:00 pm", "8-11 am", "12 - 1 PM", "10:00am until food runs out", "at 3:00 PM" */
function toHM(h, m, ap, fallbackAp) {
  h = +h; m = +(m || 0);
  ap = (ap || fallbackAp || "").toLowerCase();
  if (h > 23 || m > 59) return null;
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 6) h += 12; // "from 1:00 - 3:00" with no am/pm: afternoon
  return pad(h) + ":" + pad(m);
}
const TIME = "(\\d{1,2})(?::(\\d{2}))?(?::\\d{2})?\\s*(a\\.?m\\.?|p\\.?m\\.?)?";
const RANGE_RX = new RegExp(TIME + "\\s*(?:-|–|—|to|until|till|thru)\\s*" + TIME, "gi");
const OPEN_END_RX = new RegExp("(?:from|at|starting at|begin(?:s|ning)? at)?\\s*" + TIME + "\\s*(?:until|till|while|or until|-\\s*until)\\s+(?:food|supplies|the food|all food)", "i");
const AT_RX = new RegExp("\\b(?:at|from)\\s+" + TIME, "i");
const cleanAp = a => (a || "").replace(/\./g, "").toLowerCase();

export function parseTimes(s) {
  const out = [];
  let m;
  RANGE_RX.lastIndex = 0;
  while ((m = RANGE_RX.exec(s))) {
    const a2 = cleanAp(m[6]), a1 = cleanAp(m[3]);
    // "11 - 1 PM": start shares the end's am/pm unless that makes start after end
    let from = toHM(m[1], m[2], a1, null), to = toHM(m[4], m[5], a2, null);
    if (!a1 && a2) {
      const guess = toHM(m[1], m[2], a2);
      from = guess && guess <= to ? guess : toHM(m[1], m[2], a2 === "pm" ? "am" : "pm");
    }
    if (!from) continue;
    if (to && to <= from) {
      // "10:00 am - 12:00 am" or "11:00pm-5:00pm": obvious typos; keep the start, drop the end
      const plus12 = pad((+to.slice(0, 2) + 12) % 24) + to.slice(2);
      to = plus12 > from && +to.slice(0, 2) < 12 ? plus12 : null;
    }
    if (to && from && hoursBetween(from, to) > 12) to = null;
    out.push([from, to]);
  }
  if (!out.length) {
    const o = s.match(OPEN_END_RX) || s.match(AT_RX);
    if (o) { const f = toHM(o[1], o[2], cleanAp(o[3])); if (f) out.push([f, null]); }
  }
  return out;
}
const hoursBetween = (a, b) => (toMin(b) - toMin(a)) / 60;
const toMin = hm => +hm.slice(0, 2) * 60 + +hm.slice(3);

/* Day expressions inside one clause. Returns [{wd, nth: [..] | null}] */
function parseDays(c) {
  const out = [];
  const used = [];
  // ordinal list + weekday(s): "1st and 3rd Thursday", "1st, 3rd, and 5th Monday", "3rd Monday and Tuesday", "1st and last Friday"
  const ordRx = new RegExp(`(?<ords>(?:${ORDRX}(?:\\s*(?:,|and|&|,\\s*and)\\s*)?)+)\\s*(?<wk>week\\s+of\\s+the\\s+month\\s*)?(?<days>${DAYRX}(?:\\s*(?:,|and|&)\\s*${DAYRX})*)`, "gi");
  let m;
  while ((m = ordRx.exec(c))) {
    const nth = [...m.groups.ords.matchAll(new RegExp(ORDRX, "gi"))].map(x => ORD[x[1].toLowerCase()]);
    const days = [...m.groups.days.matchAll(new RegExp(DAYRX, "gi"))].map(x => wdOf(x[0]));
    if (m.groups.wk || /week\s+of/i.test(c)) return { unclear: true };
    for (const wd of days) if (wd != null) out.push({ wd, nth: [...new Set(nth)].sort() });
    used.push([m.index, m.index + m[0].length]);
  }
  const rest = used.length ? c.split("").map((ch, i) => used.some(([a, b]) => i >= a && i < b) ? " " : ch).join("") : c;
  // ranges: "Monday - Friday", "Monday-Thursday", "Tuesday through Saturday", "Tuesdays - Thursdays"
  const rangeRx = new RegExp(`${DAYRX}\\s*(?:-|–|through|thru|to)\\s*${DAYRX}`, "gi");
  let r2 = rest;
  while ((m = rangeRx.exec(rest))) {
    const a = wdOf(m[0].match(new RegExp(DAYRX, "i"))[0]);
    const b = wdOf(m[0].split(/-|–|through|thru|to/i).pop().trim());
    if (a == null || b == null) continue;
    for (let d = a; ; d = (d + 1) % 7) { out.push({ wd: d, nth: null }); if (d === b) break; }
    r2 = r2.replace(m[0], " ");
  }
  // single days: "Wednesdays", "Every Monday", "Tuesdays & Saturdays", "Fridays"
  for (const x of r2.matchAll(new RegExp(`\\b${DAYRX}`, "gi"))) {
    const wd = wdOf(x[0]);
    if (wd != null && !out.some(o => o.wd === wd && o.nth == null)) out.push({ wd, nth: null });
  }
  return { days: out };
}

/* Dates in notes: "Jan 1", "January 22, 2026", "11/25", "12/21 - 12/25", "November 3rd" */
function parseDates(s, yearHint, ref) {
  const out = [];
  const pick = (mo, d, y) => {
    if (!mo || !d || d > 31) return;
    if (y) { out.push(`${y}-${pad(mo)}-${pad(d)}`); return; }
    if (yearHint) { out.push(`${yearHint}-${pad(mo)}-${pad(d)}`); return; }
    out.push(`Y-${pad(mo)}-${pad(d)}`); // year worked out later against the schedule (resolveYears)
  };
  // numeric ranges "12/21 - 12/25"
  let t = s.replace(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:-|–|to|through)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g, (all, m1, d1, y1, m2, d2, y2) => {
    const yA = y1 ? (+y1 < 100 ? 2000 + +y1 : +y1) : null;
    let a = Date.UTC(yA || ref.getUTCFullYear(), m1 - 1, +d1), b = Date.UTC(yA || ref.getUTCFullYear(), m2 - 1, +d2);
    if (b < a) b = Date.UTC((yA || ref.getUTCFullYear()) + 1, m2 - 1, +d2);
    for (let x = a, i = 0; x <= b && i < 40; x += 864e5, i++) { const d = new Date(x); pick(d.getUTCMonth() + 1, d.getUTCDate(), yA ? d.getUTCFullYear() : null); }
    return " ";
  });
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) pick(+m[1], +m[2], m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : null);
  t = t.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ");
  // "January 1 & 19; February 16" and "Nov 11, 26, & 27": a month name then one or more day numbers
  const rx = new RegExp(`\\b${MONRX}\\s+((?:\\d{1,2}(?:st|nd|rd|th)?(?:\\s*(?:,|&|and|,\\s*and|,\\s*&)\\s*(?=\\d{1,2}(?:st|nd|rd|th)?\\b(?!\\s*,?\\s*\\d{4}\\b(?!\\s*[,&]))))?)+)(?:\\s*,?\\s*(\\d{4}))?`, "gi");
  for (const m of t.matchAll(rx)) {
    const mo = MON[m[1].toLowerCase().slice(0, 3)];
    const y = m[3] ? +m[3] : null;
    for (const d of m[2].matchAll(/\d{1,2}/g)) pick(mo, +d[0], y || yearHint);
  }
  return out;
}

const MONTH_ONLY_RX = new RegExp(`\\b(?:no\\s+(?:food\\s+)?distribution\\s+in\\s+${MONRX}|${MONRX}\\s+(?:\\d{4}\\s+)?(?:distribution\\s+)?cancel)`, "i");

/* Notes about closures and reschedules. kind "sdfb" notes are a "reschedules/closures" column, so bare dates mean reschedules. */
export function parseNotes(text, src, ref = new Date()) {
  const res = { skip: [], add: [], moved: [], skipMonths: [], unclear: false };
  if (!text) return res;
  const s = text.replace(/\s+/g, " ").trim();
  if (/^(none|n\/a)$/i.test(s) || /^no (holiday )?(reschedul|closure|rescheduled)[a-z]*( or closed dates)?( for| in)? ?(holidays|2\d{3})?\.?$/i.test(s) || /all distributions will be held on regularly scheduled days/i.test(s) && !/\d/.test(s.replace(/all distributions[^.]*\./i, ""))) return res;
  const yearM = s.match(/\b(20\d\d)\b/);
  const yearHint = yearM ? +yearM[1] : null;
  // split into clauses at sentence ends and at keyword changes
  const clauses = s.split(/(?<=[.;])\s+|(?=\b(?:open on|cancell?ations?:|reschedul\w*(?: dates)?(?: due to holidays)?:|closed\b))/i).map(x => x.trim()).filter(Boolean);
  for (const c of clauses) {
    const low = c.toLowerCase();
    if (/no (holiday )?reschedul|regularly scheduled|^none$/.test(low) && !/\d/.test(low)) continue;
    const mo = low.match(MONTH_ONLY_RX);
    if (mo && !/\d/.test(low.replace(/20\d\d/g, ""))) {
      const name = (mo[1] || mo[2]).slice(0, 3);
      res.skipMonths.push(MON[name]);
      continue;
    }
    const dates = parseDates(c, yearHint, ref);
    if (!dates.length) { if (/\d/.test(low.replace(/20\d\d/g, ""))) res.unclear = true; continue; }
    // "will be on 11/21 and not 11/28" / "will be on 11/19, not 11/5"
    const wb = c.match(/will be on (.+?)(?:,|\s)\s*(?:and\s+)?not (.+)/i);
    if (wb) { res.add.push(...parseDates(wb[1], yearHint, ref)); res.skip.push(...parseDates(wb[2], yearHint, ref)); continue; }
    if (/closed|cancel|no (food )?distribution|not open|no pantry/.test(low)) res.skip.push(...dates);
    else if (/open on|will be on|moved to/.test(low)) res.add.push(...dates);
    else if (/resched/.test(low)) {
      // "August 27th rescheduled to August 20th"
      const pair = c.match(/(.+?)\s+rescheduled to\s+(.+)/i);
      if (pair && parseDates(pair[1], yearHint, ref).length && !/^reschedul/i.test(pair[1].trim())) {
        res.skip.push(...parseDates(pair[1], yearHint, ref)); res.add.push(...parseDates(pair[2], yearHint, ref));
      } else res.moved.push(...dates);
    }
    else if (src === "sdfb") res.moved.push(...dates); // bare dates in the reschedule column
    else res.unclear = true;
  }
  for (const k of ["skip", "add", "moved"]) res[k] = [...new Set(res[k])].sort();
  return res;
}

/* Notes often skip the year. Pick the year (last, this, next) that fits the schedule best:
   a closure should land on a regular date, a reschedule on the same weekday, then the nearest to today. */
export function resolveYears(nt, sched, ref = new Date()) {
  const ry = ref.getUTCFullYear();
  const isRegular = (y, m, d) => {
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return (sched.rules || []).some(r => r.wd === wd && (!r.nth || r.nth.some(k => k === -1 ? d + 7 > new Date(Date.UTC(y, m, 0)).getUTCDate() : Math.ceil(d / 7) === k)));
  };
  const sameWd = (y, m, d) => (sched.rules || []).some(r => r.wd === new Date(Date.UTC(y, m - 1, d)).getUTCDay());
  const fix = (arr, kind) => arr.map(x => {
    if (!x.startsWith("Y-")) return x;
    const m = +x.slice(2, 4), d = +x.slice(5, 7);
    let best = null, bs = -1e9;
    for (const y of [ry - 1, ry, ry + 1]) {
      const t = Date.UTC(y, m - 1, d), far = Math.abs(t - ref.getTime()) / 864e5;
      if (far > 330) continue;
      let sc = -far / 1000;
      if (kind === "skip" && isRegular(y, m, d)) sc += 3;
      if (kind !== "skip" && sameWd(y, m, d)) sc += 2;
      if (kind !== "skip" && isRegular(y, m, d)) sc -= 1;
      if (sc > bs) { bs = sc; best = y; }
    }
    return best ? `${best}-${x.slice(2)}` : null;
  }).filter(Boolean);
  return { ...nt, skip: [...new Set(fix(nt.skip, "skip"))].sort(), add: [...new Set(fix(nt.add, "add"))].sort(), moved: [...new Set(fix(nt.moved, "moved"))].sort() };
}

/* Main schedule text (+ optional weekday hour fields like {mon: "9:00 AM - 12:00 PM"}). */
export function parseSchedule(text, fields = {}, ref = new Date()) {
  const rules = [];
  const once = [];
  const except = [];
  let unclear = false;
  const s = (text || "").replace(/\s+/g, " ").trim();
  const fieldDays = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (!v || !v.trim()) continue;
    const wd = wdOf(k);
    const times = v.split(",").flatMap(parseTimes);
    if (wd != null && times.length) fieldDays[wd] = times;
  }
  const callOnly = /^(call|contact|email|visit|please call)\b/i.test(s) || /for (current|the) days/i.test(s);
  const isWeeklyWord = /^weekly\.?$/i.test(s);
  if (s && !callOnly && !isWeeklyWord) {
    // one-off dated events: "Monday, November 23, 2026, 11:00 AM - 1:00 PM"
    const ev = s.match(new RegExp(`^${DAYRX},?\\s+${MONRX}\\s+(\\d{1,2}),?\\s+(\\d{4}),?\\s*(.*)$`, "i"));
    if (ev) {
      const mo = MON[ev[2].toLowerCase().slice(0, 3)];
      const times = parseTimes(ev[5]);
      once.push({ date: `${ev[4]}-${pad(mo)}-${pad(+ev[3])}`, t: times.length ? times : [[null, null]] });
    } else {
      // explicit list of dates for "every other" schedules: "2026 Dates: 1/6, 1/20, ..."
      const list = s.match(/dates?:\s*([\d/,\s.and&]+)/i);
      const everyOther = /every other|alternating|bi-?weekly/i.test(s);
      if (everyOther && list) {
        const times = parseTimes(s);
        for (const d of parseDates(list[1], (s.match(/\b(20\d\d)\b/) || [])[1] ? +(s.match(/\b(20\d\d)\b/))[1] : null, ref)) once.push({ date: d, t: times.length ? times : [[null, null]] });
      } else if (everyOther) unclear = true;
      else {
        // "Closed every 4th Friday" / "Closed every 4th Thursday of the month"
        for (const m of s.matchAll(new RegExp(`closed (?:every|on the|the)?\\s*${ORDRX}\\s+${DAYRX}`, "gi"))) except.push({ wd: wdOf(m[2]), nth: [ORD[m[1].toLowerCase()]] });
        if (new RegExp(`${ORDRX}\\s+week\\b`, "i").test(s)) unclear = true;
        const body = s.replace(new RegExp(`[^;.]*${ORDRX}\\s+week\\b[^;]*`, "gi"), " ").replace(new RegExp(`closed (?:every|on the|the)?\\s*${ORDRX}\\s+${DAYRX}[^;.]*`, "gi"), " ")
          .replace(/\b(of|in)\s+(the|each|every)\s+month\b/gi, " ").replace(/\bstarting [a-z]+ \d+(st|nd|rd|th)?\b/gi, " ");
        const clauses = body.split(/;|\.\s+/)
          .flatMap(c => c.split(new RegExp(`(?<=(?:am|pm|a\\.m\\.|p\\.m\\.|\\d))\\s*(?:,|and|&)?\\s+(?=(?:every\\s+)?(?:${ORDRX}\\s+)?${DAYRX}\\b)`, "i")))
          .map(x => x && x.trim()).filter(x => x && !new RegExp(`^${ORDRX}$|^${DAYRX}$`, "i").test(x));
        let pending = null; // days waiting for times (e.g., "Every Monday. 1st and 3rd Friday only")
        let carryTimes = null;
        for (const c of clauses) {
          if (/by appointment|in (september|january|april)/i.test(c) && !/\d{1,2}(:\d\d)?\s*(am|pm)/i.test(c) && !new RegExp(ORDRX + "\\s+" + DAYRX, "i").test(c)) continue;
          if (new RegExp(`\\b(in|during)\\s+${MONRX}`, "i").test(c)) { unclear = true; continue; }
          const pd = parseDays(c);
          if (pd.unclear) { unclear = true; continue; }
          let times = parseTimes(c);
          // "Hours: 9-12 and 1-3:30; Tuesday - Saturday": times in one clause, days in the next
          if (!pd.days.length && times.length) {
            if (pending) { for (const d of pending) addRule(rules, d, times); pending = null; }
            else if (rules.length) { const last = rules[rules.length - 1]; last.t.push(...times); }
            else carryTimes = times;
            continue;
          }
          if (!pd.days.length) continue;
          if (!times.length && carryTimes) times = carryTimes;
          if (!times.length) {
            // take hours from the weekday fields when the text only names days
            const withField = pd.days.filter(d => fieldDays[d.wd]);
            for (const d of withField) addRule(rules, d, fieldDays[d.wd]);
            const without = pd.days.filter(d => !fieldDays[d.wd]);
            if (without.length) pending = without;
            continue;
          }
          for (const d of pd.days) addRule(rules, d, times);
        }
        if (pending) for (const d of pending) addRule(rules, d, [[null, null]]);
      }
    }
  }
  // weekday fields: weekly unless the text already gave that weekday a monthly pattern
  for (const [wd, times] of Object.entries(fieldDays)) {
    const w = +wd;
    if (rules.some(r => r.wd === w)) continue;
    if (once.length && !isWeeklyWord) continue;
    rules.push({ wd: w, nth: null, t: times });
  }
  for (const r of rules) {
    // a weekly rule from the text that disagrees with a monthly one for the same day is dropped
    if (r.nth == null && rules.some(o => o !== r && o.wd === r.wd && o.nth)) r.drop = true;
  }
  const out = rules.filter(r => !r.drop);
  let conf = out.length || once.length ? "ok" : callOnly ? "call" : "none";
  if (unclear) conf = out.length || once.length ? "partial" : "none";
  if (out.some(r => r.t.some(([f]) => !f))) conf = conf === "ok" ? "notime" : conf;
  return { rules: out, once, except, conf };
}
function addRule(rules, d, times) {
  const ex = rules.find(r => r.wd === d.wd && JSON.stringify(r.nth) === JSON.stringify(d.nth));
  if (ex) { for (const t of times) if (!ex.t.some(x => x[0] === t[0] && x[1] === t[1])) ex.t.push(t); }
  else rules.push({ wd: d.wd, nth: d.nth, t: times.map(x => [...x]) });
}

/* ---------- runtime: next dates, in America/Los_Angeles ---------- */
const TZ = "America/Los_Angeles";
export function laParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hm: `${p.hour}:${p.minute}`, wd: WD[p.weekday.toLowerCase()] };
}
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
function nthOf(y, m, d) { return Math.ceil(d / 7); }
function isLast(y, m, d) { return d + 7 > new Date(Date.UTC(y, m, 0)).getUTCDate(); }

/* Returns up to `n` upcoming {date: "YYYY-MM-DD", t: [from,to], today, now} within `days` days. */
export function nextTimes(sched, now = new Date(), n = 3, days = 45) {
  if (!sched) return [];
  const { rules = [], once = [], except = [], skip = [], add = [], moved = [], skipMonths = [] } = sched;
  const L = laParts(now);
  const today = iso(L.y, L.m, L.d);
  const cand = new Map();
  const base = Date.UTC(L.y, L.m - 1, L.d);
  for (let i = 0; i < days; i++) {
    const dt = new Date(base + i * 864e5);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate(), wd = dt.getUTCDay();
    for (const r of rules) {
      if (r.wd !== wd) continue;
      if (r.nth && !r.nth.some(k => k === -1 ? isLast(y, m, d) : nthOf(y, m, d) === k)) continue;
      if (except.some(e => e.wd === wd && e.nth.some(k => k === -1 ? isLast(y, m, d) : nthOf(y, m, d) === k))) continue;
      const key = iso(y, m, d);
      const prev = cand.get(key) || [];
      cand.set(key, [...prev, ...r.t]);
    }
  }
  // reschedules in the food bank's own reschedule column: the moved date replaces the nearest regular date
  for (const md of moved) {
    const [y, m, d] = md.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d);
    if (t < base - 31 * 864e5 || t > base + days * 864e5) continue;
    let best = null, bd = 1e15;
    // search regular dates around it, including just outside our window
    for (let i = -10; i <= 10; i++) {
      const dt = new Date(t + i * 864e5);
      const yy = dt.getUTCFullYear(), mm = dt.getUTCMonth() + 1, dd = dt.getUTCDate(), wd = dt.getUTCDay();
      const hit = rules.some(r => r.wd === wd && (!r.nth || r.nth.some(k => k === -1 ? isLast(yy, mm, dd) : nthOf(yy, mm, dd) === k)));
      const sameUnit = rules.some(r => r.nth) ? mm === m : true;
      if (hit && sameUnit && Math.abs(i) < bd && i !== 0) { bd = Math.abs(i); best = iso(yy, mm, dd); }
    }
    const times = (best && cand.get(best)) || rules.find(r => r.wd === new Date(t).getUTCDay())?.t || rules[0]?.t || [[null, null]];
    if (best) cand.delete(best);
    if (t >= base) cand.set(md, times);
  }
  for (const a of add) {
    const [y, m, d] = a.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d);
    if (t < base || t > base + days * 864e5) continue;
    if (!cand.has(a)) cand.set(a, rules.find(r => r.wd === new Date(t).getUTCDay())?.t || rules[0]?.t || [[null, null]]);
  }
  for (const o of once) cand.set(o.date, [...(cand.get(o.date) || []), ...o.t]);
  for (const s of skip) cand.delete(s);
  for (const k of [...cand.keys()]) if (skipMonths.includes(+k.slice(5, 7))) cand.delete(k);
  const out = [];
  for (const k of [...cand.keys()].sort()) {
    if (k < today) continue;
    const slots = dedupeSlots(cand.get(k));
    for (const t of slots) {
      if (k === today && t[1] && t[1] <= L.hm) continue;      // already over today
      if (k === today && !t[1] && t[0] && hoursBetween(t[0], L.hm) > 3) continue; // "until food runs out": likely over
      out.push({ date: k, t, today: k === today, now: k === today && t[0] && t[0] <= L.hm && (!t[1] || t[1] > L.hm) });
      if (out.length >= n) return out;
    }
  }
  return out;
}
function dedupeSlots(arr) {
  const seen = new Set(), out = [];
  for (const t of arr.sort((a, b) => String(a[0]).localeCompare(String(b[0])))) { const k = t.join("|"); if (!seen.has(k)) { seen.add(k); out.push(t); } }
  return out;
}
export const todayISO = (now = new Date()) => { const L = laParts(now); return iso(L.y, L.m, L.d); };
