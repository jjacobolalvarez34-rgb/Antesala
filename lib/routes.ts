import type { Route } from 'next';

/** Constructores de rutas del recorrido. Cada etapa tiene URL propia. */
export const routes = {
  hotel: (h: string) => `/h/${h}` as Route,
  explorar: (h: string) => `/h/${h}/explorar` as Route,
  lista: (h: string) => `/h/${h}/lista` as Route,
  comparar: (h: string) => `/h/${h}/comparar` as Route,
  panel: (h: string) => `/h/${h}/panel` as Route,
  piso: (h: string, level: string) => `/h/${h}/piso/${level}` as Route,
  unidad: (h: string, unit: string) => `/h/${h}/unidad/${unit}` as Route,
  espacio: (h: string, unit: string, space: string) => `/h/${h}/unidad/${unit}/${space}` as Route,
};
