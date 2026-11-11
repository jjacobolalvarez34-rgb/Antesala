import { Cinzel, Cormorant_Garamond, Inter, Instrument_Serif, Jost } from 'next/font/google';

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

/**
 * Identidad de Antesala (D-062): Cinzel para el logo y los titulares en
 * mayúsculas, Cormorant Garamond itálica para las frases y Jost para el texto.
 * Solo se usan en las páginas de Antesala, no en las de los hoteles.
 */
export const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jost',
  display: 'swap',
});

export const fontVariables = `${instrumentSerif.variable} ${inter.variable} ${cinzel.variable} ${cormorant.variable} ${jost.variable}`;

export const displayFontVar: Record<DisplayFont, string> = {
  'Instrument Serif': 'var(--font-instrument-serif)',
};

export const textFontVar: Record<TextFont, string> = {
  Inter: 'var(--font-inter)',
};
