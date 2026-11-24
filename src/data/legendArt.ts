/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LegendTiers } from '../utils/legends';
import { resolveLook } from './classHeroes';
import { UserClass } from '../types';

// ---------------------------------------------------------
// LEGEND ART — the five default heroes drawn at any mix of chapters.
// Each renderer takes the tiers of the hero's three upgrades (0–3 each, in
// the order of that legend's tracks) and returns static SVG markup for the
// 120×180 hero box, outline included. Placeholders are filled per instance:
// LIGHT/COLOR = class tones, #GLOW/#BLUR2 = glow filters, #SIL = silhouette
// fill, #RIM = rim-light stroke. All markup here is authored, never user input.
// ---------------------------------------------------------

const GOLD = '#d4af37';
const glow = (on: boolean) => (on ? ' filter="url(#GLOW)"' : '');
const blur = (on: boolean) => (on ? ' filter="url(#BLUR2)"' : '');
const f1 = (n: number) => n.toFixed(1);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const outline = (cls: UserClass, look: string) =>
  `<path d="${resolveLook(cls, look).outline}" fill="url(#SIL)" stroke="url(#RIM)" stroke-width="1.3" stroke-linejoin="round"/>`;

// ---------------- Shield Guardian · shield / helm / ward ----------------
const SHIELD = 'M60 58 L82 63 L80 100 Q74 124 60 136 Q46 124 40 100 L38 63Z';
const SHIELD_IN = 'M60 64 L77 68 L75 99 Q70 118 60 128 Q50 118 45 99 L43 68Z';

