'use client';

import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { useNivel } from '@/components/hotel/Nivel';
import type { CameraPose } from '@/lib/building';
import { routes } from '@/lib/routes';
import { useTour } from '@/lib/store';
import type { Quality } from '@/lib/capabilities';

import { CameraRig } from '../CameraRig';
import { ExportHook } from '../ExportHook';
import { PoiProjector, SpaceLabelLayer } from '../Pois';
import type { SceneStage } from '../Scene';
import { spaceCenter, UnitModel } from '../UnitModel';
import { createLightUniforms, type LightUniforms } from '../windows';
import { Cabin } from './Cabin';
import { distToPath, fbm, groundGeometry, pathGeometry, scatter, terrainModel, type Lake, type TerrainModel } from './ground';
import { CabinLabels, LabelProjector, PoiLabels } from './TerrainLabels';
import type { TerrainCabin, TerrainData } from './types';

/**
 * Escena del glamping (D-083): un valle de páramo con los refugios sueltos.
 * - Entrada: la cámara baja desde arriba, a través de la niebla, hasta el valle.
 * - Explorar: vista del valle; cada refugio con su letrero delgado. Tocar uno lleva a él.
 * - Vista aérea (la "planta" del terreno): el terreno entero desde arriba.
 * - Refugio: la cámara vuela hasta él, el techo sube y se desvanece y queda la maqueta.
 * Comparte con el edificio la cámara (CameraRig), la maqueta de unidad, la reserva y el nivel.
 */

const FOV = 38;
const PLINTH = 0.55;

interface Props {
  data: TerrainData;
  stage: SceneStage;
  active: boolean;
  quality: Exclude<Quality, 'lista'>;
  reduced: boolean;
  intro: boolean;
}

