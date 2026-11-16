/**
 * URLs y precarga de los assets del visor, SIN three.js: este módulo lo usa el
 * layout (SceneLayer) y no debe arrastrar el 3D al JS inicial (D-029).
 */

const BASE = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL ? `${process.env.NEXT_PUBLIC_ASSETS_BASE_URL}/visor` : '/visor').replace(
  /\/$/,
  '',
);

export const visorUrl = (path: string) => `${BASE}/${path.replace(/^\//, '')}`;

/**
 * Cielo (HDRI) liviano en celular (D-087): 512 px en vez de 1024 (300 KB en vez de 1,2 MB).
 * En una pantalla chica el reflejo no gana nada con más resolución.
 */
const small = () => typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900);

export const ASSETS = {
  get envDia() {
    return small() ? 'env/dia-512.hdr' : 'env/dia.hdr';
  },
  get envNoche() {
    return small() ? 'env/noche-512.hdr' : 'env/noche.hdr';
  },
  ladrillo: { color: 'materials/ladrillo/color.jpg', normal: 'materials/ladrillo/normal.jpg', arm: 'materials/ladrillo/arm.jpg' },
  lino: { color: 'materials/lino/color.jpg', normal: 'materials/lino/normal.jpg' },
} as const;

const daySet = () => [ASSETS.envDia, ...Object.values(ASSETS.ladrillo), ...Object.values(ASSETS.lino)];
const nightSet = () => [ASSETS.envNoche];

function saveData() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return c?.saveData === true;
}

const warmed = new Set<string>();

/** Calienta la caché HTTP con prioridad baja (no decodifica). */
export function prefetch(set: 'dia' | 'noche') {
  if (typeof window === 'undefined' || saveData()) return;
  for (const path of set === 'dia' ? daySet() : nightSet()) {
    if (warmed.has(path)) continue;
    warmed.add(path);
    fetch(visorUrl(path), { priority: 'low' } as RequestInit).catch(() => warmed.delete(path));
  }
}
