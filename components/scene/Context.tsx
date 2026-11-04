'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { BuildingFrame, Facade } from '@/lib/building';

import { mergeBoxes, type Box } from './geometry';
import { neighborFacadeTexture } from './textures';

/**
 * Entorno urbano de día (D-026): cielo de tarde, andenes, calles con
 * demarcación, árboles, manzanas vecinas con fachadas de ladrillo y pañete, y
 * los cerros orientales al fondo. Procedural y liviano (texturas de canvas).
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ¿El punto cae en el corredor de vista de alguna fachada? (entre la cámara y
 * el edificio). Ahí no se ponen vecinos ni árboles para que la fachada se vea.
 */
function inViewCorridor(x: number, z: number, frame: BuildingFrame, facades: Facade[], pad = 0) {
  const rx = x - frame.center[0];
  const rz = z - frame.center[1];
  return facades.some((f) => {
    const az = f.azimuth + (14 * Math.PI) / 180;
    const dx = Math.sin(az);
    const dz = Math.cos(az);
    const along = rx * dx + rz * dz;
    if (along < 0 || along > 110) return false;
    const perp = Math.abs(rx * dz - rz * dx);
    return perp < f.length / 2 + 5 + along * 0.32 + pad;
  });
}

const STREET = 9;
const SIDEWALK = 3.2;

interface Block {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: 'ladrillo' | 'estuco';
}

function useNeighbors(frame: BuildingFrame, facades: Facade[]): Block[] {
  return useMemo(() => {
    const rand = mulberry32(42);
    const [cx, cz] = frame.center;
    const out: Block[] = [];
    const cell = 30;
    const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
    const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 3; j++) {
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const w = 8 + rand() * 10;
          const d = 9 + rand() * 9;
          const bx = cx + i * cell + (rand() - 0.5) * 12;
          const bz = cz + j * cell + (rand() - 0.5) * 12;
          const ring = Math.max(Math.abs(i), Math.abs(j));
          const floors = ring <= 1 ? 2 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 6);
          const overlaps = (x0: number, x1: number, z0: number, z1: number) =>
            bx + w / 2 > x0 && bx - w / 2 < x1 && bz + d / 2 > z0 && bz - d / 2 < z1;
          const margin = STREET / 2 + SIDEWALK + 0.5;
          if (
            overlaps(-Infinity, Infinity, frontStreet - margin, frontStreet + margin) ||
            overlaps(sideStreet - margin, sideStreet + margin, -Infinity, Infinity) ||
            overlaps(cx - frame.width / 2 - 4, cx + frame.width / 2 + 4, cz - frame.depth / 2 - 4, cz + frame.depth / 2 + 4)
          ) {
            continue;
          }
          // no tapar la vista desde la calle frente a la fachada principal
          if (inViewCorridor(bx, bz, frame, facades, Math.max(w, d) / 2)) continue;
          out.push({ x: bx, z: bz, w, d, h: floors * 2.9, kind: rand() < 0.62 ? 'ladrillo' : 'estuco' });
        }
      }
    }
    return out;
  }, [frame, facades]);
}

function NeighborBlocks({ frame, facades, shadows }: { frame: BuildingFrame; facades: Facade[]; shadows: boolean }) {
  const blocks = useNeighbors(frame, facades);
  const mats = useMemo(() => {
    const roof = new THREE.MeshStandardMaterial({ color: '#8f8a82', roughness: 0.95 });
    const make = (kind: 'ladrillo' | 'estuco') =>
      new THREE.MeshStandardMaterial({ map: neighborFacadeTexture(kind, kind === 'ladrillo' ? 3 : 9), roughness: 0.92 });
    return { roof, ladrillo: make('ladrillo'), estuco: make('estuco') };
  }, []);

  const geos = useMemo(() => {
    const byKind: Record<'ladrillo' | 'estuco', Box[]> = { ladrillo: [], estuco: [] };
    const roofs: Box[] = [];
    for (const b of blocks) {
      byKind[b.kind].push({ x: b.x, y: b.h / 2, z: b.z, w: b.w, h: b.h, d: b.d, rotY: 0 });
      roofs.push({ x: b.x, y: b.h + 0.05, z: b.z, w: b.w + 0.1, h: 0.1, d: b.d + 0.1, rotY: 0 });
    }
    return {
      ladrillo: mergeBoxes(byKind.ladrillo, 6, 0, 2.9),
      estuco: mergeBoxes(byKind.estuco, 6, 0, 2.9),
      roofs: mergeBoxes(roofs, 4),
    };
  }, [blocks]);

  return (
    <group>
      {geos.ladrillo ? (
        <mesh geometry={geos.ladrillo} material={mats.ladrillo} castShadow={shadows} receiveShadow={shadows} />
      ) : null}
      {geos.estuco ? (
        <mesh geometry={geos.estuco} material={mats.estuco} castShadow={shadows} receiveShadow={shadows} />
      ) : null}
      {geos.roofs ? <mesh geometry={geos.roofs} material={mats.roof} receiveShadow={shadows} /> : null}
    </group>
  );
}

