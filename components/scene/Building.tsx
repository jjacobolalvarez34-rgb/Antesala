'use client';

import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FLOOR_PULL, type BuildingFrame } from '@/lib/building';

/**
 * Edificio procedural desde site.building (CONTENIDO.md §5): un grupo por piso
 * con losa volada, antepecho, aletas verticales y vidrios (algunos encendidos,
 * con semilla fija). Lobby en doble vidrio con marquesina, retranqueo con
 * terraza en el último piso y cubierta con pérgola. Todo con InstancedMesh.
 */

export interface SceneFloor {
  id: string;
  order: number;
  name: string;
}

export interface BuildingColors {
  model: string;
  accent: string;
  glass: string;
  glow: string;
}

interface Props {
  footprint: [number, number][];
  frame: BuildingFrame;
  floors: SceneFloor[];
  selectedId: string | null;
  hoveredId: string | null;
  colors: BuildingColors;
  reduced: boolean;
  interactive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const SLAB = 0.3;
const SPANDREL = 0.9;
const BAY = 1.5;
const FIN = { w: 0.14, d: 0.42 };
const SETBACK = 2.4;

type Pt = [number, number];

interface Edge {
  a: Pt;
  dir: Pt;
  normal: Pt;
  length: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function edgesOf(pts: Pt[]): Edge[] {
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

const frontIndex = (edges: Edge[]) =>
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

interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
}

/** Caja alineada a un borde: t = distancia a lo largo del borde, off = desplazamiento hacia afuera. */
function onEdge(e: Edge, t: number, off: number, y: number, w: number, h: number, d: number): Box {
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

interface FloorParts {
  model: Box[];
  lit: Box[];
  dark: Box[];
  rail: Box[];
}

function floorParts(footprint: Pt[], order: number, floors: number, floorH: number): FloorParts {
  const isGround = order === 1;
  const isTop = order === floors;
  const rand = mulberry32(order * 7919);
  const parts: FloorParts = { model: [], lit: [], dark: [], rail: [] };

  let pts = footprint;
  const baseEdges = edgesOf(footprint);
  const front = frontIndex(baseEdges);
  if (isTop) {
    // retranqueo del frente: la fachada se corre hacia adentro y queda la terraza
    const n = baseEdges[front]!.normal;
    pts = footprint.map((p, i) =>
      i === front || i === (front + 1) % footprint.length ? [p[0] - n[0] * SETBACK, p[1] - n[1] * SETBACK] : p,
    );
    const fe = baseEdges[front]!;
    parts.rail.push(onEdge(fe, fe.length / 2, 0.25, SLAB + 0.55, fe.length + 0.4, 1.1, 0.04));
  }

  const y0 = SLAB;
  const facadeH = floorH - SLAB;
  edgesOf(pts).forEach((e, ei) => {
    const bays = Math.max(1, Math.round(e.length / BAY));
    const bw = e.length / bays;
    const sill = isGround ? 0 : SPANDREL;
    if (!isGround) parts.model.push(onEdge(e, e.length / 2, 0, y0 + sill / 2, e.length + 0.02, sill, 0.24));
    for (let b = 0; b <= bays; b++) {
      parts.model.push(onEdge(e, b * bw, FIN.d / 2 - 0.08, y0 + facadeH / 2, FIN.w, facadeH, FIN.d));
    }
    const glassH = facadeH - sill;
    const litChance = isGround ? 0.85 : 0.2 + (ei === front ? 0.08 : 0);
    for (let b = 0; b < bays; b++) {
      const box = onEdge(e, (b + 0.5) * bw, -0.06, y0 + sill + glassH / 2, bw - FIN.w, glassH, 0.05);
      (rand() < litChance ? parts.lit : parts.dark).push(box);
    }
    if (isGround && ei === front) {
      parts.model.push(onEdge(e, e.length / 2, 1.1, floorH - 0.45, Math.min(6, e.length * 0.4), 0.18, 2.4));
    }
  });
  return parts;
}

function useInstances(boxes: Box[]) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Object3D();
    boxes.forEach((b, i) => {
      m.position.set(b.x, b.y, b.z);
      m.rotation.set(0, b.rotY, 0);
      m.scale.set(b.w, b.h, b.d);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);
  return ref;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);

function Instances({ boxes, material, shadows }: { boxes: Box[]; material: THREE.Material; shadows?: boolean }) {
  const ref = useInstances(boxes);
  if (!boxes.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[unitBox, material, boxes.length]}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}

function Floor({
  floor,
  footprint,
  frame,
  colors,
  state,
  reduced,
  interactive,
  onHover,
  onSelect,
}: {
  floor: SceneFloor;
  footprint: Pt[];
  frame: BuildingFrame;
  colors: BuildingColors;
  state: 'idle' | 'hovered' | 'selected' | 'dimmed';
  reduced: boolean;
  interactive: boolean;
  onHover: Props['onHover'];
  onSelect: Props['onSelect'];
}) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(
    () => floorParts(footprint, floor.order, frame.floors, frame.floorHeight),
    [footprint, floor.order, frame.floors, frame.floorHeight],
  );
  const slab = useMemo(() => slabGeometry(scaled(footprint, 0.45), SLAB), [footprint]);

  const mats = useMemo(
    () => ({
      model: new THREE.MeshStandardMaterial({ color: colors.model, roughness: 0.88, metalness: 0, transparent: true }),
      slab: new THREE.MeshStandardMaterial({ color: colors.model, roughness: 0.8, transparent: true }),
      dark: new THREE.MeshStandardMaterial({
        color: colors.glass,
        roughness: 0.18,
        metalness: 0.15,
        envMapIntensity: 1.4,
        transparent: true,
      }),
      lit: new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, toneMapped: false }),
      rail: new THREE.MeshStandardMaterial({
        color: '#cfe0dc',
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.28,
      }),
    }),
    [colors],
  );

