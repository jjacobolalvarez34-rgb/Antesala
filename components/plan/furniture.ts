import * as THREE from 'three';

import type { PlanFurniture, PlanRect, PlanSide } from '@/lib/types';

/**
 * Muebles low-poly desde <g id="furniture"> (D-044): cada `data-item` se arma
 * con varias piezas (cama = base + colchón + cabecero + almohadas + pie de
 * cama; sofá = base + espaldar + brazos + cojines…) y las piezas se agrupan
 * por material para dibujarlas en pocas llamadas. `data-back` dice contra qué
 * lado va el respaldo; si falta, se deduce de la pared más cercana.
 */

export type FurnitureMaterial =
  | 'wood'
  | 'woodLight'
  | 'linen'
  | 'fabric'
  | 'textile'
  | 'accent'
  | 'stone'
  | 'ceramic'
  | 'metal'
  | 'plant'
  | 'glass';

/** Paleta neutra cálida con el bronce de la marca en los acentos. */
export const FURNITURE_COLORS: Record<FurnitureMaterial, string> = {
  wood: '#6f5039',
  woodLight: '#b49b7c',
  linen: '#f2ede4',
  fabric: '#857d72',
  textile: '#b59f80',
  accent: '#7d5f3b',
  stone: '#d6d0c6',
  ceramic: '#f6f5f1',
  metal: '#34312e',
  plant: '#58744a',
  glass: '#c9dde0',
};

type Part = { mat: FurnitureMaterial; geometry: THREE.BufferGeometry };

/** Mapea coordenadas locales (a: a lo largo del respaldo, d: desde el respaldo hacia el frente) a la planta. */
interface Local {
  L: number;
  D: number;
  box: (mat: FurnitureMaterial, a0: number, a1: number, d0: number, d1: number, y0: number, y1: number) => void;
  cyl: (mat: FurnitureMaterial, a: number, d: number, r: number, y0: number, y1: number, segments?: number) => void;
  blob: (mat: FurnitureMaterial, a: number, d: number, r: number, y: number, sy?: number) => void;
}

function local(x0: number, x1: number, z0: number, z1: number, back: PlanSide, maxH: number, out: Part[]): Local {
  const alongX = back === 'n' || back === 's';
  const L = alongX ? x1 - x0 : z1 - z0;
  const D = alongX ? z1 - z0 : x1 - x0;
  const toWorld = (a: number, d: number): [number, number] => {
    switch (back) {
      case 'n':
        return [x0 + a, z0 + d];
      case 's':
        return [x1 - a, z1 - d];
      case 'w':
        return [x0 + d, z1 - a];
      case 'e':
        return [x1 - d, z0 + a];
    }
  };
  const clampY = (y0: number, y1: number): [number, number] | null => {
    const top = Math.min(y1, maxH);
    return top - y0 > 0.005 ? [y0, top] : null;
  };
  return {
    L,
    D,
    box(mat, a0, a1, d0, d1, y0, y1) {
      const ys = clampY(y0, y1);
      if (!ys || a1 - a0 <= 0.001 || d1 - d0 <= 0.001) return;
      const [p0x, p0z] = toWorld(a0, d0);
      const [p1x, p1z] = toWorld(a1, d1);
      const [ax, bx] = [Math.min(p0x, p1x), Math.max(p0x, p1x)];
      const [az, bz] = [Math.min(p0z, p1z), Math.max(p0z, p1z)];
      const g = new THREE.BoxGeometry(bx - ax, ys[1] - ys[0], bz - az);
      g.translate((ax + bx) / 2, (ys[0] + ys[1]) / 2, (az + bz) / 2);
      out.push({ mat, geometry: g });
    },
    cyl(mat, a, d, r, y0, y1, segments = 14) {
      const ys = clampY(y0, y1);
      if (!ys) return;
      const [x, z] = toWorld(a, d);
      const g = new THREE.CylinderGeometry(r, r, ys[1] - ys[0], segments);
      g.translate(x, (ys[0] + ys[1]) / 2, z);
      out.push({ mat, geometry: g });
    },
    blob(mat, a, d, r, y, sy = 1) {
      const top = Math.min(y + r * sy, maxH);
      const ry = Math.max(0.05, (top - (y - r * sy)) / 2);
      const [x, z] = toWorld(a, d);
      const g = new THREE.IcosahedronGeometry(r, 1);
      g.scale(1, ry / r, 1);
      g.translate(x, top - ry, z);
      out.push({ mat, geometry: g });
    },
  };
}

