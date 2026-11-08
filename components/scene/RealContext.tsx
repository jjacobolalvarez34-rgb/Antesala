'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { BuildingFrame, Facade } from '@/lib/building';

import { VIEW_ONLY_LAYER } from './Backdrop';
import { neighborFacadeTexture, neighborLitTexture } from './textures';
import type { LightUniforms } from './windows';

/**
 * Contexto real (D-056): las construcciones vecinas del catastro con sus pisos
 * y las calles de OpenStreetMap, cargados aparte (context.json) para no pesar en
 * la página. Reemplaza los vecinos y calles inventados del contexto genérico.
 */
export interface RealContextData {
  source: string;
  blocks: { floors: number; footprint: [number, number][]; sameLot?: boolean }[];
  streets: { name?: string; width: number; points: [number, number][] }[];
}

export type Spot = { x: number; z: number; s: number };
export type LampSpot = { x: number; z: number; rot: number };

const FLOOR = 2.7;

export function useRealContext(url: string | undefined) {
  const [data, setData] = useState<RealContextData | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setData(j as RealContextData))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  return data;
}

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

function pointInPoly(x: number, z: number, pts: [number, number][]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i]!;
    const [xj, zj] = pts[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Prisma con muros (UV en metros: 6 m de ancho y un piso de alto por repetición) y techo. */
function prism(pts: [number, number][], h: number) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  let u = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i]!;
    const [x1, z1] = pts[(i + 1) % pts.length]!;
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) continue;
    let nx = (z1 - z0) / len;
    let nz = -(x1 - x0) / len;
    // normal hacia afuera: se prueba un punto apenas del lado de la normal
    const mx = (x0 + x1) / 2 + nx * 0.05;
    const mz = (z0 + z1) / 2 + nz * 0.05;
    if (pointInPoly(mx, mz, pts)) [nx, nz] = [-nx, -nz];
    const u0 = u / 6;
    const u1 = (u + len) / 6;
    const v1 = h / FLOOR;
    const quad = [
      [x0, 0, z0, u0, 0],
      [x1, 0, z1, u1, 0],
      [x1, h, z1, u1, v1],
      [x0, 0, z0, u0, 0],
      [x1, h, z1, u1, v1],
      [x0, h, z0, u0, v1],
    ];
    // orden de vértices según la normal (caras hacia afuera)
    const flip = nx * (z1 - z0) - nz * (x1 - x0) < 0;
    const order = flip ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5];
    for (const k of order) {
      const [x, y, z, a, b] = quad[k]!;
      pos.push(x!, y!, z!);
      nor.push(nx, 0, nz);
      uv.push(a!, b!);
    }
    u += len;
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  walls.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  walls.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const roof = new THREE.ShapeGeometry(shape);
  roof.rotateX(-Math.PI / 2);
  roof.translate(0, h + 0.03, 0);
  roof.deleteAttribute('uv');
  return { walls, roof: roof.toNonIndexed() };
}

