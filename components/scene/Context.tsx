'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { BuildingFrame, Facade } from '@/lib/building';

import { VIEW_ONLY_LAYER } from './Backdrop';
import { mergeBoxes, type Box } from './geometry';
import { RealNeighbors, streetSpots, type LampSpot, type RealContextData } from './RealContext';
import { neighborFacadeTexture, neighborLitTexture } from './textures';
import type { LightUniforms } from './windows';

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
    if (along < 0 || along > 75) return false;
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
  /** en el corredor de vista: solo lo ve la cámara de la ventana (capa VIEW_ONLY) */
  viewOnly: boolean;
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
          // en el corredor de vista de una fachada: no tapa la cámara, pero sí aparece en la vista desde la ventana
          const viewOnly = inViewCorridor(bx, bz, frame, facades, Math.max(w, d) / 2);
          out.push({ x: bx, z: bz, w, d, h: floors * 2.9, kind: rand() < 0.62 ? 'ladrillo' : 'estuco', viewOnly });
        }
      }
    }
    return out;
  }, [frame, facades]);
}

function NeighborBlocks({
  frame,
  facades,
  shadows,
  light,
}: {
  frame: BuildingFrame;
  facades: Facade[];
  shadows: boolean;
  light: LightUniforms;
}) {
  const blocks = useNeighbors(frame, facades);
  const mats = useMemo(() => {
    const roof = new THREE.MeshStandardMaterial({ color: '#8f8a82', roughness: 0.95 });
    const make = (kind: 'ladrillo' | 'estuco', seed: number) =>
      new THREE.MeshStandardMaterial({
        map: neighborFacadeTexture(kind, kind === 'ladrillo' ? 3 : 9),
        emissiveMap: neighborLitTexture(seed),
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0,
        roughness: 0.92,
      });
    return { roof, ladrillo: make('ladrillo', 21), estuco: make('estuco', 37) };
  }, []);
  useFrame(() => {
    const n = light.uNight.value;
    mats.ladrillo.emissiveIntensity = n * 1.4;
    mats.estuco.emissiveIntensity = n * 1.4;
  });

  const geos = useMemo(() => build(blocks.filter((b) => !b.viewOnly)), [blocks]);
  const viewGeos = useMemo(() => build(blocks.filter((b) => b.viewOnly)), [blocks]);

  return (
    <group>
      <BlockMeshes geos={geos} mats={mats} shadows={shadows} />
      <BlockMeshes geos={viewGeos} mats={mats} shadows={false} layer={VIEW_ONLY_LAYER} />
    </group>
  );
}

function build(blocks: Block[]) {
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
}

/** Pone un objeto (y sus hijos) en una capa de render. */
const onLayer = (layer?: number) => (o: THREE.Object3D | null) => {
  if (o && layer !== undefined) o.traverse((c) => c.layers.set(layer));
};

