import type { CSSProperties } from 'react';

import { displayFontVar, textFontVar } from './fonts';
import type { HotelTokens } from './types';

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
  } as CSSProperties;
}
