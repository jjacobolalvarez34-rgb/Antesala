'use client';

import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FLOOR_PULL, type BuildingFrame } from '@/lib/building';
import type { Cladding as CladdingKind } from '@/lib/types';

import { mergeBoxes, mergeQuads, onEdge, type Box, type EdgeFrame, type Quad } from './geometry';
import { brickTexture, concreteTexture, interiorAtlas, stuccoTexture, type Cladding } from './textures';

/**
 * Edificio procedural con fachada realista (CONTENIDO.md §5, D-026):
 * revestimiento (ladrillo, pañete o concreto) en machones, antepechos y
 * dinteles; ventanas con marco de aluminio, vidrio retranqueado que refleja el
 * cielo e interiores tenues detrás; losas de concreto; locales vidriados en el
 * primer piso; retranqueo con terraza en el último; cubierta con pérgola.
 * Un grupo por piso; cada material se fusiona en una sola geometría por piso.
 */

export interface SceneFloor {
  id: string;
  order: number;
  name: string;
}

export interface BuildingColors {
  accent: string;
}

interface Props {
  footprint: [number, number][];
  frame: BuildingFrame;
  floors: SceneFloor[];
  cladding: CladdingKind;
  selectedId: string | null;
  hoveredId: string | null;
  /** dirección (x, z) hacia la que se separa el piso elegido */
  pullDir: [number, number];
  colors: BuildingColors;
  reduced: boolean;
  interactive: boolean;
  shadows: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

type Pt = [number, number];

const SLAB = 0.3;
const WALL = 0.22;
const BAY = 2.7;
const SILL = 0.9;
const WIN_H = 1.6;
const SETBACK = 2.6;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function edgesOf(pts: Pt[]): EdgeFrame[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const dir: Pt = [dx / length, dz / length];
    let normal: Pt = [dir[1], -dir[0]];
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (normal[0] * (mid[0] - cx) + normal[1] * (mid[1] - cz) < 0) normal = [-normal[0], -normal[1]];
    return { a, dir, normal, length };
  });
}

const frontIndex = (edges: EdgeFrame[]) =>
  edges.reduce((best, e, i) => (e.normal[1] > edges[best]!.normal[1] ? i : best), 0);

function scaled(pts: Pt[], grow: number): Pt[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, z]) => {
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz) || 1;
    return [x + (dx / d) * grow, z + (dz / d) * grow];
  });
}

function slabGeometry(pts: Pt[], thickness: number) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

interface FloorParts {
  clad: Box[];
  concrete: Box[];
  frame: Box[];
  glass: Box[];
  rail: Box[];
  green: Box[];
  interiors: Quad[];
}

const facing = (e: EdgeFrame) => Math.atan2(e.normal[0], e.normal[1]);

/** Ventana con marco, vidrio retranqueado, alféizar e interior detrás. */
function addWindow(
  p: FloorParts,
  e: EdgeFrame,
  t: number,
  y0: number,
  w: number,
  h: number,
  rand: () => number,
  sill = true,
) {
  const fr = 0.06;
  const recess = -0.13;
  p.frame.push(onEdge(e, t, recess, y0 + h - fr / 2, w, fr, 0.09));
  p.frame.push(onEdge(e, t, recess, y0 + fr / 2, w, fr, 0.09));
  p.frame.push(onEdge(e, t - w / 2 + fr / 2, recess, y0 + h / 2, fr, h, 0.09));
  p.frame.push(onEdge(e, t + w / 2 - fr / 2, recess, y0 + h / 2, fr, h, 0.09));
  if (w > 1.3) p.frame.push(onEdge(e, t, recess, y0 + h / 2, 0.05, h - fr * 2, 0.07));
  p.glass.push(onEdge(e, t, recess - 0.01, y0 + h / 2, w - fr, h - fr, 0.015));
  if (sill) p.concrete.push(onEdge(e, t, 0.02, y0 - 0.03, w + 0.12, 0.06, 0.16));
  const inside = onEdge(e, t, -1.7, y0 + h / 2, w + 1.4, h + 0.9, 0);
  p.interiors.push({ box: { ...inside, rotY: facing(e) }, cell: Math.floor(rand() * 4) });
}