/** Bandas planas a lo largo de cada calle. */
function ribbons(streets: RealContextData['streets'], extra: number, y: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (const s of streets) {
    const w = s.width / 2 + extra;
    const pos: number[] = [];
    for (let i = 0; i < s.points.length - 1; i++) {
      const [x0, z0] = s.points[i]!;
      const [x1, z1] = s.points[i + 1]!;
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 0.01) continue;
      const px = (-(z1 - z0) / len) * w;
      const pz = ((x1 - x0) / len) * w;
      const a = [x0 + px, y, z0 + pz];
      const b = [x0 - px, y, z0 - pz];
      const c = [x1 - px, y, z1 - pz];
      const d = [x1 + px, y, z1 + pz];
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    if (!pos.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    parts.push(g);
  }
  if (!parts.length) return null;
  const m = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return m;
}

/** Árboles y postes a lo largo de las calles, sin caer dentro de construcciones. */
export function streetSpots(data: RealContextData, footprint: [number, number][]) {
  const blocked = (x: number, z: number) =>
    pointInPoly(x, z, footprint) || data.blocks.some((b) => pointInPoly(x, z, b.footprint));
  const trees: Spot[] = [];
  const lamps: LampSpot[] = [];
  data.streets.forEach((s, si) => {
    if (s.width < 6) return;
    let acc = 0;
    for (let i = 0; i < s.points.length - 1; i++) {
      const [x0, z0] = s.points[i]!;
      const [x1, z1] = s.points[i + 1]!;
      const len = Math.hypot(x1 - x0, z1 - z0);
      const nx = -(z1 - z0) / len;
      const nz = (x1 - x0) / len;
      for (let t = (14 - (acc % 14)) % 14; t < len; t += 14) {
        const x = x0 + ((x1 - x0) * t) / len;
        const z = z0 + ((z1 - z0) * t) / len;
        const k = si * 1000 + i * 37 + t;
        const side = hash(k) < 0.5 ? 1 : -1;
        const off = s.width / 2 + 1.4;
        const tx = x + nx * off * side;
        const tz = z + nz * off * side;
        if (hash(k + 3) < 0.7 && !blocked(tx, tz)) trees.push({ x: tx, z: tz, s: 0.75 + hash(k + 7) * 0.5 });
        if (Math.round(t / 14) % 2 === 0) {
          const lx = x - nx * (s.width / 2 + 0.6) * side;
          const lz = z - nz * (s.width / 2 + 0.6) * side;
          if (!blocked(lx, lz)) lamps.push({ x: lx, z: lz, rot: Math.atan2(nx * side, nz * side) });
        }
      }
      acc += len;
    }
  });
  return { trees, lamps };
}

export function RealNeighbors({
  data,
  frame,
  inCorridor,
  shadows,
  light,
}: {
  data: RealContextData;
  frame: BuildingFrame;
  facades: Facade[];
  inCorridor: (x: number, z: number, pad: number) => boolean;
  shadows: boolean;
  light: LightUniforms;
}) {
  const mats = useMemo(() => {
    const make = (kind: 'ladrillo' | 'estuco', seed: number) => {
      const map = neighborFacadeTexture(kind, kind === 'ladrillo' ? 3 : 9);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      const lit = neighborLitTexture(seed);
      lit.wrapS = lit.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map, emissiveMap: lit, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.92 });
    };
    return {
      ladrillo: make('ladrillo', 21),
      estuco: make('estuco', 37),
      roof: new THREE.MeshStandardMaterial({ color: '#8f8a82', roughness: 0.95 }),
      road: new THREE.MeshStandardMaterial({ color: '#56585b', roughness: 0.95 }),
      walk: new THREE.MeshStandardMaterial({ color: '#b9b5ad', roughness: 1 }),
    };
  }, []);
  useFrame(() => {
    const n = light.uNight.value;
    mats.ladrillo.emissiveIntensity = n * 1.4;
    mats.estuco.emissiveIntensity = n * 1.4;
  });

  const geos = useMemo(() => {
    const groups = { main: { ladrillo: [] as THREE.BufferGeometry[], estuco: [] as THREE.BufferGeometry[], roof: [] as THREE.BufferGeometry[] }, view: { ladrillo: [] as THREE.BufferGeometry[], estuco: [] as THREE.BufferGeometry[], roof: [] as THREE.BufferGeometry[] } };
    data.blocks.forEach((b, i) => {
      const xs = b.footprint.map((p) => p[0]);
      const zs = b.footprint.map((p) => p[1]);
      const cx = xs.reduce((s, v) => s + v, 0) / xs.length;
      const cz = zs.reduce((s, v) => s + v, 0) / zs.length;
      const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
      // Suba es sobre todo ladrillo; la otra torre del conjunto, igual que el edificio
      const kind = b.sameLot || hash(i) < 0.7 ? 'ladrillo' : 'estuco';
      const { walls, roof } = prism(b.footprint, Math.max(1, b.floors) * FLOOR);
      const g = inCorridor(cx, cz, r) ? groups.view : groups.main;
      g[kind].push(walls);
      g.roof.push(roof);
    });
    const merge = (list: THREE.BufferGeometry[]) => {
      if (!list.length) return null;
      const m = mergeGeometries(list, false);
      list.forEach((x) => x.dispose());
      return m;
    };
    return {
      main: { ladrillo: merge(groups.main.ladrillo), estuco: merge(groups.main.estuco), roof: merge(groups.main.roof) },
      view: { ladrillo: merge(groups.view.ladrillo), estuco: merge(groups.view.estuco), roof: merge(groups.view.roof) },
      walk: ribbons(data.streets, 2.6, 0.06),
      road: ribbons(data.streets, 0, 0.09),
    };
  }, [data, inCorridor]);

  useEffect(
    () => () => {
      for (const g of [geos.main, geos.view]) Object.values(g).forEach((x) => x?.dispose());
      geos.walk?.dispose();
      geos.road?.dispose();
    },
    [geos],
  );

  const viewLayer = (o: THREE.Object3D | null) => o?.traverse((c) => c.layers.set(VIEW_ONLY_LAYER));
  void frame;
  return (
    <group>
      {geos.walk ? <mesh geometry={geos.walk} material={mats.walk} receiveShadow={shadows} /> : null}
      {geos.road ? <mesh geometry={geos.road} material={mats.road} receiveShadow={shadows} /> : null}
      {geos.main.ladrillo ? <mesh geometry={geos.main.ladrillo} material={mats.ladrillo} castShadow={shadows} receiveShadow={shadows} /> : null}
      {geos.main.estuco ? <mesh geometry={geos.main.estuco} material={mats.estuco} castShadow={shadows} receiveShadow={shadows} /> : null}
      {geos.main.roof ? <mesh geometry={geos.main.roof} material={mats.roof} receiveShadow={shadows} /> : null}
      <group ref={viewLayer}>
        {geos.view.ladrillo ? <mesh geometry={geos.view.ladrillo} material={mats.ladrillo} /> : null}
        {geos.view.estuco ? <mesh geometry={geos.view.estuco} material={mats.estuco} /> : null}
        {geos.view.roof ? <mesh geometry={geos.view.roof} material={mats.roof} /> : null}
      </group>
    </group>
  );
}
