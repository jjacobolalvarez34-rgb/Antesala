'use client';

import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { planToMesh, WALL_H } from '@/components/plan/planToMesh';
import type { PlanGeometry } from '@/lib/types';

import type { UnitSpaceMeta } from '../UnitModel';
import type { LightUniforms } from '../windows';
import { cabinMaterials } from './materials';
import type { TerrainCabin } from './types';

const noHit = () => null;
const WARM = new THREE.Color('#ffb46b');
const BLACK = new THREE.Color('#000000');

/**
 * Un refugio por fuera (D-083). Se levanta desde su plano: los mismos muros, ventanas y
 * puertas que la maqueta de adentro (regla 9). Encima, el techo; debajo, una base de piedra
 * hasta el suelo y el deck o porche en madera.
 *
 * Estados: quieto, bajo el puntero (se entibia) y abierto (al entrar: el techo sube y se
 * desvanece, los muros se van y queda la maqueta por dentro, que pone TerrainScene).
 */
export function Cabin({
  cabin,
  plan,
  spaces,
  position,
  groundY,
  state,
  light,
  shadows,
  reduced,
}: {
  cabin: TerrainCabin;
  plan: PlanGeometry;
  spaces: UnitSpaceMeta[];
  /** centro del plano a la altura del piso del refugio */
  position: [number, number, number];
  /** altura del suelo bajo el refugio (la base llega hasta aquí) */
  groundY: number;
  state: 'idle' | 'hovered' | 'open' | 'dim';
  light: LightUniforms;
  shadows: boolean;
  reduced: boolean;
}) {
  const mats = useMemo(() => cabinMaterials(cabin.style), [cabin.style]);
  const meshes = useMemo(() => planToMesh(plan), [plan]);
  const W = plan.width / 100;
  const H = plan.height / 100;
  // muros: el rectángulo de los muros (sin el deck ni el porche)
  const bounds = useMemo(() => {
    const xs = plan.walls.flatMap((w) => [w.x, w.x + w.width]);
    const ys = plan.walls.flatMap((w) => [w.y, w.y + w.height]);
    return { x0: Math.min(...xs) / 100 - W / 2, x1: Math.max(...xs) / 100 - W / 2, z0: Math.min(...ys) / 100 - H / 2, z1: Math.max(...ys) / 100 - H / 2 };
  }, [plan, W, H]);
  const outdoor = useMemo(() => new Set(spaces.filter((s) => s.type === 'terraza' || s.type === 'balcon').map((s) => s.id)), [spaces]);

  const roof = useMemo(() => roofGeometry(bounds, cabin.roof, cabin.style), [bounds, cabin.roof, cabin.style]);
  const gables = useMemo(() => (cabin.roof === 'dos-aguas' ? gableGeometry(bounds, cabin.style) : null), [bounds, cabin.roof, cabin.style]);
  const plinth = useMemo(() => {
    const drop = Math.max(0.35, position[1] - groundY + 0.6);
    const g = new THREE.BoxGeometry(bounds.x1 - bounds.x0 + 0.1, drop, bounds.z1 - bounds.z0 + 0.1);
    g.translate((bounds.x0 + bounds.x1) / 2, -drop / 2, (bounds.z0 + bounds.z1) / 2);
    return g;
  }, [bounds, position, groundY]);
  const decks = useMemo(
    () =>
      plan.spaces
        .filter((s) => outdoor.has(s.id))
        .map((s) => {
          const xs = s.points.map((p) => p[0] / 100 - W / 2);
          const zs = s.points.map((p) => p[1] / 100 - H / 2);
          const x0 = Math.min(...xs);
          const x1 = Math.max(...xs);
          const z0 = Math.min(...zs);
          const z1 = Math.max(...zs);
          const drop = Math.max(0.3, position[1] - groundY + 0.5);
          const top = new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0);
          top.translate((x0 + x1) / 2, -0.05, (z0 + z1) / 2);
          // postes en las esquinas, hasta el suelo
          const posts = [
            [x0 + 0.1, z0 + 0.1],
            [x1 - 0.1, z0 + 0.1],
            [x0 + 0.1, z1 - 0.1],
            [x1 - 0.1, z1 - 0.1],
          ].map(([px, pz]) => {
            const p = new THREE.BoxGeometry(0.14, drop, 0.14);
            p.translate(px!, -drop / 2 - 0.1, pz!);
            return p;
          });
          return { id: s.id, top, posts };
        }),
    [plan, outdoor, W, H, position, groundY],
  );
  useEffect(
    () => () => {
      roof.dispose();
      gables?.dispose();
      plinth.dispose();
      decks.forEach((d) => [d.top, ...d.posts].forEach((g) => g.dispose()));
      meshes.walls?.dispose();
      meshes.glass?.dispose();
      meshes.doors?.dispose();
    },
    [roof, gables, plinth, decks, meshes],
  );

  // abrir: el techo sube y se desvanece; los muros, vidrios y puertas se van después
  const roofGroup = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const open = state === 'open';
    const dim = state === 'dim';
    const d = reduced ? 0 : 1;
    const shellMats = [mats.walls, mats.trim, mats.glass];
    if (roofGroup.current) {
      if (!open) roofGroup.current.visible = true;
      gsap.to(roofGroup.current.position, { y: open ? 3.2 : 0, duration: 1.1 * d, ease: open ? 'power2.in' : 'power3.out', overwrite: true });
    }
    gsap.to(mats.roof, {
      opacity: open ? 0 : dim ? 0.55 : 1,
      duration: (open ? 0.8 : 0.6) * d,
      delay: open ? 0.25 * d : 0,
      ease: 'power1.inOut',
      overwrite: true,
      onComplete: () => {
        if (roofGroup.current) roofGroup.current.visible = !open;
      },
    });
    if (shell.current && !open) shell.current.visible = true;
    shellMats.forEach((m, i) =>
      gsap.to(m, {
        opacity: open ? 0 : dim ? 0.55 : m === mats.glass ? 0.92 : 1,
        duration: (open ? 0.7 : 0.6) * d,
        delay: open ? 0.55 * d : 0.15 * d,
        ease: 'power1.inOut',
        overwrite: true,
        onComplete: i === 0 && open ? () => shell.current && (shell.current.visible = false) : undefined,
      }),
    );
    for (const m of [mats.roof, ...shellMats]) m.depthWrite = !open && !dim;
  }, [state, mats, reduced]);

  // bajo el puntero se entibia; de noche las ventanas se encienden
  const warm = useRef(0);
  useFrame((_, dt) => {
    const target = state === 'hovered' ? 1 : 0;
    warm.current += (target - warm.current) * (1 - Math.exp(-dt * 8));
    mats.walls.emissive.copy(BLACK).lerp(WARM, 0.18 * warm.current);
    const n = light.uNight.value;
    mats.glass.emissiveIntensity = n * 1.5 + warm.current * 0.35;
  });

  return (
    <group position={position}>
      <mesh geometry={plinth} material={mats.base} castShadow={shadows} receiveShadow={shadows} raycast={noHit} />
      {decks.map((d) => (
        <group key={d.id}>
          <mesh geometry={d.top} material={mats.deck} castShadow={shadows} receiveShadow={shadows} raycast={noHit} />
          {d.posts.map((p, i) => (
            <mesh key={i} geometry={p} material={mats.trim} raycast={noHit} />
          ))}
        </group>
      ))}
      <group ref={shell}>
        {meshes.walls ? <mesh geometry={meshes.walls} material={mats.walls} castShadow={shadows} receiveShadow={shadows} raycast={noHit} /> : null}
        {meshes.glass ? <mesh geometry={meshes.glass} material={mats.glass} raycast={noHit} /> : null}
        {meshes.doors ? <mesh geometry={meshes.doors} material={mats.trim} raycast={noHit} /> : null}
      </group>
      <group ref={roofGroup}>
        <mesh geometry={roof} material={mats.roof} castShadow={shadows} raycast={noHit} />
        {gables ? <mesh geometry={gables} material={mats.walls} castShadow={shadows} raycast={noHit} /> : null}
      </group>
    </group>
  );
}