/** Cuatro patas finas en las esquinas. */
function legs(l: Local, mat: FurnitureMaterial, h: number, inset = 0.04, w = 0.04) {
  for (const a of [inset, l.L - inset - w]) for (const d of [inset, l.D - inset - w]) l.box(mat, a, a + w, d, d + w, 0, h);
}

function build(item: string, l: Local) {
  const { L, D } = l;
  switch (item) {
    case 'bed': {
      l.box('wood', 0, L, 0, D, 0.02, 0.28);
      l.box('linen', 0.03, L - 0.03, 0.06, D - 0.02, 0.28, 0.5);
      l.box('fabric', 0, L, 0, 0.07, 0.02, 1.05);
      const pillows = L > 1.2 ? 2 : 1;
      const pw = (L - 0.16 - (pillows - 1) * 0.08) / pillows;
      for (let i = 0; i < pillows; i++) {
        const a = 0.08 + i * (pw + 0.08);
        l.box('linen', a, a + pw, 0.1, 0.42, 0.5, 0.62);
      }
      l.box('accent', 0.02, L - 0.02, D * 0.68, D * 0.9, 0.5, 0.53);
      return;
    }
    case 'nightstand':
      l.box('wood', 0, L, 0, D, 0, 0.5);
      l.cyl('metal', L / 2, D / 2, 0.025, 0.5, 0.68, 8);
      l.cyl('linen', L / 2, D / 2, Math.min(L, D) * 0.3, 0.66, 0.84);
      return;
    case 'wardrobe':
      l.box('woodLight', 0, L, 0, D, 0, 2.1);
      l.box('metal', L / 2 - 0.01, L / 2 + 0.01, D - 0.01, D, 0.9, 1.3);
      return;
    case 'desk':
    case 'table':
    case 'console':
      l.box('wood', 0, L, 0, D, item === 'console' ? 0.76 : 0.72, item === 'console' ? 0.8 : 0.76);
      legs(l, 'metal', item === 'console' ? 0.76 : 0.72);
      return;
    case 'coffee':
      l.box('stone', 0, L, 0, D, 0.34, 0.4);
      l.box('wood', 0.08, L - 0.08, 0.08, D - 0.08, 0, 0.34);
      return;
    case 'chair':
      l.box('fabric', 0.03, L - 0.03, 0.03, D - 0.03, 0.42, 0.48);
      l.box('fabric', 0.03, L - 0.03, 0, 0.06, 0.48, 0.84);
      legs(l, 'metal', 0.42, 0.04, 0.03);
      return;
    case 'stool':
      l.cyl('metal', L / 2, D / 2, 0.025, 0, 0.7, 8);
      l.cyl('fabric', L / 2, D / 2, Math.min(L, D) / 2, 0.7, 0.76);
      return;
    case 'sofa':
    case 'armchair': {
      const arm = Math.min(0.16, L * 0.18);
      l.box('fabric', 0, L, 0, D, 0.06, 0.4);
      l.box('fabric', 0, L, 0, 0.2, 0.06, 0.8);
      l.box('fabric', 0, arm, 0, D, 0.06, 0.6);
      l.box('fabric', L - arm, L, 0, D, 0.06, 0.6);
      const seats = item === 'sofa' ? Math.max(2, Math.round((L - 2 * arm) / 0.75)) : 1;
      const sw = (L - 2 * arm - (seats - 1) * 0.02) / seats;
      for (let i = 0; i < seats; i++) {
        const a = arm + i * (sw + 0.02);
        l.box('textile', a, a + sw, 0.2, D - 0.02, 0.4, 0.48);
      }
      return;
    }
    case 'lounger':
      l.box('wood', 0, L, 0, D, 0.12, 0.26);
      l.box('linen', 0.03, L - 0.03, 0.45, D - 0.03, 0.26, 0.32);
      l.box('linen', 0.03, L - 0.03, 0.03, 0.45, 0.26, 0.58);
      return;
    case 'counter':
    case 'kitchen':
      l.box('wood', 0, L, 0, D - 0.03, 0, 0.86);
      l.box('stone', 0, L, 0, D, 0.86, 0.9);
      return;
    case 'island':
      l.box('wood', 0, L, 0.04, D - 0.25, 0, 0.86);
      l.box('stone', 0, L, 0, D, 0.86, 0.9);
      return;
    case 'bar':
      l.box('wood', 0, L, 0.1, D, 0, 1.0);
      l.box('stone', 0, L, 0, D, 1.0, 1.04);
      return;
    case 'reception':
      l.box('accent', 0, L, 0.18, D, 0, 1.0);
      l.box('stone', 0, L, 0.12, D, 1.0, 1.05);
      l.box('wood', 0.05, L - 0.05, 0, 0.18, 0, 0.74);
      return;
    case 'shower':
      l.box('ceramic', 0, L, 0, D, 0, 0.06);
      l.box('glass', 0, L, D - 0.02, D, 0.06, 2.0);
      return;
    case 'bathtub':
      l.box('ceramic', 0, L, 0, D, 0, 0.55);
      return;
    case 'sink': {
      l.box('wood', 0, L, 0, D, 0.1, 0.8);
      const n = L > 1.4 ? 2 : 1;
      const bw = Math.min(0.5, (L - 0.2) / n - 0.1);
      for (let i = 0; i < n; i++) {
        const c = (L / (n * 2)) * (2 * i + 1);
        l.box('ceramic', c - bw / 2, c + bw / 2, 0.08, D - 0.06, 0.8, 0.86);
      }
      return;
    }
    case 'toilet':
      l.box('ceramic', L * 0.1, L * 0.9, 0, 0.18, 0, 0.78);
      l.box('ceramic', L * 0.15, L * 0.85, 0.15, D, 0, 0.42);
      return;
    case 'shelf':
      l.box('woodLight', 0, L, 0, D, 0, 1.8);
      return;
    case 'bench':
      l.box('wood', 0, L, 0, D, 0.4, 0.46);
      l.box('wood', 0.1, 0.16, 0.04, D - 0.04, 0, 0.4);
      l.box('wood', L - 0.16, L - 0.1, 0.04, D - 0.04, 0, 0.4);
      return;
    case 'planter':
    case 'plant': {
      if (Math.max(L, D) > Math.min(L, D) * 1.6) {
        // jardinera larga: artesa con follaje corrido
        l.box('stone', 0, L, 0, D, 0, 0.42);
        l.box('plant', 0.04, L - 0.04, 0.04, D - 0.04, 0.42, 0.42 + Math.min(0.45, Math.min(L, D) * 1.4));
        return;
      }
      const r = Math.min(L, D) / 2;
      l.cyl('stone', L / 2, D / 2, r * 0.75, 0, 0.42);
      l.blob('plant', L / 2, D / 2, r * 1.05, 0.42 + r * 0.95, 1.25);
      return;
    }
    case 'lamp':
      l.cyl('metal', L / 2, D / 2, 0.015, 0, 1.3, 6);
      l.cyl('linen', L / 2, D / 2, Math.min(L, D) / 2, 1.3, 1.6);
      return;
    case 'rug':
      l.box('textile', 0, L, 0, D, 0.004, 0.018);
      return;
    case 'stairs': {
      const n = 12;
      for (let i = 0; i < n; i++) l.box('stone', 0, L, (i * D) / n, D, 0, ((i + 1) * 1.6) / n);
      return;
    }
    case 'elevator':
      l.box('stone', 0, L, 0, D - 0.04, 0, 2.3);
      l.box('metal', L * 0.2, L * 0.8, D - 0.04, D, 0, 2.1);
      return;
    case 'booth':
      l.box('glass', 0, L, 0, D, 0, 2.1);
      l.box('fabric', 0.05, L - 0.05, 0.05, 0.45, 0, 0.45);
      l.box('wood', 0.1, L - 0.1, D * 0.55, D - 0.1, 0.72, 0.76);
      return;
    default:
      l.box('fabric', 0, L, 0, D, 0, 0.6);
  }
}

