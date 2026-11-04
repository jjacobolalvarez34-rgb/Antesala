import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Cajas con UV en metros (para texturas a escala real) que se fusionan en una
 * sola geometría por material. Así el ladrillo no se estira y las hiladas
 * quedan alineadas entre piezas distintas.
 */

export interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
}

/** Caja alineada a un borde de fachada. */
export interface EdgeFrame {
  a: [number, number];
  dir: [number, number];
  normal: [number, number];
  length: number;
}

/** t = distancia a lo largo del borde; off = desplazamiento hacia afuera (+) o adentro (−). */
export function onEdge(e: EdgeFrame, t: number, off: number, y: number, w: number, h: number, d: number): Box {
  return {
    x: e.a[0] + e.dir[0] * t + e.normal[0] * off,
    y,
    z: e.a[1] + e.dir[1] * t + e.normal[1] * off,
    w,
    h,
    d,
    rotY: Math.atan2(-e.dir[1], e.dir[0]),
  };
}

/**
 * BoxGeometry con UV escaladas a metros / tile. yBase permite alinear
 * texturas entre pisos (altura absoluta de la pieza).
 */
function boxGeometry(b: Box, tileU: number, tileV: number, yBase: number) {
  const g = new THREE.BoxGeometry(b.w, b.h, b.d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // orden de caras en BoxGeometry: +x, −x, +y, −y, +z, −z (4 vértices cada una)
  const dims: [number, number][] = [
    [b.d, b.h],
    [b.d, b.h],
    [b.w, b.d],
    [b.w, b.d],
    [b.w, b.h],
    [b.w, b.h],
  ];
  const uOff = (b.x + b.z) / tileU;
  const vOff = (yBase + b.y - b.h / 2) / tileV;
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = dims[f]!;
    const vertical = f !== 2 && f !== 3;
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * fw) / tileU + uOff, (uv.getY(i) * fh) / tileV + (vertical ? vOff : 0));
    }
  }
  g.rotateY(b.rotY);
  g.translate(b.x, b.y, b.z);
  return g;
}

export function mergeBoxes(boxes: Box[], tile = 1, yBase = 0, tileV = tile): THREE.BufferGeometry | null {
  if (!boxes.length) return null;
  const parts = boxes.map((b) => boxGeometry(b, tile, tileV, yBase));
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export interface Quad {
  box: Box;
  /** celda del atlas 2 × 2 (0..3) */
  cell: number;
}

/** Planos (interiores) con UV a una celda del atlas 2 × 2, mirando hacia afuera. */
export function mergeQuads(quads: Quad[]): THREE.BufferGeometry | null {
  if (!quads.length) return null;
  const parts = quads.map(({ box, cell }) => {
    const g = new THREE.PlaneGeometry(box.w, box.h);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const cu = (cell % 2) * 0.5;
    const cv = 0.5 - Math.floor(cell / 2) * 0.5;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, cu + uv.getX(i) * 0.5, cv + uv.getY(i) * 0.5);
    g.rotateY(box.rotY);
    g.translate(box.x, box.y, box.z);
    return g;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}