export default function TerrainScene({ data, stage, active, quality, reduced, intro }: Props) {
  const router = useRouter();
  const nivel = useNivel();
  const night = useTour((s) => s.night);
  const hoveredUnit = useTour((s) => s.hoveredUnit?.id ?? null);
  const setHoveredUnit = useTour((s) => s.setHoveredUnit);
  const high = quality === 'alto';
  const shadows = quality !== 'bajo';

  const lakePoi = data.pois.find((p) => p.id.startsWith('laguna'));
  const lake: Lake | null = lakePoi ? { x: lakePoi.position[0], z: lakePoi.position[2], rx: 13, rz: 8.5 } : null;
  const model = useMemo(() => terrainModel(data.cabins, lake), [data.cabins, lake?.x, lake?.z]); // eslint-disable-line react-hooks/exhaustive-deps

  const light = useMemo<LightUniforms>(() => createLightUniforms(), []);
  useEffect(() => {
    gsap.to(light.uNight, { value: night ? 1 : 0, duration: reduced ? 0 : 2.2, ease: 'power2.inOut', overwrite: true });
  }, [night, reduced, light]);

  const unitId = stage.kind === 'unidad' ? stage.unitId : null;
  const spaceId = stage.kind === 'unidad' ? stage.spaceId : null;
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);
  const setHovered = (id: string | null) => setHoveredUnit(id ? { id, x: 0, y: 0 } : null);

  // dónde queda cada refugio: centro del plano a la altura de su terraza
  const placed = useMemo(
    () =>
      data.cabins.flatMap((c) => {
        const entry = data.unitPlans[c.id];
        if (!entry) return [];
        const floorY = (model.padHeight[c.id] ?? model.height(c.x, c.z)) + PLINTH;
        return [{ cabin: c, entry, pos: [c.x, floorY, c.z] as [number, number, number], ground: model.height(c.x, c.z) }];
      }),
    [data.cabins, data.unitPlans, model],
  );
  const current = placed.find((p) => p.cabin.id === unitId);

  // letreros: en la punta del techo de cada refugio
  const cabinAnchors = useRef(new Map<string, HTMLElement>());
  const poiAnchors = useRef(new Map<string, HTMLElement>());
  const spaceAnchors = useRef(new Map<string, HTMLElement>());
  const cabinPoints = useMemo(() => placed.map((p) => ({ id: p.cabin.id, position: [p.pos[0], p.pos[1] + 5.2, p.pos[2]] as [number, number, number] })), [placed]);
  const poiPoints = useMemo(
    () => data.pois.map((p) => ({ id: p.id, position: [p.position[0], model.height(p.position[0], p.position[2]) + 2.6, p.position[2]] as [number, number, number] })),
    [data.pois, model],
  );
  const spaceLabels = useMemo(() => {
    if (!current) return [];
    return current.entry.spaces.flatMap((s) => {
      const c = spaceCenter(current.entry.plan, s.id);
      return c
        ? [{ id: s.id, name: s.name, position: [current.pos[0] + c[0], current.pos[1] + 1.3, current.pos[2] + c[1]] as [number, number, number], href: routes.espacio(data.slug, current.cabin.id, s.id) }]
        : [];
    });
  }, [current, data.slug]);

  const inUnit = stage.kind === 'unidad';
  const aerial = stage.kind === 'piso';
  // la bajada desde el cielo empieza cuando se levanta el telón de marca (si no, pasaba tapada)
  const [descend, setDescend] = useState(!intro || reduced);

  return (
    <div className="relative size-full">
      <Canvas
        aria-hidden
        frameloop={active ? 'always' : 'never'}
        shadows={shadows ? 'soft' : false}
        dpr={high ? [1, 1.75] : [1, 1.25]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: FOV, near: 0.5, far: 2400, position: [0, 400, 40] }}
        onPointerMissed={() => setHovered(null)}
      >
        <ReadySignal />
        {!descend ? <WaitCurtain onLifted={() => setDescend(true)} /> : null}
        <ExportHook />
        <SkyAndFog light={light} intro={intro && !reduced} descend={descend} />
        <Lights light={light} shadows={shadows} high={high} />
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={1.2} color="#c9d4dc" position={[0, 60, 0]} rotation-x={Math.PI / 2} scale={[200, 200, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#ffe2bd" position={[80, 30, 60]} scale={[60, 20, 1]} />
        </Environment>
        <Ground model={model} shadows={shadows} />
        <Ridges />
        {lake ? <Water lake={lake} level={model.water} /> : null}
        <Paths data={data} model={model} placed={placed} />
        <Vegetation data={data} model={model} placed={placed} high={high} shadows={shadows} />
        <Reception data={data} model={model} light={light} shadows={shadows} />
        <Campfire data={data} model={model} light={light} />

        {placed.map((p) => (
          <group key={p.cabin.id}>
            <Cabin
              cabin={p.cabin}
              plan={p.entry.plan}
              spaces={p.entry.spaces}
              position={p.pos}
              groundY={p.ground}
              state={unitId === p.cabin.id ? 'open' : inUnit ? 'dim' : hoveredUnit === p.cabin.id ? 'hovered' : 'idle'}
              light={light}
              shadows={shadows}
              reduced={reduced}
            />
            {/* zona para el puntero: todo el refugio */}
            {!inUnit ? (
              <mesh
                position={[p.pos[0], p.pos[1] + 2, p.pos[2]]}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHovered(p.cabin.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHovered(null);
                  document.body.style.cursor = '';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = '';
                  router.push(p.cabin.href);
                }}
              >
                <boxGeometry args={[p.entry.plan.width / 100 + 1, 5, p.entry.plan.height / 100 + 1]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            ) : null}
          </group>
        ))}

        {current ? (
          <UnitModel
            key={`${current.cabin.id}-${nivel}`}
            plan={current.entry.plan}
            spaces={current.entry.spaces}
            realista={nivel === 'premium' ? current.entry.realista : undefined}
            position={current.pos}
            visible={inUnit && active}
            selectedSpace={spaceId}
            hoveredSpace={hoveredSpace}
            reduced={reduced}
            shadows={shadows}
            cut={spaceId !== null}
            focus={spaceId}
            onHover={setHoveredSpace}
            onSelect={(sid) => router.push(routes.espacio(data.slug, current.cabin.id, sid))}
          />
        ) : null}

        <LabelProjector points={cabinPoints} anchors={cabinAnchors} />
        <LabelProjector points={poiPoints} anchors={poiAnchors} />
        <PoiProjector pois={spaceLabels} anchors={spaceAnchors} />
        <Rig data={data} stage={stage} model={model} placed={placed} reduced={reduced} intro={intro && !reduced} descend={descend} />
      </Canvas>

      <PoiLabels pois={data.pois} anchors={poiAnchors} visible={active && !inUnit} />
      <CabinLabels cabins={data.cabins} anchors={cabinAnchors} visible={active && !inUnit && !aerial ? true : active && aerial} hovered={hoveredUnit} onHover={setHovered} offer={data.offer} />
      <SpaceLabelLayer
        labels={spaceId ? spaceLabels.filter((l) => l.id === spaceId) : spaceLabels}
        anchors={spaceAnchors}
        visible={inUnit && active}
        current={spaceId}
        hovered={hoveredSpace}
        onHover={setHoveredSpace}
      />
    </div>
  );
}