function Streets({ frame, shadows }: { frame: BuildingFrame; shadows: boolean }) {
  const [cx, cz] = frame.center;
  const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
  const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
  const { walks, curbs, marks } = useMemo(() => {
    const L = 500;
    const walks: Box[] = [
      // andenes a ambos lados de cada calle
      { x: cx, y: 0.08, z: frontStreet - STREET / 2 - SIDEWALK / 2, w: L, h: 0.16, d: SIDEWALK, rotY: 0 },
      { x: cx, y: 0.08, z: frontStreet + STREET / 2 + SIDEWALK / 2, w: L, h: 0.16, d: SIDEWALK, rotY: 0 },
      { x: sideStreet - STREET / 2 - SIDEWALK / 2, y: 0.08, z: cz, w: SIDEWALK, h: 0.16, d: L, rotY: 0 },
      { x: sideStreet + STREET / 2 + SIDEWALK / 2, y: 0.08, z: cz, w: SIDEWALK, h: 0.16, d: L, rotY: 0 },
    ];
    const curbs: Box[] = walks.map((w) =>
      w.w > w.d
        ? { ...w, y: 0.09, d: 0.18, z: w.z + (w.z < frontStreet ? SIDEWALK / 2 : -SIDEWALK / 2) }
        : { ...w, y: 0.09, w: 0.18, x: w.x + (w.x < sideStreet ? SIDEWALK / 2 : -SIDEWALK / 2) },
    );
    const marks: Box[] = [];
    for (let t = -L / 2; t < L / 2; t += 6) {
      marks.push({ x: cx + t, y: 0.012, z: frontStreet, w: 3, h: 0.01, d: 0.14, rotY: 0 });
      marks.push({ x: sideStreet, y: 0.012, z: cz + t, w: 0.14, h: 0.01, d: 3, rotY: 0 });
    }
    return { walks, curbs, marks };
  }, [cx, cz, frontStreet, sideStreet]);
  const walkGeo = useMemo(() => mergeBoxes(walks, 2), [walks]);
  const curbGeo = useMemo(() => mergeBoxes(curbs, 2), [curbs]);
  const markGeo = useMemo(() => mergeBoxes(marks), [marks]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.005, frontStreet]} receiveShadow={shadows}>
        <planeGeometry args={[500, STREET]} />
        <meshStandardMaterial color="#47484a" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[sideStreet, 0.004, cz]} receiveShadow={shadows}>
        <planeGeometry args={[STREET, 500]} />
        <meshStandardMaterial color="#47484a" roughness={0.95} />
      </mesh>
      {walkGeo ? (
        <mesh geometry={walkGeo} receiveShadow={shadows}>
          <meshStandardMaterial color="#c4bfb6" roughness={0.9} />
        </mesh>
      ) : null}
      {curbGeo ? (
        <mesh geometry={curbGeo} receiveShadow={shadows}>
          <meshStandardMaterial color="#d8d4cc" roughness={0.85} />
        </mesh>
      ) : null}
      {markGeo ? (
        <mesh geometry={markGeo}>
          <meshStandardMaterial color="#e9e6df" roughness={0.6} />
        </mesh>
      ) : null}
    </group>
  );
}

