/**
 * URLs y precarga de los assets del visor, SIN three.js: este módulo lo usa el
 * layout (SceneLayer) y no debe arrastrar el 3D al JS inicial (D-029).
 */

const BASE = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL ? `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/visor` : '/visor').replace(
  /\/$/,
  '',
);

export const visorUrl = (path: string) => `${BASE}/${path.replace(/^\//, '')}`;

export const ASSETS = {
  envDia: 'env/dia.hdr',
  envNoche: 'env/noche.hdr',
  ladrillo: { color: 'materials/ladrillo/color.jpg', normal: 'materials/ladrillo/normal.jpg', arm: 'materials/ladrillo/arm.jpg' },
  lino: { color: 'materials/lino/color.jpg', normal: 'materials/lino/normal.jpg' },
} as const;

const DAY_SET = [ASSETS.envDia, ...Object.values(ASSETS.ladrillo), ...Object.values(ASSETS.lino)];
const NIGHT_SET = [ASSETS.envNoche];

function saveData() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return c?.saveData === true;
}

const warmed = new Set<string>();

/** Calienta la caché HTTP con prioridad baja (no decodifica). */
export function prefetch(set: 'dia' | 'noche') {
  if (typeof window === 'undefined' || saveData()) return;
  for (const path of set === 'dia' ? DAY_SET : NIGHT_SET) {
    if (warmed.has(path)) continue;
    warmed.add(path);
    fetch(visorUrl(path), { priority: 'low' } as RequestInit).catch(() => warmed.delete(path));
  }
}
