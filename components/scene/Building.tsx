'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {
  bayCount,
  edgesOf,
  floorFootprint,
  FLOOR_PULL,
  frontEdgeIndex,
  REDUCED_FADE_OUT,
  viewerBay,
  type BuildingFrame,
  type Edge,
} from '@/lib/building';
import type { Building, PlanGeometry } from '@/lib/types';

import type { CladdingMaps } from './assets';
import { FloorPlanModel, type FloorPlanSpace } from './FloorPlanModel';
import { mergeBoxes, onEdge, type Box } from './geometry';
import { brickTexture, concreteTexture, interiorAtlas, stuccoTexture, type Cladding } from './textures';
import {
  buildGlowGeometry,
  buildWindowGeometry,
  createGlowMaterial,
  createWindowMaterial,
  STYLE,
  type LightUniforms,
  type WindowSpec,
} from './windows';

/**
 * Edificio procedural v2 (D-026, D-030): fachada con revestimiento real (PBR
 * cuando carga), ventanas con cuarto en paralaje y cortinas, balcones en las
 * unidades que los tienen, entrada de hotel con letrero, apliques y materas,
 * retranqueo con terraza y cubierta con pérgola. De noche: cuartos encendidos,
 * letrero y apliques iluminados y bañadores de luz en la fachada.
 */

export interface SceneFloor {
  id: string;
  order: number;
  name: string;
}

export interface BuildingColors {
  accent: string;
}

/** Unidad ubicada en la fachada: slot para la luz y el hover. */
export interface FacadeUnit {
  slot: number;
  order: number;
  /** ventanas: borde del footprint + índice visto desde afuera */
  windows: { edge: number; window: number }[];
  /** ventana del balcón (si la unidad tiene balcón) */
  balcony?: { edge: number; window: number };
}

interface Props {
  building: Building;
  frame: BuildingFrame;
  floors: SceneFloor[];
  brandName: string;
  units: FacadeUnit[];
  light: LightUniforms;
  cladMaps: CladdingMaps | null;
  linen: THREE.Texture | null;
  selectedId: string | null;
  /** el edificio se desvanece (maqueta de la unidad en primer plano) */
  gone?: boolean;
  hoveredId: string | null;
  pullDir: [number, number];
  colors: BuildingColors;
  reduced: boolean;
  interactive: boolean;
  shadows: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onUnitHover: (slot: number | null, clientX: number, clientY: number) => void;
  /** x, y: punto del toque en pantalla (para mostrar el nombre mientras se enciende la luz) */
  onUnitSelect: (slot: number, x: number, y: number) => void;
  /** plantas de piso (D-041) por id de nivel */
  floorPlans?: Record<string, { plan: PlanGeometry; spaces: FloorPlanSpace[] }>;
  planHovered?: string | null;
  onPlanHover?: (unitId: string | null) => void;
  onPlanSelect?: (unitId: string) => void;
}

type Pt = [number, number];

const SLAB = 0.3;
const WALL = 0.22;
const SILL = 0.9;
const WIN_H = 1.6;
const RECESS = -0.14;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

const facing = (e: Edge) => Math.atan2(e.normal[0], e.normal[1]);

interface FloorParts {
  clad: Box[];
  concrete: Box[];
  frame: Box[];
  glass: Box[];
  rail: Box[];
  green: Box[];
  windows: WindowSpec[];
}

function addWindow(
  p: FloorParts,
  e: Edge,
  t: number,
  y0: number,
  w: number,
  h: number,
  spec: Omit<WindowSpec, 'center' | 'width' | 'height' | 'rotY'>,
  sill = true,
) {
  const fr = 0.06;
  p.frame.push(onEdge(e, t, RECESS + 0.02, y0 + h - fr / 2, w, fr, 0.09));
  p.frame.push(onEdge(e, t, RECESS + 0.02, y0 + fr / 2, w, fr, 0.09));
  p.frame.push(onEdge(e, t - w / 2 + fr / 2, RECESS + 0.02, y0 + h / 2, fr, h, 0.09));
  p.frame.push(onEdge(e, t + w / 2 - fr / 2, RECESS + 0.02, y0 + h / 2, fr, h, 0.09));
  if (w > 1.3) p.frame.push(onEdge(e, t, RECESS + 0.02, y0 + h / 2, 0.05, h - fr * 2, 0.07));
  p.glass.push(onEdge(e, t, RECESS + 0.015, y0 + h / 2, w - fr, h - fr, 0.012));
  if (sill) p.concrete.push(onEdge(e, t, 0.02, y0 - 0.03, w + 0.12, 0.06, 0.16));
  const c = onEdge(e, t, RECESS, y0 + h / 2, 0, 0, 0);
  p.windows.push({ ...spec, center: [c.x, c.y, c.z], width: w - fr, height: h - fr, rotY: facing(e) });
}

