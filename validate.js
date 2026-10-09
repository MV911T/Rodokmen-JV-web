#!/usr/bin/env node
// Consistency checks for data.js – run by build.sh before every publish.
// ERROR = data that cannot be true (blocks publishing); WARN = likely stale/inconsistent, must be reviewed.
// Usage: node validate.js [--strict]   (--strict also fails on warnings)
'use strict';
const fs = require('fs');
const path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'));
const D = window.RODOKMEN, P = D.people, byId = Object.fromEntries(P.map(p => [p.id, p]));

const out = [];
const err = (p, msg) => out.push(['ERROR', p ? p.id : '-', msg]);
const warn = (p, msg) => out.push(['WARN', p ? p.id : '-', msg]);

// 4-digit years mentioned in a date string (e.g. "cca 1870–1874" -> [1870, 1874])
const yearsIn = s => (String(s || '').match(/\b(1[5-9]\d\d|20\d\d)\b/g) || []).map(Number);
// exact = date given to the day (d. m. yyyy)
const isExact = e => !!(e && /\b\d{1,2}\.\s*\d{1,2}\.\s*\d{4}\b/.test(e.date || '') && !/před|po |mezi|cca|nejspíš|\?|–/.test(e.date || ''));
const by = e => (e && e.year) || null;

const children = {};
P.forEach(c => ['father', 'mother'].forEach(k => { if (c[k]) (children[c[k]] = children[c[k]] || []).push(c); }));

for (const p of P) {
  // 1. structural
  for (const k of ['father', 'mother']) if (p[k] && !byId[p[k]]) err(p, `${k} "${p[k]}" does not exist`);
  if (!['M', 'D', 'R', 'K'].includes(p.cert)) err(p, `invalid cert "${p.cert}"`);
  for (const k of ['spouse']) if (p[k] && !byId[p[k]]) err(p, `${k} "${p[k]}" does not exist`);
  for (const s of p.siblings || []) if (!byId[s]) err(p, `sibling "${s}" does not exist`);
  if (p.id !== D.root && !children[p.id] && !p.father && !p.mother && !(p.spouse && byId[p.spouse]) && !P.some(q => q.spouse === p.id) && !(p.siblings || []).length)
    warn(p, 'person is not connected to anyone in the tree (no child, parent, spouse or sibling)');

  // 2. year field vs. date text
  for (const [k, e] of [['b', p.b], ['d', p.d]]) {
    if (!e) continue;
    const ys = yearsIn(e.date);
    const before = /^\s*před/.test(e.date || ''), after = /^\s*po\b/.test(e.date || '');
    if (ys.length && e.year && !ys.includes(e.year) && !(ys.length === 2 && e.year >= ys[0] && e.year <= ys[1])
        && !(before && e.year <= Math.max(...ys)) && !(after && e.year >= Math.min(...ys)))
      err(p, `${k}.year ${e.year} does not match ${k}.date "${e.date}"`);
    if (isExact(e) && e.approx) warn(p, `${k}.date "${e.date}" is exact but marked approx`);
  }
  if (by(p.b) && by(p.d) && by(p.d) < by(p.b)) err(p, `death ${by(p.d)} before birth ${by(p.b)}`);
  if (by(p.b) && by(p.d) && by(p.d) - by(p.b) > 105) warn(p, `age at death ${by(p.d) - by(p.b)} > 105`);

  // 3. parent/child chronology (catches stale estimates like "~1880" for a father of a child born 1894)
  for (const c of children[p.id] || []) {
    const pb = by(p.b), cb = by(c.b);
    if (!pb || !cb) continue;
    const age = cb - pb, sex = c.mother === p.id ? 'mother' : 'father';
    if (age < 15) (p.b.approx ? warn : err)(p, `${sex} only ${age} at birth of ${c.id} (${cb}) – ${p.b.approx ? 'estimate is stale' : 'impossible'}`);
    if (sex === 'mother' && age > 50) (p.b.approx ? warn : err)(p, `mother ${age} at birth of ${c.id} (${cb})`);
    if (sex === 'father' && age > 70) warn(p, `father ${age} at birth of ${c.id} (${cb})`);
    const pd = by(p.d);
    if (pd && p.d && !p.d.approx && pd < cb - (sex === 'father' ? 1 : 0)) err(p, `died ${pd} before birth of ${c.id} (${cb})`);
  }

  // 4. marriage year vs. birth
  const my = yearsIn(p.marriage)[0];
  if (my && by(p.b) && my - by(p.b) < 14) (p.b.approx ? warn : err)(p, `married ${my} at age ${my - by(p.b)}`);
  if (my && by(p.d) && p.d && !p.d.approx && my > by(p.d)) err(p, `married ${my} after death ${by(p.d)}`);

  // 5. notes that contradict the structured fields (stale text)
  const notes = p.notes || [];
  const deathWords = /\b(zemřel|zemřela|†)/i;
  if (!p.d && !p.alive && notes.some(n => /^(Zemřel|Zemřela)\b/.test(n))) warn(p, 'a note says the person died, but there is no death field');
  if (p.cert === 'M' && notes[0] && /^(Kandidát|Nový silný kandidát|Kandidáti)/.test(notes[0]))
    warn(p, 'first note starts with a candidate statement – reads as if the person were unconfirmed');
  const seen = new Set();
  notes.forEach(n => { const k = n.slice(0, 60); if (seen.has(k)) warn(p, `duplicate note: "${k}…"`); seen.add(k); });
  notes.forEach(n => {
    // only notes ABOUT this person's own birth (start with "*" or "Narozen")
    const m = n.match(/^(?:\*|Narozen[a]?\s+)[^0-9]{0,20}(?:cca\s+)?(?:\d{1,2}\.\s*\d{1,2}\.\s*)?(\d{4})/);
    if (m && by(p.b) && Math.abs(+m[1] - by(p.b)) > 3 && !/kandidát|dřívější|opraven|chybn|udáno|neověř|\(K\)/i.test(n))
      warn(p, `note mentions birth ${m[1]} but b.year is ${by(p.b)}: "${n.slice(0, 80)}…"`);
  });
  if (notes.some(n => /^(Rodiče|Údaje)[^.]*(zatím neznám|nezjištěn|neznámé)/i.test(n)) && (p.father || p.mother))
    warn(p, 'note says parents/data are unknown, but parents are linked – stale note?');
  if (notes.some(n => /Údaje neznámé/i.test(n)) && by(p.b) && isExact(p.b))
    warn(p, 'note says data unknown, but an exact birth date exists – stale note?');

  // 5b. children mentioned only in notes (e.g. "otec Paula (*17. 7. 1894)") vs. own birth estimate
  if (by(p.b)) notes.forEach(n => {
    if (!/\b(syn|synové|dcera|dcery|děti|dítě|otec|matka|Děti)\b/i.test(n) || /\b(sestra|bratr|sourozen|Sourozen)/i.test(n)) return;
    if (/na (vlastní )?křest|Kandidát na křest|^Křest|Narozen[a]? \d|pokřtěn[a]? \d/i.test(n)) return;   // note about the person's OWN birth/baptism
    if (/^(Kandidát|KANDIDÁT|RODIČE|Rodiče)/.test(n)) return;   // notes about the person's (candidate) parents mention siblings, not children
    for (const m of n.matchAll(/\*\s*(?:\d{1,2}\.\s*\d{1,2}\.\s*)?(\d{4})/g)) {
      const cy = +m[1], age = cy - by(p.b);
      if (cy > by(p.b) - 1 && age < 15) (p.b.approx ? warn : err)(p, `child born ${cy} mentioned in notes, but own birth ${by(p.b)} gives age ${age}: "${n.slice(0, 70)}…"`);
    }
  });

  // 6. evidence
  if (p.cert === 'M' && !(p.sources && p.sources.length) && !(p.scans && p.scans.length))
    warn(p, 'cert M (register) but no sources and no scans');
  for (const s of p.scans || []) if (!fs.existsSync(path.join(__dirname, s.f))) err(p, `scan file missing: ${s.f}`);
}

