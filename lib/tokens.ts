import type { CSSProperties } from 'react';

import { displayFontVar, textFontVar } from './fonts';
import type { HotelTokens } from './types';

const RADIUS = {
  rectas: { btn: '2px', card: '2px' },
  suaves: { btn: '8px', card: '14px' },
  redondas: { btn: '999px', card: '22px' },
} as const;

/** tokens.json → variables CSS que consume app/globals.css. */
export function tokensToStyle(tokens: HotelTokens): CSSProperties {
  const c = tokens.color;
  return {
    '--hotel-accent': c.accent,
    '--hotel-accent-on-dark': c.accentOnDark ?? c.accent,
    '--hotel-base': c.base,
    '--hotel-stone': c.stone ?? c.base,
    '--hotel-ink': c.ink,
    '--font-display-hotel': displayFontVar[tokens.font.display],
    '--font-text': textFontVar[tokens.font.text],
    // esquinas (D-086): botones y tarjetas de la web del hotel
    '--hotel-r-btn': RADIUS[tokens.look?.corners ?? 'rectas'].btn,
    '--hotel-r-card': RADIUS[tokens.look?.corners ?? 'rectas'].card,
  } as CSSProperties;
}