type Bounds = { x0: number; x1: number; z0: number; z1: number };
const OVER = 0.45;

function pitchOf(style: TerrainCabin['style']) {
  return style === 'madera' ? 0.72 : style === 'piedra' ? 0.42 : 0.55;
}

/** Techo: a dos aguas (cumbrera a lo largo del lado largo) o plano con alero. */
function roofGeometry(b: Bounds, roof: TerrainCabin['roof'], style: TerrainCabin['style']) {
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  const sx = b.x1 - b.x0;
  const sz = b.z1 - b.z0;
  if (roof === 'plano') {
    const g = new THREE.BoxGeometry(sx + OVER * 2, 0.26, sz + OVER * 2);
    g.translate(cx, WALL_H + 0.13, cz);
    return g;
  }
  const alongX = sx >= sz;
  const span = alongX ? sz : sx;
  const length = (alongX ? sx : sz) + OVER * 2;
  const pitch = pitchOf(style);
  const half = span / 2 + OVER;
  const slant = half / Math.cos(pitch);
  const rise = (span / 2) * Math.tan(pitch);
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const g = alongX ? new THREE.BoxGeometry(length, 0.14, slant) : new THREE.BoxGeometry(slant, 0.14, length);
    if (alongX) {
      g.rotateX(side * pitch);
      g.translate(cx, WALL_H + rise - (Math.sin(pitch) * slant) / 2 + 0.05, cz + side * (Math.cos(pitch) * slant) / 2);
    } else {
      g.rotateZ(-side * pitch);
      g.translate(cx + side * (Math.cos(pitch) * slant) / 2, WALL_H + rise - (Math.sin(pitch) * slant) / 2 + 0.05, cz);
    }
    parts.push(g);
  }
  // cumbrera
  const ridge = new THREE.BoxGeometry(alongX ? length : 0.22, 0.12, alongX ? 0.22 : length);
  ridge.translate(cx, WALL_H + rise + 0.1, cz);
  parts.push(ridge);
  // chimenea en piedra y en la casa
  if (style === 'piedra' || style === 'clara') {
    const ch = new THREE.BoxGeometry(0.6, 1.4, 0.6);
    ch.translate(alongX ? b.x0 + sx * 0.25 : cx + span * 0.2, WALL_H + rise * 0.75 + 0.5, alongX ? cz - span * 0.18 : b.z0 + sz * 0.25);
    parts.push(ch);
  }
  return mergeAll(parts);
}