// 7. spouses: same marriage year on both sides
for (const c of P) {
  const f = byId[c.father], m = byId[c.mother];
  if (!f || !m) continue;
  const yf = yearsIn(f.marriage)[0], ym = yearsIn(m.marriage)[0];
  if (yf && ym && yf !== ym && !/2\. sňatek|1\. sňatek/.test((f.marriage || '') + (m.marriage || '')))
    warn(f, `marriage year ${yf} differs from spouse ${m.id} (${ym})`);
}

// 8. page context – everything the "Odkud jsme" view and the event column derive from must stay in sync
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
for (const p of P) if (!D.lines[p.line]) err(p, `line "${p.line}" is not defined in D.lines`);
// lines without --l-<id> in template.html get an automatic colour on the page (template.html, line colour fallback)
for (const s of D.story || []) {
  for (const l of s.lines || [s.line]) if (!D.lines[l]) err(null, `story "${s.title}" refers to unknown line "${l}"`);
  for (const t of s.text) if (/nejstarší doložen/i.test(t)) warn(null, `story "${s.title}" hard-codes the oldest ancestor (computed on the page) – remove it`);
}
for (const pl of D.places || []) if (/\bod 1\d{3}\b/.test(pl.note)) warn(null, `place "${pl.name}" note hard-codes a year ("${pl.note}") – the page adds "od YYYY" itself`);
// historical events must cover the whole time span of the tree (≥ 1 event per 50 years)
const minY = Math.min(...P.map(p => p.b.year));
for (let y = Math.floor(minY / 50) * 50; y < Math.max(...P.map(p => p.b.year)); y += 50)
  if (!(D.events || []).some(e => (e.y2 || e.y) >= y && e.y < y + 50)) warn(null, `no historical event in ${y}–${y + 49} (event column would be empty there)`);
// map: every place people refer to should be in the gazetteer (INFO – does not block publishing)
global.window.RODOKMEN_GAZ = undefined;
eval(fs.readFileSync(path.join(__dirname, 'gazetteer.js'), 'utf8'));
const GZ = window.RODOKMEN_GAZ || [], missing = new Map();
for (const p of P) for (const e of [p.b, p.d]) {
  if (!e || !e.place || /^\?|nejisté|\(\?\)$/.test(e.place)) continue;
  if (!GZ.some(z => z.a.some(a => e.place.includes(a)))) missing.set(e.place, p.id);
}
for (const [pl, id] of missing) console.log(`INFO  ${id.padEnd(14)} place not in gazetteer.js (not on the map): "${pl}"`);

const uniq = [...new Map(out.map(o => [o.join('|'), o])).values()];
const errors = uniq.filter(o => o[0] === 'ERROR'), warns = uniq.filter(o => o[0] === 'WARN');
for (const [lvl, id, msg] of [...errors, ...warns]) console.log(`${lvl.padEnd(5)} ${id.padEnd(14)} ${msg}`);
console.log(`validate: ${P.length} people, ${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length || (process.argv.includes('--strict') && warns.length) ? 1 : 0);