function BlockMeshes({
  geos,
  mats,
  shadows,
  layer,
}: {
  geos: ReturnType<typeof build>;
  mats: { roof: THREE.Material; ladrillo: THREE.Material; estuco: THREE.Material };
  shadows: boolean;
  layer?: number;
}) {
  return (
    <group ref={onLayer(layer)}>
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

interface TreeSpot {
  x: number;
  z: number;
  s: number;
}

/** Árboles de calle; los del corredor de vista solo aparecen en la vista desde la ventana. */
function Trees({
  frame,
  facades,
  shadows,
  spots,
}: {
  frame: BuildingFrame;
  facades: Facade[];
  shadows: boolean;
  /** árboles ya ubicados (contexto real, a lo largo de las calles) */
  spots?: TreeSpot[];
}) {
  const [cx, cz] = frame.center;
  const all = useMemo(() => {
    if (spots) return spots;
    const rand = mulberry32(77);
    const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
    const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
    const out: TreeSpot[] = [];
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
        !(Math.abs(p.x - sideStreet) < STREET && Math.abs(p.z - frontStreet) < STREET),
    );
  }, [cx, cz, frame, spots]);
  const main = useMemo(() => all.filter((p) => !inViewCorridor(p.x, p.z, frame, facades, -2)), [all, frame, facades]);
  const viewOnly = useMemo(() => all.filter((p) => inViewCorridor(p.x, p.z, frame, facades, -2)), [all, frame, facades]);
  return (
    <group>
      <TreeSet spots={main} shadows={shadows} />
      <TreeSet spots={viewOnly} shadows={false} layer={VIEW_ONLY_LAYER} />
    </group>
  );
}

function TreeSet({ spots, shadows, layer }: { spots: TreeSpot[]; shadows: boolean; layer?: number }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
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

  if (!spots.length) return null;
  return (
    <group ref={onLayer(layer)}>
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

const skyFragment = /* glsl */ `
  uniform float uNight;
  varying vec3 vDir;
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, 0.0, 1.0);
    // día: tarde bogotana; el sol bajo hacia el occidente (+x)
    vec3 day = mix(vec3(0.87, 0.89, 0.88), vec3(0.50, 0.62, 0.71), pow(h, 0.55));
    float sun = pow(max(dot(dir, normalize(vec3(0.75, 0.32, 0.55))), 0.0), 18.0);
    day += vec3(1.0, 0.89, 0.72) * sun * 0.6;
    // noche: azul profundo, resplandor de ciudad en el horizonte y estrellas
    vec3 night = mix(vec3(0.10, 0.09, 0.11), vec3(0.012, 0.018, 0.04), pow(h, 0.4));
    night += vec3(0.20, 0.12, 0.06) * pow(1.0 - h, 6.0) * 0.6;
    vec2 cell = floor(vec2(atan(dir.z, dir.x) * 180.0, dir.y * 260.0));
    float star = step(0.9965, hash2(cell)) * smoothstep(0.08, 0.35, h);
    night += vec3(star) * 0.9;
    gl_FragColor = vec4(mix(day, night, uNight), 1.0);
  }
`;

/** Faroles a lo largo de los andenes: poste, cabeza encendida de noche y charco de luz. */
function StreetLamps({
  frame,
  facades,
  light,
  shadows,
  custom,
}: {
  frame: BuildingFrame;
  facades: Facade[];
  light: LightUniforms;
  shadows: boolean;
  /** postes ya ubicados (contexto real) */
  custom?: LampSpot[];
}) {
  const [cx, cz] = frame.center;
  const spots = useMemo(() => {
    if (custom) return custom.filter((p) => !inViewCorridor(p.x, p.z, frame, facades, -7));
    const frontStreet = cz + frame.depth / 2 + SIDEWALK + STREET / 2;
    const sideStreet = cx + frame.width / 2 + SIDEWALK + STREET / 2;
    const out: { x: number; z: number; rot: number }[] = [];
    for (let t = -150; t <= 150; t += 17) {
      out.push({ x: cx + t, z: frontStreet - STREET / 2 - 0.5, rot: 0 });
      out.push({ x: cx + t + 8, z: frontStreet + STREET / 2 + 0.5, rot: Math.PI });
      out.push({ x: sideStreet - STREET / 2 - 0.5, z: cz + t, rot: -Math.PI / 2 });
      out.push({ x: sideStreet + STREET / 2 + 0.5, z: cz + t + 8, rot: Math.PI / 2 });
    }
    return out.filter((p) => !inViewCorridor(p.x, p.z, frame, facades, -7));
  }, [cx, cz, frame, facades, custom]);
  const posts = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d9d4c8', emissive: new THREE.Color('#ffc983'), emissiveIntensity: 0 }),
    [],
  );
  const poolMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uNight: light.uNight },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uNight; varying vec2 vUv;
          void main() { float r = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - r, 0.0, 1.0), 1.8) * 0.5 * uNight;
          gl_FragColor = vec4(vec3(1.0, 0.76, 0.45) * a, 1.0); }
        `,
      }),
    [light],
  );
  useFrame(() => {
    headMat.emissiveIntensity = light.uNight.value * 4;
  });
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    spots.forEach((p, i) => {
      m.position.set(p.x, 2.8, p.z);
      m.rotation.set(0, 0, 0);
      m.scale.set(1, 1, 1);
      m.updateMatrix();
      posts.current?.setMatrixAt(i, m.matrix);
      const off = new THREE.Vector3(0, 0, 0.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      m.position.set(p.x + off.x, 5.55, p.z + off.z);
      m.rotation.set(0, p.rot, 0);
      m.updateMatrix();
      heads.current?.setMatrixAt(i, m.matrix);
      m.position.set(p.x + off.x * 1.6, 0.03, p.z + off.z * 1.6);
      m.rotation.set(-Math.PI / 2, 0, 0);
      m.updateMatrix();
      pools.current?.setMatrixAt(i, m.matrix);
    });
    for (const r of [posts, heads, pools]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, spots.length]} castShadow={shadows}>
        <cylinderGeometry args={[0.07, 0.09, 5.6, 8]} />
        <meshStandardMaterial color="#2c2e30" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, spots.length]} material={headMat}>
        <boxGeometry args={[0.32, 0.12, 0.9]} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[undefined, undefined, spots.length]} material={poolMat} renderOrder={2}>
        <planeGeometry args={[9, 9]} />
      </instancedMesh>
    </group>
  );
}

/** Luces de sol/luna; se usan en las dos escenas (fondo y edificio). */
export function DayNightLights({
  frame,
  light,
  shadows,
  high,
}: {
  frame: BuildingFrame;
  light: LightUniforms;
  shadows: boolean;
  high: boolean;
}) {
  const [cx, cz] = frame.center;
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const daySun = useMemo(() => new THREE.Color('#ffe3c2'), []);
  const moon = useMemo(() => new THREE.Color('#9fb4d6'), []);
  const daySky = useMemo(() => new THREE.Color('#dce6ee'), []);
  const nightSky = useMemo(() => new THREE.Color('#2a3550'), []);
  useFrame(() => {
    const n = light.uNight.value;
    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(3.1, 0.45, n);
      sun.current.color.copy(daySun).lerp(moon, n);
    }
    if (hemi.current) {
      hemi.current.intensity = THREE.MathUtils.lerp(0.75, 0.34, n);
      hemi.current.color.copy(daySky).lerp(nightSky, n);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#dce6ee', '#6f665a', 0.75]} />
      <directionalLight
        ref={sun}
        position={[cx + 75, 62, cz + 58]}
        intensity={3.1}
        color="#ffe3c2"
        castShadow={shadows}
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={10}
        shadow-camera-far={280}
      />
    </>
  );
}

export function Context({
  frame,
  facades,
  shadows,
  high,
  light,
  real,
  footprint,
}: {
  frame: BuildingFrame;
  facades: Facade[];
  shadows: boolean;
  high: boolean;
  light: LightUniforms;
  /** contexto real (catastro + OpenStreetMap, D-056); sin él, vecinos y calles inventados */
  real?: RealContextData | null;
  footprint: [number, number][];
}) {
  const realSpots = useMemo(() => (real ? streetSpots(real, footprint) : null), [real, footprint]);
  const inCorridor = useCallback((x: number, z: number, pad: number) => inViewCorridor(x, z, frame, facades, pad), [frame, facades]);
  const [cx, cz] = frame.center;
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uNight: light.uNight },
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [light],
  );
  const fog = useMemo(() => new THREE.Fog('#d9dcda', 160, 820), []);
  const dayFog = useMemo(() => new THREE.Color('#d9dcda'), []);
  const nightFog = useMemo(() => new THREE.Color('#14161d'), []);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);
  useFrame(() => {
    fog.color.copy(dayFog).lerp(nightFog, light.uNight.value);
  });
  return (
    <group>
      <DayNightLights frame={frame} light={light} shadows={shadows} high={high} />
      <mesh scale={900} material={sky}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.02, cz]} receiveShadow={shadows}>
        <circleGeometry args={[480, 48]} />
        <meshStandardMaterial color="#8a867e" roughness={1} />
      </mesh>
      {real && realSpots ? (
        <>
          <RealNeighbors data={real} frame={frame} facades={facades} inCorridor={inCorridor} shadows={shadows} light={light} />
          <StreetLamps frame={frame} facades={facades} light={light} shadows={shadows} custom={realSpots.lamps} />
          <Trees frame={frame} facades={facades} shadows={shadows} spots={realSpots.trees} />
        </>
      ) : (
        <>
          <Streets frame={frame} shadows={shadows} />
          <StreetLamps frame={frame} facades={facades} light={light} shadows={shadows} />
          <Trees frame={frame} facades={facades} shadows={shadows} />
          <NeighborBlocks frame={frame} facades={facades} shadows={shadows} light={light} />
        </>
      )}
      <Ridge frame={frame} />
    </group>
  );
}