function floorParts(footprint: Pt[], order: number, floors: number, floorH: number): FloorParts {
  const isGround = order === 1;
  const isTop = order === floors;
  const rand = mulberry32(order * 7919 + 13);
  const p: FloorParts = { clad: [], concrete: [], frame: [], glass: [], rail: [], green: [], interiors: [] };

  const baseEdges = edgesOf(footprint);
  const front = frontIndex(baseEdges);
  let pts = footprint;
  if (isTop) {
    const n = baseEdges[front]!.normal;
    pts = footprint.map((q, i) =>
      i === front || i === (front + 1) % footprint.length ? [q[0] - n[0] * SETBACK, q[1] - n[1] * SETBACK] : q,
    );
    const fe = baseEdges[front]!;
    // baranda de vidrio y materas en el borde de la terraza
    p.rail.push(onEdge(fe, fe.length / 2, 0.05, SLAB + 0.55, fe.length - 0.3, 1.1, 0.03));
    p.frame.push(onEdge(fe, fe.length / 2, 0.05, SLAB + 1.12, fe.length - 0.3, 0.05, 0.06));
    for (let t = 1.6; t < fe.length - 1; t += 3.2) {
      p.concrete.push(onEdge(fe, t, -0.5, SLAB + 0.25, 1.6, 0.5, 0.5));
      p.green.push(onEdge(fe, t, -0.5, SLAB + 0.75, 1.4, 0.55, 0.45));
    }
  }

  const ceil = floorH; // tope del muro = siguiente losa
  edgesOf(pts).forEach((e, ei) => {
    const isSetbackFacade = isTop && ei === front;
    const bays = Math.max(1, Math.round(e.length / BAY));
    const bw = e.length / bays;
    const wallOff = -WALL / 2;

    if (isGround) {
      // locales vidriados entre machones de concreto
      const glassTop = ceil - 0.7;
      for (let b = 0; b <= bays; b++) {
        p.concrete.push(onEdge(e, b * bw, wallOff + 0.04, (SLAB + ceil) / 2, 0.45, ceil - SLAB, WALL + 0.08));
      }
      p.clad.push(onEdge(e, e.length / 2, wallOff, (glassTop + ceil) / 2, e.length, ceil - glassTop, WALL));
      for (let b = 0; b < bays; b++) addWindow(p, e, (b + 0.5) * bw, SLAB, bw - 0.45, glassTop - SLAB, rand, false);
      if (ei === front) {
        p.concrete.push(onEdge(e, e.length / 2, 1.2, glassTop + 0.12, Math.min(7, e.length * 0.45), 0.16, 2.4));
      }
      return;
    }

    if (isSetbackFacade) {
      // fachada vidriada de piso a techo hacia la terraza
      for (let b = 0; b <= bays; b++) p.clad.push(onEdge(e, b * bw, wallOff, (SLAB + ceil) / 2, 0.3, ceil - SLAB, WALL));
      for (let b = 0; b < bays; b++) addWindow(p, e, (b + 0.5) * bw, SLAB + 0.05, bw - 0.3, ceil - SLAB - 0.35, rand, false);
      p.clad.push(onEdge(e, e.length / 2, wallOff, ceil - 0.15, e.length, 0.3, WALL));
      return;
    }

    const winW = Math.min(1.7, bw - 0.9);
    const winY = SLAB + SILL;
    const winTop = winY + WIN_H;
    for (let b = 0; b < bays; b++) {
      const t0 = b * bw;
      const tc = t0 + bw / 2;
      const pier = (bw - winW) / 2;
      // machones a cada lado de la ventana
      p.clad.push(onEdge(e, t0 + pier / 2, wallOff, (SLAB + ceil) / 2, pier, ceil - SLAB, WALL));
      p.clad.push(onEdge(e, t0 + bw - pier / 2, wallOff, (SLAB + ceil) / 2, pier, ceil - SLAB, WALL));
      // antepecho y dintel
      p.clad.push(onEdge(e, tc, wallOff, (SLAB + winY) / 2, winW, winY - SLAB, WALL));
      p.clad.push(onEdge(e, tc, wallOff, (winTop + ceil) / 2, winW, ceil - winTop, WALL));
      addWindow(p, e, tc, winY, winW, WIN_H, rand);
    }
  });
  return p;
}

