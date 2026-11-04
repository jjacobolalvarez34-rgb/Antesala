import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { PlanGeometry, PlanOpening, PlanRect } from '@/lib/types';

/**
 * Plano SVG (cm) → maqueta 3D (m), según CONTENIDO.md §4:
 * paredes de 2,6 m con vanos reales (puertas hasta 2,1 m; ventanas de 0,9 a
 * 2,2 m), un piso por espacio (para resaltarlo), vidrio en las ventanas y
 * muebles low-poly desde <g id="furniture">. Sin techo.
 * La maqueta queda centrada en el origen (x, z) y apoyada en y = 0.
 */

export const WALL_H = 2.6;
const DOOR_H = 2.1;
const SILL = 0.9;
const HEAD = 2.2;
const CM = 0.01;

export interface UnitMeshes {
  walls: THREE.BufferGeometry | null;
  glass: THREE.BufferGeometry | null;
  floors: { id: string; geometry: THREE.ShapeGeometry; center: [number, number] }[];
  furniture: { item: string; geometry: THREE.BufferGeometry }[];
  /** tamaño total en metros (ancho x, fondo z) */
  size: [number, number];
}

/** Alturas típicas de muebles low-poly (m). */
const FURNITURE_H: Record<string, number> = {
  bed: 0.5,
  nightstand: 0.55,
  wardrobe: 2.1,
  desk: 0.75,
  sofa: 0.8,
  armchair: 0.8,
  table: 0.75,
  counter: 0.9,
  island: 0.9,
  shower: 0.08,
  bathtub: 0.55,
  sink: 0.85,
  toilet: 0.45,
  console: 0.8,
  planter: 0.6,
};

function overlap1d(a0: number, a1: number, b0: number, b1: number) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/** Huecos que cortan una pared: los que se superponen con ella en planta. */
function openingsIn(wall: PlanRect, openings: PlanOpening[]) {
  return openings.filter(
    (o) =>
      overlap1d(wall.x, wall.x + wall.width, o.x, o.x + o.width) > 0.5 &&
      overlap1d(wall.y, wall.y + wall.height, o.y, o.y + o.height) > 0.5,
  );
}

function box(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

export function planToMesh(plan: PlanGeometry): UnitMeshes {
  const ox = (plan.width * CM) / 2;
  const oz = (plan.height * CM) / 2;
  // cm → m, centrado (x del SVG = x; y del SVG = z)
  const X = (v: number) => v * CM - ox;
  const Z = (v: number) => v * CM - oz;

  const wallParts: THREE.BufferGeometry[] = [];
  const glassParts: THREE.BufferGeometry[] = [];

  for (const w of plan.walls) {
    const horizontal = w.width >= w.height;
    const cuts = openingsIn(w, plan.openings).sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y));
    const start = horizontal ? w.x : w.y;
    const end = horizontal ? w.x + w.width : w.y + w.height;
    const segment = (s0: number, s1: number, y0: number, y1: number) => {
      if (s1 - s0 < 0.5 || y1 - y0 <= 0) return;
      wallParts.push(
        horizontal
          ? box(X(s0), X(s1), Z(w.y), Z(w.y + w.height), y0, y1)
          : box(X(w.x), X(w.x + w.width), Z(s0), Z(s1), y0, y1),
      );
    };
    let cursor = start;
    for (const o of cuts) {
      const o0 = Math.max(start, horizontal ? o.x : o.y);
      const o1 = Math.min(end, horizontal ? o.x + o.width : o.y + o.height);
      segment(cursor, o0, 0, WALL_H);
      if (o.type === 'door') {
        segment(o0, o1, DOOR_H, WALL_H);
      } else {
        segment(o0, o1, 0, SILL);
        segment(o0, o1, HEAD, WALL_H);
        const mid = horizontal ? w.y + w.height / 2 : w.x + w.width / 2;
        glassParts.push(
          horizontal
            ? box(X(o0), X(o1), Z(mid) - 0.01, Z(mid) + 0.01, SILL, HEAD)
            : box(X(mid) - 0.01, X(mid) + 0.01, Z(o0), Z(o1), SILL, HEAD),
        );
      }
      cursor = Math.max(cursor, o1);
    }
    segment(cursor, end, 0, WALL_H);
  }

  const floors = plan.spaces.map((s) => {
    const shape = new THREE.Shape(s.points.map(([x, y]) => new THREE.Vector2(X(x), -Z(y))));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    const cx = s.points.reduce((a, p) => a + p[0], 0) / s.points.length;
    const cy = s.points.reduce((a, p) => a + p[1], 0) / s.points.length;
    return { id: s.id, geometry, center: [X(cx), Z(cy)] as [number, number] };
  });

  const byItem = new Map<string, THREE.BufferGeometry[]>();
  for (const f of plan.furniture) {
    const h = FURNITURE_H[f.item] ?? 0.6;
    const inset = 3;
    const g = box(X(f.x + inset), X(f.x + f.width - inset), Z(f.y + inset), Z(f.y + f.height - inset), 0.02, h);
    const list = byItem.get(f.item) ?? [];
    list.push(g);
    byItem.set(f.item, list);
  }
  const furniture = [...byItem.entries()].map(([item, parts]) => {
    const geometry = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    return { item, geometry };
  });

  const walls = wallParts.length ? mergeGeometries(wallParts, false) : null;
  const glass = glassParts.length ? mergeGeometries(glassParts, false) : null;
  wallParts.forEach((p) => p.dispose());
  glassParts.forEach((p) => p.dispose());

  return { walls, glass, floors, furniture, size: [plan.width * CM, plan.height * CM] };
}
