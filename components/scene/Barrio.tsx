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
 * lugar real, se ve como un decorado"; D-091). Es una cuadrícula de calles con andenes, como un
 * barrio de Bogotá. Desde el 2026-11-21 (D-094) la calle tiene medidas y detalles reales, y el
 * hotel sigue siendo el protagonista:
 *
 * - calzada de 10 m (dos carriles de 3,5 m y uno de parqueo) con línea central amarilla y cebras
 *   en los cruces cercanos; andén de 4,5 m con sardinel claro, franja verde de 1,2 m (árboles y
 *   postes) y zona peatonal en loseta;
 * - manzanas con edificios pegados a lo largo del borde, con alturas y colores variados, locales
 *   en el primer piso (vitrina oscura y algún toldo) y antepecho arriba; ninguno pasa del 80 % de
 *   la altura del hotel, para que no le compita;
 * - frente a la fachada (el corredor de vista, D-055) los edificios altos solo aparecen en la vista
 *   desde la ventana, pero la cámara ve locales de 1 o 2 pisos: antes quedaba un lote vacío;
 * - carros estacionados en las calles cercanas, árboles en las calles de la manzana del hotel y un
 *   par de parques;
 * - todo va unido en pocas mallas (un dibujo por material), apagado (muteNeighbor), y solo lo
 *   cercano hace sombra.
 */

/** calzada (m): dos carriles de 3,5 y uno de parqueo, como una vía local de Bogotá */
export const STREET = 10;
/** andén (m): sardinel, franja verde de 1,2 m y zona peatonal */
export const SIDEWALK = 4.5;
const CURB = 0.22;
const GREEN = 1.2;
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

/** Paso de la cuadrícula: manzanas de ~75 m, o más si el hotel es grande. */
export function gridOf(frame: BuildingFrame) {
  const [cx, cz] = frame.center;
  const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
  const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
  const pitch = Math.max(76, Math.max(frame.width, frame.depth) + 48);
  return { frontStreet, sideStreet, pitch };
}

interface Lot extends Box {
  tint: THREE.Color;
  kind: 'ladrillo' | 'estuco';
  near: boolean;
  viewOnly: boolean;
}

interface Tinted extends Box {
  tint: THREE.Color;
}

// tonos que multiplican la textura (que ya trae su color): variaciones suaves, no un rojo encima de otro
const LADRILLO = ['#ffffff', '#f1e3d9', '#e6d0c2', '#d8c3b6', '#f4ebe2'];
const ESTUCO = ['#ffffff', '#f3eee4', '#e8e1d2', '#f2e7d6', '#dfe3e3', '#f6f0e6'];
// toldos y carros en tonos apagados (el color fuerte es del hotel)
const TOLDO = ['#7b5a48', '#55625a', '#6c6c66', '#8a7358', '#4f5866'];
const CARRO = ['#c9c9c6', '#8f9294', '#3d4247', '#e6e4df', '#5b6470', '#7a6f63', '#2f3133'];