function floorParts(
  building: Building,
  order: number,
  floorH: number,
  unitAt: Map<string, number>,
  balconyAt: Set<string>,
): FloorParts {
  const isGround = order === 1;
  const isTop = order === building.floors;
  const rand = mulberry32(order * 7919 + 13);
  const p: FloorParts = { clad: [], concrete: [], frame: [], glass: [], rail: [], green: [], windows: [] };
  const base = building.footprint as Pt[];
  const front = frontEdgeIndex(base);

  if (isTop) {
    const fe = edgesOf(base)[front]!;
    p.rail.push(onEdge(fe, fe.length / 2, 0.05, SLAB + 0.55, fe.length - 0.3, 1.1, 0.03));
    p.frame.push(onEdge(fe, fe.length / 2, 0.05, SLAB + 1.12, fe.length - 0.3, 0.05, 0.06));
    for (let t = 1.6; t < fe.length - 1; t += 3.2) {
      p.concrete.push(onEdge(fe, t, -0.5, SLAB + 0.25, 1.6, 0.5, 0.5));
      p.green.push(onEdge(fe, t, -0.5, SLAB + 0.75, 1.4, 0.55, 0.45));
    }
  }

  const ceil = floorH;
  edgesOf(floorFootprint(building, order)).forEach((e) => {
    const bays = bayCount(e.length);
    const bw = e.length / bays;
    const wallOff = -WALL / 2;
    const keyOf = (b: number) => `${order}|${e.index}|${viewerBay(e, b, bays)}`;
    const specFor = (b: number, style: number) => ({
      seed: order * 131 + e.index * 17 + b * 3 + 0.5,
      slot: unitAt.get(keyOf(b)) ?? -1,
      style,
      cell: Math.floor(rand() * 4),
    });

    if (isGround) {
      const glassTop = ceil - 0.7;
      for (let b = 0; b <= bays; b++) {
        p.concrete.push(onEdge(e, b * bw, wallOff + 0.04, (SLAB + ceil) / 2, 0.45, ceil - SLAB, WALL + 0.08));
      }
      p.clad.push(onEdge(e, e.length / 2, wallOff, (glassTop + ceil) / 2, e.length, ceil - glassTop, WALL));
      for (let b = 0; b < bays; b++) {
        addWindow(p, e, (b + 0.5) * bw, SLAB, bw - 0.45, glassTop - SLAB, specFor(b, STYLE.lobby), false);
      }
      return;
    }

    if (isTop && e.index === front) {
      for (let b = 0; b <= bays; b++) p.clad.push(onEdge(e, b * bw, wallOff, (SLAB + ceil) / 2, 0.3, ceil - SLAB, WALL));
      for (let b = 0; b < bays; b++) {
        addWindow(p, e, (b + 0.5) * bw, SLAB + 0.05, bw - 0.3, ceil - SLAB - 0.35, specFor(b, STYLE.sheer), false);
      }
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
      p.clad.push(onEdge(e, t0 + pier / 2, wallOff, (SLAB + ceil) / 2, pier, ceil - SLAB, WALL));
      p.clad.push(onEdge(e, t0 + bw - pier / 2, wallOff, (SLAB + ceil) / 2, pier, ceil - SLAB, WALL));
      const style = rand() < 0.3 ? STYLE.sheer : STYLE.panels;
      if (balconyAt.has(keyOf(b))) {
        // puerta-ventana al balcón: de piso a dintel, sin antepecho
        const doorTop = ceil - 0.45;
        p.clad.push(onEdge(e, tc, wallOff, (doorTop + ceil) / 2, winW, ceil - doorTop, WALL));
        addWindow(p, e, tc, SLAB + 0.02, winW, doorTop - SLAB - 0.02, specFor(b, style), false);
        const bwid = Math.min(3.6, bw * 1.35);
        p.concrete.push(onEdge(e, tc, 0.65, SLAB - 0.1, bwid, 0.2, 1.3));
        p.rail.push(onEdge(e, tc, 1.27, SLAB + 0.55, bwid, 1.05, 0.03));
        p.rail.push(onEdge(e, tc - bwid / 2, 0.65, SLAB + 0.55, 0.03, 1.05, 1.24));
        p.rail.push(onEdge(e, tc + bwid / 2, 0.65, SLAB + 0.55, 0.03, 1.05, 1.24));
        p.frame.push(onEdge(e, tc, 1.27, SLAB + 1.1, bwid + 0.04, 0.05, 0.06));
        p.concrete.push(onEdge(e, tc + bwid / 2 - 0.45, 0.85, SLAB + 0.2, 0.5, 0.4, 0.5));
        p.green.push(onEdge(e, tc + bwid / 2 - 0.45, 0.85, SLAB + 0.62, 0.62, 0.6, 0.6));
        continue;
      }
      p.clad.push(onEdge(e, tc, wallOff, (SLAB + winY) / 2, winW, winY - SLAB, WALL));
      p.clad.push(onEdge(e, tc, wallOff, (winTop + ceil) / 2, winW, ceil - winTop, WALL));
      addWindow(p, e, tc, winY, winW, WIN_H, specFor(b, style));
    }
  });
  return p;
}

