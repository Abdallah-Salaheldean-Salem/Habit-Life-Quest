/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserClass } from '../types';

// ---------------------------------------------------------
// CLASS HEROES — a backlit, full-body hero silhouette per class (120×180
// art, drawn symmetric about x=60), each with one glowing signature item in
// its stat colour. `detail` is static SVG markup authored here; LIGHT and
// COLOR stand for the class tones, GLOW/SIL for the per-instance filter and
// fill ids. Rendered by <ClassHero>.
// ---------------------------------------------------------

export const HERO_VIEWBOX = '0 0 120 180';

export interface ClassHeroDef {
  /** Stat colour and its light tint. */
  color: string;
  light: string;
  /** The silhouette outline. */
  outline: string;
  /** Glowing details drawn over the silhouette (trusted, static markup). */
  detail: string;
  /** viewBox framing head and shoulders, for small badges. */
  bust: string;
  /** What the art shows, for screen readers. */
  alt: string;
  /** One line of flavour for the character-select screen. */
  motto: string;
}

export const CLASS_HEROES: Record<UserClass, ClassHeroDef> = {
  warrior: {
    color: '#10b981',
    light: '#6ee7b7',
    outline: 'M60,14 L64,16 L67,22 L69,29 L70,35 L70,42 L67,46 L64,48 L65,50 L70,51 L80,49 L89,53 L92,60 L90,64 L95,90 L98,125 L102,158 L95,163 L90,159 L84,165 L80,171 L67,171 L66,150 L63,124 L60,121 L60,121 L57,124 L54,150 L53,171 L40,171 L36,165 L30,159 L25,163 L18,158 L22,125 L25,90 L30,64 L28,60 L31,53 L40,49 L50,51 L55,50 L56,48 L53,46 L50,42 L50,35 L51,29 L53,22 L56,16 L60,14 Z',
    detail: "<path d=\"M60 15 Q66 3 80 9 Q70 9 66 20Z\" fill=\"url(#SIL)\" stroke=\"LIGHT\" stroke-width=\".6\" stroke-opacity=\".8\"/> <rect x=\"53\" y=\"36.5\" width=\"14\" height=\"2.2\" rx=\"1\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M60 22 V46\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M70 51 Q60 58 50 51\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".5\" stroke-width=\".8\"/> <path d=\"M80 49 Q86 56 84 64 M40 49 Q34 56 36 64\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".45\" stroke-width=\".8\"/> <path d=\"M58.4 106 L58.4 160 L60 167 L61.6 160 L61.6 106Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <rect x=\"46\" y=\"101\" width=\"28\" height=\"3.4\" rx=\"1.2\" fill=\"#d4af37\"/> <rect x=\"58.5\" y=\"89\" width=\"3\" height=\"12\" fill=\"#3b2a1a\"/> <circle cx=\"60\" cy=\"88\" r=\"2.6\" fill=\"#d4af37\" filter=\"url(#GLOW)\"/> <path d=\"M50 92 Q55 88 60 93 Q65 88 70 92 L69 99 Q60 96 51 99Z\" fill=\"#14142a\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".7\"/>",
    bust: '25 4 70 70',
    alt: 'Plumed helm and cape, greatsword planted point-down.',
    motto: 'Forged in motion. Sleep, train, eat well — and grow strong.',
  },
  scholar: {
    color: '#3b82f6',
    light: '#93c5fd',
    outline: 'M60,18 L64,20 L70,27 L74,38 L74,48 L73,53 L80,56 L88,62 L91,72 L93,88 L97,104 L86,106 L80,100 L76,108 L81,138 L90,170 L60,171 L60,171 L30,170 L39,138 L44,108 L40,100 L34,106 L23,104 L27,88 L29,72 L32,62 L40,56 L47,53 L46,48 L46,38 L50,27 L56,20 L60,18 Z',
    detail: "<path d=\"M60 30 Q68 32 69 44 Q66 54 60 55 Q54 54 51 44 Q52 32 60 30Z\" fill=\"#05050c\"/> <circle cx=\"56\" cy=\"44\" r=\"1.4\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><circle cx=\"64\" cy=\"44\" r=\"1.4\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M60 56 V170\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M73 53 Q60 62 47 53\" fill=\"none\" stroke=\"#d4af37\" stroke-opacity=\".7\" stroke-width=\".9\"/> <path d=\"M66 108 L81 138 M54 108 L39 138\" stroke=\"COLOR\" stroke-opacity=\".3\" stroke-width=\".7\"/> <ellipse cx=\"60\" cy=\"88\" rx=\"22\" ry=\"12\" fill=\"COLOR\" opacity=\".35\" filter=\"url(#GLOW)\"/> <path d=\"M42 86 Q51 82 60 87 Q69 82 78 86 L77 96 Q69 92 60 97 Q51 92 43 96Z\" fill=\"#e5e7eb\" stroke=\"#d4af37\" stroke-width=\"1\"/> <path d=\"M60 87 V97\" stroke=\"#94a3b8\" stroke-width=\".7\"/> <path d=\"M47 88 h9 M47 91 h8 M64 88 h9 M65 91 h8\" stroke=\"COLOR\" stroke-width=\".7\"/> <g fill=\"LIGHT\" filter=\"url(#GLOW)\" font-family=\"serif\" font-size=\"6\" text-anchor=\"middle\"> <text x=\"52\" y=\"76\" opacity=\".9\">ᚱ</text><text x=\"66\" y=\"70\" opacity=\".8\">ᚦ</text><text x=\"58\" y=\"62\" opacity=\".55\">ᛟ</text><text x=\"71\" y=\"80\" opacity=\".7\">ᚨ</text> </g>",
    bust: '25 12 70 70',
    alt: 'Hooded mage holding a glowing open tome, runes rising.',
    motto: 'Sharpened by study. Read, practise, ship the work.',
  },
  monk: {
    color: '#a855f7',
    light: '#d8b4fe',
    outline: 'M60,44 L65,45 L69,50 L70,56 L68,62 L64,65 L65,68 L74,70 L82,74 L86,84 L88,98 L93,110 L103,118 L106,126 L98,132 L80,134 L60,135 L60,135 L40,134 L22,132 L14,126 L17,118 L27,110 L32,98 L34,84 L38,74 L46,70 L55,68 L56,65 L52,62 L50,56 L51,50 L55,45 L60,44 Z',
    detail: "<circle cx=\"60\" cy=\"56\" r=\"21\" fill=\"none\" stroke=\"LIGHT\" stroke-width=\"1.6\" opacity=\".9\" filter=\"url(#GLOW)\"/> <circle cx=\"60\" cy=\"56\" r=\"25\" fill=\"none\" stroke=\"COLOR\" stroke-width=\".6\" opacity=\".6\" stroke-dasharray=\"2 3\"/> <path d=\"M54 56 q2 1.4 4 0 M62 56 q2 1.4 4 0\" stroke=\"LIGHT\" stroke-width=\".9\" fill=\"none\"/> <g fill=\"#d4af37\"><circle cx=\"54\" cy=\"70\" r=\"1.3\"/><circle cx=\"57\" cy=\"72\" r=\"1.3\"/><circle cx=\"60\" cy=\"73\" r=\"1.5\"/><circle cx=\"63\" cy=\"72\" r=\"1.3\"/><circle cx=\"66\" cy=\"70\" r=\"1.3\"/></g> <path d=\"M74 70 Q66 90 60 96 Q54 90 46 70\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".55\" stroke-width=\".9\"/> <path d=\"M93 110 Q80 112 60 118 Q40 112 27 110\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".45\" stroke-width=\".8\"/> <circle cx=\"60\" cy=\"104\" r=\"4\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <ellipse cx=\"60\" cy=\"150\" rx=\"30\" ry=\"4\" fill=\"COLOR\" opacity=\".55\" filter=\"url(#GLOW)\"/> <g fill=\"LIGHT\" filter=\"url(#GLOW)\"><circle cx=\"24\" cy=\"80\" r=\"1.6\"/><circle cx=\"98\" cy=\"70\" r=\"1.3\"/><circle cx=\"30\" cy=\"140\" r=\"1.1\"/><circle cx=\"92\" cy=\"146\" r=\"1.4\"/></g>",
    bust: '25 28 70 70',
    alt: 'Floating in lotus pose inside a halo of light.',
    motto: 'Steady as still water. Calm, connection, rest.',
  },
  guildmaster: {
    color: '#f59e0b',
    light: '#fcd34d',
    outline: 'M60,18 L66,18 L68,28 L80,30 L86,34 L70,36 L68,43 L66,49 L72,46 L76,54 L87,58 L90,66 L90,86 L93,128 L98,166 L84,168 L72,158 L70,171 L63,171 L62,140 L60,138 L60,138 L58,140 L57,171 L50,171 L48,158 L36,168 L22,166 L27,128 L30,86 L30,66 L33,58 L44,54 L48,46 L54,49 L52,43 L50,36 L34,34 L40,30 L52,28 L54,18 L60,18 Z',
    detail: "<rect x=\"53\" y=\"40\" width=\"5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><rect x=\"62\" y=\"40\" width=\"5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M54 26 H66\" stroke=\"#d4af37\" stroke-width=\"2\"/> <path d=\"M66 49 L60 60 L54 49\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".9\"/> <path d=\"M60 60 L72 158 M60 60 L48 158\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M66 64 Q60 72 54 64\" fill=\"none\" stroke=\"#d4af37\" stroke-width=\".9\"/> <rect x=\"58.8\" y=\"100\" width=\"2.4\" height=\"70\" fill=\"#3b2a1a\" stroke=\"#d4af37\" stroke-width=\".4\"/> <path d=\"M51 98 Q60 93 69 98 L68 104 Q60 101 52 104Z\" fill=\"#14142a\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".7\"/> <circle cx=\"60\" cy=\"92\" r=\"5\" fill=\"#d4af37\" filter=\"url(#GLOW)\"/><circle cx=\"58.5\" cy=\"90.5\" r=\"1.6\" fill=\"#fff8dc\"/> <g fill=\"#d4af37\" stroke=\"#8a6a12\" stroke-width=\".5\" filter=\"url(#GLOW)\"><circle cx=\"34\" cy=\"76\" r=\"3\"/><circle cx=\"88\" cy=\"96\" r=\"2.6\"/><circle cx=\"96\" cy=\"70\" r=\"2\"/><circle cx=\"26\" cy=\"112\" r=\"2.2\"/></g>",
    bust: '25 12 70 70',
    alt: 'Long coat and wide hat, hands on a gold-orbed cane, coins in orbit.',
    motto: 'Builder of fortunes. Earn, save, invest, lead.',
  },
  bard: {
    color: '#ec4899',
    light: '#f9a8d4',
    outline: 'M60,24 L66,24 L71,28 L77,32 L70,35 L68,43 L66,50 L64,52 L72,54 L84,58 L90,70 L95,104 L99,148 L92,154 L86,149 L80,156 L76,170 L66,170 L64,126 L60,123 L60,123 L56,126 L54,170 L44,170 L40,156 L34,149 L28,154 L21,148 L25,104 L30,70 L36,58 L48,54 L56,52 L54,50 L52,43 L50,35 L43,32 L49,28 L54,24 L60,24 Z',
    detail: "<path d=\"M48 30 Q30 10 44 4 Q42 18 52 28Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M51 28 Q38 14 44 6\" fill=\"none\" stroke=\"#fff\" stroke-width=\".5\" opacity=\".8\"/> <rect x=\"53\" y=\"40\" width=\"4.5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><rect x=\"62.5\" y=\"40\" width=\"4.5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M72 54 Q60 62 48 54\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".9\"/> <path d=\"M79 118 Q60 112 41 118\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".45\" stroke-width=\".8\"/> <ellipse cx=\"60\" cy=\"86\" rx=\"16\" ry=\"18\" fill=\"COLOR\" opacity=\".3\" filter=\"url(#GLOW)\"/> <path d=\"M50 102 Q44 88 47 76 Q48 70 52 70 Q50 78 53 88 Q56 96 60 98 Q64 96 67 88 Q70 78 68 70 Q72 70 73 76 Q76 88 70 102Z\" fill=\"#d4af37\" stroke=\"#8a6a12\" stroke-width=\".5\"/> <rect x=\"48\" y=\"72\" width=\"24\" height=\"2.2\" rx=\"1\" fill=\"#d4af37\"/> <g stroke=\"LIGHT\" stroke-width=\".7\" filter=\"url(#GLOW)\"><path d=\"M55 74 V98\"/><path d=\"M58.3 74 V99\"/><path d=\"M61.7 74 V99\"/><path d=\"M65 74 V98\"/></g> <g fill=\"LIGHT\" filter=\"url(#GLOW)\" font-family=\"serif\" font-size=\"8\"><text x=\"80\" y=\"76\">♪</text><text x=\"30\" y=\"92\" font-size=\"6\">♫</text><text x=\"86\" y=\"56\" font-size=\"5\">♪</text></g>",
    bust: '25 6 70 70',
    alt: 'Feathered cap and cape, holding a glowing lyre.',
    motto: 'Maker of joy. Play, make, share what you love.',
  },
};

/** Fill in a hero's detail markup for one rendered instance. */
export function heroDetail(def: ClassHeroDef, ids: { glow: string; sil: string }): string {
  return def.detail
    .replace(/LIGHT/g, def.light)
    .replace(/COLOR/g, def.color)
    .replace(/#GLOW/g, `#${ids.glow}`)
    .replace(/#SIL/g, `#${ids.sil}`);
}