function useMerged(boxes: Box[], tile: number, yBase: number) {
  const geo = useMemo(() => mergeBoxes(boxes, tile, yBase), [boxes, tile, yBase]);
  useEffect(() => () => geo?.dispose(), [geo]);
  return geo;
}

interface Materials {
  clad: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  slab: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  interior: THREE.MeshBasicMaterial;
  rail: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
}

interface SharedTextures {
  clad: Cladding;
  concrete: Cladding;
  interior: THREE.Texture;
}

function makeMaterials(tex: SharedTextures): Materials {
  return {
    clad: new THREE.MeshStandardMaterial({
      map: tex.clad.map,
      bumpMap: tex.clad.bump,
      bumpScale: tex.clad.bumpScale,
      roughness: tex.clad.roughness,
      transparent: true,
    }),
    concrete: new THREE.MeshStandardMaterial({
      map: tex.concrete.map,
      bumpMap: tex.concrete.bump,
      bumpScale: tex.concrete.bumpScale,
      roughness: tex.concrete.roughness,
      transparent: true,
    }),
    slab: new THREE.MeshStandardMaterial({ color: '#d4cfc6', roughness: 0.88, transparent: true }),
    frame: new THREE.MeshStandardMaterial({ color: '#2d3033', roughness: 0.45, metalness: 0.6, transparent: true }),
    glass: new THREE.MeshStandardMaterial({
      color: '#9fb4bd',
      roughness: 0.04,
      metalness: 0.85,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
    interior: new THREE.MeshBasicMaterial({ map: tex.interior, transparent: true, color: '#b9b0a4' }),
    rail: new THREE.MeshStandardMaterial({
      color: '#c9dad8',
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
    green: new THREE.MeshStandardMaterial({ color: '#5b7346', roughness: 0.95, transparent: true }),
  };
}

const BASE_OPACITY: Record<keyof Materials, number> = {
  clad: 1,
  concrete: 1,
  slab: 1,
  frame: 1,
  glass: 0.55,
  interior: 1,
  rail: 0.3,
  green: 1,
};

function Floor({
  floor,
  footprint,
  frame,
  tex,
  colors,
  state,
  pullDir,
  reduced,
  interactive,
  shadows,
  onHover,
  onSelect,
}: {
  floor: SceneFloor;
  footprint: Pt[];
  frame: BuildingFrame;
  tex: SharedTextures;
  colors: BuildingColors;
  state: 'idle' | 'hovered' | 'selected' | 'dimmed';
  pullDir: [number, number];
  reduced: boolean;
  interactive: boolean;
  shadows: boolean;
  onHover: Props['onHover'];
  onSelect: Props['onSelect'];
}) {
  const group = useRef<THREE.Group>(null);
  const yBase = (floor.order - 1) * frame.floorHeight;
  const parts = useMemo(
    () => floorParts(footprint, floor.order, frame.floors, frame.floorHeight),
    [footprint, floor.order, frame.floors, frame.floorHeight],
  );
  const slab = useMemo(() => slabGeometry(scaled(footprint, 0.18), SLAB), [footprint]);
  const clad = useMerged(parts.clad, tex.clad.tile, yBase);
  const concrete = useMerged(parts.concrete, tex.concrete.tile, yBase);
  const frameGeo = useMerged(parts.frame, 1, 0);
  const glass = useMerged(parts.glass, 1, 0);
  const rail = useMerged(parts.rail, 1, 0);
  const green = useMerged(parts.green, 1, 0);
  const interiors = useMemo(() => mergeQuads(parts.interiors), [parts.interiors]);
  const mats = useMemo(() => makeMaterials(tex), [tex]);

  useLayoutEffect(() => {
    const dim = state === 'dimmed';
    const selected = state === 'selected';
    const lifted = state === 'hovered' || selected;
    const d = reduced ? 0 : 1.2;
    const ease = 'power2.inOut';
    const g = group.current;
    if (g) {
      gsap.to(g.position, {
        x: selected ? pullDir[0] * FLOOR_PULL : 0,
        z: selected ? pullDir[1] * FLOOR_PULL : 0,
        duration: d,
        ease,
        overwrite: true,
      });
    }
    for (const key of Object.keys(mats) as (keyof Materials)[]) {
      const mat = mats[key];
      gsap.to(mat, {
        opacity: dim ? BASE_OPACITY[key] * 0.08 : BASE_OPACITY[key],
        duration: d * 0.7,
        ease,
        overwrite: true,
      });
      if (key !== 'glass' && key !== 'rail') mat.depthWrite = !dim;
    }
    const slabColor = new THREE.Color(lifted ? colors.accent : '#d4cfc6');
    gsap.to(mats.slab.color, { r: slabColor.r, g: slabColor.g, b: slabColor.b, duration: 0.25, overwrite: true });
  }, [state, reduced, mats, colors, pullDir]);

  return (
    <group
      ref={group}
      name={`piso-${floor.id}`}
      onPointerOver={
        interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              onHover(floor.id);
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              onHover(null);
              document.body.style.cursor = '';
            }
          : undefined
      }
      onClick={
        interactive
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect(floor.id);
            }
          : undefined
      }
    >
      <group position={[0, yBase, 0]}>
        <mesh geometry={slab} material={mats.slab} castShadow={shadows} receiveShadow={shadows} />
        {clad ? <mesh geometry={clad} material={mats.clad} castShadow={shadows} receiveShadow={shadows} /> : null}
        {concrete ? (
          <mesh geometry={concrete} material={mats.concrete} castShadow={shadows} receiveShadow={shadows} />
        ) : null}
        {frameGeo ? <mesh geometry={frameGeo} material={mats.frame} castShadow={shadows} /> : null}
        {interiors ? <mesh geometry={interiors} material={mats.interior} /> : null}
        {glass ? <mesh geometry={glass} material={mats.glass} renderOrder={2} /> : null}
        {rail ? <mesh geometry={rail} material={mats.rail} renderOrder={3} /> : null}
        {green ? <mesh geometry={green} material={mats.green} castShadow={shadows} /> : null}
      </group>
    </group>
  );
}

function Roof({
  footprint,
  frame,
  tex,
  dimmed,
  shadows,
}: {
  footprint: Pt[];
  frame: BuildingFrame;
  tex: SharedTextures;
  dimmed: boolean;
  shadows: boolean;
}) {
  const roof = useMemo(() => slabGeometry(scaled(footprint, 0.3), 0.4), [footprint]);
  const mats = useMemo(
    () => ({
      concrete: new THREE.MeshStandardMaterial({
        map: tex.concrete.map,
        bumpMap: tex.concrete.bump,
        bumpScale: tex.concrete.bumpScale,
        roughness: 0.9,
        transparent: true,
      }),
      roof: new THREE.MeshStandardMaterial({ color: '#b9b3aa', roughness: 0.95, transparent: true }),
      wood: new THREE.MeshStandardMaterial({ color: '#7b5a3e', roughness: 0.8, transparent: true }),
      rail: new THREE.MeshStandardMaterial({
        color: '#c9dad8',
        roughness: 0.05,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    }),
    [tex],
  );
  useLayoutEffect(() => {
    for (const [k, m] of Object.entries(mats)) {
      const base = k === 'rail' ? 0.3 : 1;
      gsap.to(m, { opacity: dimmed ? base * 0.08 : base, duration: 0.8, overwrite: true });
      if (k !== 'rail') m.depthWrite = !dimmed;
    }
  }, [dimmed, mats]);

  const { parapet, beams, rails } = useMemo(() => {
    const edges = edgesOf(scaled(footprint, 0.3));
    const parapet = edges.map((e) => onEdge(e, e.length / 2, -0.12, 0.4 + 0.45, e.length, 0.9, 0.24));
    const rails = edges.map((e) => onEdge(e, e.length / 2, -0.12, 0.4 + 1.25, e.length, 0.7, 0.03));
    const [cx, cz] = frame.center;
    const beams: Box[] = [];
    const span = frame.width * 0.5;
    const zc = cz - frame.depth * 0.15;
    const dz = frame.depth * 0.42;
    for (let i = 0; i < 11; i++) {
      beams.push({ x: cx - span / 2 + (i * span) / 10, y: 3.2, z: zc, w: 0.1, h: 0.22, d: dz, rotY: 0 });
    }
    for (const sx of [-1, 1]) {
      beams.push({ x: cx + (sx * span) / 2, y: 3.0, z: zc, w: 0.18, h: 0.25, d: dz + 0.4, rotY: 0 });
      for (const sz of [-1, 1]) {
        beams.push({ x: cx + (sx * span) / 2, y: 1.7, z: zc + (sz * dz) / 2, w: 0.18, h: 2.8, d: 0.18, rotY: 0 });
      }
    }
    return { parapet, beams, rails };
  }, [footprint, frame]);

  const parapetGeo = useMemo(() => mergeBoxes(parapet, tex.concrete.tile, frame.height), [parapet, tex, frame.height]);
  const beamGeo = useMemo(() => mergeBoxes(beams), [beams]);
  const railGeo = useMemo(() => mergeBoxes(rails), [rails]);

  return (
    <group position={[0, frame.height, 0]}>
      <mesh geometry={roof} material={mats.roof} castShadow={shadows} receiveShadow={shadows} />
      {parapetGeo ? (
        <mesh geometry={parapetGeo} material={mats.concrete} castShadow={shadows} receiveShadow={shadows} />
      ) : null}
      {beamGeo ? <mesh geometry={beamGeo} material={mats.wood} castShadow={shadows} /> : null}
      {railGeo ? <mesh geometry={railGeo} material={mats.rail} renderOrder={3} /> : null}
    </group>
  );
}

export function BuildingModel({
  footprint,
  frame,
  floors,
  cladding,
  selectedId,
  hoveredId,
  pullDir,
  colors,
  reduced,
  interactive,
  shadows,
  onHover,
  onSelect,
}: Props) {
  const pts = footprint as Pt[];
  const tex = useMemo<SharedTextures>(
    () => ({
      clad: cladding === 'ladrillo' ? brickTexture() : cladding === 'concreto' ? concreteTexture(17) : stuccoTexture(),
      concrete: concreteTexture(),
      interior: interiorAtlas(),
    }),
    [cladding],
  );
  const plinth = useMemo(() => slabGeometry(scaled(pts, 0.9), 0.2), [pts]);
  const plinthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a948a', roughness: 0.9 }), []);

  return (
    <group>
      <mesh geometry={plinth} material={plinthMat} position={[0, -0.18, 0]} receiveShadow={shadows} />
      {floors.map((f) => (
        <Floor
          key={f.id}
          floor={f}
          footprint={pts}
          frame={frame}
          tex={tex}
          colors={colors}
          state={selectedId ? (f.id === selectedId ? 'selected' : 'dimmed') : f.id === hoveredId ? 'hovered' : 'idle'}
          pullDir={pullDir}
          reduced={reduced}
          interactive={interactive}
          shadows={shadows}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      <Roof footprint={pts} frame={frame} tex={tex} dimmed={selectedId !== null} shadows={shadows} />
    </group>
  );
}