function useMerged(boxes: Box[], tile: number, yBase: number) {
  const geo = useMemo(() => mergeBoxes(boxes, tile, yBase), [boxes, tile, yBase]);
  useEffect(() => () => geo?.dispose(), [geo]);
  return geo;
}

interface SharedTextures {
  clad: Cladding;
  concrete: Cladding;
  atlas: THREE.Texture;
}

interface Materials {
  clad: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  slab: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  rail: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
  windows: THREE.ShaderMaterial;
  glow: THREE.ShaderMaterial;
}

const BASE_OPACITY = { clad: 1, concrete: 1, slab: 1, frame: 1, glass: 0.42, rail: 0.3, green: 1 } as const;

function makeMaterials(tex: SharedTextures, light: LightUniforms): Materials {
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
    frame: new THREE.MeshStandardMaterial({ color: '#2a2d30', roughness: 0.4, metalness: 0.65, transparent: true }),
    glass: new THREE.MeshStandardMaterial({
      color: '#a9bcc4',
      roughness: 0.03,
      metalness: 0.9,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: BASE_OPACITY.glass,
      depthWrite: false,
    }),
    rail: new THREE.MeshStandardMaterial({
      color: '#c9dad8',
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: BASE_OPACITY.rail,
      depthWrite: false,
    }),
    green: new THREE.MeshStandardMaterial({ color: '#4f6b3c', roughness: 0.95, transparent: true }),
    windows: createWindowMaterial(light, tex.atlas),
    glow: createGlowMaterial(light),
  };
}

const noRaycast = () => null;

