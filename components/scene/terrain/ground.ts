import * as THREE from 'three';

import type { TerrainCabin } from './types';

/**
 * Relieve del páramo (D-083), calculado (sin archivos): un valle que sube hacia el norte
 * (z negativo), lomas suaves, cerros alrededor y una laguna. Bajo cada refugio el suelo se
 * aplana en una terraza. Todo determinista: el mismo terreno en cada visita.
 */

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, oct = 4) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Lake {
  x: number;
  z: number;
  rx: number;
  rz: number;
}

export interface TerrainModel {
  height: (x: number, z: number) => number;
  /** altura del piso de cada refugio (terraza aplanada) */
  padHeight: Record<string, number>;
  lake: Lake | null;
  water: number;
}

/** Relieve sin terrazas (base). */
function base(x: number, z: number) {
  const r = Math.hypot(x, z * 1.15);
  let h = -z * 0.075; // el valle sube hacia el norte
  h += 5.5 * (fbm(x / 70 + 3.1, z / 70 - 1.7) - 0.5);
  h += 1.2 * (fbm(x / 18, z / 18) - 0.5);
  // cerros alrededor del valle: suben fuera del terreno
  h += smooth(95, 260, r) * (38 + 70 * fbm(x / 120, z / 120));
  return h;
}

export function terrainModel(cabins: TerrainCabin[], lake: Lake | null): TerrainModel {
  const pads = cabins.map((c) => ({ id: c.id, x: c.x, z: c.z, h: base(c.x, c.z) }));
  const water = lake ? base(lake.x, lake.z) - 0.9 : 0;
  const height = (x: number, z: number) => {
    let h = base(x, z);
    for (const p of pads) {
      const d = Math.hypot(x - p.x, z - p.z);
      const w = 1 - smooth(7, 16, d);
      h += (p.h - h) * w;
    }
    if (lake) {
      const e = Math.hypot((x - lake.x) / lake.rx, (z - lake.z) / lake.rz);
      // cuenca: la orilla baja hasta el fondo
      const w = 1 - smooth(0.75, 1.35, e);
      h += (water - 1.2 - h) * w * 0.9;
    }
    return h;
  };
  const padHeight: Record<string, number> = {};
  for (const p of pads) padHeight[p.id] = height(p.x, p.z);
  return { height, padHeight, lake, water };
}

/** Malla del suelo con colores de páramo (ocre, verde oliva, gris de roca) por vértice. */
export function groundGeometry(model: TerrainModel, size = 640, seg = 220) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  // páramo: pajonal ocre apagado, verde oliva y musgo oscuro (no desierto)
  const ocre = new THREE.Color('#6f6844');
  const olivo = new THREE.Color('#566042');
  const musgo = new THREE.Color('#3d4a30');
  const roca = new THREE.Color('#6b6a63');
  const orilla = new THREE.Color('#38412b');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = model.height(x, z);
    pos.setY(i, h);
    const n = fbm(x / 22 + 7, z / 22);
    c.copy(ocre).lerp(olivo, smooth(0.3, 0.6, n));
    c.lerp(musgo, smooth(0.5, 0.8, fbm(x / 9, z / 9)) * 0.75);
    // pendiente fuerte y alto: roca
    const slope = Math.abs(model.height(x + 1, z) - h) + Math.abs(model.height(x, z + 1) - h);
    c.lerp(roca, smooth(0.6, 1.4, slope) * 0.7);
    if (model.lake) {
      const e = Math.hypot((x - model.lake.x) / model.lake.rx, (z - model.lake.z) / model.lake.rz);
      c.lerp(orilla, 1 - smooth(1.0, 1.6, e));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Sendero: cinta de tierra que sigue el relieve, de un punto a otro con una curva suave. */
export function pathGeometry(model: TerrainModel, pts: [number, number][], width = 1.3) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const n = Math.max(8, Math.round(curve.getLength() / 1.2));
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    const t = curve.getTangentAt(i / n);
    const nx = -t.z;
    const nz = t.x;
    // el borde se angosta un poco y ondula: no parece una cinta perfecta
    const w = (width / 2) * (0.85 + 0.3 * fbm(p.x / 4, p.z / 4));
    for (const s of [-1, 1]) {
      const x = p.x + nx * w * s;
      const z = p.z + nz * w * s;
      positions.push(x, model.height(x, z) + 0.05, z);
    }
    if (i < n) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Puntos para la vegetación, lejos de refugios, senderos, laguna y recepción. */
export function scatter(
  count: number,
  radius: number,
  seed: number,
  keep: (x: number, z: number, r: number) => boolean,
): { x: number; z: number; s: number; r: number }[] {
  const out: { x: number; z: number; s: number; r: number }[] = [];
  let i = 0;
  let tries = 0;
  while (out.length < count && tries < count * 20) {
    tries++;
    const a = hash(seed + i, 1.3) * Math.PI * 2;
    const d = Math.sqrt(hash(seed + i, 7.9)) * radius;
    const s = hash(seed + i, 3.7);
    const r = hash(seed + i, 5.1);
    i++;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (keep(x, z, r)) out.push({ x, z, s, r });
  }
  return out;
}

/** Distancia de un punto a una polilínea (para dejar libres los senderos). */
export function distToPath(x: number, z: number, pts: [number, number][]) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i]!;
    const [bx, bz] = pts[i + 1]!;
    const vx = bx - ax;
    const vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}
