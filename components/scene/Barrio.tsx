'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { BuildingFrame } from '@/lib/building';

import { VIEW_ONLY_LAYER } from './Backdrop';
import { mergeBoxes, type Box } from './geometry';
import { muteNeighbor, neighborFacadeTexture, neighborLitTexture, paved } from './textures';
import type { LightUniforms } from './windows';

/**
 * Barrio inventado alrededor del hotel (pedido de Jacobo, 2026-11-16: "el fondo no parece un
 * lugar real, se ve como un decorado"). Antes había solo dos calles y edificios sueltos sobre
 * tierra. Ahora es una cuadrícula de calles con andenes, como un barrio de Bogotá:
 *
 * - cada manzana tiene su andén alrededor y edificios pegados uno al otro a lo largo del borde,
 *   con alturas y colores variados (ladrillos de varios tonos, estucos claros) y alguna torre
 *   más alta lejos del hotel;
 * - un par de manzanas son parques con árboles;
 * - todo va unido en pocas mallas (un dibujo por material) y solo lo cercano hace sombra.
 *
 * Lo que queda en el corredor de vista de una fachada (D-055) va en la capa VIEW_ONLY: no tapa
 * la cámara, pero aparece en la vista desde la ventana.
 */

export const STREET = 9;
export const SIDEWALK = 3.2;
const RINGS = 4;

export interface TreeSpot {
  x: number;
  z: number;
  s: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paso de la cuadrícula: manzanas de ~70 m, o más si el hotel es grande. */
export function gridOf(frame: BuildingFrame) {
  const [cx, cz] = frame.center;
  const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
  const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
  const pitch = Math.max(72, Math.max(frame.width, frame.depth) + 44);
  return { frontStreet, sideStreet, pitch };
}

interface Lot extends Box {
  tint: THREE.Color;
  kind: 'ladrillo' | 'estuco';
  near: boolean;
  viewOnly: boolean;
}

// tonos que multiplican la textura (que ya trae su color): variaciones suaves, no un rojo encima de otro
const LADRILLO = ['#ffffff', '#f1e3d9', '#e6d0c2', '#d8c3b6', '#f4ebe2'];
const ESTUCO = ['#ffffff', '#f3eee4', '#e8e1d2', '#f2e7d6', '#dfe3e3', '#f6f0e6'];

export function useBarrio(frame: BuildingFrame, inCorridor: (x: number, z: number, pad: number) => boolean) {
  return useMemo(() => {
    const rand = mulberry32(42);
    const [cx, cz] = frame.center;
    const { frontStreet, sideStreet, pitch } = gridOf(frame);
    const lots: Lot[] = [];
    const sidewalks: Box[] = [];
    const yards: Box[] = [];
    const parks: Box[] = [];
    const parkTrees: TreeSpot[] = [];
    const marks: Box[] = [];
    const color = (hexes: string[]) => {
      const c = new THREE.Color(hexes[Math.floor(rand() * hexes.length)]!);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + (rand() - 0.5) * 0.06, 0, 1));
    };
    // dos parques fijos, lejos del corredor de la fachada principal
    const parkAt = new Set(['-2,1', '2,-2']);

    for (let i = -RINGS; i < RINGS; i++) {
      for (let j = -RINGS; j < RINGS; j++) {
        // la manzana (i, j) va entre las calles x_i..x_{i+1} y z_j..z_{j+1}; la del hotel es (−1, −1)
        const x0 = sideStreet + i * pitch + STREET / 2;
        const x1 = sideStreet + (i + 1) * pitch - STREET / 2;
        const z0 = frontStreet + j * pitch + STREET / 2;
        const z1 = frontStreet + (j + 1) * pitch - STREET / 2;
        const mx = (x0 + x1) / 2;
        const mz = (z0 + z1) / 2;
        const W = x1 - x0;
        const D = z1 - z0;
        const ring = Math.max(Math.abs(i + 0.5), Math.abs(j + 0.5)) - 0.5;
        const hotel = i === -1 && j === -1;
        // andén alrededor de la manzana
        sidewalks.push(
          { x: mx, y: 0.08, z: z0 + SIDEWALK / 2, w: W, h: 0.16, d: SIDEWALK, rotY: 0 },
          { x: mx, y: 0.08, z: z1 - SIDEWALK / 2, w: W, h: 0.16, d: SIDEWALK, rotY: 0 },
          { x: x0 + SIDEWALK / 2, y: 0.08, z: mz, w: SIDEWALK, h: 0.16, d: D - SIDEWALK * 2, rotY: 0 },
          { x: x1 - SIDEWALK / 2, y: 0.08, z: mz, w: SIDEWALK, h: 0.16, d: D - SIDEWALK * 2, rotY: 0 },
        );
        // demarcación de las calles (las de abajo y la izquierda de cada manzana)
        for (let t = x0; t < x1; t += 6) marks.push({ x: t + 1.5, y: 0.012, z: z0 - STREET / 2, w: 3, h: 0.01, d: 0.14, rotY: 0 });
        for (let t = z0; t < z1; t += 6) marks.push({ x: x0 - STREET / 2, y: 0.012, z: t + 1.5, w: 0.14, h: 0.01, d: 3, rotY: 0 });

        const ix0 = x0 + SIDEWALK;
        const ix1 = x1 - SIDEWALK;
        const iz0 = z0 + SIDEWALK;
        const iz1 = z1 - SIDEWALK;
        if (parkAt.has(`${i},${j}`) && !hotel) {
          parks.push({ x: mx, y: 0.06, z: mz, w: ix1 - ix0, h: 0.12, d: iz1 - iz0, rotY: 0 });
          for (let k = 0; k < 22; k++) {
            parkTrees.push({ x: ix0 + 3 + rand() * (ix1 - ix0 - 6), z: iz0 + 3 + rand() * (iz1 - iz0 - 6), s: 0.8 + rand() * 0.7 });
          }
          continue;
        }
        // el patio de la manzana (en la del hotel, apenas un piso de patio bajo, para no tapar su base)
        yards.push({ x: mx, y: hotel ? 0.01 : 0.04, z: mz, w: ix1 - ix0, h: hotel ? 0.02 : 0.08, d: iz1 - iz0, rotY: 0 });

        // edificios pegados a lo largo de los cuatro bordes de la manzana
        const sides: { a0: number; a1: number; along: 'x' | 'z'; edge: number; dir: 1 | -1 }[] = [
          { a0: ix0, a1: ix1, along: 'x', edge: iz0, dir: 1 },
          { a0: ix0, a1: ix1, along: 'x', edge: iz1, dir: -1 },
          { a0: iz0 + 15, a1: iz1 - 15, along: 'z', edge: ix0, dir: 1 },
          { a0: iz0 + 15, a1: iz1 - 15, along: 'z', edge: ix1, dir: -1 },
        ];
        for (const s of sides) {
          let a = s.a0;
          while (a < s.a1 - 6) {
            const w = Math.min(7 + rand() * 9, s.a1 - a);
            const deep = 10 + rand() * 5;
            const tower = ring >= 2 && rand() < 0.07;
            const floors = tower ? 12 + Math.floor(rand() * 9) : ring <= 1 ? 3 + Math.floor(rand() * 5) : 3 + Math.floor(rand() * 7);
            const h = floors * 2.9;
            const c = a + w / 2;
            const off = s.edge + (s.dir * deep) / 2;
            const x = s.along === 'x' ? c : off;
            const z = s.along === 'x' ? off : c;
            const bw = s.along === 'x' ? w - 0.2 : deep;
            const bd = s.along === 'x' ? deep : w - 0.2;
            a += w + (rand() < 0.12 ? 1.5 + rand() * 2 : 0);
            // el lote del hotel queda libre
            if (Math.abs(x - cx) < frame.width / 2 + bw / 2 + 5 && Math.abs(z - cz) < frame.depth / 2 + bd / 2 + 5) continue;
            const kind = tower ? 'estuco' : rand() < 0.58 ? 'ladrillo' : 'estuco';
            lots.push({
              x,
              y: h / 2,
              z,
              w: bw,
              h,
              d: bd,
              rotY: 0,
              kind,
              tint: color(kind === 'ladrillo' ? LADRILLO : ESTUCO),
              near: ring <= 1,
              viewOnly: inCorridor(x, z, Math.max(bw, bd) / 2),
            });
          }
        }
      }
    }
    // la calzada: un solo plano oscuro bajo toda la cuadrícula
    const span = pitch * RINGS * 2 + STREET;
    const center: [number, number] = [sideStreet + 0, frontStreet + 0];
    return { lots, sidewalks, yards, parks, parkTrees, marks, span, center };
  }, [frame, inCorridor]);
}