function Floor({
  floor,
  building,
  frame,
  tex,
  light,
  cladMaps,
  linen,
  colors,
  state,
  unitAt,
  balconyAt,
  pullDir,
  reduced,
  interactive,
  shadows,
  onHover,
  onSelect,
  onUnitHover,
  onUnitSelect,
  floorPlan,
  planHovered,
  onPlanHover,
  onPlanSelect,
}: {
  floorPlan?: { plan: PlanGeometry; spaces: FloorPlanSpace[] };
  planHovered: string | null;
  onPlanHover: (unitId: string | null) => void;
  onPlanSelect: (unitId: string) => void;
  floor: SceneFloor;
  building: Building;
  frame: BuildingFrame;
  tex: SharedTextures;
  light: LightUniforms;
  cladMaps: CladdingMaps | null;
  linen: THREE.Texture | null;
  colors: BuildingColors;
  state: 'idle' | 'hovered' | 'selected' | 'dimmed' | 'gone';
  unitAt: Map<string, number>;
  balconyAt: Set<string>;
  pullDir: [number, number];
  reduced: boolean;
  interactive: boolean;
  shadows: boolean;
  onHover: Props['onHover'];
  onSelect: Props['onSelect'];
  onUnitHover: Props['onUnitHover'];
  onUnitSelect: Props['onUnitSelect'];
}) {
  const group = useRef<THREE.Group>(null);
  // con un piso abierto, solo su planta recibe toques: la fachada oculta y los pisos de encima
  // (casi transparentes) se quedaban con el clic y la habitación no abría
  const live = interactive && (state === 'idle' || state === 'hovered');
  /** la fachada del piso (todo menos la losa y la planta): se oculta del todo cuando se retira */
  const facadeRef = useRef<THREE.Group>(null);
  const hasPlan = Boolean(floorPlan);
  // la planta amoblada se arma en tiempo libre después del arranque (no en la carga inicial)
  const [planIdle, setPlanIdle] = useState(false);
  useEffect(() => {
    if (!hasPlan) return;
    const run = () => setPlanIdle(true);
    const idle = 'requestIdleCallback' in window;
    const id = idle
      ? window.requestIdleCallback(run, { timeout: 2500 + floor.order * 600 })
      : window.setTimeout(run, 2000 + floor.order * 400);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [hasPlan, floor.order]);
  const planMounted = planIdle || state === 'selected';
  const yBase = (floor.order - 1) * frame.floorHeight;
  const parts = useMemo(
    () => floorParts(building, floor.order, frame.floorHeight, unitAt, balconyAt),
    [building, floor.order, frame.floorHeight, unitAt, balconyAt],
  );
  const slab = useMemo(() => slabGeometry(scaled(building.footprint as Pt[], 0.18), SLAB), [building.footprint]);
  const clad = useMerged(parts.clad, tex.clad.tile, yBase);
  const concrete = useMerged(parts.concrete, tex.concrete.tile, yBase);
  const frameGeo = useMerged(parts.frame, 1, 0);
  const glass = useMerged(parts.glass, 1, 0);
  const rail = useMerged(parts.rail, 1, 0);
  const green = useMerged(parts.green, 1, 0);
  const windowGeo = useMemo(() => buildWindowGeometry(parts.windows), [parts.windows]);
  const glowGeo = useMemo(() => buildGlowGeometry(parts.windows), [parts.windows]);
  const mats = useMemo(() => makeMaterials(tex, light), [tex, light]);

  // ladrillo real cuando llega (carga progresiva)
  useEffect(() => {
    if (!cladMaps) return;
    const m = mats.clad;
    m.map = cladMaps.map;
    m.normalMap = cladMaps.normalMap;
    m.normalScale.set(0.9, 0.9);
    m.aoMap = cladMaps.arm;
    m.roughnessMap = cladMaps.arm;
    m.roughness = 1;
    m.bumpMap = null;
    m.color.setRGB(1.22, 1.0, 0.88);
    m.needsUpdate = true;
  }, [cladMaps, mats]);

  useEffect(() => {
    if (!linen) return;
    mats.windows.uniforms.uLinen!.value = linen;
    mats.windows.uniforms.uHasLinen!.value = 1;
  }, [linen, mats]);

  useLayoutEffect(() => {
    const gone = state === 'gone';
    const dim = state === 'dimmed' || gone;
    const fade = gone ? 0 : 0.08;
    const selected = state === 'selected';
    const lifted = state === 'hovered' || selected;
    const d = reduced ? 0 : 1.2;
    // con movimiento reducido, el cambio ocurre cuando el fundido está en negro (no antes)
    const rd = reduced ? REDUCED_FADE_OUT : 0;
    const ease = 'power2.inOut';
    const g = group.current;
    if (g && !gone) g.visible = true;
    if (g) {
      // cajón: el piso elegido sale con desaceleración (después de que el anterior entra) y vuelve a entrar
      gsap.to(g.position, {
        x: selected ? pullDir[0] * FLOOR_PULL : 0,
        z: selected ? pullDir[1] * FLOOR_PULL : 0,
        duration: reduced ? 0 : selected ? 1.05 : 0.55,
        delay: reduced ? rd : selected ? 0.35 : 0,
        ease: selected ? 'power3.out' : 'power2.in',
        overwrite: true,
      });
    }
    // planta del piso: con el cajón afuera, la fachada de este piso se retira (queda la losa).
    // Retirada, se oculta: con opacidad 0 seguía escribiendo profundidad y tapaba a ratos la planta
    const cutaway = selected && hasPlan;
    const fg = facadeRef.current;
    if (fg && !cutaway) fg.visible = true;
    for (const key of Object.keys(BASE_OPACITY) as (keyof typeof BASE_OPACITY)[]) {
      const mat = mats[key];
      const keep = key === 'slab';
      gsap.to(mat, {
        opacity: dim ? BASE_OPACITY[key] * fade : cutaway && !keep ? 0 : BASE_OPACITY[key],
        duration: gone ? d * 0.9 : d * 0.7,
        delay: reduced ? rd : gone ? 0.55 : cutaway ? 1.1 : 0,
        ease,
        overwrite: true,
        onComplete:
          gone && key === 'clad'
            ? () => g && (g.visible = false)
            : cutaway && key === 'clad'
              ? () => fg && (fg.visible = false)
              : undefined,
      });
      if (key !== 'glass' && key !== 'rail') mat.depthWrite = !dim && !(cutaway && !keep);
    }
    for (const m of [mats.windows, mats.glow]) {
      gsap.to(m.uniforms.uOpacity!, {
        value: dim ? fade : cutaway ? 0 : 1,
        duration: d * 0.7,
        delay: reduced ? rd : cutaway ? 1.1 : 0,
        ease,
        overwrite: true,
      });
      m.depthWrite = m === mats.windows ? !dim && !cutaway : false;
    }
    // señal visible de "esto se puede tocar": el piso bajo el puntero se entibia
    const hot = state === 'hovered';
    mats.clad.emissive.set(hot ? '#5a3a1a' : '#000000');
    mats.concrete.emissive.set(hot ? '#3a2a18' : '#000000');
    const slabColor = new THREE.Color(lifted ? colors.accent : '#d4cfc6');
    gsap.to(mats.slab.color, { r: slabColor.r, g: slabColor.g, b: slabColor.b, duration: 0.25, overwrite: true });
  }, [state, reduced, mats, colors, pullDir, hasPlan]);

  const slotAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const geo = (e.object as THREE.Mesh).geometry;
    const face = e.faceIndex ?? -1;
    if (face < 0) return -1;
    const vi = geo.index ? geo.index.getX(face * 3) : face * 3;
    return Math.round(geo.getAttribute('aRoom').getZ(vi));
  };

  return (
    <group
      ref={group}
      name={`piso-${floor.id}`}
      onPointerOver={
        live
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              onHover(floor.id);
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        live
          ? () => {
              onHover(null);
              document.body.style.cursor = '';
            }
          : undefined
      }
      onClick={
        live
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect(floor.id);
            }
          : undefined
      }
    >
      <group position={[0, yBase, 0]}>
        <mesh geometry={slab} material={mats.slab} castShadow={shadows} receiveShadow={shadows} />
        <group ref={facadeRef}>
          {clad ? <mesh geometry={clad} material={mats.clad} castShadow={shadows} receiveShadow={shadows} /> : null}
          {concrete ? (
            <mesh geometry={concrete} material={mats.concrete} castShadow={shadows} receiveShadow={shadows} />
          ) : null}
          {frameGeo ? <mesh geometry={frameGeo} material={mats.frame} castShadow={shadows} /> : null}
          {windowGeo ? (
            <mesh
              geometry={windowGeo}
              material={mats.windows}
              onPointerMove={
                live
                  ? (e: ThreeEvent<PointerEvent>) => {
                      const slot = slotAt(e);
                      onUnitHover(slot >= 0 ? slot : null, e.nativeEvent.clientX, e.nativeEvent.clientY);
                    }
                  : undefined
              }
              onPointerLeave={live ? () => onUnitHover(null, 0, 0) : undefined}
              onClick={
                live
                  ? (e: ThreeEvent<MouseEvent>) => {
                      const slot = slotAt(e);
                      if (slot >= 0) {
                        e.stopPropagation();
                        onUnitSelect(slot, e.nativeEvent.clientX, e.nativeEvent.clientY);
                      }
                    }
                  : undefined
              }
            />
          ) : null}
          {glass ? <mesh geometry={glass} material={mats.glass} renderOrder={2} raycast={noRaycast} /> : null}
          {glowGeo ? <mesh geometry={glowGeo} material={mats.glow} renderOrder={4} raycast={noRaycast} /> : null}
          {rail ? <mesh geometry={rail} material={mats.rail} renderOrder={3} raycast={noRaycast} /> : null}
          {green ? <mesh geometry={green} material={mats.green} castShadow={shadows} /> : null}
        </group>
        {floorPlan && planMounted ? (
          <FloorPlanModel
            plan={floorPlan.plan}
            spaces={floorPlan.spaces}
            position={[frame.center[0], SLAB, frame.center[1]]}
            visible={state === 'selected'}
            hovered={planHovered}
            reduced={reduced}
            shadows={shadows}
            light={light}
            onHover={onPlanHover}
            onSelect={onPlanSelect}
          />
        ) : null}
      </group>
    </group>
  );
}