/** Árboles de calle: tronco y copa de varias esferas, con variación. */
function Trees({ frame, facades, shadows }: { frame: BuildingFrame; facades: Facade[]; shadows: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const [cx, cz] = frame.center;
  const spots = useMemo(() => {
    const rand = mulberry32(77);
    const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
    const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
    const out: { x: number; z: number; s: number }[] = [];
    for (let t = -120; t <= 120; t += 8.5) {
      for (const side of [-1, 1]) {
        out.push({ x: cx + t + (rand() - 0.5) * 2, z: frontStreet + side * (STREET / 2 + 0.9), s: 0.8 + rand() * 0.5 });
        out.push({ x: sideStreet + side * (STREET / 2 + 0.9), z: cz + t + (rand() - 0.5) * 2, s: 0.8 + rand() * 0.5 });
      }
    }
    // el andén del hotel queda despejado para que se vean sus fachadas; tampoco en el cruce
    return out.filter(
      (p) =>
        !(Math.abs(p.x - cx) < frame.width / 2 + 5 && p.z < frontStreet && p.z > cz) &&
        !(Math.abs(p.z - cz) < frame.depth / 2 + 5 && p.x < sideStreet && p.x > cx) &&
        !(Math.abs(p.x - sideStreet) < STREET && Math.abs(p.z - frontStreet) < STREET) &&
        !inViewCorridor(p.x, p.z, frame, facades, -2),
    );
  }, [cx, cz, frame, facades]);

  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    const rand = mulberry32(5);
    const color = new THREE.Color();
    spots.forEach((p, i) => {
      m.position.set(p.x, 1.6 * p.s, p.z);
      m.rotation.set(0, 0, 0);
      m.scale.set(0.18 * p.s, 3.2 * p.s, 0.18 * p.s);
      m.updateMatrix();
      trunks.current?.setMatrixAt(i, m.matrix);
      for (let k = 0; k < 3; k++) {
        m.position.set(p.x + (rand() - 0.5) * 1.6 * p.s, (3.6 + rand() * 1.6) * p.s, p.z + (rand() - 0.5) * 1.6 * p.s);
        const r = (1.5 + rand() * 0.9) * p.s;
        m.scale.set(r, r * 0.85, r);
        m.rotation.set(rand(), rand(), rand());
        m.updateMatrix();
        crowns.current?.setMatrixAt(i * 3 + k, m.matrix);
        crowns.current?.setColorAt(i * 3 + k, color.setHSL(0.23 + rand() * 0.05, 0.28, 0.2 + rand() * 0.08));
      }
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true;
      if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true;
    }
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.length]} castShadow={shadows}>
        <cylinderGeometry args={[0.6, 1, 1, 6]} />
        <meshStandardMaterial color="#5c4a3a" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={crowns}
        args={[undefined, undefined, spots.length * 3]}
        castShadow={shadows}
        receiveShadow={shadows}
      >
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}

function Ridge({ frame }: { frame: BuildingFrame }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 160, 90, 16);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = (y + 80) / 160;
      const crest = 70 + Math.sin(x / 61) * 22 + Math.sin(x / 23 + 1.7) * 8 + Math.sin(x / 7.3) * 2;
      pos.setY(i, t * crest);
      pos.setZ(i, -t * 40);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  // cerros orientales al fondo (−z)
  return (
    <mesh geometry={geo} position={[frame.center[0], -1, frame.center[1] - 260]}>
      <meshStandardMaterial color="#56694d" roughness={1} />
    </mesh>
  );
}

const skyShader = {
  uniforms: {
    top: { value: new THREE.Color('#7f9db6') },
    horizon: { value: new THREE.Color('#dfe3e1') },
    glow: { value: new THREE.Color('#ffe2b8') },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 top;
    uniform vec3 horizon;
    uniform vec3 glow;
    varying vec3 vDir;
    void main() {
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 col = mix(horizon, top, pow(h, 0.55));
      // sol de la tarde hacia el occidente (+x)
      float sun = pow(max(dot(normalize(vDir), normalize(vec3(0.75, 0.32, 0.55))), 0.0), 18.0);
      col += glow * sun * 0.6;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function Context({ frame, facades, shadows }: { frame: BuildingFrame; facades: Facade[]; shadows: boolean }) {
  const [cx, cz] = frame.center;
  return (
    <group>
      <mesh scale={900}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial args={[skyShader]} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.02, cz]} receiveShadow={shadows}>
        <circleGeometry args={[480, 48]} />
        <meshStandardMaterial color="#8a867e" roughness={1} />
      </mesh>
      <Streets frame={frame} shadows={shadows} />
      <Trees frame={frame} facades={facades} shadows={shadows} />
      <NeighborBlocks frame={frame} facades={facades} shadows={shadows} />
      <Ridge frame={frame} />
    </group>
  );
}