/** Cajas con un color por caja (multiplica la textura de fachada). */
function mergeTinted(lots: Lot[]) {
  if (!lots.length) return null;
  const parts = lots.map((b) => {
    const g = mergeBoxes([b], 6, 0, 2.9)!;
    const n = g.attributes.position!.count;
    const col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.set([b.tint.r, b.tint.g, b.tint.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function BarrioMeshes({
  barrio,
  shadows,
  light,
}: {
  barrio: ReturnType<typeof useBarrio>;
  shadows: boolean;
  light: LightUniforms;
}) {
  const mats = useMemo(() => {
    const make = (kind: 'ladrillo' | 'estuco', seed: number) =>
      muteNeighbor(
        new THREE.MeshStandardMaterial({
          // la textura gris (ventanas y juntas) por el color de cada edificio
          map: neighborFacadeTexture(kind, kind === 'ladrillo' ? 3 : 9),
          emissiveMap: neighborLitTexture(seed),
          emissive: new THREE.Color('#ffffff'),
          emissiveIntensity: 0,
          vertexColors: true,
          roughness: 0.92,
        }),
      );
    return {
      ladrillo: make('ladrillo', 21),
      estuco: make('estuco', 37),
      roof: muteNeighbor(new THREE.MeshStandardMaterial({ color: '#8b867e', roughness: 0.95 })),
      asphalt: new THREE.MeshStandardMaterial({ color: '#46474a', roughness: 0.95 }),
      walk: paved(new THREE.MeshStandardMaterial({ color: '#8a8479', roughness: 0.92 }), 0.6),
      yard: new THREE.MeshStandardMaterial({ color: '#6b665c', roughness: 1 }),
      park: new THREE.MeshStandardMaterial({ color: '#5d6b44', roughness: 1 }),
      mark: new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.6 }),
    };
  }, []);
  useFrame(() => {
    const n = light.uNight.value;
    mats.ladrillo.emissiveIntensity = n * 1.4;
    mats.estuco.emissiveIntensity = n * 1.4;
  });

  const geos = useMemo(() => {
    const pick = (f: (l: Lot) => boolean) => ({
      ladrillo: mergeTinted(barrio.lots.filter((l) => l.kind === 'ladrillo' && f(l))),
      estuco: mergeTinted(barrio.lots.filter((l) => l.kind === 'estuco' && f(l))),
      roofs: mergeBoxes(
        barrio.lots.filter(f).map((l) => ({ x: l.x, y: l.h + 0.05, z: l.z, w: l.w + 0.1, h: 0.1, d: l.d + 0.1, rotY: 0 })),
        4,
      ),
    });
    return {
      near: pick((l) => l.near && !l.viewOnly),
      far: pick((l) => !l.near && !l.viewOnly),
      view: pick((l) => l.viewOnly),
      walks: mergeBoxes(barrio.sidewalks, 2),
      yards: mergeBoxes(barrio.yards, 4),
      parks: mergeBoxes(barrio.parks, 4),
      marks: mergeBoxes(barrio.marks),
    };
  }, [barrio]);

  const blocks = (g: (typeof geos)['near'], cast: boolean, layer?: number) => (
    <group ref={layer !== undefined ? (o) => o?.traverse((c) => c.layers.set(layer)) : undefined}>
      {g.ladrillo ? <mesh geometry={g.ladrillo} material={mats.ladrillo} castShadow={cast} receiveShadow={cast} /> : null}
      {g.estuco ? <mesh geometry={g.estuco} material={mats.estuco} castShadow={cast} receiveShadow={cast} /> : null}
      {g.roofs ? <mesh geometry={g.roofs} material={mats.roof} receiveShadow={cast} /> : null}
    </group>
  );

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[barrio.center[0], 0.004, barrio.center[1]]}
        receiveShadow={shadows}
        material={mats.asphalt}
      >
        <planeGeometry args={[barrio.span, barrio.span]} />
      </mesh>
      {geos.walks ? <mesh geometry={geos.walks} material={mats.walk} receiveShadow={shadows} /> : null}
      {geos.yards ? <mesh geometry={geos.yards} material={mats.yard} receiveShadow={shadows} /> : null}
      {geos.parks ? <mesh geometry={geos.parks} material={mats.park} receiveShadow={shadows} /> : null}
      {geos.marks ? <mesh geometry={geos.marks} material={mats.mark} /> : null}
      {blocks(geos.near, shadows)}
      {blocks(geos.far, false)}
      {blocks(geos.view, false, VIEW_ONLY_LAYER)}
    </group>
  );
}

/** Cerros orientales por capas: los lejanos más claros y azulados (perspectiva aérea). */
export function Cerros({ frame }: { frame: BuildingFrame }) {
  const layers = useMemo(() => {
    const make = (seed: number, height: number, depth: number, base: string, top: string) => {
      const g = new THREE.PlaneGeometry(1100, 200, 110, 20);
      const pos = g.attributes.position!;
      const col = new Float32Array(pos.count * 3);
      const cBase = new THREE.Color(base);
      const cTop = new THREE.Color(top);
      const c = new THREE.Color();
      const rand = mulberry32(seed);
      const ph = [rand() * 10, rand() * 10, rand() * 10];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = (y + 100) / 200;
        const crest = height + Math.sin(x / 73 + ph[0]!) * height * 0.28 + Math.sin(x / 29 + ph[1]!) * height * 0.11 + Math.sin(x / 9.1 + ph[2]!) * 2.2;
        pos.setY(i, t * crest);
        pos.setZ(i, -t * depth);
        // manchas de monte: más oscuro en las cañadas, más claro arriba
        const patch = Math.sin(x / 17 + ph[0]!) * Math.sin(t * 9 + x / 40) * 0.5 + 0.5;
        c.copy(cBase).lerp(cTop, t * 0.7 + patch * 0.15);
        col.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };
    return [
      { geo: make(3, 74, 46, '#3f5236', '#6f7d58'), z: -270 },
      { geo: make(9, 118, 60, '#5d6f63', '#8e9a8d'), z: -420 },
      { geo: make(17, 150, 70, '#8292a0', '#a9b5bf'), z: -560 },
    ];
  }, []);
  return (
    <group>
      {layers.map((l, k) => (
        <mesh key={k} geometry={l.geo} position={[frame.center[0], -1, frame.center[1] + l.z]}>
          <meshStandardMaterial vertexColors roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