/** Letrero del hotel en la marquesina: textura con el nombre y emisivo de noche. */
function useSignTextures(name: string) {
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setFontReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => {
    const W = 1024;
    const H = 160;
    const family =
      getComputedStyle(document.documentElement).getPropertyValue('--font-instrument-serif').trim() || 'Georgia, serif';
    const make = (bg: string, fg: string) => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `400 ${H * 0.62}px ${family}`;
      const text = name.toUpperCase().split('').join(' ');
      ctx.fillText(text, W / 2, H * 0.54);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    return { map: make('#2d261f', '#e9dcc4'), emissive: make('#000000', '#ffd9a0'), key: fontReady };
  }, [name, fontReady]);
}

function Entrance({
  building,
  frame,
  brandName,
  shadows,
  light,
}: {
  building: Building;
  frame: BuildingFrame;
  brandName: string;
  shadows: boolean;
  light: LightUniforms;
}) {
  const pts = building.footprint as Pt[];
  const e = edgesOf(pts)[frontEdgeIndex(pts)]!;
  const glassTop = frame.floorHeight - 0.7;
  const canopyW = Math.min(7, e.length * 0.45);
  const sign = useSignTextures(brandName);
  const mats = useMemo(
    () => ({
      sign: new THREE.MeshStandardMaterial({
        map: sign.map,
        emissiveMap: sign.emissive,
        emissive: new THREE.Color('#ffcf94'),
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.3,
      }),
      sconce: new THREE.MeshStandardMaterial({ color: '#f3e3c8', emissive: new THREE.Color('#ffcf94'), emissiveIntensity: 0.4 }),
      door: new THREE.MeshStandardMaterial({ color: '#1f2224', roughness: 0.4, metalness: 0.7 }),
      planter: new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.8 }),
      plant: new THREE.MeshStandardMaterial({ color: '#3f5a30', roughness: 1 }),
      canopy: new THREE.MeshStandardMaterial({ color: '#2d261f', roughness: 0.55, metalness: 0.5 }),
    }),
    [sign],
  );
  useFrame(() => {
    const n = light.uNight.value;
    mats.sign.emissiveIntensity = 0.25 + n * 2.2;
    mats.sconce.emissiveIntensity = 0.5 + n * 3.5;
  });

  const pieces = useMemo(() => {
    const at = (t: number, off: number, y: number, w: number, h: number, d: number) => onEdge(e, t, off, y, w, h, d);
    const mid = e.length / 2;
    return {
      canopy: mergeBoxes([at(mid, 1.25, glassTop + 0.1, canopyW, 0.14, 2.5)]),
      sign: at(mid, 2.5, glassTop + 0.28, canopyW * 0.86, 0.42, 0.05),
      door: mergeBoxes([
        at(mid, RECESS + 0.03, (SLAB + glassTop) / 2, 0.08, glassTop - SLAB, 0.1),
        at(mid - 1.1, RECESS + 0.03, (SLAB + glassTop) / 2, 0.08, glassTop - SLAB, 0.1),
        at(mid + 1.1, RECESS + 0.03, (SLAB + glassTop) / 2, 0.08, glassTop - SLAB, 0.1),
        at(mid, RECESS + 0.03, glassTop - 0.45, 2.3, 0.06, 0.1),
        at(mid - 0.55, RECESS + 0.05, 1.15, 0.03, 0.5, 0.06),
        at(mid + 0.55, RECESS + 0.05, 1.15, 0.03, 0.5, 0.06),
      ]),
      sconces: mergeBoxes([at(mid - 1.7, 0.12, 2.05, 0.16, 0.42, 0.14), at(mid + 1.7, 0.12, 2.05, 0.16, 0.42, 0.14)]),
      planters: mergeBoxes([at(mid - 2.6, 0.75, 0.38, 0.9, 0.76, 0.9), at(mid + 2.6, 0.75, 0.38, 0.9, 0.76, 0.9)]),
      plants: [at(mid - 2.6, 0.75, 1.15, 0, 0, 0), at(mid + 2.6, 0.75, 1.15, 0, 0, 0)],
    };
  }, [e, glassTop, canopyW]);

  return (
    <group>
      {pieces.canopy ? <mesh geometry={pieces.canopy} material={mats.canopy} castShadow={shadows} receiveShadow={shadows} /> : null}
      <mesh position={[pieces.sign.x, pieces.sign.y, pieces.sign.z]} rotation-y={pieces.sign.rotY} material={mats.sign}>
        <boxGeometry args={[pieces.sign.w, pieces.sign.h, pieces.sign.d]} />
      </mesh>
      {pieces.door ? <mesh geometry={pieces.door} material={mats.door} /> : null}
      {pieces.sconces ? <mesh geometry={pieces.sconces} material={mats.sconce} /> : null}
      {pieces.planters ? <mesh geometry={pieces.planters} material={mats.planter} castShadow={shadows} /> : null}
      {pieces.plants.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={[0.62, 0.8, 0.62]} material={mats.plant} castShadow={shadows}>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
      ))}
    </group>
  );
}

