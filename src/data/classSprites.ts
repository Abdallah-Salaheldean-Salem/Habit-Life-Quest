/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserClass } from '../types';

// ---------------------------------------------------------
// CLASS SPRITES — hand-drawn 16×16 pixel art, one per class, in each class's
// stat colour. Each row is 16 characters; '.' is transparent and every other
// character is a key into the shared palette (plus the class's own P/p/L
// tones). Rendered as crisp SVG rects by <ClassSprite>.
// ---------------------------------------------------------

export const SPRITE_SIZE = 16;

/** Colours shared by every sprite. */
export const BASE_PALETTE: Record<string, string> = {
  K: '#0b0b14', // outline
  S: '#f1c27d', // skin
  s: '#c98b52', // skin shade
  H: '#3b2a1a', // hair
  W: '#e5e7eb', // steel / paper / feather
  w: '#94a3b8', // steel shade
  G: '#d4af37', // gold
  g: '#8a6a12', // gold shade
  B: '#8b5a2b', // wood / leather
  b: '#5c3a1a', // dark leather
};

export interface ClassSpriteDef {
  /** P = main, p = shade, L = light — the class's stat colour. */
  tones: { P: string; p: string; L: string };
  rows: string[];
  /** One line of flavour for the character-select screen. */
  motto: string;
}

export const CLASS_SPRITES: Record<UserClass, ClassSpriteDef> = {
  // Helmet with a plume, sword raised, round shield.
  warrior: {
    tones: { P: '#10b981', p: '#047857', L: '#6ee7b7' },
    motto: 'Forged in motion. Sleep, train, eat well — and grow strong.',
    rows: [
      '......LP........',
      '.....KPpK....W..',
      '....KwWWwK...W..',
      '...KwWWWWwK..W..',
      '...KwKKKKwK..W..',
      '...KwKSSKwK..W..',
      '...KwSSSSwK..W..',
      '....KwsswK..GGG.',
      '....KKPPKK...b..',
      '..KKPPGGPPKK.b..',
      '.KwwKPPPPK.SSb..',
      'KwGwKPPPPK......',
      '.KwwK.PPPP......',
      '..KK..pp.pp.....',
      '......ww.ww.....',
      '.....KKK.KKK....',
    ],
  },
  // Mortarboard with a gold tassel, glasses, an open book.
  scholar: {
    tones: { P: '#3b82f6', p: '#1d4ed8', L: '#93c5fd' },
    motto: 'Sharpened by study. Read, practise, ship the work.',
    rows: [
      '................',
      '...KKKKKKKKKK...',
      '..KppppppppppK..',
      '....KKpppKKG....',
      '....KHHHHHHKG...',
      '...KHSSSSSSHKG..',
      '...KSKKSSKKSK...',
      '...KSSSSSSSSK...',
      '....KSSssSSK....',
      '....KKPPPPKK....',
      '...KPPPLLPPPK...',
      '..KPPBBBBBBPPK..',
      '..KSPBGWWGBPSK..',
      '...KPBBBBBBPK...',
      '...KPPPPPPPPK...',
      '....KKKKKKKK....',
    ],
  },
  // Shaved head, eyes closed, prayer beads, hands together, a little aura.
  monk: {
    tones: { P: '#a855f7', p: '#7e22ce', L: '#d8b4fe' },
    motto: 'Steady as still water. Calm, connection, rest.',
    rows: [
      '..L....KK....L..',
      '.....KSSSSK.....',
      '....KSSSSSSK....',
      '...KSSSSSSSSK...',
      '.L.KSSSSSSSSK.L.',
      '...KSKKSSKKSK...',
      '...KSSSSSSSSK...',
      '....KSSssSSK....',
      '...GKKSSSSKKG...',
      '..KPGPPGGPPGPK..',
      '.KPPPPKSSKPPPPK.',
      '.KPpPPKSSKPPpPK.',
      '..KPPGGGGGGPPK..',
      '..KPPPPPPPPPPK..',
      '..KpPPPPPPPPpK..',
      '...KKKKKKKKKK...',
    ],
  },
  // Tricorn hat with a gold badge, moustache, coat, a coin held high.
  guildmaster: {
    tones: { P: '#f59e0b', p: '#b45309', L: '#fcd34d' },
    motto: 'Builder of fortunes. Earn, save, invest, lead.',
    rows: [
      '................',
      '....KKKKKKKK....',
      '..KKbBBBBBBbKK..',
      '.KbBBBGGBBBBbK..',
      '..KKKKKKKKKKK...',
      '...KHSSSSSSHK...',
      '...KSKSSSSKSK...',
      '...KSHHHHHHSK.G.',
      '....KSSSSSSK.GgG',
      '...KPPWWWWPPK.G.',
      '..KPPPWWWWPPPKS.',
      '..KpPPPWWPPPpKS.',
      '..KbbbbGbbbbbK..',
      '..KPPPBBPPPPPK..',
      '...KpppKpppK....',
      '...KKKK.KKKK....',
    ],
  },
  // Feathered beret, smile, a lute across the body.
  bard: {
    tones: { P: '#ec4899', p: '#be185d', L: '#f9a8d4' },
    motto: 'Maker of joy. Play, make, share what you love.',
    rows: [
      '..........W.....',
      '....KKKKKKW.....',
      '...KPPPPPPKW....',
      '..KPPPPLPPPPK...',
      '...KHHHHHHHK....',
      '...KHSSSSSSHK...',
      '...KSKSSSSKSK...',
      '...KSSSKKSSSK...',
      '....KSSSSSSK....',
      '...KPPLPPLPPK.b.',
      '..KPPPPPPPPK.b..',
      '.KBBBBSPPPK.b...',
      'KBBKBBBBBbbb....',
      'KBBBBBBBKPPK....',
      '.KBBBBBK.pPK....',
      '..KKKKK..KKK....',
    ],
  },
};

/** Resolve a sprite pixel to its colour (or null for transparent). */
export function spriteColor(def: ClassSpriteDef, ch: string): string | null {
  if (ch === '.') return null;
  if (ch === 'P' || ch === 'p' || ch === 'L') return def.tones[ch];
  return BASE_PALETTE[ch] ?? null;
}