/** Espera a que el telón de marca (BrandIntro) se levante para empezar la bajada. */
function WaitCurtain({ onLifted }: { onLifted: () => void }) {
  const ready = useTour((s) => s.sceneReady);
  const n = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current || !ready || ++n.current % 6) return;
    const curtain = document.querySelector('.brand-intro');
    if (!curtain || curtain.classList.contains('brand-intro-leave')) {
      done.current = true;
      onLifted();
    }
  });
  return null;
}

function ReadySignal() {
  const frames = useRef(0);
  const setSceneReady = useTour((s) => s.setSceneReady);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) setSceneReady(true);
  });
  return null;
}

type Placed = { cabin: TerrainCabin; entry: TerrainData['unitPlans'][string]; pos: [number, number, number]; ground: number };

/** Cámara por etapa: valle, vista aérea, refugio y espacio. La entrada baja desde el cielo. */
function Rig({
  data,
  stage,
  model,
  placed,
  reduced,
  intro,
  descend,
}: {
  data: TerrainData;
  stage: SceneStage;
  model: TerrainModel;
  placed: Placed[];
  reduced: boolean;
  intro: boolean;
  descend: boolean;
}) {
  const size = useThree((s) => s.size);
  const wide = size.width >= 768;
  const portrait = size.height > size.width;
  const h0 = model.height(0, 0);
  const [mw, md] = data.mapSize;
  const span = Math.max(mw, md);
  // el centro de los refugios (no el del mapa): el valle se encuadra sobre ellos
  const cx = placed.length ? placed.reduce((a, p) => a + p.cabin.x, 0) / placed.length : 0;
  const cz = placed.length ? placed.reduce((a, p) => a + p.cabin.z, 0) / placed.length : 0;
  let pose: CameraPose = {
    target: [cx, model.height(cx, cz) + 2, cz + 4],
    radius: span * (portrait ? 1.35 : 0.78),
    polar: 1.02,
    azimuth: 0.3,
    shiftX: wide ? -0.1 : 0,
    shiftY: wide ? 0.02 : 0.1,
  };
  let key = 'valle';
  let depth = 1;
  const focus = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('enfocar') : null;
  const focused = stage.kind === 'explorar' && focus ? placed.find((p) => p.cabin.id === focus) : undefined;
  if (focused) {
    const W = focused.entry.plan.width / 100;
    const D = focused.entry.plan.height / 100;
    pose = { target: [focused.pos[0], focused.pos[1] + 1.6, focused.pos[2]], radius: Math.max(W, D) * 2.1 + 6, polar: 1.28, azimuth: 0.45, shiftX: 0, shiftY: 0 };
    key = `fuera-${focused.cabin.id}`;
  } else if (stage.kind === 'piso') {
    pose = { target: [cx, h0, cz], radius: span * (portrait ? 1.9 : 1.1), polar: 0.28, azimuth: 0, shiftX: wide ? -0.1 : 0, shiftY: wide ? 0.02 : 0.1 };
    key = 'aerea';
    depth = 1;
  } else if (stage.kind === 'unidad') {
    const p = placed.find((x) => x.cabin.id === stage.unitId);
    if (p) {
      const W = p.entry.plan.width / 100;
      const D = p.entry.plan.height / 100;
      const c = stage.spaceId ? spaceCenter(p.entry.plan, stage.spaceId) : null;
      if (c) {
        const sp = p.entry.plan.spaces.find((s) => s.id === stage.spaceId);
        const xs = sp?.points.map((q) => q[0] / 100) ?? [];
        const zs = sp?.points.map((q) => q[1] / 100) ?? [];
        const half = xs.length ? Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2 : 3;
        pose = {
          target: [p.pos[0] + c[0], p.pos[1] + 0.6, p.pos[2] + c[1]],
          radius: Math.min(9, Math.max(4.5, half * 2.2 + 2)) * (portrait ? 1.35 : 1),
          polar: 0.78,
          azimuth: 0.5,
          shiftX: wide ? 0.13 : 0,
          shiftY: wide ? 0 : 0.12,
        };
        key = `espacio-${stage.unitId}-${stage.spaceId}`;
        depth = 3;
      } else {
        pose = {
          target: [p.pos[0], p.pos[1] + 0.8, p.pos[2]],
          radius: (Math.max(W, D) * 1.35 + 6) * (portrait ? 1.45 : 1),
          polar: 0.86,
          azimuth: 0.5,
          shiftX: wide ? 0.13 : 0,
          shiftY: wide ? 0 : 0.14,
        };
        key = `refugio-${stage.unitId}`;
        depth = 2;
      }
    }
  }
  // entrada: desde muy arriba, girando un poco mientras baja a través de la niebla
  const introFrom: CameraPose = { ...pose, radius: pose.radius * 4.2, polar: 0.06, azimuth: pose.azimuth - 0.9 };
  const inUnit = stage.kind === 'unidad';
  return (
    <>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={pose.radius * (inUnit ? 0.6 : 0.55)}
        maxDistance={pose.radius * 1.35}
        minPolarAngle={0.05}
        maxPolarAngle={inUnit ? 1.2 : 1.32}
        rotateSpeed={0.8}
      />
      {/* antes de la bajada, la cámara espera arriba, sobre la niebla */}
      {descend ? (
        <CameraRig pose={pose} stageKey={key} depth={depth} intro={intro} reduced={reduced} autoRotate={false} introFrom={introFrom} introDuration={4.2} />
      ) : (
        <HoldCamera pose={introFrom} />
      )}
    </>
  );
}

