import type { Hotel, Level, Unit } from './types';

/** Selectores puros sobre el modelo. Sirven en servidor y cliente. */

export const sortedLevels = (hotel: Hotel): Level[] => [...hotel.levels].sort((a, b) => a.order - b.order);

export const unitsOnLevel = (hotel: Hotel, levelId: string): Unit[] =>
  hotel.units.filter((u) => u.levelId === levelId).sort((a, b) => a.id.localeCompare(b.id));

export const poisOnLevel = (hotel: Hotel, levelId: string) => hotel.site.pois.filter((p) => p.levelId === levelId);

export const findUnit = (hotel: Hotel, unitId: string) => hotel.units.find((u) => u.id === unitId);

export const findLevel = (hotel: Hotel, levelId: string) => hotel.levels.find((l) => l.id === levelId);

export const findCategory = (hotel: Hotel, categoryId: string) => hotel.categories.find((c) => c.id === categoryId);

/** Precio por noche de la unidad, con el extra por vista incluido. */
export const unitPrice = (u: Unit): number | undefined =>
  u.basePriceCOP === undefined ? undefined : u.basePriceCOP + (u.viewPremiumCOP ?? 0);

/** Precio más bajo del hotel ("desde"). */
export const priceFrom = (hotel: Hotel): number | undefined => {
  const prices = hotel.units.map(unitPrice).filter((p): p is number => p !== undefined);
  return prices.length ? Math.min(...prices) : undefined;
};

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const formatCOP = (value: number): string => cop.format(value);

export const formatArea = (m2: number): string =>
  `${m2.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m²`;

export const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Resumen corto de un piso: unidades y zonas comunes ("Suite 402 · Cowork"). */
export const levelSummary = (hotel: Hotel, levelId: string): string => {
  const parts = [
    ...unitsOnLevel(hotel, levelId).map((u) => u.name),
    ...poisOnLevel(hotel, levelId).map((p) => p.name),
  ];
  return parts.length ? parts.join(' · ') : 'Sin unidades de muestra';
};