export function useBarrio(frame: BuildingFrame, inCorridor: (x: number, z: number, pad: number) => boolean) {
  return useMemo(() => {
    const rand = mulberry32(42);
    const [cx, cz] = frame.center;
    const { frontStreet, sideStreet, pitch } = gridOf(frame);
    // junto al hotel, ninguno pasa del 60 % de su altura; más allá, del 80 % (lejos, torres de
    // hasta 30 m si el hotel es bajo): que no le compitan
    const capHotel = Math.max(frame.height * 0.6, 9);
    const capNear = Math.max(frame.height * 0.8, 9);
    const capFar = Math.max(frame.height * 0.8, 30);
    const lots: Lot[] = [];
    const sidewalks: Box[] = [];
    const curbs: Box[] = [];
    const greens: Box[] = [];
    const yards: Box[] = [];
    const parks: Box[] = [];
    const parkTrees: TreeSpot[] = [];
    const streetTrees: TreeSpot[] = [];
    const marks: Box[] = [];
    const zebras: Box[] = [];
    const shops: Box[] = [];
    const lintels: Box[] = [];
    const awnings: Tinted[] = [];
    const cars: Tinted[] = [];
    const pick = (hexes: string[]) => new THREE.Color(hexes[Math.floor(rand() * hexes.length)]!);
    const color = (hexes: string[]) => {
      const c = pick(hexes);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + (rand() - 0.5) * 0.06, 0, 1));
    };
    // dos parques fijos, lejos del corredor de la fachada principal
    const parkAt = new Set(['-2,1', '2,-2']);
    // calles del hotel (al frente y al costado): ahí van los árboles de Context y la entrada
    const hotelStreet = (x: number, z: number) => Math.abs(z - frontStreet) < STREET / 2 + SIDEWALK + 0.5 || Math.abs(x - sideStreet) < STREET / 2 + SIDEWALK + 0.5;

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
        // andén alrededor de la manzana (loseta)
        sidewalks.push(
          { x: mx, y: 0.08, z: z0 + SIDEWALK / 2, w: W, h: 0.16, d: SIDEWALK, rotY: 0 },
          { x: mx, y: 0.08, z: z1 - SIDEWALK / 2, w: W, h: 0.16, d: SIDEWALK, rotY: 0 },
          { x: x0 + SIDEWALK / 2, y: 0.08, z: mz, w: SIDEWALK, h: 0.16, d: D - SIDEWALK * 2, rotY: 0 },
          { x: x1 - SIDEWALK / 2, y: 0.08, z: mz, w: SIDEWALK, h: 0.16, d: D - SIDEWALK * 2, rotY: 0 },
        );
        // sardinel claro en el borde de la calzada (un poco por encima del andén para que se lea)
        curbs.push(
          { x: mx, y: 0.085, z: z0 + CURB / 2, w: W, h: 0.17, d: CURB, rotY: 0 },
          { x: mx, y: 0.085, z: z1 - CURB / 2, w: W, h: 0.17, d: CURB, rotY: 0 },
          { x: x0 + CURB / 2, y: 0.085, z: mz, w: CURB, h: 0.17, d: D - CURB * 2, rotY: 0 },
          { x: x1 - CURB / 2, y: 0.085, z: mz, w: CURB, h: 0.17, d: D - CURB * 2, rotY: 0 },
        );
        if (ring <= 1) {
          // franja verde junto al sardinel (sin las esquinas, por donde se cruza)
          const g = CURB + GREEN / 2;
          const cut = SIDEWALK + 4;
          greens.push(
            { x: mx, y: 0.165, z: z0 + g, w: W - cut * 2, h: 0.02, d: GREEN, rotY: 0 },
            { x: mx, y: 0.165, z: z1 - g, w: W - cut * 2, h: 0.02, d: GREEN, rotY: 0 },
            { x: x0 + g, y: 0.165, z: mz, w: GREEN, h: 0.02, d: D - cut * 2, rotY: 0 },
            { x: x1 - g, y: 0.165, z: mz, w: GREEN, h: 0.02, d: D - cut * 2, rotY: 0 },
          );
        }
        if (ring === 0 && !hotel) {
          // árboles en la franja verde de las calles de las manzanas vecinas del hotel
          const g = CURB + GREEN / 2;
          for (let t = x0 + SIDEWALK + 6; t < x1 - SIDEWALK - 4; t += 9.5) {
            for (const z of [z0 + g, z1 - g]) if (!hotelStreet(t, z)) streetTrees.push({ x: t + (rand() - 0.5) * 1.2, z, s: 0.8 + rand() * 0.45 });
          }
          for (let t = z0 + SIDEWALK + 6; t < z1 - SIDEWALK - 4; t += 9.5) {
            for (const x of [x0 + g, x1 - g]) if (!hotelStreet(x, t)) streetTrees.push({ x, z: t + (rand() - 0.5) * 1.2, s: 0.8 + rand() * 0.45 });
          }
        }
        // línea central amarilla discontinua (las calles de abajo y la izquierda de cada manzana)
        // (desde 6 m del cruce: ahí van las cebras)
        for (let t = x0 + 6; t < x1 - 6; t += 6) marks.push({ x: t + 1.5, y: 0.012, z: z0 - STREET / 2, w: 3, h: 0.01, d: 0.12, rotY: 0 });
        for (let t = z0 + 6; t < z1 - 6; t += 6) marks.push({ x: x0 - STREET / 2, y: 0.012, z: t + 1.5, w: 0.12, h: 0.01, d: 3, rotY: 0 });
        // cebras en los cruces cercanos: franjas de 0,5 m paralelas al tráfico, a todo lo ancho
        if (ring <= 1) {
          for (let k = -STREET / 2 + 0.6; k < STREET / 2 - 0.4; k += 1) {
            zebras.push({ x: x0 + 2, y: 0.013, z: z0 - STREET / 2 + k, w: 3, h: 0.01, d: 0.5, rotY: 0 });
            zebras.push({ x: x0 - STREET / 2 + k, y: 0.013, z: z0 + 2, w: 0.5, h: 0.01, d: 3, rotY: 0 });
          }
        }
        // carros estacionados en el carril de parqueo, del lado de la manzana, en las calles de abajo
        // y de la izquierda de cada manzana cercana; frente a la entrada del hotel, ninguno
        if (ring <= 1) {
          const lane = z0 - 1.4;
          for (let t = x0 + 14; t < x1 - 12; t += 6.2) {
            if (rand() < 0.35) continue;
            if (Math.abs(lane - frontStreet) < STREET && Math.abs(t - cx) < frame.width / 2 + 6) continue;
            const c = pick(CARRO);
            cars.push({ x: t, y: 0.42, z: lane, w: 4.3, h: 0.7, d: 1.78, rotY: 0, tint: c });
            cars.push({ x: t - 0.25, y: 1.02, z: lane, w: 2.3, h: 0.52, d: 1.6, rotY: 0, tint: c.clone().multiplyScalar(0.55) });
          }
          const laneX = x0 - 1.4;
          for (let t = z0 + 14; t < z1 - 12; t += 6.2) {
            if (rand() < 0.35) continue;
            if (Math.abs(laneX - sideStreet) < STREET && Math.abs(t - cz) < frame.depth / 2 + 6) continue;
            const c = pick(CARRO);
            cars.push({ x: laneX, y: 0.42, z: t, w: 1.78, h: 0.7, d: 4.3, rotY: 0, tint: c });
            cars.push({ x: laneX, y: 1.02, z: t - 0.25, w: 1.6, h: 0.52, d: 2.3, rotY: 0, tint: c.clone().multiplyScalar(0.55) });
          }
        }

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
            let floors = tower ? 12 + Math.floor(rand() * 9) : ring <= 1 ? 3 + Math.floor(rand() * 5) : 3 + Math.floor(rand() * 7);
            floors = Math.max(2, Math.min(floors, Math.floor((ring === 0 ? capHotel : ring <= 1 ? capNear : capFar) / 2.9)));
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
            const tint = color(kind === 'ladrillo' ? LADRILLO : ESTUCO);
            const viewOnly = inCorridor(x, z, Math.max(bw, bd) / 2);
            lots.push({ x, y: h / 2, z, w: bw, h, d: bd, rotY: 0, kind, tint, near: ring <= 1, viewOnly });
            if (viewOnly) {
              // la cámara ve locales de 1 o 2 pisos (no tapan la fachada); el edificio alto sigue en
              // la vista desde la ventana. Un poco más angosto, para que no se pisen las caras.
              const hl = (rand() < 0.5 ? 1 : 2) * 3.2;
              lots.push({ x, y: hl / 2, z, w: bw - 0.3, h: hl, d: bd - 0.3, rotY: 0, kind, tint, near: ring <= 1, viewOnly: false });
            }
            if (ring <= 1) {
              // local en el primer piso, del lado de la calle: vitrina oscura, dintel y a veces toldo
              const face = s.edge - s.dir * 0.04;
              const len = w - 1.2;
              const sx = s.along === 'x' ? len : 0.08;
              const sz = s.along === 'x' ? 0.08 : len;
              const fx = s.along === 'x' ? c : face;
              const fz = s.along === 'x' ? face : c;
              shops.push({ x: fx, y: 1.45, z: fz, w: sx, h: 2.5, d: sz, rotY: 0 });
              lintels.push({ x: fx, y: 2.95, z: fz, w: s.along === 'x' ? w - 0.25 : 0.12, h: 0.35, d: s.along === 'x' ? 0.12 : w - 0.25, rotY: 0 });
              if (rand() < 0.35) {
                const ax = s.along === 'x' ? c : s.edge - s.dir * 0.55;
                const az = s.along === 'x' ? s.edge - s.dir * 0.55 : c;
                awnings.push({ x: ax, y: 2.62, z: az, w: s.along === 'x' ? len - 0.4 : 1.0, h: 0.08, d: s.along === 'x' ? 1.0 : len - 0.4, rotY: 0, tint: pick(TOLDO) });
              }
            }
          }
        }
      }
    }
    // la calzada: un solo plano oscuro bajo toda la cuadrícula
    const span = pitch * RINGS * 2 + STREET;
    const center: [number, number] = [sideStreet + 0, frontStreet + 0];
    return { lots, sidewalks, curbs, greens, yards, parks, parkTrees, streetTrees, marks, zebras, shops, lintels, awnings, cars, span, center };
  }, [frame, inCorridor]);
}