/** Hastiales: los triángulos de muro bajo el techo a dos aguas. */
function gableGeometry(b: Bounds, style: TerrainCabin['style']) {
  const sx = b.x1 - b.x0;
  const sz = b.z1 - b.z0;
  const alongX = sx >= sz;
  const span = alongX ? sz : sx;
  const rise = (span / 2) * Math.tan(pitchOf(style));
  const shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0);
  shape.lineTo(span / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const parts: THREE.BufferGeometry[] = [];
  for (const end of [0, 1]) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
    if (alongX) {
      g.rotateY(Math.PI / 2);
      g.translate(end ? b.x1 - 0.15 : b.x0, WALL_H, (b.z0 + b.z1) / 2);
    } else {
      g.translate((b.x0 + b.x1) / 2, WALL_H, end ? b.z1 - 0.15 : b.z0);
    }
    parts.push(g);
  }
  return mergeAll(parts);
}

function mergeAll(parts: THREE.BufferGeometry[]) {
  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  let count = 0;
  for (const p of nonIndexed) count += p.getAttribute('position').count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const p of nonIndexed) {
    p.computeVertexNormals();
    const a = p.getAttribute('position');
    const n = p.getAttribute('normal');
    pos.set(a.array as Float32Array, o * 3);
    nor.set(n.array as Float32Array, o * 3);
    o += a.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  parts.forEach((p) => p.dispose());
  return g;
}
