/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserClass } from '../types';

// ---------------------------------------------------------
// CLASS HEROES — backlit, full-body hero silhouettes (120×180 art, drawn
// symmetric about x=60), each with a glowing signature item in its class's
// stat colour. Every class has a few looks to choose from; the first is the
// default. `detail` / `back` are static SVG markup authored here (never user
// input): LIGHT and COLOR stand for the class tones, GLOW/SIL for the
// per-instance filter and fill ids. Rendered by <ClassHero>.
// ---------------------------------------------------------

export const HERO_VIEWBOX = '0 0 120 180';

export interface HeroLook {
  /** Stable id, saved with the character. */
  id: string;
  name: string;
  /** Stat colour and its light tint. */
  color: string;
  light: string;
  /** The silhouette outline. */
  outline: string;
  /** Glowing details drawn over the silhouette. */
  detail: string;
  /** Props drawn behind the silhouette. */
  back: string;
  /** viewBox framing head and shoulders, for small badges. */
  bust: string;
  /** What the art shows, for screen readers. */
  alt: string;
}

/** One line of flavour per class for the character-select screen. */
export const CLASS_MOTTOS: Record<UserClass, string> = {
  warrior: 'Forged in motion. Sleep, train, eat well — and grow strong.',
  scholar: 'Sharpened by study. Read, practise, ship the work.',
  monk: 'Steady as still water. Calm, connection, rest.',
  guildmaster: 'Builder of fortunes. Earn, save, invest, lead.',
  bard: 'Maker of joy. Play, make, share what you love.',
};