/** Cajas con un color por caja (con `tile` multiplica la textura de fachada). */
function mergeTinted(boxes: Tinted[], tile = 6, tileV = 2.9) {
  if (!boxes.length) return null;
  const parts = boxes.map((b) => {
    const g = mergeBoxes([b], tile, 0, tileV)!;
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
      roof: muteNeighbor(new THREE.MeshStandardMaterial({ color: '#77726a', roughness: 0.95 })),
      asphalt: paved(new THREE.MeshStandardMaterial({ color: '#45464a', roughness: 0.95 }), 0),
      walk: paved(new THREE.MeshStandardMaterial({ color: '#8a8479', roughness: 0.92 }), 0.6),
      curb: new THREE.MeshStandardMaterial({ color: '#b7b2a8', roughness: 0.9 }),
      green: new THREE.MeshStandardMaterial({ color: '#56653f', roughness: 1 }),
      yard: new THREE.MeshStandardMaterial({ color: '#6b665c', roughness: 1 }),
      park: new THREE.MeshStandardMaterial({ color: '#5d6b44', roughness: 1 }),
      mark: new THREE.MeshStandardMaterial({ color: '#cdb35a', roughness: 0.6 }),
      zebra: new THREE.MeshStandardMaterial({ color: '#e4e1da', roughness: 0.6 }),
      // vitrina: oscura de día, con algo de luz de local de noche
      shop: muteNeighbor(new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: 0.25, metalness: 0.1, emissive: new THREE.Color('#ffd7a0'), emissiveIntensity: 0 })),
      lintel: muteNeighbor(new THREE.MeshStandardMaterial({ color: '#bdb6ab', roughness: 0.9 })),
      tinted: muteNeighbor(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })),
    };
  }, []);
  useFrame(() => {
    const n = light.uNight.value;
    mats.ladrillo.emissiveIntensity = n * 1.4;
    mats.estuco.emissiveIntensity = n * 1.4;
    mats.shop.emissiveIntensity = n * 0.55;
  });

  const geos = useMemo(() => {
    const pick = (f: (l: Lot) => boolean) => ({
      ladrillo: mergeTinted(barrio.lots.filter((l) => l.kind === 'ladrillo' && f(l))),
      estuco: mergeTinted(barrio.lots.filter((l) => l.kind === 'estuco' && f(l))),
      // antepecho: un borde de 45 cm un poco más ancho que la fachada
      roofs: mergeBoxes(
        barrio.lots.filter(f).map((l) => ({ x: l.x, y: l.h + 0.22, z: l.z, w: l.w + 0.24, h: 0.45, d: l.d + 0.24, rotY: 0 })),
        4,
      ),
    });
    return {
      near: pick((l) => l.near && !l.viewOnly),
      far: pick((l) => !l.near && !l.viewOnly),
      view: pick((l) => l.viewOnly),
      walks: mergeBoxes(barrio.sidewalks, 2),
      curbs: mergeBoxes(barrio.curbs, 2),
      greens: mergeBoxes(barrio.greens, 4),
      yards: mergeBoxes(barrio.yards, 4),
      parks: mergeBoxes(barrio.parks, 4),
      marks: mergeBoxes(barrio.marks),
      zebras: mergeBoxes(barrio.zebras),
      shops: mergeBoxes(barrio.shops, 4),
      lintels: mergeBoxes(barrio.lintels, 4),
      // toldos y carros comparten material (color por vértice): un solo dibujo
      tinted: mergeTinted([...barrio.awnings, ...barrio.cars], 4, 4),
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
      {geos.curbs ? <mesh geometry={geos.curbs} material={mats.curb} receiveShadow={shadows} /> : null}
      {geos.greens ? <mesh geometry={geos.greens} material={mats.green} receiveShadow={shadows} /> : null}
      {geos.yards ? <mesh geometry={geos.yards} material={mats.yard} receiveShadow={shadows} /> : null}
      {geos.parks ? <mesh geometry={geos.parks} material={mats.park} receiveShadow={shadows} /> : null}
      {geos.marks ? <mesh geometry={geos.marks} material={mats.mark} /> : null}
      {geos.zebras ? <mesh geometry={geos.zebras} material={mats.zebra} /> : null}
      {geos.shops ? <mesh geometry={geos.shops} material={mats.shop} /> : null}
      {geos.lintels ? <mesh geometry={geos.lintels} material={mats.lintel} /> : null}
      {geos.tinted ? <mesh geometry={geos.tinted} material={mats.tinted} castShadow={shadows} /> : null}
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