  useLayoutEffect(() => {
    const dim = state === 'dimmed';
    const selected = state === 'selected';
    const lifted = state === 'hovered' || selected;
    const d = reduced ? 0 : 1.2;
    const ease = 'power2.inOut';
    const g = group.current;
    if (g) gsap.to(g.position, { z: selected ? FLOOR_PULL : 0, duration: d, ease, overwrite: true });
    const opacity = dim ? 0.07 : 1;
    for (const key of ['model', 'slab', 'dark', 'lit'] as const) {
      const mat = mats[key];
      gsap.to(mat, { opacity, duration: d * 0.7, ease, overwrite: true });
      mat.depthWrite = !dim;
    }
    gsap.to(mats.rail, { opacity: dim ? 0.03 : 0.28, duration: d * 0.7, overwrite: true });
    const slabColor = new THREE.Color(lifted ? colors.accent : colors.model);
    gsap.to(mats.slab.color, { r: slabColor.r, g: slabColor.g, b: slabColor.b, duration: 0.25, overwrite: true });
  }, [state, reduced, mats, colors]);

  const y = (floor.order - 1) * frame.floorHeight;
  return (
    <group
      ref={group}
      name={`piso-${floor.id}`}
      position={[0, y, 0]}
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
      <mesh geometry={slab} material={mats.slab} castShadow receiveShadow />
      <Instances boxes={parts.model} material={mats.model} shadows />
      <Instances boxes={parts.dark} material={mats.dark} />
      <Instances boxes={parts.lit} material={mats.lit} />
      <Instances boxes={parts.rail} material={mats.rail} />
    </group>
  );
}

function Roof({ footprint, frame, colors, dimmed }: { footprint: Pt[]; frame: BuildingFrame; colors: BuildingColors; dimmed: boolean }) {
  const roof = useMemo(() => slabGeometry(scaled(footprint, 0.6), 0.5), [footprint]);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: colors.model, roughness: 0.85, transparent: true }),
    [colors.model],
  );
  const rail = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: '#cfe0dc', roughness: 0.05, transparent: true, opacity: 0.25 }),
    [],
  );
  useLayoutEffect(() => {
    gsap.to(mat, { opacity: dimmed ? 0.07 : 1, duration: 0.8, overwrite: true });
    mat.depthWrite = !dimmed;
  }, [dimmed, mat]);

  const { beams, railBoxes } = useMemo(() => {
    const edges = edgesOf(scaled(footprint, 0.45));
    const railBoxes = edges.map((e) => onEdge(e, e.length / 2, 0, 1.05, e.length, 1.0, 0.04));
    // pérgola sobre la mitad trasera de la cubierta
    const [cx, cz] = frame.center;
    const beams: Box[] = [];
    const span = frame.width * 0.55;
    for (let i = 0; i < 9; i++) {
      beams.push({ x: cx - span / 2 + (i * span) / 8, y: 3.0, z: cz - frame.depth * 0.18, w: 0.12, h: 0.14, d: frame.depth * 0.45, rotY: 0 });
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        beams.push({
          x: cx + (sx * span) / 2,
          y: 1.5,
          z: cz - frame.depth * 0.18 + (sz * frame.depth * 0.45) / 2,
          w: 0.16,
          h: 3.0,
          d: 0.16,
          rotY: 0,
        });
      }
    }
    return { beams, railBoxes };
  }, [footprint, frame]);

  return (
    <group position={[0, frame.height, 0]}>
      <mesh geometry={roof} material={mat} castShadow receiveShadow />
      <group position={[0, 0.5, 0]}>
        <Instances boxes={beams} material={mat} shadows />
        <Instances boxes={railBoxes} material={rail} />
      </group>
    </group>
  );
}

export function BuildingModel({
  footprint,
  frame,
  floors,
  selectedId,
  hoveredId,
  colors,
  reduced,
  interactive,
  onHover,
  onSelect,
}: Props) {
  const pts = footprint as Pt[];
  const plinth = useMemo(() => slabGeometry(scaled(pts, 1.4), 0.15), [pts]);
  const plinthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8f877a', roughness: 0.95 }), []);

  return (
    <group>
      <mesh geometry={plinth} material={plinthMat} position={[0, -0.14, 0]} receiveShadow />
      {floors.map((f) => (
        <Floor
          key={f.id}
          floor={f}
          footprint={pts}
          frame={frame}
          colors={colors}
          state={
            selectedId
              ? f.id === selectedId
                ? 'selected'
                : 'dimmed'
              : f.id === hoveredId
                ? 'hovered'
                : 'idle'
          }
          reduced={reduced}
          interactive={interactive}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      <Roof footprint={pts} frame={frame} colors={colors} dimmed={selectedId !== null} />
    </group>
  );
}
