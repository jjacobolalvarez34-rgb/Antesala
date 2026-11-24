import type { Route } from 'next';

import { EN } from './i18n-en';

/**
 * Idiomas de las demos (D-094, pedido de Jacobo, 2026-11-24: un amigo de Nueva Zelanda quería
 * mostrarlas a amigos que hablan otros idiomas).
 *
 * - Español en `/h/...` (como siempre) e inglés en `/en/h/...`. Las páginas son las mismas.
 * - Los textos de la interfaz se escriben en español y se envuelven con `t(lang, 'texto')`: en
 *   inglés se buscan en el diccionario (`lib/i18n-en.ts`); si falta, queda el español. Un texto
 *   olvidado nunca rompe la página.
 * - El contenido de cada hotel se traduce al cargarlo (`translateDeep`), con la tabla del hotel
 *   (`content/hotels/<slug>/i18n/en.json`) y unas reglas comunes ("Piso 5" → "Floor 5").
 *   Así un hotel nuevo trae su traducción en su carpeta (regla 1) y los componentes no cambian.
 * - La página de Antesala (venta a hoteles colombianos) sigue solo en español.
 */
export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];
export const isLang = (v: unknown): v is Lang => v === 'es' || v === 'en';

const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;

/** Texto de la interfaz en el idioma pedido (la clave es el texto en español). */
export function t(lang: Lang, es: string, vars?: Record<string, string | number>): string {
  return fill(lang === 'en' ? (EN[es] ?? es) : es, vars);
}

/** Prefijo de las rutas de las demos por idioma. */
export const langPrefix = (lang: Lang) => (lang === 'en' ? '/en' : '');

/** Constructores de rutas del recorrido en un idioma (mismas firmas que `routes`). */
export function routesFor(lang: Lang) {
  const p = langPrefix(lang);
  return {
    hotel: (h: string) => `${p}/h/${h}` as Route,
    explorar: (h: string) => `${p}/h/${h}/explorar` as Route,
    lista: (h: string) => `${p}/h/${h}/lista` as Route,
    comparar: (h: string) => `${p}/h/${h}/comparar` as Route,
    panel: (h: string) => `${p}/h/${h}/panel` as Route,
    piso: (h: string, level: string) => `${p}/h/${h}/piso/${level}` as Route,
    unidad: (h: string, unit: string) => `${p}/h/${h}/unidad/${unit}` as Route,
    espacio: (h: string, unit: string, space: string) => `${p}/h/${h}/unidad/${unit}/${space}` as Route,
  };
}
export type Routes = ReturnType<typeof routesFor>;

/** La misma página en el otro idioma (para el selector ES / EN). */
export function switchLangPath(path: string, to: Lang) {
  const bare = path.replace(/^\/en(?=\/|$)/, '') || '/';
  return to === 'en' ? `/en${bare === '/' ? '' : bare}` : bare;
}

// ---------------------------------------------------------------- contenido de los hoteles

/** Reglas comunes para textos que se arman con números ("Piso 5", "Estudio 201", "2 personas"). */
const RULES: [RegExp, string][] = [
  [/^Piso (\d+)$/, 'Floor $1'],
  [/^Piso (\d+) de (\d+)$/, 'Floor $1 of $2'],
  [/^Estudio (\d+)$/, 'Studio $1'],
  [/^Suite (\d+)$/, 'Suite $1'],
  [/^Penthouse (\d+)$/, 'Penthouse $1'],
  [/^Habitación (\d+)$/, 'Room $1'],
  [/^Apartamento (\d+)$/, 'Apartment $1'],
  [/^(\d+) camas? (sencilla|doble|queen|king)s?$/, '$1 $2 bed'],
  [/^1 cama (\w+)$/, '1 $1 bed'],
  [/^(\d+) camas (\w+)$/, '$1 $2 beds'],
];

/** Claves que nunca se traducen (identificadores, rutas, archivos, opciones). */
const SKIP = new Set([
  'id',
  'slug',
  'src',
  'href',
  'plan',
  'type',
  'kind',
  'tier',
  'fidelity',
  'sameAs',
  'realista',
  'categoryId',
  'levelId',
  'unitId',
  'spaceId',
  'poiId',
  'finish',
  'offer',
  'corners',
  'hero',
  'title',
  'cladding',
  'ground',
  'windows',
  'whatsapp',
  'email',
  'phone',
  'url',
  'target',
  'currency',
  'locale',
  'logo',
  'font',
  'icon',
  'cover',
  'facade',
]);

/** Traduce un texto del contenido con la tabla del hotel y las reglas comunes; si no, lo deja igual. */
export function translateText(text: string, table: Record<string, string>): string {
  const hit = table[text] ?? EN[text];
  if (hit) return hit;
  for (const [re, to] of RULES) if (re.test(text)) return text.replace(re, to);
  return text;
}

/** Copia del objeto con sus textos traducidos (solo valores de texto, nunca identificadores). */
export function translateDeep<T>(value: T, table: Record<string, string>, key = ''): T {
  if (typeof value === 'string') return (SKIP.has(key) ? value : translateText(value, table)) as T;
  if (Array.isArray(value)) return value.map((v) => translateDeep(v, table, key)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SKIP.has(k) ? v : translateDeep(v, table, k);
    return out as T;
  }
  return value;
}