/** Qué lados pueden ser el respaldo de cada mueble (cama: lado corto; sofá: lado largo). */
function candidates(item: string, f: PlanRect): PlanSide[] {
  const wide = f.width >= f.height; // el lado largo corre en x
  if (item === 'bed' || item === 'lounger') return wide ? ['w', 'e'] : ['n', 's'];
  if (item === 'sofa' || item === 'counter' || item === 'kitchen' || item === 'bar' || item === 'reception' || item === 'shelf' || item === 'wardrobe' || item === 'console' || item === 'sink')
    return wide ? ['n', 's'] : ['w', 'e'];
  return ['n', 's', 'w', 'e'];
}

/** Respaldo deducido: el lado candidato más cercano a una pared. */
export function inferBack(item: string, f: PlanRect, walls: PlanRect[]): PlanSide {
  let best: { side: PlanSide; dist: number } | null = null;
  for (const side of candidates(item, f)) {
    for (const w of walls) {
      let dist: number;
      if (side === 'n' || side === 's') {
        if (Math.min(f.x + f.width, w.x + w.width) - Math.max(f.x, w.x) <= 0) continue;
        dist = side === 'n' ? f.y - (w.y + w.height) : w.y - (f.y + f.height);
      } else {
        if (Math.min(f.y + f.height, w.y + w.height) - Math.max(f.y, w.y) <= 0) continue;
        dist = side === 'w' ? f.x - (w.x + w.width) : w.x - (f.x + f.width);
      }
      if (dist < -5) continue; // la pared está del otro lado
      if (!best || dist < best.dist) best = { side, dist };
    }
  }
  return best?.side ?? candidates(item, f)[0]!;
}

/**
 * Geometría de todos los muebles, agrupada por material.
 * `X`/`Z` pasan de cm del SVG a metros centrados; `maxH` recorta lo alto (planta en corte).
 */
export function furnitureGeometry(
  furniture: PlanFurniture[],
  walls: PlanRect[],
  X: (v: number) => number,
  Z: (v: number) => number,
  maxH: number,
): Map<FurnitureMaterial, THREE.BufferGeometry[]> {
  const parts: Part[] = [];
  for (const f of furniture) {
    const back = f.back ?? inferBack(f.item, f, walls);
    const inset = f.item === 'rug' ? 0 : 2;
    const l = local(X(f.x + inset), X(f.x + f.width - inset), Z(f.y + inset), Z(f.y + f.height - inset), back, maxH, parts);
    build(f.item, l);
  }
  const byMat = new Map<FurnitureMaterial, THREE.BufferGeometry[]>();
  for (const p of parts) {
    // las cajas vienen indexadas y las esferas no: todo sin índice para poder unirlas
    const g = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry;
    if (g !== p.geometry) p.geometry.dispose();
    const list = byMat.get(p.mat) ?? [];
    list.push(g);
    byMat.set(p.mat, list);
  }
  return byMat;
}
