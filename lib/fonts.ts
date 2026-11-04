import { Inter, Instrument_Serif } from 'next/font/google';

import type { DisplayFont, TextFont } from './types';

/**
 * Registro de fuentes disponibles para los hoteles. next/font necesita
 * declaraciones estáticas, así que tokens.json elige entre las de aquí.
 */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontVariables = `${instrumentSerif.variable} ${inter.variable}`;

export const displayFontVar: Record<DisplayFont, string> = {
  'Instrument Serif': 'var(--font-instrument-serif)',
};

export const textFontVar: Record<TextFont, string> = {
  Inter: 'var(--font-inter)',
};