function guardian([shield, helm, ward]: LegendTiers): string {
  const s: string[] = [];
  if (ward >= 2) {
    s.push(`<path d="M14 150 A48 56 0 0 1 106 150" fill="none" stroke="LIGHT" stroke-opacity="${ward === 2 ? 0.3 : 0.5}" stroke-width=".8" stroke-dasharray="2 2"${glow(ward === 3)}/>`);
  }
  if (ward === 3) {
    let hexes = '';
    for (const row of range(5)) {
      for (const col of range(9)) {
        const cx = 18 + col * 10.5 + (row % 2 ? 5.25 : 0);
        const cy = 70 + row * 9;
        if ((cx - 60) ** 2 / 46 ** 2 + (cy - 150) ** 2 / 54 ** 2 > 1) continue;
        const pts = range(6).map((i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${f1(cx + 5 * Math.cos(a))},${f1(cy + 5 * Math.sin(a))}`; }).join(' ');
        hexes += `<polygon points="${pts}"/>`;
      }
    }
    s.push(`<g fill="none" stroke="LIGHT" stroke-opacity=".16" stroke-width=".5">${hexes}</g>`);
    for (const x of [20, 100]) {
      const sc = 0.55;
      s.push(`<g transform="translate(${f1(x - 60 * sc)} ${f1(92 - 58 * sc)}) scale(${sc})" opacity=".55"><path d="${SHIELD}" fill="#0b1a16" stroke="LIGHT" stroke-width="1.4"/>`
        + `<path d="M60 76 L64 90 L60 104 L56 90Z" fill="LIGHT"/><path d="M${60 + (x > 60 ? 30 : -30)} 10 V150" stroke="LIGHT" stroke-width="1.5"/></g>`);
    }
  }
  // spear follows the shield; the pennant is the oath (ward)
  const top = [30, 22, 22, 18][shield];
  s.push(`<path d="M93 ${top} L93 170" stroke="#5c3a1a" stroke-width="2.2"/>`);
  s.push(`<path d="M93 ${top - 16} L97 ${top - 2} L93 ${top + 2} L89 ${top - 2}Z" fill="${['#94a3b8', '#cbd5e1', 'LIGHT', 'LIGHT'][shield]}"${glow(shield >= 2)}/>`);
  if (ward >= 1) {
    s.push(`<path d="M93 ${top + 4} L106 ${top + 8} L93 ${top + 13}Z" fill="COLOR" fill-opacity=".7" stroke="${ward === 3 ? GOLD : 'LIGHT'}" stroke-width=".6"/>`);
  }
  s.push(outline('warrior', 'shield-guardian'));
  const wings = [
    null,
    ['M69 28 Q75 22 77 15 Q77 23 71 31Z M51 28 Q45 22 43 15 Q43 23 49 31Z', '#94a3b8', false],
    ['M69 28 Q82 18 86 8 Q84 22 72 34Z M51 28 Q38 18 34 8 Q36 22 48 34Z', 'LIGHT', true],
    ['M69 27 Q87 13 93 1 Q91 20 72 35Z M51 27 Q33 13 27 1 Q29 20 48 35Z', 'LIGHT', true],
  ][helm] as [string, string, boolean] | null;
  if (wings) s.push(`<path d="${wings[0]}" fill="${wings[1]}" opacity=".9"${glow(wings[2])}${helm === 3 ? ` stroke="${GOLD}" stroke-width=".6"` : ''}/>`);
  s.push('<rect x="53" y="36.5" width="14" height="2.2" rx="1" fill="LIGHT" filter="url(#GLOW)"/><path d="M60 19 V46" stroke="COLOR" stroke-opacity=".35" stroke-width=".8"/>');
  if (shield === 0) {
    s.push(`<path d="${SHIELD}" fill="#231d17" stroke="#64748b" stroke-width="1.2"/><path d="M60 64 V126 M44 88 H76" stroke="#3a2f24" stroke-width="2"/><circle cx="60" cy="88" r="3.2" fill="#475569"/>`);
  } else if (shield === 1) {
    s.push(`<path d="${SHIELD}" fill="url(#SIL)" stroke="#94a3b8" stroke-width="1.5"/><path d="M47 84 L60 98 L73 84 M47 94 L60 108 L73 94" fill="none" stroke="COLOR" stroke-width="1.6"/>`);
  } else {
    s.push(`<path d="${SHIELD}" fill="url(#SIL)" stroke="${GOLD}" stroke-width="1.6"/><path d="${SHIELD_IN}" fill="none" stroke="COLOR" stroke-opacity=".5" stroke-width=".7"/>`
      + `<path d="M60 76 L66 90 L60 112 L54 90Z" fill="LIGHT"${shield === 3 ? blur(true) : glow(true)}/><path d="M50 90 H70" stroke="LIGHT" stroke-width="1.4" filter="url(#GLOW)"/>`);
    if (shield === 3) {
      const rays = range(8).map((i) => { const a = (i * Math.PI) / 4 + 0.39; return `<line x1="60" y1="94" x2="${f1(60 + 30 * Math.cos(a))}" y2="${f1(94 + 30 * Math.sin(a))}"/>`; }).join('');
      s.push(`<path d="M44 70 L48 74 M76 70 L72 74 M46 106 L50 103 M74 106 L70 103" stroke="${GOLD}" stroke-width=".8"/><g stroke="LIGHT" stroke-width=".5" opacity=".6">${rays}</g>`);
    }
  }
  return s.join('');
}

// ---------------- Tome Keeper · tome / runes / hood ----------------
function tomeKeeper([tome, runes, hood]: LegendTiers): string {
  const s: string[] = [outline('scholar', 'tome-keeper')];
  if (hood >= 1) {
    const stars: [number, number][] = hood === 1 ? [[60, 18], [69, 26], [51, 26]]
      : hood === 2 ? [[60, 18], [64, 20], [56, 20], [69, 26], [51, 26], [72, 33], [48, 33]]
      : [[60, 16], [63, 14], [57, 14], [66, 19], [54, 19], [70, 24], [50, 24], [73, 31], [47, 31], [75, 39], [45, 39], [61, 11], [68, 15], [52, 15]];
    s.push(stars.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 0.55 : 0.8}" fill="#f3e5ab" class="hq-twinkle" style="animation-delay:${(i * 0.3).toFixed(1)}s"/>`).join(''));
  }
  const eye = hood === 3 ? '#fff' : 'LIGHT';
  s.push('<path d="M60 30 Q68 32 69 44 Q66 54 60 55 Q54 54 51 44 Q52 32 60 30Z" fill="#05050c"/>'
    + `<circle cx="56" cy="44" r="1.4" fill="${eye}" filter="url(#GLOW)"/><circle cx="64" cy="44" r="1.4" fill="${eye}" filter="url(#GLOW)"/>`
    + '<path d="M60 56 V170" stroke="COLOR" stroke-opacity=".35" stroke-width=".8"/><path d="M66 108 L81 138 M54 108 L39 138" stroke="COLOR" stroke-opacity=".3" stroke-width=".7"/>');
  if (tome >= 1) s.push(`<path d="M73 53 Q60 62 47 53" fill="none" stroke="${GOLD}" stroke-opacity=".7" stroke-width=".9"/>`);
  if (tome === 0) {
    s.push('<path d="M47 88 Q53 85 60 89 Q67 85 73 88 L72 95 Q66 92 60 96 Q54 92 48 95Z" fill="#cbd5e1" stroke="#64748b" stroke-width=".7"/><path d="M60 89 V96" stroke="#64748b" stroke-width=".5"/>');
  } else {
    s.push(`<ellipse cx="60" cy="88" rx="${18 + tome * 3}" ry="${10 + tome}" fill="COLOR" opacity="${(0.25 + tome * 0.08).toFixed(2)}" filter="url(#GLOW)"/>`);
    const edge = tome === 1 ? '#8b5a2b' : GOLD;
    s.push(`<path d="M42 86 Q51 82 60 87 Q69 82 78 86 L77 96 Q69 92 60 97 Q51 92 43 96Z" fill="#e5e7eb" stroke="${edge}" stroke-width="${(0.8 + tome * 0.2).toFixed(1)}"/>`
      + '<path d="M60 87 V97" stroke="#94a3b8" stroke-width=".7"/><path d="M47 88 h9 M47 91 h8 M64 88 h9 M65 91 h8" stroke="COLOR" stroke-width=".7"/>');
    if (tome >= 2) s.push(`<path d="M42 86 l3 1 M78 86 l-3 1 M43 96 l3 -1 M77 96 l-3 -1" stroke="${GOLD}" stroke-width="1.2"/>`);
  }
  if (runes === 0) {
    s.push('<text x="60" y="79" text-anchor="middle" font-size="5" fill="LIGHT" opacity=".6" font-family="serif">ᚱ</text>');
  } else if (runes === 1) {
    s.push('<g fill="LIGHT" filter="url(#GLOW)" font-family="serif" font-size="6" text-anchor="middle"><text x="54" y="77">ᚱ</text><text x="65" y="71">ᚦ</text><text x="59" y="64" opacity=".6">ᛟ</text></g>');
  } else if (runes === 2) {
    s.push('<g fill="LIGHT" filter="url(#GLOW)" font-family="serif" font-size="6" text-anchor="middle">'
      + [...'ᚦᚱᚢᛏᚺ'].map((g, i) => `<text x="${44 + i * 8}" y="${f1(70 - 6 * Math.sin(((i + 0.5) * Math.PI) / 5))}">${g}</text>`).join('') + '</g>');
  } else {
    s.push('<ellipse cx="60" cy="92" rx="40" ry="16.8" fill="none" stroke="LIGHT" stroke-opacity=".55" stroke-width=".8" filter="url(#GLOW)"/>');
    s.push('<g fill="LIGHT" filter="url(#GLOW)" font-family="serif">' + [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'].map((g, i) =>
      `<text x="${f1(60 + 40 * Math.cos((i * Math.PI) / 6))}" y="${f1(92 + 16.8 * Math.sin((i * Math.PI) / 6))}" text-anchor="middle" dominant-baseline="middle" font-size="7" class="hq-twinkle" style="animation-delay:${(i * 0.25).toFixed(2)}s">${g}</text>`).join('') + '</g>');
    for (const [x, y, a] of [[22, 56, -18], [96, 48, 14], [30, 30, 8]]) {
      s.push(`<g class="hq-bob" transform="rotate(${a} ${x} ${y})"><rect x="${x - 4}" y="${y - 5}" width="8" height="10" fill="#e5e7eb" opacity=".85"/>`
        + `<path d="M${x - 2.5} ${y - 2} h5 M${x - 2.5} ${y} h5 M${x - 2.5} ${y + 2} h3" stroke="COLOR" stroke-width=".5"/></g>`);
    }
  }
  return s.join('');
}

// ---------------- Floating Sage · beads / markings / rising ----------------
function sage([beads, markings, rising]: LegendTiers): string {
  const lift = [0, 7, 14, 22][rising];
  const hy = 56 - lift;
  const s: string[] = [];
  if (rising === 0) s.push('<path d="M22 134 L98 134 L102 139 L18 139Z" fill="#1a1426" stroke="COLOR" stroke-opacity=".45" stroke-width=".7"/>');
  if (rising === 3) {
    const petals = range(12).map((i) => `<ellipse cx="60" cy="${hy - 34}" rx="4" ry="9" transform="rotate(${i * 30} 60 ${hy})"/>`).join('');
    s.push(`<g class="hq-spin-slow" style="transform-origin:60px ${hy}px" fill="none" stroke="LIGHT" stroke-opacity=".35" stroke-width=".6">${petals}`
      + `<circle cx="60" cy="${hy}" r="42" stroke-dasharray="1 3"/><circle cx="60" cy="${hy}" r="30"/></g>`);
  }
  if (rising >= 1) {
    s.push(`<circle cx="60" cy="${hy}" r="${19 + rising}" fill="none" stroke="LIGHT" stroke-width="${(0.6 + rising * 0.35).toFixed(2)}" opacity="${(0.35 + rising * 0.2).toFixed(2)}"${glow(rising >= 2)}/>`);
  }
  s.push(`<g transform="translate(0 ${-lift})"><g class="${rising ? 'hq-float' : ''}">${outline('monk', 'floating-sage')}`);
  s.push('<path d="M74 70 Q66 90 60 96 Q54 90 46 70" fill="none" stroke="COLOR" stroke-opacity=".5" stroke-width=".9"/><path d="M93 110 Q80 112 60 118 Q40 112 27 110" fill="none" stroke="COLOR" stroke-opacity=".4" stroke-width=".8"/>');
  s.push(rising < 3
    ? '<path d="M54 56 q2 1.4 4 0 M62 56 q2 1.4 4 0" stroke="LIGHT" stroke-width=".9" fill="none"/>'
    : '<path d="M54 56 h4 M62 56 h4" stroke="#fff" stroke-width="1.4" stroke-linecap="round" filter="url(#BLUR2)"/>');
  const bead = ['#7c5a3a', '#34d399', GOLD, '#f3e5ab'][beads];
  s.push(`<g${glow(beads >= 2)}>` + range(6).map((i) => { const a = Math.PI * (0.1 + i * 0.16); return `<circle cx="${f1(60 + 6.5 * Math.cos(a))}" cy="${f1(66 + 4 * Math.sin(a))}" r="${beads === 3 ? 1.6 : 1.3}" fill="${bead}"/>`; }).join('') + '</g>');
  if (markings >= 1) s.push('<circle cx="60" cy="50" r="1" fill="LIGHT" filter="url(#GLOW)"/>');
  if (markings >= 2) s.push('<path d="M78 76 q5 9 1 18 q-3 6 2 12 M42 76 q-5 9 -1 18 q3 6 -2 12" fill="none" stroke="LIGHT" stroke-width=".7" opacity=".85" filter="url(#GLOW)"/>');
  if (markings === 3) s.push(`<path d="M60 74 L64 82 L60 90 L56 82Z M52 84 L60 98 L68 84" fill="none" stroke="${GOLD}" stroke-width=".7" filter="url(#GLOW)"/>`);
  const orb = [0, 2.2, 3.6, 4.4][rising];
  if (orb) s.push(`<circle cx="60" cy="104" r="${orb}" fill="LIGHT" opacity="${(0.5 + rising * 0.15).toFixed(2)}" filter="url(#${rising === 3 ? 'BLUR2' : 'GLOW'})"/>`);
  s.push('</g></g>');
  if (rising >= 2) {
    const base = 146 - lift;
    for (const [a, dx, w] of [[-70, 36, 6], [70, 36, 6], [-45, 25, 7], [45, 25, 7], [-20, 13, 7.5], [20, 13, 7.5], [0, 0, 8]]) {
      const cx = 60 + (a > 0 ? dx : -dx);
      s.push(`<path d="M${cx} ${base + 6} Q${cx - w} ${base - 3} ${cx} ${base - 13} Q${cx + w} ${base - 3} ${cx} ${base + 6}Z" transform="rotate(${f1(a * 0.9)} ${cx} ${base + 6})" `
        + `fill="#1a1030" stroke="LIGHT" stroke-width=".7" stroke-opacity="${rising === 2 ? 0.6 : 0.9}"${glow(rising === 3)}/>`);
    }
  }
  return s.join('');
}

// ---------------- Coin Baron · cane / hoard / ledger ----------------
function baron([cane, hoard, ledger]: LegendTiers): string {
  const s: string[] = [outline('guildmaster', 'coin-baron'),
    '<rect x="53" y="40" width="5" height="1.8" rx=".9" fill="LIGHT" filter="url(#GLOW)"/><rect x="62" y="40" width="5" height="1.8" rx=".9" fill="LIGHT" filter="url(#GLOW)"/>',
    '<path d="M66 49 L60 60 L54 49" fill="none" stroke="COLOR" stroke-opacity=".6" stroke-width=".9"/><path d="M60 60 L72 158 M60 60 L48 158" stroke="COLOR" stroke-opacity=".35" stroke-width=".8"/>'];
  if (cane >= 1) s.push(`<path d="M54 26 H66" stroke="${cane === 1 ? '#94a3b8' : GOLD}" stroke-width="2"/>`);
  if (ledger >= 1) s.push(`<path d="M66 64 Q60 72 54 64" fill="none" stroke="${GOLD}" stroke-width=".9"/><circle cx="60" cy="69.5" r="1.4" fill="${GOLD}"/>`);
  const coin = (x: number, y: number, r = 2.2, lit = false) => `<ellipse cx="${x}" cy="${f1(y)}" rx="${r}" ry="${(r * 0.45).toFixed(2)}" fill="${GOLD}" stroke="#8a6a12" stroke-width=".4"${glow(lit)}/>`;
  if (hoard === 0) s.push(coin(36, 170) + coin(84, 171));
  else if (hoard === 1) {
    for (const [x, n] of [[30, 3], [38, 5], [84, 4], [92, 2]]) s.push(range(n).map((i) => coin(x, 171 - i * 1.6)).join(''));
  } else {
    const cx = hoard === 2 ? 92 : 90;
    if (hoard === 3) s.push([[78, 172], [84, 170], [100, 172], [106, 171], [95, 168], [24, 172], [30, 170], [36, 172]].map(([x, y]) => coin(x, y, 2.2, true)).join(''));
    s.push(`<path d="M${cx - 10} 158 H${cx + 10} V171 H${cx - 10}Z" fill="#2a1d12" stroke="${GOLD}" stroke-width=".8"/><path d="M${cx - 10} 163 H${cx + 10}" stroke="${GOLD}" stroke-width=".6"/><rect x="${f1(cx - 1.4)}" y="161" width="2.8" height="3.6" fill="${GOLD}"/>`);
    if (hoard === 2) s.push(`<path d="M${cx - 10} 158 Q${cx} 151 ${cx + 10} 158" fill="#2a1d12" stroke="${GOLD}" stroke-width=".8"/>`);
    else {
      s.push(`<path d="M${cx - 10} 158 L${cx - 12} 146 Q${cx} 140 ${cx + 8} 146 L${cx + 10} 158" fill="#2a1d12" stroke="${GOLD}" stroke-width=".8"/><ellipse cx="${cx}" cy="157" rx="9" ry="3" fill="${GOLD}" filter="url(#BLUR2)"/>`
        + '<g fill="#f3e5ab" opacity=".8">' + range(5).map((i) => `<circle cx="${cx - 6 + i * 3}" cy="${150 - (i % 2) * 4}" r=".6" class="hq-twinkle" style="animation-delay:${(i * 0.3).toFixed(1)}s"/>`).join('') + '</g>');
    }
  }
  s.push(`<rect x="58.8" y="100" width="2.4" height="70" fill="${cane === 0 ? '#5c3a1a' : '#3b2a1a'}"${cane >= 2 ? ` stroke="${GOLD}" stroke-width=".4"` : ''}/>`);
  s.push('<path d="M51 98 Q60 93 69 98 L68 104 Q60 101 52 104Z" fill="#14142a" stroke="COLOR" stroke-opacity=".6" stroke-width=".7"/>');
  if (ledger >= 2) s.push(`<circle cx="66.5" cy="100.5" r="1.3" fill="${GOLD}" stroke="#b91c1c" stroke-width=".6"/>`);
  if (cane === 0) s.push('<ellipse cx="60" cy="93" rx="4" ry="2.6" fill="#5c3a1a"/>');
  else if (cane === 1) s.push('<circle cx="60" cy="92" r="4" fill="#cbd5e1" stroke="#64748b" stroke-width=".5"/>');
  else {
    s.push(`<circle cx="60" cy="92" r="${cane === 2 ? 5 : 5.6}" fill="${GOLD}"${cane === 3 ? blur(true) : glow(true)}/><circle cx="58.5" cy="90.5" r="1.6" fill="#fff8dc"/>`);
    if (cane === 3) s.push('<ellipse cx="60" cy="92" rx="10" ry="3.2" fill="none" stroke="#f3e5ab" stroke-width=".6" opacity=".8"/>');
  }
  if (hoard >= 2) {
    const pts = [[34, 76, 3], [88, 96, 2.6], [96, 70, 2], [26, 112, 2.2], ...(hoard === 3 ? [[22, 60, 2], [100, 120, 2.2]] : [])];
    s.push(`<g class="${hoard === 3 ? 'hq-bob' : ''}" fill="${GOLD}" stroke="#8a6a12" stroke-width=".5" filter="url(#GLOW)">` + pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>');
  }
  if (ledger === 3) {
    s.push(`<g class="hq-bob2"><path d="M14 132 Q20 129 26 132 Q32 129 38 132 L38 140 Q32 137 26 140 Q20 137 14 140Z" fill="#e8d5a8" stroke="${GOLD}" stroke-width=".7"/>`
      + '<path d="M26 132 V140" stroke="#8a6a12" stroke-width=".5"/><path d="M17 134 h6 M17 136 h5 M29 134 h6 M29 136 h4" stroke="#8b5a2b" stroke-width=".5"/><circle cx="34" cy="139" r="2.4" fill="#b91c1c" filter="url(#GLOW)"/></g>');
  }
  return s.join('');
}

// ---------------- Lyre Minstrel · lyre / feather / songs ----------------
const LYRE = 'M50 102 Q44 88 47 76 Q48 70 52 70 Q50 78 53 88 Q56 96 60 98 Q64 96 67 88 Q70 78 68 70 Q72 70 73 76 Q76 88 70 102Z';

function minstrel([lyre, feather, songs]: LegendTiers): string {
  const s: string[] = [outline('bard', 'lyre-minstrel')];
  const big = 'M48 30 Q30 10 44 4 Q42 18 52 28Z';
  if (feather === 0) s.push('<path d="M50 30 Q40 18 46 11 Q45 21 53 28Z" fill="#8b6a4a"/><path d="M51 29 Q44 20 46 12" stroke="#c9a27a" stroke-width=".4" fill="none"/>');
  else if (feather === 1) s.push(`<path d="${big}" fill="#cbd5e1"/><path d="M46 22 l-4 -2 M44 16 l-4 -1 M45 10 l-3 0" stroke="#475569" stroke-width="1"/>`);
  else if (feather === 2) s.push(`<path d="${big}" fill="#0f766e"/><ellipse cx="42" cy="11" rx="3.2" ry="4" fill="#1d4ed8"/><ellipse cx="42" cy="11" rx="1.6" ry="2" fill="#f59e0b"/><circle cx="42" cy="11.5" r=".7" fill="#05050c"/>`);
  else s.push('<path d="M48 31 Q26 8 42 0 Q40 18 53 28Z" fill="#f59e0b" filter="url(#BLUR2)"/><path d="M48 30 Q34 14 42 4 Q42 16 51 27Z" fill="#fde68a" class="hq-flicker"/>');
  s.push('<rect x="53" y="40" width="4.5" height="1.8" rx=".9" fill="LIGHT" filter="url(#GLOW)"/><rect x="62.5" y="40" width="4.5" height="1.8" rx=".9" fill="LIGHT" filter="url(#GLOW)"/>'
    + '<path d="M79 118 Q60 112 41 118" fill="none" stroke="COLOR" stroke-opacity=".45" stroke-width=".8"/>');
  s.push(`<path d="M72 54 Q60 62 48 54" fill="none" stroke="${songs >= 2 ? GOLD : 'COLOR'}" stroke-opacity=".7" stroke-width=".9"/>`);
  if (songs >= 2) s.push(`<path d="M30 150 q5 -5 10 0 q5 5 10 0 M70 150 q5 -5 10 0 q5 5 10 0" fill="none" stroke="${GOLD}" stroke-width=".55" opacity=".7"/>`);
  const frame = ['#8b5a2b', '#b08d57', GOLD, GOLD][lyre];
  if (lyre === 3) {
    s.push('<path d="M52 104 Q56 100 60 103 Q64 100 68 104" fill="none" stroke="COLOR" stroke-opacity=".6" stroke-width="1"/>');
    s.push('<g fill="none" stroke="LIGHT" stroke-linecap="round" class="hq-pulse">' + range(3).map((i) =>
      `<path d="M${78 + i * 6} ${66 - i * 3} q${4 + i * 2} ${8 + i * 2} 0 ${16 + i * 6}" stroke-width="${(1 - i * 0.2).toFixed(1)}" opacity="${(0.9 - i * 0.25).toFixed(2)}"/>`
      + `<path d="M${42 - i * 6} ${66 - i * 3} q${-4 - i * 2} ${8 + i * 2} 0 ${16 + i * 6}" stroke-width="${(1 - i * 0.2).toFixed(1)}" opacity="${(0.9 - i * 0.25).toFixed(2)}"/>`).join('') + '</g>');
    s.push('<g transform="translate(0 -10)"><g class="hq-float">');
  }
  if (lyre >= 1) s.push(`<ellipse cx="60" cy="86" rx="16" ry="18" fill="COLOR" opacity="${(0.15 + lyre * 0.08).toFixed(2)}" filter="url(#GLOW)"/>`);
  s.push(`<path d="${LYRE}" fill="${frame}" stroke="${lyre === 0 ? '#5c3a1a' : '#8a6a12'}" stroke-width=".5"${glow(lyre === 3)}/><rect x="48" y="72" width="24" height="2.2" rx="1" fill="${frame}"/>`);
  const n = [3, 5, 7, 7][lyre];
  const color = ['#e5e7eb', 'LIGHT', 'LIGHT', '#fff'][lyre];
  s.push(`<g stroke="${color}" stroke-width="${n === 7 ? 0.55 : 0.7}"${glow(lyre >= 1)}>` + range(n).map((i) => {
    const x = 53 + i * (14 / (n - 1));
    return `<path d="M${f1(x)} 74 V${f1(98 - Math.abs(x - 60) * 0.25)}"/>`;
  }).join('') + '</g>');
  if (lyre === 3) s.push('</g></g>');
  const notes = [[], [[80, 76, 8]], [[80, 76, 8], [30, 92, 6], [86, 56, 5]], [[80, 76, 8], [30, 92, 6], [86, 56, 5], [24, 60, 7], [96, 98, 6], [38, 34, 5]]][songs];
  if (notes.length) {
    s.push(`<g fill="${songs === 3 ? GOLD : 'LIGHT'}" filter="url(#GLOW)" font-family="serif" class="${songs === 3 ? 'hq-bob' : ''}">`
      + notes.map(([x, y, f], i) => `<text x="${x}" y="${y}" font-size="${f}">${i % 2 ? '♫' : '♪'}</text>`).join('') + '</g>');
  }
  return s.join('');
}

const RENDERERS: Record<string, (t: LegendTiers) => string> = {
  'shield-guardian': guardian,
  'tome-keeper': tomeKeeper,
  'floating-sage': sage,
  'coin-baron': baron,
  'lyre-minstrel': minstrel,
};

/** Legend markup for a look at the given tiers, or null if the look has no legend yet. */
export function legendArt(lookId: string, tiers: LegendTiers): string | null {
  const r = RENDERERS[lookId];
  return r ? r(tiers) : null;
}

/** Where the ground glow sits (the Floating Sage's shadow shrinks as he rises). */
export function legendGround(lookId: string, tiers: LegendTiers): { cy: number; rx: number; ry: number; opacity: number } | null {
  if (lookId !== 'floating-sage') return null;
  const r = tiers[2];
  return { cy: [139, 150, 158, 166][r], rx: [42, 30, 24, 18][r], ry: [4, 4, 3, 2.5][r], opacity: [0.25, 0.45, 0.5, 0.55][r] };
}