export const CLASS_LOOKS: Record<UserClass, HeroLook[]> = {
  warrior: [
    {
      id: 'shield-guardian',
      name: 'Shield Guardian',
      color: '#10b981',
      light: '#6ee7b7',
      outline: 'M60,18 L65,19 L69,25 L69,29 L70,35 L70,42 L67,46 L64,48 L65,50 L70,51 L80,49 L89,53 L92,60 L90,64 L95,90 L98,125 L102,158 L95,163 L90,159 L84,165 L80,171 L67,171 L66,150 L63,124 L60,121 L60,121 L57,124 L54,150 L53,171 L40,171 L36,165 L30,159 L25,163 L18,158 L22,125 L25,90 L30,64 L28,60 L31,53 L40,49 L50,51 L55,50 L56,48 L53,46 L50,42 L50,35 L51,29 L51,25 L55,19 L60,18 Z',
      detail: "<path d=\"M69 28 Q82 18 86 8 Q84 22 72 34Z M51 28 Q38 18 34 8 Q36 22 48 34Z\" fill=\"LIGHT\" opacity=\".85\" filter=\"url(#GLOW)\"/> <rect x=\"53\" y=\"36.5\" width=\"14\" height=\"2.2\" rx=\"1\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M60 19 V46\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M93 22 L93 170\" stroke=\"#5c3a1a\" stroke-width=\"2.2\"/> <path d=\"M93 6 L97 20 L93 24 L89 20Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M60 58 L82 63 L80 100 Q74 124 60 136 Q46 124 40 100 L38 63Z\" fill=\"url(#SIL)\" stroke=\"#d4af37\" stroke-width=\"1.6\"/> <path d=\"M60 64 L77 68 L75 99 Q70 118 60 128 Q50 118 45 99 L43 68Z\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".5\" stroke-width=\".7\"/> <path d=\"M60 76 L66 90 L60 112 L54 90Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M50 90 H70\" stroke=\"LIGHT\" stroke-width=\"1.4\" filter=\"url(#GLOW)\"/>",
      back: "",
      bust: '25 4 70 70',
      alt: 'Winged helm, a gold-rimmed shield with a glowing crest, and a spear.',
    },
    {
      id: 'dragon-slayer',
      name: 'Dragon Slayer',
      color: '#10b981',
      light: '#6ee7b7',
      outline: 'M60,16 L62,21 L65,13 L68,24 L69,29 L70,35 L70,42 L67,46 L64,48 L65,50 L70,51 L80,49 L89,53 L92,60 L90,64 L95,90 L98,125 L102,158 L95,163 L90,159 L84,165 L80,171 L67,171 L66,150 L63,124 L60,121 L60,121 L57,124 L54,150 L53,171 L40,171 L36,165 L30,159 L25,163 L18,158 L22,125 L25,90 L30,64 L28,60 L31,53 L40,49 L50,51 L55,50 L56,48 L53,46 L50,42 L50,35 L51,29 L52,24 L55,13 L58,21 L60,16 Z',
      detail: "<path d=\"M53 36 l5 2 M67 36 l-5 2\" stroke=\"LIGHT\" stroke-width=\"2\" stroke-linecap=\"round\" filter=\"url(#GLOW)\"/> <path d=\"M60 24 V46\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M80 49 L84 40 L86 50 L90 43 L91 54 L96 50 L92 60Z M40 49 L36 40 L34 50 L30 43 L29 54 L24 50 L28 60Z\" fill=\"url(#SIL)\" stroke=\"LIGHT\" stroke-opacity=\".8\" stroke-width=\".7\"/> <path d=\"M70 51 Q60 58 50 51\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".5\" stroke-width=\".8\"/> <path d=\"M71 92 L106 10 L110 12 L77 95Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M73 92 L107 13\" stroke=\"#fff\" stroke-width=\".6\" opacity=\".7\"/> <path d=\"M64 88 L84 98\" stroke=\"#d4af37\" stroke-width=\"3.2\" stroke-linecap=\"round\"/> <path d=\"M72 95 L66 108\" stroke=\"#3b2a1a\" stroke-width=\"3\"/> <circle cx=\"65\" cy=\"110\" r=\"2.4\" fill=\"#d4af37\" filter=\"url(#GLOW)\"/> <path d=\"M62 96 Q68 90 76 96 L74 104 Q68 100 63 104Z\" fill=\"#14142a\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".7\"/> <g fill=\"COLOR\" opacity=\".5\"><path d=\"M52 66 l3 4 l-3 4 l-3 -4Z\"/><path d=\"M60 72 l3 4 l-3 4 l-3 -4Z\"/><path d=\"M68 66 l3 4 l-3 4 l-3 -4Z\"/></g>",
      back: "",
      bust: '25 6 70 70',
      alt: 'Spiked crown-helm and pauldrons, a huge glowing greatsword over the shoulder.',
    },
    {
      id: 'sun-paladin',
      name: 'Sun Paladin',
      color: '#10b981',
      light: '#6ee7b7',
      outline: 'M60,18 L66,19 L70,24 L69,29 L70,35 L70,42 L67,46 L64,48 L65,50 L70,51 L80,49 L89,53 L92,60 L90,64 L95,90 L98,125 L102,158 L95,163 L90,159 L84,165 L80,171 L67,171 L66,150 L63,124 L60,121 L60,121 L57,124 L54,150 L53,171 L40,171 L36,165 L30,159 L25,163 L18,158 L22,125 L25,90 L30,64 L28,60 L31,53 L40,49 L50,51 L55,50 L56,48 L53,46 L50,42 L50,35 L51,29 L50,24 L54,19 L60,18 Z',
      detail: "<rect x=\"53\" y=\"36.5\" width=\"14\" height=\"2.2\" rx=\"1\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M60 19 V35\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M70 51 Q60 58 50 51\" fill=\"none\" stroke=\"#d4af37\" stroke-width=\"1\"/> <path d=\"M52 56 H68 L66 140 L60 148 L54 140Z\" fill=\"#e5e7eb\" opacity=\".9\"/> <circle cx=\"60\" cy=\"80\" r=\"7\" fill=\"#d4af37\" filter=\"url(#GLOW)\"/> <g stroke=\"#d4af37\" stroke-width=\"1.2\" filter=\"url(#GLOW)\"><path d=\"M60 68 V64 M60 92 V96 M48 80 H44 M72 80 H76 M51.5 71.5 l-3 -3 M68.5 71.5 l3 -3 M51.5 88.5 l-3 3 M68.5 88.5 l3 3\"/></g> <path d=\"M54 110 H66\" stroke=\"COLOR\" stroke-width=\"1.4\"/> <path d=\"M96 60 V150\" stroke=\"#5c3a1a\" stroke-width=\"2.4\"/> <rect x=\"88\" y=\"48\" width=\"16\" height=\"12\" rx=\"1.5\" fill=\"url(#SIL)\" stroke=\"LIGHT\" stroke-width=\"1\"/> <rect x=\"90\" y=\"51\" width=\"12\" height=\"6\" rx=\"1\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/>",
      back: "<g stroke=\"#d4af37\" stroke-width=\"1.3\" opacity=\".55\"> <path d=\"M60 32 L60 0\"/><path d=\"M60 32 L82 6\"/><path d=\"M60 32 L38 6\"/><path d=\"M60 32 L96 22\"/><path d=\"M60 32 L24 22\"/><path d=\"M60 32 L100 40\"/><path d=\"M60 32 L20 40\"/> </g> <circle cx=\"60\" cy=\"32\" r=\"18\" fill=\"none\" stroke=\"#d4af37\" stroke-width=\"1.2\" opacity=\".7\"/>",
      bust: '25 6 70 70',
      alt: 'Helm framed by a golden sunburst, a sun-emblem tabard and a warhammer.',
    },
    {
      id: 'ronin',
      name: 'Ronin',
      color: '#10b981',
      light: '#6ee7b7',
      outline: 'M60,22 L66,22 L72,26 L82,32 L78,37 L70,36 L70,44 L66,48 L64,50 L70,52 L84,52 L91,56 L90,72 L84,74 L84,90 L80,100 L84,124 L94,166 L60,170 L60,170 L26,166 L36,124 L40,100 L36,90 L36,74 L30,72 L29,56 L36,52 L50,52 L56,50 L54,48 L50,44 L50,36 L42,37 L38,32 L48,26 L54,22 L60,22 Z',
      detail: "<path d=\"M60 22 Q46 12 42 2 Q54 10 60 16 Q66 10 78 2 Q74 12 60 22Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M54 39 H66 V47 Q60 51 54 47Z\" fill=\"#05050c\"/> <path d=\"M55 38 l4 1.2 M65 38 l-4 1.2\" stroke=\"LIGHT\" stroke-width=\"1.7\" stroke-linecap=\"round\" filter=\"url(#GLOW)\"/> <g stroke=\"COLOR\" stroke-opacity=\".55\" stroke-width=\".7\"><path d=\"M72 58 H90 M72 64 H90 M48 58 H30 M48 64 H30\"/><path d=\"M48 30 H72\"/></g> <path d=\"M70 52 Q60 72 50 52\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".5\" stroke-width=\".8\"/> <path d=\"M76 100 Q60 104 44 100\" fill=\"none\" stroke=\"#d4af37\" stroke-width=\"1.4\"/> <g stroke=\"COLOR\" stroke-opacity=\".4\" stroke-width=\".7\"><path d=\"M60 104 V170\"/><path d=\"M70 104 L78 168\"/><path d=\"M50 104 L42 168\"/></g> <path d=\"M60 96 L106 18 L108 20 L64 99Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M106 18 Q108 14 110 13\" stroke=\"LIGHT\" stroke-width=\"1.6\" filter=\"url(#GLOW)\"/> <ellipse cx=\"62\" cy=\"97\" rx=\"5\" ry=\"2\" fill=\"#d4af37\" transform=\"rotate(-60 62 97)\"/> <path d=\"M60 99 L52 113\" stroke=\"#3b2a1a\" stroke-width=\"3.4\" stroke-linecap=\"round\"/> <path d=\"M54 104 Q60 100 64 106 L60 112 Q56 110 52 112Z\" fill=\"#14142a\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".7\"/> <g fill=\"#f9a8d4\" opacity=\".8\"><circle cx=\"20\" cy=\"40\" r=\"1.4\"/><circle cx=\"28\" cy=\"70\" r=\"1.1\"/><circle cx=\"102\" cy=\"120\" r=\"1.3\"/><circle cx=\"16\" cy=\"120\" r=\"1\"/></g>",
      back: "",
      bust: '25 4 70 70',
      alt: 'Samurai helm with a glowing crescent crest, katana drawn, petals drifting.',
    },
  ],
  scholar: [
    {
      id: 'tome-keeper',
      name: 'Tome Keeper',
      color: '#3b82f6',
      light: '#93c5fd',
      outline: 'M60,18 L64,20 L70,27 L74,38 L74,48 L73,53 L80,56 L88,62 L91,72 L93,88 L97,104 L86,106 L80,100 L76,108 L81,138 L90,170 L60,171 L60,171 L30,170 L39,138 L44,108 L40,100 L34,106 L23,104 L27,88 L29,72 L32,62 L40,56 L47,53 L46,48 L46,38 L50,27 L56,20 L60,18 Z',
      detail: "<path d=\"M60 30 Q68 32 69 44 Q66 54 60 55 Q54 54 51 44 Q52 32 60 30Z\" fill=\"#05050c\"/> <circle cx=\"56\" cy=\"44\" r=\"1.4\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><circle cx=\"64\" cy=\"44\" r=\"1.4\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M60 56 V170\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M73 53 Q60 62 47 53\" fill=\"none\" stroke=\"#d4af37\" stroke-opacity=\".7\" stroke-width=\".9\"/> <path d=\"M66 108 L81 138 M54 108 L39 138\" stroke=\"COLOR\" stroke-opacity=\".3\" stroke-width=\".7\"/> <ellipse cx=\"60\" cy=\"88\" rx=\"22\" ry=\"12\" fill=\"COLOR\" opacity=\".35\" filter=\"url(#GLOW)\"/> <path d=\"M42 86 Q51 82 60 87 Q69 82 78 86 L77 96 Q69 92 60 97 Q51 92 43 96Z\" fill=\"#e5e7eb\" stroke=\"#d4af37\" stroke-width=\"1\"/> <path d=\"M60 87 V97\" stroke=\"#94a3b8\" stroke-width=\".7\"/> <path d=\"M47 88 h9 M47 91 h8 M64 88 h9 M65 91 h8\" stroke=\"COLOR\" stroke-width=\".7\"/> <g fill=\"LIGHT\" filter=\"url(#GLOW)\" font-family=\"serif\" font-size=\"6\" text-anchor=\"middle\"> <text x=\"52\" y=\"76\" opacity=\".9\">ᚱ</text><text x=\"66\" y=\"70\" opacity=\".8\">ᚦ</text><text x=\"58\" y=\"62\" opacity=\".55\">ᛟ</text><text x=\"71\" y=\"80\" opacity=\".7\">ᚨ</text> </g>",
      back: "",
      bust: '25 12 70 70',
      alt: 'Hooded mage holding a glowing open tome, runes rising.',
    },
    {
      id: 'archmage',
      name: 'Archmage',
      color: '#3b82f6',
      light: '#93c5fd',
      outline: 'M60,2 L62,8 L66,20 L70,30 L86,34 L73,38 L74,46 L73,53 L80,56 L88,62 L91,72 L93,88 L97,104 L86,106 L80,100 L76,108 L81,138 L90,170 L60,171 L60,171 L30,170 L39,138 L44,108 L40,100 L34,106 L23,104 L27,88 L29,72 L32,62 L40,56 L47,53 L46,46 L47,38 L34,34 L50,30 L54,20 L58,8 L60,2 Z',
      detail: "<path d=\"M52 40 H68 L66 50 Q60 54 54 50Z\" fill=\"#05050c\"/> <circle cx=\"56.5\" cy=\"44\" r=\"1.3\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><circle cx=\"63.5\" cy=\"44\" r=\"1.3\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M53 50 Q60 54 67 50 L64 70 L60 80 L56 70Z\" fill=\"#cbd5e1\"/> <path d=\"M58 56 L60 76 M62 56 L60 76\" stroke=\"#94a3b8\" stroke-width=\".5\"/> <path d=\"M54 30 Q60 27 66 30\" stroke=\"#d4af37\" stroke-width=\"1.6\" fill=\"none\"/> <circle cx=\"62\" cy=\"16\" r=\"1\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><circle cx=\"58\" cy=\"22\" r=\".8\" fill=\"LIGHT\"/> <path d=\"M60 80 V170\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M96 40 L96 170\" stroke=\"#5c3a1a\" stroke-width=\"2.4\"/> <path d=\"M96 40 Q90 34 93 26 M96 40 Q102 34 99 26\" stroke=\"#5c3a1a\" stroke-width=\"1.6\" fill=\"none\"/> <circle cx=\"96\" cy=\"31\" r=\"4.5\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <circle cx=\"96\" cy=\"31\" r=\"9\" fill=\"COLOR\" opacity=\".35\" filter=\"url(#GLOW)\"/>",
      back: "",
      bust: '25 10 70 70',
      alt: 'Pointed hat, long white beard and a staff topped with a glowing crystal.',
    },
  ],
  monk: [
    {
      id: 'floating-sage',
      name: 'Floating Sage',
      color: '#a855f7',
      light: '#d8b4fe',
      outline: 'M60,44 L65,45 L69,50 L70,56 L68,62 L64,65 L65,68 L74,70 L82,74 L86,84 L88,98 L93,110 L103,118 L106,126 L98,132 L80,134 L60,135 L60,135 L40,134 L22,132 L14,126 L17,118 L27,110 L32,98 L34,84 L38,74 L46,70 L55,68 L56,65 L52,62 L50,56 L51,50 L55,45 L60,44 Z',
      detail: "<circle cx=\"60\" cy=\"56\" r=\"21\" fill=\"none\" stroke=\"LIGHT\" stroke-width=\"1.6\" opacity=\".9\" filter=\"url(#GLOW)\"/> <circle cx=\"60\" cy=\"56\" r=\"25\" fill=\"none\" stroke=\"COLOR\" stroke-width=\".6\" opacity=\".6\" stroke-dasharray=\"2 3\"/> <path d=\"M54 56 q2 1.4 4 0 M62 56 q2 1.4 4 0\" stroke=\"LIGHT\" stroke-width=\".9\" fill=\"none\"/> <g fill=\"#d4af37\"><circle cx=\"54\" cy=\"70\" r=\"1.3\"/><circle cx=\"57\" cy=\"72\" r=\"1.3\"/><circle cx=\"60\" cy=\"73\" r=\"1.5\"/><circle cx=\"63\" cy=\"72\" r=\"1.3\"/><circle cx=\"66\" cy=\"70\" r=\"1.3\"/></g> <path d=\"M74 70 Q66 90 60 96 Q54 90 46 70\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".55\" stroke-width=\".9\"/> <path d=\"M93 110 Q80 112 60 118 Q40 112 27 110\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".45\" stroke-width=\".8\"/> <circle cx=\"60\" cy=\"104\" r=\"4\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <ellipse cx=\"60\" cy=\"150\" rx=\"30\" ry=\"4\" fill=\"COLOR\" opacity=\".55\" filter=\"url(#GLOW)\"/> <g fill=\"LIGHT\" filter=\"url(#GLOW)\"><circle cx=\"24\" cy=\"80\" r=\"1.6\"/><circle cx=\"98\" cy=\"70\" r=\"1.3\"/><circle cx=\"30\" cy=\"140\" r=\"1.1\"/><circle cx=\"92\" cy=\"146\" r=\"1.4\"/></g>",
      back: "",
      bust: '25 28 70 70',
      alt: 'Floating in lotus pose inside a halo of light.',
    },
    {
      id: 'staff-ascetic',
      name: 'Staff Ascetic',
      color: '#a855f7',
      light: '#d8b4fe',
      outline: 'M60,22 L65,23 L69,28 L70,34 L68,40 L64,43 L65,46 L74,48 L84,52 L88,60 L89,82 L85,96 L80,108 L85,140 L90,168 L66,170 L64,150 L60,148 L60,148 L56,150 L54,170 L30,168 L35,140 L40,108 L35,96 L31,82 L32,60 L36,52 L46,48 L55,46 L56,43 L52,40 L50,34 L51,28 L55,23 L60,22 Z',
      detail: "<path d=\"M54 33 q2 1.4 4 0 M62 33 q2 1.4 4 0\" stroke=\"LIGHT\" stroke-width=\".9\" fill=\"none\"/> <circle cx=\"60\" cy=\"27\" r=\"1.6\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <g fill=\"#d4af37\"><circle cx=\"54\" cy=\"48\" r=\"1.2\"/><circle cx=\"57\" cy=\"50\" r=\"1.2\"/><circle cx=\"60\" cy=\"51\" r=\"1.4\"/><circle cx=\"63\" cy=\"50\" r=\"1.2\"/><circle cx=\"66\" cy=\"48\" r=\"1.2\"/></g> <path d=\"M84 52 Q72 66 62 74 M36 52 Q48 66 58 74\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".55\" stroke-width=\".9\"/> <path d=\"M60 62 L64 78 L60 82 L56 78Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <ellipse cx=\"60\" cy=\"72\" rx=\"12\" ry=\"14\" fill=\"COLOR\" opacity=\".3\" filter=\"url(#GLOW)\"/> <path d=\"M80 108 Q60 112 40 108\" fill=\"none\" stroke=\"#d4af37\" stroke-width=\"1.2\"/> <path d=\"M60 112 V148\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <g fill=\"LIGHT\" filter=\"url(#GLOW)\"><path d=\"M30 120 q-3 -8 0 -14 q3 6 0 14Z\"/><path d=\"M92 112 q-3 -8 0 -14 q3 6 0 14Z\"/><path d=\"M24 150 q-2 -6 0 -10 q2 4 0 10Z\"/><path d=\"M98 146 q-2 -6 0 -10 q2 4 0 10Z\"/></g>",
      back: "<rect x=\"10\" y=\"54\" width=\"100\" height=\"3.2\" rx=\"1.6\" fill=\"#5c3a1a\" transform=\"rotate(-12 60 56)\"/> <g transform=\"rotate(-12 60 56)\"><rect x=\"10\" y=\"53.4\" width=\"6\" height=\"4.4\" fill=\"#d4af37\"/><rect x=\"104\" y=\"53.4\" width=\"6\" height=\"4.4\" fill=\"#d4af37\"/></g>",
      bust: '25 8 70 70',
      alt: 'Standing, palms together, a staff across the back and spirit flames around.',
    },
  ],
  guildmaster: [
    {
      id: 'coin-baron',
      name: 'Coin Baron',
      color: '#f59e0b',
      light: '#fcd34d',
      outline: 'M60,18 L66,18 L68,28 L80,30 L86,34 L70,36 L68,43 L66,49 L72,46 L76,54 L87,58 L90,66 L90,86 L93,128 L98,166 L84,168 L72,158 L70,171 L63,171 L62,140 L60,138 L60,138 L58,140 L57,171 L50,171 L48,158 L36,168 L22,166 L27,128 L30,86 L30,66 L33,58 L44,54 L48,46 L54,49 L52,43 L50,36 L34,34 L40,30 L52,28 L54,18 L60,18 Z',
      detail: "<rect x=\"53\" y=\"40\" width=\"5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><rect x=\"62\" y=\"40\" width=\"5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M54 26 H66\" stroke=\"#d4af37\" stroke-width=\"2\"/> <path d=\"M66 49 L60 60 L54 49\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".9\"/> <path d=\"M60 60 L72 158 M60 60 L48 158\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M66 64 Q60 72 54 64\" fill=\"none\" stroke=\"#d4af37\" stroke-width=\".9\"/> <rect x=\"58.8\" y=\"100\" width=\"2.4\" height=\"70\" fill=\"#3b2a1a\" stroke=\"#d4af37\" stroke-width=\".4\"/> <path d=\"M51 98 Q60 93 69 98 L68 104 Q60 101 52 104Z\" fill=\"#14142a\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".7\"/> <circle cx=\"60\" cy=\"92\" r=\"5\" fill=\"#d4af37\" filter=\"url(#GLOW)\"/><circle cx=\"58.5\" cy=\"90.5\" r=\"1.6\" fill=\"#fff8dc\"/> <g fill=\"#d4af37\" stroke=\"#8a6a12\" stroke-width=\".5\" filter=\"url(#GLOW)\"><circle cx=\"34\" cy=\"76\" r=\"3\"/><circle cx=\"88\" cy=\"96\" r=\"2.6\"/><circle cx=\"96\" cy=\"70\" r=\"2\"/><circle cx=\"26\" cy=\"112\" r=\"2.2\"/></g>",
      back: "",
      bust: '25 12 70 70',
      alt: 'Long coat and wide hat, hands on a gold-orbed cane, coins in orbit.',
    },
    {
      id: 'merchant-king',
      name: 'Merchant King',
      color: '#f59e0b',
      light: '#fcd34d',
      outline: 'M60,20 L62,26 L66,18 L68,28 L71,20 L70,36 L68,43 L66,49 L72,46 L76,54 L87,58 L90,66 L90,86 L93,128 L98,166 L84,168 L72,158 L70,171 L63,171 L62,140 L60,138 L60,138 L58,140 L57,171 L50,171 L48,158 L36,168 L22,166 L27,128 L30,86 L30,66 L33,58 L44,54 L48,46 L54,49 L52,43 L50,36 L49,20 L52,28 L54,18 L58,26 L60,20 Z',
      detail: "<path d=\"M50 30 H70 V36 H50Z\" fill=\"#d4af37\"/> <path d=\"M49 30 L49 20 L53 27 L56 18 L60 26 L64 18 L67 27 L71 20 L71 30Z\" fill=\"#d4af37\" stroke=\"#8a6a12\" stroke-width=\".5\" filter=\"url(#GLOW)\"/> <circle cx=\"60\" cy=\"33\" r=\"1.6\" fill=\"COLOR\"/><circle cx=\"54\" cy=\"33\" r=\"1\" fill=\"LIGHT\"/><circle cx=\"66\" cy=\"33\" r=\"1\" fill=\"LIGHT\"/> <rect x=\"53\" y=\"40\" width=\"5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><rect x=\"62\" y=\"40\" width=\"5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M72 46 Q86 56 90 66 Q76 62 60 66 Q44 62 30 66 Q34 56 48 46\" fill=\"#e5e7eb\" opacity=\".9\"/> <g fill=\"#0b0b14\"><circle cx=\"40\" cy=\"60\" r=\".9\"/><circle cx=\"50\" cy=\"58\" r=\".9\"/><circle cx=\"70\" cy=\"58\" r=\".9\"/><circle cx=\"80\" cy=\"60\" r=\".9\"/></g> <path d=\"M60 66 L72 158 M60 66 L48 158\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <ellipse cx=\"60\" cy=\"100\" rx=\"12\" ry=\"22\" fill=\"COLOR\" opacity=\".3\" filter=\"url(#GLOW)\"/> <circle cx=\"60\" cy=\"84\" r=\"6\" fill=\"none\" stroke=\"LIGHT\" stroke-width=\"2.4\" filter=\"url(#GLOW)\"/> <path d=\"M60 90 V120 M60 112 H66 M60 118 H68\" stroke=\"LIGHT\" stroke-width=\"2.4\" filter=\"url(#GLOW)\"/> <path d=\"M52 92 Q60 88 68 92 L67 98 Q60 95 53 98Z\" fill=\"#14142a\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".7\"/>",
      back: "",
      bust: '25 10 70 70',
      alt: 'Gold crown and white fur mantle, holding a large glowing key.',
    },
  ],
  bard: [
    {
      id: 'lyre-minstrel',
      name: 'Lyre Minstrel',
      color: '#ec4899',
      light: '#f9a8d4',
      outline: 'M60,24 L66,24 L71,28 L77,32 L70,35 L68,43 L66,50 L64,52 L72,54 L84,58 L90,70 L95,104 L99,148 L92,154 L86,149 L80,156 L76,170 L66,170 L64,126 L60,123 L60,123 L56,126 L54,170 L44,170 L40,156 L34,149 L28,154 L21,148 L25,104 L30,70 L36,58 L48,54 L56,52 L54,50 L52,43 L50,35 L43,32 L49,28 L54,24 L60,24 Z',
      detail: "<path d=\"M48 30 Q30 10 44 4 Q42 18 52 28Z\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M51 28 Q38 14 44 6\" fill=\"none\" stroke=\"#fff\" stroke-width=\".5\" opacity=\".8\"/> <rect x=\"53\" y=\"40\" width=\"4.5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><rect x=\"62.5\" y=\"40\" width=\"4.5\" height=\"1.8\" rx=\".9\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M72 54 Q60 62 48 54\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".6\" stroke-width=\".9\"/> <path d=\"M79 118 Q60 112 41 118\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".45\" stroke-width=\".8\"/> <ellipse cx=\"60\" cy=\"86\" rx=\"16\" ry=\"18\" fill=\"COLOR\" opacity=\".3\" filter=\"url(#GLOW)\"/> <path d=\"M50 102 Q44 88 47 76 Q48 70 52 70 Q50 78 53 88 Q56 96 60 98 Q64 96 67 88 Q70 78 68 70 Q72 70 73 76 Q76 88 70 102Z\" fill=\"#d4af37\" stroke=\"#8a6a12\" stroke-width=\".5\"/> <rect x=\"48\" y=\"72\" width=\"24\" height=\"2.2\" rx=\"1\" fill=\"#d4af37\"/> <g stroke=\"LIGHT\" stroke-width=\".7\" filter=\"url(#GLOW)\"><path d=\"M55 74 V98\"/><path d=\"M58.3 74 V99\"/><path d=\"M61.7 74 V99\"/><path d=\"M65 74 V98\"/></g> <g fill=\"LIGHT\" filter=\"url(#GLOW)\" font-family=\"serif\" font-size=\"8\"><text x=\"80\" y=\"76\">♪</text><text x=\"30\" y=\"92\" font-size=\"6\">♫</text><text x=\"86\" y=\"56\" font-size=\"5\">♪</text></g>",
      back: "",
      bust: '25 6 70 70',
      alt: 'Feathered cap and cape, holding a glowing lyre.',
    },
    {
      id: 'wandering-piper',
      name: 'Wandering Piper',
      color: '#ec4899',
      light: '#f9a8d4',
      outline: 'M60,18 L64,20 L70,27 L74,38 L74,48 L73,53 L78,55 L84,58 L90,70 L95,104 L99,148 L92,154 L86,149 L80,156 L76,170 L66,170 L64,126 L60,123 L60,123 L56,126 L54,170 L44,170 L40,156 L34,149 L28,154 L21,148 L25,104 L30,70 L36,58 L42,55 L47,53 L46,48 L46,38 L50,27 L56,20 L60,18 Z',
      detail: "<path d=\"M60 30 Q68 32 69 44 Q66 54 60 55 Q54 54 51 44 Q52 32 60 30Z\" fill=\"#05050c\"/> <circle cx=\"56\" cy=\"43\" r=\"1.3\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/><circle cx=\"64\" cy=\"43\" r=\"1.3\" fill=\"LIGHT\" filter=\"url(#GLOW)\"/> <path d=\"M73 53 Q60 60 47 53\" fill=\"none\" stroke=\"#d4af37\" stroke-opacity=\".8\" stroke-width=\".9\"/> <path d=\"M58 52 L100 34\" stroke=\"#d4af37\" stroke-width=\"2.6\" stroke-linecap=\"round\"/> <g fill=\"#05050c\"><circle cx=\"72\" cy=\"46.1\" r=\".8\"/><circle cx=\"78\" cy=\"43.5\" r=\".8\"/><circle cx=\"84\" cy=\"41\" r=\".8\"/><circle cx=\"90\" cy=\"38.4\" r=\".8\"/></g> <path d=\"M66 54 Q72 52 74 47 L70 45 Q66 49 62 50Z M80 47 Q86 46 86 41 L82 40 Q80 44 77 44Z\" fill=\"url(#SIL)\" stroke=\"LIGHT\" stroke-opacity=\".6\" stroke-width=\".6\"/> <path d=\"M100 34 Q106 30 104 22 Q112 26 108 36 Q104 44 112 50\" fill=\"none\" stroke=\"LIGHT\" stroke-width=\"1\" filter=\"url(#GLOW)\" opacity=\".8\"/> <g fill=\"LIGHT\" filter=\"url(#GLOW)\" font-family=\"serif\"><text x=\"98\" y=\"20\" font-size=\"8\">♪</text><text x=\"104\" y=\"62\" font-size=\"6\">♫</text><text x=\"88\" y=\"16\" font-size=\"5\">♪</text></g> <path d=\"M60 56 V120\" stroke=\"COLOR\" stroke-opacity=\".35\" stroke-width=\".8\"/> <path d=\"M84 102 Q60 108 36 102\" fill=\"none\" stroke=\"COLOR\" stroke-opacity=\".5\" stroke-width=\".8\"/> <rect x=\"76\" y=\"104\" width=\"7\" height=\"9\" rx=\"1.5\" fill=\"#8b5a2b\" stroke=\"#d4af37\" stroke-width=\".5\"/>",
      back: "",
      bust: '25 12 70 70',
      alt: 'A hooded wanderer playing a golden flute, music drifting away.',
    },
  ],
};

/** The look to show for a class: the saved one if it belongs to the class, else the default. */
export function resolveLook(cls: UserClass, lookId?: string | null): HeroLook {
  const looks = CLASS_LOOKS[cls] ?? CLASS_LOOKS.scholar;
  return looks.find((l) => l.id === lookId) ?? looks[0];
}

/** Fill in a look's markup for one rendered instance. */
export function heroMarkup(markup: string, look: HeroLook, ids: { glow: string; sil: string }): string {
  return markup
    .replace(/LIGHT/g, look.light)
    .replace(/COLOR/g, look.color)
    .replace(/#GLOW/g, `#${ids.glow}`)
    .replace(/#SIL/g, `#${ids.sil}`);
}