/** Bañadores de luz en la fachada (solo de noche): planos aditivos con degradé vertical. */
function Uplights({ building, light }: { building: Building; light: LightUniforms }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const e of edgesOf(building.footprint as Pt[])) {
      const bays = bayCount(e.length);
      const bw = e.length / bays;
      for (let b = 0; b <= bays; b++) {
        const box = onEdge(e, b * bw, 0.26, 4.5, 1.7, 9.0, 0);
        const g = new THREE.PlaneGeometry(box.w, box.h);
        g.rotateY(facing(e));
        g.translate(box.x, box.y, box.z);
        parts.push(g);
      }
    }
    const merged = mergeGeometriesSafe(parts);
    parts.forEach((p) => p.dispose());
    return merged;
  }, [building]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uNight: light.uNight },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uNight;
          varying vec2 vUv;
          void main() {
            float x = abs(vUv.x - 0.5) * 2.0;
            float a = pow(1.0 - vUv.y, 1.35) * (1.0 - x * x) * 0.5 * uNight;
            gl_FragColor = vec4(vec3(1.0, 0.78, 0.5) * a, 1.0);
          }
        `,
      }),
    [light],
  );
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} renderOrder={5} raycast={noRaycast} />;
}

const mergeGeometriesSafe = (parts: THREE.BufferGeometry[]) => (parts.length ? mergeGeometries(parts, false) : null);

function Roof({
  building,
  frame,
  tex,
  dimmed,
  gone = false,
  shadows,
}: {
  building: Building;
  frame: BuildingFrame;
  tex: SharedTextures;
  dimmed: boolean;
  gone?: boolean;
  shadows: boolean;
}) {
  const footprint = building.footprint as Pt[];
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
      gsap.to(m, { opacity: gone ? 0 : dimmed ? base * 0.08 : base, duration: 0.8, overwrite: true });
      if (k !== 'rail') m.depthWrite = !dimmed && !gone;
    }
  }, [dimmed, gone, mats]);

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
      {railGeo ? <mesh geometry={railGeo} material={mats.rail} renderOrder={3} raycast={noRaycast} /> : null}
    </group>
  );
}

export function BuildingModel({
  building,
  frame,
  floors,
  brandName,
  units,
  light,
  cladMaps,
  linen,
  selectedId,
  gone = false,
  hoveredId,
  pullDir,
  colors,
  reduced,
  interactive,
  shadows,
  onHover,
  onSelect,
  onUnitHover,
  onUnitSelect,
  floorPlans,
  planHovered = null,
  onPlanHover = () => {},
  onPlanSelect = () => {},
}: Props) {
  const cladding = building.style?.cladding ?? 'estuco';
  const tex = useMemo<SharedTextures>(
    () => ({
      clad: cladding === 'ladrillo' ? brickTexture() : cladding === 'concreto' ? concreteTexture(17) : stuccoTexture(),
      concrete: concreteTexture(),
      atlas: interiorAtlas(),
    }),
    [cladding],
  );
  const { unitAt, balconyAt } = useMemo(() => {
    const unitAt = new Map<string, number>();
    const balconyAt = new Set<string>();
    for (const u of units) {
      for (const w of u.windows) unitAt.set(`${u.order}|${w.edge}|${w.window}`, u.slot);
      if (u.balcony) balconyAt.add(`${u.order}|${u.balcony.edge}|${u.balcony.window}`);
    }
    return { unitAt, balconyAt };
  }, [units]);
  const plinth = useMemo(() => slabGeometry(scaled(building.footprint as Pt[], 0.9), 0.2), [building.footprint]);
  const plinthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a948a', roughness: 0.9 }), []);
  const catcher = useMemo(() => new THREE.ShadowMaterial({ opacity: 0.32, transparent: true }), []);
  const [cx, cz] = frame.center;

  // cuando el edificio se va (maqueta en primer plano), tras el fundido se oculta todo:
  // un objeto con opacidad 0 sigue proyectando sombra y ocupando el plano
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    if (!gone) {
      g.visible = true;
      return;
    }
    const call = gsap.delayedCall(reduced ? REDUCED_FADE_OUT : 1.7, () => {
      g.visible = false;
    });
    return () => {
      call.kill();
    };
  }, [gone, reduced]);

  return (
    <group ref={root}>
      {/* recibe la sombra del edificio sobre el fondo congelado */}
      {shadows ? (
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0.02, cz]} material={catcher} receiveShadow raycast={noRaycast}>
          <planeGeometry args={[160, 160]} />
        </mesh>
      ) : null}
      <mesh geometry={plinth} material={plinthMat} position={[0, -0.18, 0]} receiveShadow={shadows} />
      {floors.map((f) => (
        <Floor
          key={f.id}
          floor={f}
          building={building}
          frame={frame}
          tex={tex}
          light={light}
          cladMaps={cladding === 'ladrillo' ? cladMaps : null}
          linen={linen}
          colors={colors}
          state={gone ? 'gone' : selectedId ? (f.id === selectedId ? 'selected' : 'dimmed') : f.id === hoveredId ? 'hovered' : 'idle'}
          unitAt={unitAt}
          balconyAt={balconyAt}
          pullDir={pullDir}
          reduced={reduced}
          interactive={interactive && !gone}
          shadows={shadows}
          onHover={onHover}
          onSelect={onSelect}
          onUnitHover={onUnitHover}
          onUnitSelect={onUnitSelect}
          floorPlan={floorPlans?.[f.id]}
          planHovered={planHovered}
          onPlanHover={onPlanHover}
          onPlanSelect={onPlanSelect}
        />
      ))}
      {selectedId || gone ? null : <Entrance building={building} frame={frame} brandName={brandName} shadows={shadows} light={light} />}
      {selectedId || gone ? null : <Uplights building={building} light={light} />}
      <Roof building={building} frame={frame} tex={tex} dimmed={selectedId !== null} gone={gone} shadows={shadows} />
    </group>
  );
}