function HoldCamera({ pose }: { pose: CameraPose }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const [tx, ty, tz] = pose.target;
    const sp = Math.sin(pose.polar);
    camera.position.set(tx + pose.radius * sp * Math.sin(pose.azimuth), ty + pose.radius * Math.cos(pose.polar), tz + pose.radius * sp * Math.cos(pose.azimuth));
    camera.lookAt(tx, ty, tz);
  }, [camera, pose]);
  return null;
}

/** Cielo de páramo (gradiente) y niebla: espesa al llegar y se abre mientras baja la cámara. */
function SkyAndFog({ light, intro, descend }: { light: LightUniforms; intro: boolean; descend: boolean }) {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.FogExp2('#c8cfcf', intro ? 0.011 : 0.0021), [intro]);
  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);
  useEffect(() => {
    if (intro && descend) gsap.to(fog, { density: 0.0021, duration: 4.6, ease: 'power2.out' });
  }, [intro, descend, fog]);
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uNight: light.uNight },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uNight;
          varying vec3 vDir;
          float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            float y = clamp(vDir.y, -0.2, 1.0);
            vec3 dayTop = vec3(0.62, 0.71, 0.78);
            vec3 dayHorizon = vec3(0.82, 0.84, 0.82);
            vec3 nightTop = vec3(0.03, 0.05, 0.10);
            vec3 nightHorizon = vec3(0.10, 0.12, 0.17);
            vec3 day = mix(dayHorizon, dayTop, smoothstep(0.0, 0.55, y));
            vec3 night = mix(nightHorizon, nightTop, smoothstep(0.0, 0.5, y));
            vec3 col = mix(day, night, uNight);
            // estrellas de noche
            vec2 g = floor(vDir.xz / max(vDir.y, 0.12) * 220.0);
            float s = step(0.9975, h(g)) * smoothstep(0.08, 0.3, y) * uNight;
            col += vec3(s);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [light],
  );
  useFrame(() => {
    const n = light.uNight.value;
    fog.color.setRGB(0.74 - 0.68 * n, 0.78 - 0.71 * n, 0.77 - 0.66 * n);
  });
  return (
    <mesh material={sky} scale={1600} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

function Lights({ light, shadows, high }: { light: LightUniforms; shadows: boolean; high: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const daySun = useMemo(() => new THREE.Color('#ffe7c8'), []);
  const moon = useMemo(() => new THREE.Color('#9fb4d6'), []);
  useFrame(() => {
    const n = light.uNight.value;
    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.lerp(2.6, 0.22, n);
      sun.current.color.copy(daySun).lerp(moon, n);
    }
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(0.9, 0.1, n);
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#d9e2e8', '#5d5a45', 0.9]} />
      <directionalLight
        ref={sun}
        position={[70, 90, 55]}
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-camera-left={-95}
        shadow-camera-right={95}
        shadow-camera-top={95}
        shadow-camera-bottom={-95}
        shadow-camera-far={300}
      />
    </>
  );
}

function Ground({ model, shadows }: { model: TerrainModel; shadows: boolean }) {
  const geo = useMemo(() => groundGeometry(model), [model]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

/** Cerros lejanos: tres anillos que se pierden en la niebla. */
function Ridges() {
  const geos = useMemo(
    () =>
      [
        { r: 360, h: 70, c: '#6b736c', seed: 1 },
        { r: 470, h: 110, c: '#7d8786', seed: 2 },
        { r: 600, h: 150, c: '#929c9d', seed: 3 },
      ].map(({ r, h, c, seed }) => {
        const seg = 160;
        const pos: number[] = [];
        const idx: number[] = [];
        for (let i = 0; i <= seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          const n = fbm(Math.cos(a) * 3 + seed * 10, Math.sin(a) * 3 + seed * 5);
          const top = h * (0.35 + n);
          const x = Math.cos(a) * r;
          const z = Math.sin(a) * r;
          pos.push(x, -20, z, x, top, z);
          if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return { g, c };
      }),
    [],
  );
  return (
    <>
      {geos.map(({ g, c }, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={c} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Water({ lake, level }: { lake: Lake; level: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[lake.x, level, lake.z]} scale={[lake.rx * 1.25, lake.rz * 1.25, 1]}>
      <circleGeometry args={[1, 48]} />
      <meshStandardMaterial color="#2f3d40" roughness={0.12} metalness={0.55} />
    </mesh>
  );
}

/** Senderos de tierra desde la recepción a cada refugio, a la fogata, a la laguna y al mirador. */
function usePaths(data: TerrainData, placed: Placed[]) {
  return useMemo(() => {
    const rec = data.pois.find((p) => p.id === 'recepcion');
    if (!rec) return [];
    const start: [number, number] = [rec.position[0], rec.position[2] - 4];
    const ends: [number, number][] = [
      ...placed.map((p) => {
        // a la puerta: el lado sur del refugio (abajo del plano)
        const D = p.entry.plan.height / 100;
        return [p.cabin.x, p.cabin.z + D / 2 + 1.2] as [number, number];
      }),
      ...data.pois.filter((p) => p.id !== 'recepcion').map((p) => [p.position[0], p.position[2] + 3] as [number, number]),
    ];
    return ends.map((end) => {
      const mid: [number, number] = [
        (start[0] + end[0]) / 2 + (fbm(end[0] / 10, end[1] / 10) - 0.5) * 16,
        (start[1] + end[1]) / 2 + (fbm(end[1] / 10, end[0] / 10) - 0.5) * 10,
      ];
      return [start, mid, end];
    });
  }, [data.pois, placed]);
}

function Paths({ data, model, placed }: { data: TerrainData; model: TerrainModel; placed: Placed[] }) {
  const paths = usePaths(data, placed);
  const geos = useMemo(() => paths.map((p) => pathGeometry(model, p)), [paths, model]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial color="#8a7a5c" roughness={1} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
    </>
  );
}

/** Frailejones, pajonal, rocas y un bosquecito de encenillos. Instanciados: livianos aunque sean miles. */
function Vegetation({ data, model, placed, high, shadows }: { data: TerrainData; model: TerrainModel; placed: Placed[]; high: boolean; shadows: boolean }) {
  const paths = usePaths(data, placed);
  const sets = useMemo(() => {
    const clear = (x: number, z: number, pad: number) => {
      for (const p of placed) {
        const W = p.entry.plan.width / 200 + 6 + pad;
        const D = p.entry.plan.height / 200 + 6 + pad;
        if (Math.abs(x - p.cabin.x) < W && Math.abs(z - p.cabin.z) < D) return false;
      }
      for (const p of data.pois) if (Math.hypot(x - p.position[0], z - p.position[2]) < 7 + pad) return false;
      for (const path of paths) if (distToPath(x, z, path) < 1.6 + pad) return false;
      if (model.lake && Math.hypot((x - model.lake.x) / model.lake.rx, (z - model.lake.z) / model.lake.rz) < 1.45) return false;
      return true;
    };
    const k = high ? 1 : 0.55;
    const frailejones = scatter(Math.round(520 * k), 150, 11, (x, z, r) => clear(x, z, 0) && r < 0.35 + 0.5 * fbm(x / 30, z / 30));
    const pajonal = scatter(Math.round(1600 * k), 200, 23, (x, z) => clear(x, z, -0.5));
    const rocas = scatter(Math.round(90 * k), 170, 37, (x, z) => clear(x, z, 0));
    // encenillos: al occidente de la cabaña que lleva su nombre
    const enc = placed.find((p) => p.cabin.id === 'encenillo');
    const bosque = enc
      ? scatter(Math.round(140 * k), 26, 41, (x, z) => clear(enc.cabin.x - 30 + x, enc.cabin.z + z, 0)).map((p) => ({ ...p, x: enc.cabin.x - 30 + p.x, z: enc.cabin.z + p.z }))
      : [];
    return { frailejones, pajonal, rocas, bosque };
  }, [placed, data.pois, paths, model, high]);

  const geo = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.11, 0.16, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(0.42, 1);
    crown.scale(1, 0.62, 1);
    const tuft = new THREE.ConeGeometry(0.42, 0.75, 6);
    tuft.translate(0, 0.37, 0);
    const rock = new THREE.DodecahedronGeometry(0.7, 0);
    const tree = new THREE.ConeGeometry(1.5, 4.5, 7);
    tree.translate(0, 3.2, 0);
    const treeTrunk = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 5);
    treeTrunk.translate(0, 0.6, 0);
    return { trunk, crown, tuft, rock, tree, treeTrunk };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const tuftRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const treeTrunkRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const refs = { trunk: trunkRef, crown: crownRef, tuft: tuftRef, rock: rockRef, tree: treeRef, treeTrunk: treeTrunkRef };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const set = (mesh: THREE.InstancedMesh | null, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rot: number) => {
      if (!mesh) return;
      q.setFromAxisAngle(up, rot);
      m.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
      mesh.setMatrixAt(i, m);
    };
    sets.frailejones.forEach((f, i) => {
      const h = 0.6 + f.s * 2.2;
      const y = model.height(f.x, f.z);
      set(refs.trunk.current, i, f.x, y, f.z, 1.3, h, 1.3, f.r * 6);
      set(refs.crown.current, i, f.x, y + h + 0.15, f.z, 1.3 + f.r * 0.5, 1.2 + f.r * 0.4, 1.3 + f.r * 0.5, f.r * 6);
    });
    sets.pajonal.forEach((t, i) => {
      const sc = 0.9 + t.s * 1.3;
      set(refs.tuft.current, i, t.x, model.height(t.x, t.z) - 0.05, t.z, sc, sc * (0.8 + t.r * 0.6), sc, t.r * 6);
    });
    sets.rocas.forEach((r, i) => {
      const sc = 0.5 + r.s * 1.6;
      set(refs.rock.current, i, r.x, model.height(r.x, r.z) + sc * 0.2, r.z, sc, sc * 0.6, sc * 0.9, r.r * 6);
    });
    sets.bosque.forEach((t, i) => {
      const sc = 0.8 + t.s * 0.6;
      const y = model.height(t.x, t.z);
      set(refs.tree.current, i, t.x, y, t.z, sc, sc, sc, t.r * 6);
      set(refs.treeTrunk.current, i, t.x, y, t.z, sc, sc, sc, 0);
    });
    Object.values(refs).forEach((r) => {
      if (r.current) {
        r.current.instanceMatrix.needsUpdate = true;
        r.current.computeBoundingSphere();
      }
    });
  }, [sets, model]);

  return (
    <>
      <instancedMesh ref={trunkRef} args={[geo.trunk, undefined, sets.frailejones.length]} castShadow={shadows}>
        <meshStandardMaterial color="#3a2e24" roughness={1} />
      </instancedMesh>
      {/* la roseta plateada del frailejón */}
      <instancedMesh ref={crownRef} args={[geo.crown, undefined, sets.frailejones.length]} castShadow={shadows}>
        <meshStandardMaterial color="#7c8565" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={tuftRef} args={[geo.tuft, undefined, sets.pajonal.length]}>
        <meshStandardMaterial color="#857546" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[geo.rock, undefined, sets.rocas.length]} castShadow={shadows} receiveShadow={shadows}>
        <meshStandardMaterial color="#77756d" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={treeRef} args={[geo.tree, undefined, sets.bosque.length]} castShadow={shadows}>
        <meshStandardMaterial color="#3f4f37" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={treeTrunkRef} args={[geo.treeTrunk, undefined, sets.bosque.length]}>
        <meshStandardMaterial color="#3b2e24" roughness={1} />
      </instancedMesh>
    </>
  );
}

const RECEPTION_ROOF = (() => {
  const s = new THREE.Shape();
  s.moveTo(-5.0, 0);
  s.lineTo(5.0, 0);
  s.lineTo(0, 2.3);
  s.closePath();
  return s;
})();

/** Recepción: casita de madera con techo a dos aguas, encendida de noche. */
function Reception({ data, model, light, shadows }: { data: TerrainData; model: TerrainModel; light: LightUniforms; shadows: boolean }) {
  const rec = data.pois.find((p) => p.id === 'recepcion');
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b3438', roughness: 0.1, metalness: 0.5, emissive: new THREE.Color('#ffbe73'), emissiveIntensity: 0 }), []);
  useFrame(() => {
    glass.emissiveIntensity = light.uNight.value * 1.6;
  });
  if (!rec) return null;
  const x = rec.position[0];
  const z = rec.position[2];
  const y = model.height(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 1.6, 0]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[9, 3.2, 5.5]} />
        <meshStandardMaterial color="#5b4532" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.4, 2.76]} material={glass}>
        <planeGeometry args={[6.5, 1.8]} />
      </mesh>
      <mesh position={[0, 3.2, -3.15]} castShadow={shadows}>
        <extrudeGeometry args={[RECEPTION_ROOF, { depth: 6.3, bevelEnabled: false }]} />
        <meshStandardMaterial color="#2e3133" roughness={0.55} metalness={0.35} />
      </mesh>
    </group>
  );
}

/** Fogata: círculo de piedras y fuego que titila de noche. */
function Campfire({ data, model, light }: { data: TerrainData; model: TerrainModel; light: LightUniforms }) {
  const poi = data.pois.find((p) => p.id === 'fogata');
  const fire = useRef<THREE.MeshStandardMaterial>(null);
  const lamp = useRef<THREE.PointLight>(null);
  useFrame((st) => {
    const n = light.uNight.value;
    const flick = 0.8 + 0.2 * Math.sin(st.clock.elapsedTime * 11) * Math.sin(st.clock.elapsedTime * 7.3);
    if (fire.current) fire.current.emissiveIntensity = (0.6 + 2.4 * n) * flick;
    if (lamp.current) lamp.current.intensity = n * 30 * flick;
  });
  if (!poi) return null;
  const x = poi.position[0];
  const z = poi.position[2];
  const y = model.height(x, z);
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.3, 0.15, Math.sin(a) * 1.3]}>
            <dodecahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial color="#6d6a62" roughness={1} flatShading />
          </mesh>
        );
      })}
      {Array.from({ length: 4 }, (_, i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 3.2, 0.25, Math.sin(a) * 3.2]} rotation-y={-a}>
            <boxGeometry args={[0.45, 0.45, 2.2]} />
            <meshStandardMaterial color="#5b4532" roughness={1} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.45, 0]}>
        <coneGeometry args={[0.5, 0.95, 7]} />
        <meshStandardMaterial ref={fire} color="#3a2010" emissive="#ff8a2a" emissiveIntensity={0.6} />
      </mesh>
      <pointLight ref={lamp} position={[0, 1.2, 0]} color="#ff9d4a" intensity={0} distance={22} decay={1.6} />
    </group>
  );
}
