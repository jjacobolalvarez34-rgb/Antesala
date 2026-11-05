'use client';

import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import {
  buildingFrame,
  facadeDir,
  facadePose,
  facadesOf,
  floorPose,
  FLOOR_PULL,
  spacePose,
  unitPose,
  windowViewpoint,
  type Facade,
} from '@/lib/building';
import { higherQuality, lowerQuality, type Quality } from '@/lib/capabilities';
import { formatCOP } from '@/lib/hotel';
import { polygonLabelPoint } from '@/lib/plan';
import { routes } from '@/lib/routes';
import { useTour } from '@/lib/store';
import type { Building, PlanGeometry } from '@/lib/types';

import { ASSETS, loadBrick, loadEnvironment, loadLinen, prefetch, type CladdingMaps } from './assets';
import { Backdrop, VIEW_ONLY_LAYER, type BackdropApi } from './Backdrop';
import { BuildingModel, type BuildingColors, type FacadeUnit, type SceneFloor } from './Building';
import type { FloorPlanSpace } from './FloorPlanModel';
import { CameraRig } from './CameraRig';
import { Context, DayNightLights } from './Context';
import { PanoSphere, panoDirection } from './PanoSphere';
import { PoiLayer, PoiProjector, SpaceLabelLayer, type ScenePoi } from './Pois';
import { TourGuide, type GuideStep } from './TourGuide';
import { spaceCenter, UnitModel, type UnitSpaceMeta } from './UnitModel';
import { UnitOverlay } from './UnitOverlay';
import { ViewpointOverlay } from './ViewpointOverlay';
import { createLightUniforms, MAX_UNITS, type LightUniforms } from './windows';

export interface SceneUnit {
  id: string;
  name: string;
  category?: string;
  levelId: string;
  levelName?: string;
  price?: number;
  viewPremium?: number;
  view?: string;
  href: Route;
  exterior: { facade: number; windows: number[] }[];
  balcony: boolean;
}

export interface SceneData {
  slug: string;
  brandName: string;
  building: Building;
  floors: SceneFloor[];
  pois: ScenePoi[];
  units: SceneUnit[];
  colors: BuildingColors;
  /** planta de cada piso (D-041) */
  levelPlans: Record<string, { plan: PlanGeometry; spaces: FloorPlanSpace[] }>;
  /**
   * Demo (D-046): el 360° de cada espacio se recorre por dentro de la maqueta
   * amoblada, en vivo. Un hotel real muestra sus fotos 360° capturadas.
   */
  liveInterior: boolean;
  /** plano parseado y espacios de cada unidad (maqueta del bloque 3) */
  unitPlans: Record<string, { plan: PlanGeometry; spaces: UnitSpaceMeta[] }>;
}

export type SceneStage =
  | { kind: 'explorar' }
  | { kind: 'piso'; levelId: string }
  | { kind: 'unidad'; unitId: string; spaceId: string | null };

/** Dónde se ubica la maqueta: dentro del edificio, sobre la losa de su piso. */
function unitAnchor(data: SceneData, frame: ReturnType<typeof buildingFrame>, unitId: string): [number, number, number] | null {
  const unit = data.units.find((u) => u.id === unitId);
  const order = unit ? data.floors.find((f) => f.id === unit.levelId)?.order : undefined;
  if (order === undefined) return null;
  return [frame.center[0], (order - 1) * frame.floorHeight + 0.3, frame.center[1]];
}

interface Props {
  data: SceneData;
  stage: SceneStage;
  active: boolean;
  quality: Exclude<Quality, 'lista'>;
  qualityLocked: boolean;
  reduced: boolean;
  intro: boolean;
}

const FOV = 30;

/** En el 360° la cámara se abre (gran angular, como una foto de interior); afuera vuelve al tele. */
function FovController({ wide, reduced }: { wide: boolean; reduced: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    const target = wide ? 75 : FOV;
    const tween = gsap.to(camera, {
      fov: target,
      duration: reduced ? 0 : 0.9,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => camera.updateProjectionMatrix(),
    });
    return () => {
      tween.kill();
    };
  }, [wide, reduced, camera]);
  return null;
}

/** En un mirador se ven también los vecinos del corredor de vista (capa VIEW_ONLY). */
function ViewLayerController({ on }: { on: boolean }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (on) camera.layers.enable(VIEW_ONLY_LAYER);
    else camera.layers.disable(VIEW_ONLY_LAYER);
  }, [on, camera]);
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

/** Cámara: fachada elegida en la vista exterior; el piso visto desde esa fachada. */
function Rig({
  data,
  stage,
  facade,
  reduced,
  intro,
  pano,
  vp,
  in360,
}: Pick<Props, 'data' | 'stage' | 'reduced' | 'intro'> & {
  facade: Facade;
  in360: boolean;
  pano: { yaw: number; eye: [number, number, number]; live: boolean } | null;
  vp: { key: string; position: [number, number, number]; yaw: number } | null;
}) {
  const frame = useMemo(() => buildingFrame(data.building), [data.building]);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(size.height, 1);
  const wide = size.width >= 768;
  const layout = wide ? 'side' : 'sheet';
  const floorOrder = stage.kind === 'piso' ? data.floors.find((f) => f.id === stage.levelId)?.order : undefined;
  let pose = facadePose(frame, facade, FOV, aspect, wide);
  let stageKey = `explorar-${facade.index}`;
  let depth = 1;
  if (vp && stage.kind === 'explorar') {
    // mirador: la cámara se para en el punto y mira hacia yaw, un poco hacia abajo
    pose = {
      target: vp.position,
      radius: 0.05,
      polar: Math.PI / 2 - 0.1,
      azimuth: Math.atan2(-Math.cos(vp.yaw), -Math.sin(vp.yaw)),
      shiftX: 0,
      shiftY: 0,
    };
    stageKey = `vp-${vp.key}`;
    depth = 3;
  } else if (floorOrder !== undefined) {
    pose = floorPose(frame, floorOrder, facade, FOV, aspect, layout);
    stageKey = `piso-${floorOrder}`;
    depth = 2;
  } else if (stage.kind === 'unidad') {
    const anchor = unitAnchor(data, frame, stage.unitId);
    const plan = data.unitPlans[stage.unitId]?.plan;
    if (anchor && plan) {
      const c = stage.spaceId ? spaceCenter(plan, stage.spaceId) : null;
      if (c && pano) {
        // 360°: la cámara se para en el punto de vista y mira hacia la ventana
        // (por dentro de la maqueta, un poco hacia abajo para ver también los muebles)
        const look = pano.yaw;
        pose = {
          target: pano.eye,
          radius: 0.05,
          polar: pano.live ? Math.PI / 2 - 0.2 : Math.PI / 2,
          azimuth: Math.atan2(-Math.cos(look), -Math.sin(look)),
          shiftX: 0,
          shiftY: 0,
        };
        stageKey = `pano-${stage.unitId}-${stage.spaceId}`;
        depth = 5;
      } else if (c) {
        pose = spacePose([anchor[0] + c[0], anchor[1] + 0.6, anchor[2] + c[1]], facade, FOV, aspect, layout);
        stageKey = `espacio-${stage.unitId}-${stage.spaceId}`;
        depth = 4;
      } else {
        pose = unitPose([anchor[0], anchor[1] + 0.4, anchor[2]], [plan.width / 100, plan.height / 100], facade, FOV, aspect, layout);
        stageKey = `unidad-${stage.unitId}`;
        depth = 3;
      }
    }
  }
  // límites alrededor del encuadre de cada vista: se puede acercar, alejar e inclinar
  // un poco, pero no tanto como para perder el edificio o ver el vacío del fondo
  return (
    <>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        enableZoom={!in360}
        minDistance={in360 ? 0.04 : pose.radius * 0.65}
        maxDistance={in360 ? 0.06 : pose.radius * 1.3}
        minPolarAngle={in360 ? 0.35 : Math.max(0.2, pose.polar - 0.55)}
        maxPolarAngle={in360 ? 2.8 : Math.min(1.48, pose.polar + 0.14)}
        rotateSpeed={in360 ? -0.35 : 0.6}
      />
      <CameraRig pose={pose} stageKey={stageKey} depth={depth} intro={intro} reduced={reduced} autoRotate={false} />
    </>
  );
}

/** Enciende o apaga la luz de cada unidad con una transición suave. */
function UnitLights({ light, units }: { light: LightUniforms; units: SceneUnit[] }) {
  const hovered = useTour((s) => s.hoveredUnit?.id ?? null);
  const selected = useTour((s) => s.selectedUnit);
  useFrame((_, delta) => {
    const arr = light.uUnitLight.value;
    const k = 1 - Math.exp(-delta * 16);
    for (let i = 0; i < Math.min(units.length, MAX_UNITS); i++) {
      const id = units[i]!.id;
      const target = id === hovered || id === selected ? 1 : 0;
      arr[i] = arr[i]! + (target - arr[i]!) * k;
    }
  });
  return null;
}

/** Entorno del edificio: HDRI real cuando llega; mientras tanto, luces de estudio. */
function BuildingEnvironment({ map, light }: { map: THREE.Texture | null; light: LightUniforms }) {
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    scene.environmentIntensity = THREE.MathUtils.lerp(1, 0.5, light.uNight.value);
  });
  if (map) return <Environment map={map} />;
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={1.1} color="#9fb9cf" position={[0, 60, 0]} rotation-x={Math.PI / 2} scale={[200, 200, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffe2bd" position={[60, 25, 45]} scale={[30, 14, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#dfe3e1" position={[-60, 12, 0]} rotation-y={Math.PI / 2} scale={[120, 20, 1]} />
      <Lightformer form="rect" intensity={0.35} color="#7a7368" position={[0, -10, 0]} rotation-x={-Math.PI / 2} scale={[200, 200, 1]} />
    </Environment>
  );
}

export default function Scene({ data, stage, active, quality, qualityLocked, reduced, intro }: Props) {
  const router = useRouter();
  const frame = useMemo(() => buildingFrame(data.building), [data.building]);
  const facades = useMemo(() => facadesOf(data.building), [data.building]);
  const hoveredLevelId = useTour((s) => s.hoveredLevelId);
  const setHoveredLevel = useTour((s) => s.setHoveredLevel);
  const setQuality = useTour((s) => s.setQuality);
  const sceneReady = useTour((s) => s.sceneReady);
  const night = useTour((s) => s.night);
  const facadeIndex = useTour((s) => s.facade);
  const setHoveredUnit = useTour((s) => s.setHoveredUnit);
  const setSelectedUnit = useTour((s) => s.setSelectedUnit);
  const high = quality === 'alto';
  const shadows = quality !== 'bajo';
  const selectedId = stage.kind === 'piso' ? stage.levelId : null;
  const inUnit = stage.kind === 'unidad';
  const unitId = stage.kind === 'unidad' ? stage.unitId : null;
  const spaceId = stage.kind === 'unidad' ? stage.spaceId : null;
  const [hoveredSpace, setHoveredSpace] = useState<string | null>(null);
  const [planHovered, setPlanHovered] = useState<string | null>(null);
  const floorAnchors = useRef(new Map<string, HTMLElement>());
  const floorLabels = useMemo(() => {
    if (stage.kind !== 'piso') return [];
    const entry = data.levelPlans[stage.levelId];
    const order = data.floors.find((f) => f.id === stage.levelId)?.order;
    if (!entry || order === undefined) return [];
    const fc = facadesOf(data.building);
    const [px, pz] = facadeDir(fc[facadeIndex % fc.length]!);
    return entry.spaces.flatMap((sp) => {
      if (sp.kind !== 'unit' || !sp.unitId) return [];
      const poly = entry.plan.spaces.find((p) => p.id === sp.id);
      const unit = data.units.find((u) => u.id === sp.unitId);
      if (!poly || !unit) return [];
      const [lx, ly] = polygonLabelPoint(poly.points);
      const x = frame.center[0] + lx / 100 - entry.plan.width / 200 + px * FLOOR_PULL;
      const z = frame.center[1] + ly / 100 - entry.plan.height / 200 + pz * FLOOR_PULL;
      const y = (order - 1) * frame.floorHeight + 1.9;
      return [
        {
          id: sp.unitId,
          name: unit.price !== undefined ? `${unit.name} · ${formatCOP(unit.price)}` : unit.name,
          position: [x, y, z] as [number, number, number],
          href: unit.href,
        },
      ];
    });
  }, [stage, data, frame, facadeIndex]);
  const view360 = useTour((s) => s.view360);
  const currentPano =
    unitId && spaceId ? (data.unitPlans[unitId]?.spaces.find((s) => s.id === spaceId)?.pano ?? null) : null;
  const in360Pano = view360 && currentPano !== null && active;
  const viewpoint = useTour((s) => s.viewpoint);
  const setViewpoint = useTour((s) => s.setViewpoint);
  const vpPoi = viewpoint && stage.kind === 'explorar' ? data.pois.find((p) => p.id === viewpoint.poiId) : undefined;
  const vpData = vpPoi?.viewpoints?.[viewpoint!.index] ?? null;
  const in360 = in360Pano || (vpData !== null && active);
  useEffect(() => {
    if (stage.kind !== 'explorar' && viewpoint) setViewpoint(null);
  }, [stage.kind, viewpoint, setViewpoint]);
  useEffect(() => {
    document.documentElement.dataset.viewpoint = vpData ? 'on' : 'off';
  }, [vpData]);
  // punto de vista del 360: centro del espacio a 1,5 m del piso. Por dentro de la
  // maqueta (demo) retrocede hacia el muro opuesto a la ventana: se ve el cuarto y la ventana
  const eye = useMemo<[number, number, number] | null>(() => {
    if (!unitId || !spaceId) return null;
    const entry = data.unitPlans[unitId];
    const anchor = unitAnchor(data, frame, unitId);
    const c = entry ? spaceCenter(entry.plan, spaceId) : null;
    if (!anchor || !c || !entry) return null;
    let [x, z] = c;
    const yaw = entry.spaces.find((s) => s.id === spaceId)?.pano?.yaw;
    const poly = entry.plan.spaces.find((s) => s.id === spaceId);
    if (data.liveInterior && yaw !== undefined && poly) {
      const [dx, , dz] = panoDirection(yaw, 0);
      const xs = poly.points.map((p) => p[0] / 100 - entry.plan.width / 200);
      const zs = poly.points.map((p) => p[1] / 100 - entry.plan.height / 200);
      const m = 0.45;
      const [x0, x1, z0, z1] = [Math.min(...xs) + m, Math.max(...xs) - m, Math.min(...zs) + m, Math.max(...zs) - m];
      for (let t = 0; t < 3; t += 0.05) {
        const nx = c[0] - dx * t;
        const nz = c[1] - dz * t;
        if (nx < x0 || nx > x1 || nz < z0 || nz > z1) break;
        [x, z] = [nx, nz];
      }
    }
    return [anchor[0] + x, anchor[1] + 1.5, anchor[2] + z];
  }, [unitId, spaceId, data, frame]);
  const panoAnchors = useRef(new Map<string, HTMLElement>());
  const panoLinks = useMemo(() => {
    if (!currentPano || !eye || !unitId) return [];
    return currentPano.hotspots.flatMap((h) => {
      if (!h.target) return [];
      const [dx, dy, dz] = panoDirection(h.yaw, h.pitch);
      return [
        {
          id: h.target,
          name: h.label,
          position: [eye[0] + dx * 5, eye[1] + dy * 5, eye[2] + dz * 5] as [number, number, number],
          href: routes.espacio(data.slug, unitId, h.target),
        },
      ];
    });
  }, [currentPano, eye, unitId, data.slug]);
  const [cx, cz] = frame.center;
  const anchors = useRef(new Map<string, HTMLElement>());
  const spaceAnchors = useRef(new Map<string, HTMLElement>());
  // etiquetas de los espacios de la unidad actual (HTML proyectado)
  const spaceLabels = useMemo(() => {
    if (!unitId) return [];
    const entry = data.unitPlans[unitId];
    const anchor = unitAnchor(data, frame, unitId);
    if (!entry || !anchor) return [];
    return entry.spaces.flatMap((s) => {
      const c = spaceCenter(entry.plan, s.id);
      return c
        ? [{ id: s.id, name: s.name, position: [anchor[0] + c[0], anchor[1] + 1.3, anchor[2] + c[1]] as [number, number, number], href: routes.espacio(data.slug, unitId, s.id) }]
        : [];
    });
  }, [unitId, data, frame]);
  const guideStep: GuideStep =
    in360 ? 'mirar' : stage.kind === 'piso' ? 'piso' : stage.kind === 'unidad' ? (spaceId ? 'espacio' : 'unidad') : 'explorar';
  const backdrop = useRef<BackdropApi | null>(null);
  const showPois = stage.kind === 'explorar' && active && !useTour.getState().viewpoint;
  const facade = facades[facadeIndex % facades.length]!;
  const pullDir = facadeDir(facade);
  const light = useMemo(() => createLightUniforms(), []);

  // unidades en la fachada (slot = índice en data.units)
  const facadeUnits = useMemo<FacadeUnit[]>(
    () =>
      data.units.flatMap((u, slot) => {
        const order = data.floors.find((f) => f.id === u.levelId)?.order;
        if (order === undefined || !u.exterior.length) return [];
        const windows = u.exterior.flatMap((e) =>
          facades[e.facade] ? e.windows.map((w) => ({ edge: facades[e.facade]!.index, window: w })) : [],
        );
        const first = u.exterior[0]!;
        const mid = first.windows[Math.floor(first.windows.length / 2)]!;
        const balcony = u.balcony && facades[first.facade] ? { edge: facades[first.facade]!.index, window: mid } : undefined;
        return [{ slot, order, windows, balcony }];
      }),
    [data.units, data.floors, facades],
  );

  // carga progresiva: lo real del día cuando la escena ya pintó; lo de noche después
  const [envs, setEnvs] = useState<{ dia?: THREE.Texture; noche?: THREE.Texture }>({});
  const [cladMaps, setCladMaps] = useState<CladdingMaps | null>(null);
  const [linen, setLinen] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!sceneReady) return;
    let alive = true;
    loadEnvironment(ASSETS.envDia).then((t) => alive && setEnvs((e) => ({ ...e, dia: t })), () => {});
    if ((data.building.style?.cladding ?? 'estuco') === 'ladrillo') {
      loadBrick().then((m) => alive && setCladMaps(m), () => {});
    }
    loadLinen().then((l) => alive && setLinen(l.map), () => {});
    const later = window.setTimeout(() => prefetch('noche'), 5000);
    return () => {
      alive = false;
      window.clearTimeout(later);
    };
  }, [sceneReady, data.building.style?.cladding]);
  useEffect(() => {
    if (!night || envs.noche) return;
    let alive = true;
    loadEnvironment(ASSETS.envNoche).then((t) => alive && setEnvs((e) => ({ ...e, noche: t })), () => {});
    return () => {
      alive = false;
    };
  }, [night, envs.noche]);
  const environment = night ? (envs.noche ?? envs.dia ?? null) : (envs.dia ?? null);
  useEffect(() => {
    backdrop.current?.invalidate(2);
  }, [environment]);

  // vista desde la ventana: se pide desde el panel de la unidad y se renderiza aquí
  const viewRequest = useTour((s) => s.viewRequest);
  const requestView = useTour((s) => s.requestView);
  const setView = useTour((s) => s.setView);
  useEffect(() => {
    if (!viewRequest) return;
    const unit = data.units.find((u) => u.id === viewRequest);
    const ext = unit?.exterior[0];
    const order = unit ? data.floors.find((f) => f.id === unit.levelId)?.order : undefined;
    const f = ext ? facades[ext.facade] : undefined;
    requestView(null);
    if (!unit || !ext || !f || order === undefined || !backdrop.current) return;
    const vp = windowViewpoint(data.building, f.index, order, ext.windows[Math.floor(ext.windows.length / 2)]!);
    if (!vp) return;
    const from = new THREE.Vector3(...vp.position);
    const dir = new THREE.Vector3(vp.normal[0], -0.08, vp.normal[1]).normalize();
    setView({ unitId: unit.id, src: backdrop.current.snapshot(from, dir, 960, 600) });
  }, [viewRequest, requestView, setView, data, facades]);

  // transición día/noche: el fondo se re-renderiza (desenfocado) mientras dura
  useEffect(() => {
    gsap.to(light.uNight, {
      value: night ? 1 : 0,
      duration: reduced ? 0 : 2.2,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => backdrop.current?.invalidate(1),
      onComplete: () => backdrop.current?.invalidate(1),
    });
  }, [night, reduced, light]);

  return (
    <div className="relative size-full">
      {/* el canvas es decorativo para lectores de pantalla: todo se puede hacer con los controles HTML */}
      <Canvas
        aria-hidden
        frameloop={active ? 'always' : 'never'}
        shadows={shadows ? 'soft' : false}
        dpr={high ? [1, 2] : quality === 'medio' ? [1, 1.5] : 1}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: FOV, near: 0.5, far: 3000, position: [cx + 60, 60, cz + 80] }}
        onPointerMissed={() => {
          setHoveredLevel(null);
          setSelectedUnit(null);
        }}
      >
        {/* por dentro (recorrido en vivo) por las ventanas se ve la ciudad, no el estudio */}
        <Backdrop apiRef={backdrop} environment={environment} studio={inUnit && !(in360Pano && data.liveInterior)} reduced={reduced}>
          <Context frame={frame} facades={facades} shadows={shadows} high={high} light={light} />
        </Backdrop>

        {/* escena del edificio (en vivo) */}
        <DayNightLights frame={frame} light={light} shadows={shadows} high={high} />
        <BuildingEnvironment map={environment} light={light} />
        <BuildingModel
          building={data.building}
          frame={frame}
          floors={data.floors}
          brandName={data.brandName}
          units={facadeUnits}
          light={light}
          cladMaps={cladMaps}
          linen={linen}
          selectedId={selectedId}
          gone={inUnit}
          floorPlans={data.levelPlans}
          planHovered={planHovered}
          onPlanHover={setPlanHovered}
          onPlanSelect={(id) => {
            const u = data.units.find((x) => x.id === id);
            if (u) router.push(u.href);
          }}
          hoveredId={hoveredLevelId}
          pullDir={pullDir}
          colors={data.colors}
          reduced={reduced}
          interactive={active}
          shadows={shadows}
          onHover={setHoveredLevel}
          onSelect={(id) => router.push(routes.piso(data.slug, id))}
          onUnitHover={(slot, x, y) => {
            const u = slot === null ? undefined : data.units[slot];
            setHoveredUnit(u ? { id: u.id, x, y } : null);
            document.body.style.cursor = u ? 'pointer' : '';
          }}
          onUnitSelect={(slot) => {
            // tocar la habitación entra directo a su unidad (con la transición de cámara)
            const u = data.units[slot];
            if (u) {
              setHoveredUnit(null);
              router.push(u.href);
            }
          }}
        />
        <UnitLights light={light} units={data.units} />
        <PoiProjector pois={data.pois} anchors={anchors} />

        {/* maqueta de la unidad actual (bloque 3); solo se monta la que se ve */}
        {unitId && data.unitPlans[unitId] && unitAnchor(data, frame, unitId) ? (
          <UnitModel
            key={unitId}
            plan={data.unitPlans[unitId]!.plan}
            spaces={data.unitPlans[unitId]!.spaces}
            position={unitAnchor(data, frame, unitId)!}
            visible={inUnit && active}
            selectedSpace={spaceId}
            hoveredSpace={hoveredSpace}
            reduced={reduced}
            shadows={shadows}
            cut={spaceId !== null && !in360}
            onHover={setHoveredSpace}
            onSelect={(sid) => router.push(routes.espacio(data.slug, unitId, sid))}
          />
        ) : null}
        <PoiProjector pois={spaceLabels} anchors={spaceAnchors} />
        <PoiProjector pois={floorLabels} anchors={floorAnchors} />
        {currentPano && eye && !data.liveInterior ? (
          <PanoSphere key={spaceId} url={currentPano.url} position={eye} visible={in360} reduced={reduced} />
        ) : null}
        <PoiProjector pois={panoLinks} anchors={panoAnchors} />

        <Rig data={data} stage={stage} facade={facade} reduced={reduced} intro={intro} in360={in360} pano={in360Pano && currentPano && eye ? { yaw: currentPano.yaw, eye, live: data.liveInterior } : null}
          vp={vpData && vpPoi ? { key: `${vpPoi.id}-${vpData.id}`, position: vpData.position, yaw: vpData.yaw } : null}
        />

        {!qualityLocked ? (
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setQuality(lowerQuality(quality))}
            onIncline={() => setQuality(higherQuality(quality))}
            onFallback={() => setQuality('bajo')}
          />
        ) : null}
        <FovController wide={in360} reduced={reduced} />
        <ViewLayerController on={vpData !== null} />
        <ReadySignal />
      </Canvas>
      <PoiLayer pois={data.pois} anchors={anchors} visible={showPois} />
      {stage.kind === 'explorar' && active ? <ViewpointOverlay pois={data.pois} /> : null}
      <SpaceLabelLayer
        labels={floorLabels}
        anchors={floorAnchors}
        visible={stage.kind === 'piso' && active}
        current={null}
        hovered={planHovered}
        onHover={setPlanHovered}
        ariaLabel="Unidades del piso"
        reveal
      />
      <SpaceLabelLayer
        labels={panoLinks}
        anchors={panoAnchors}
        visible={in360}
        current={null}
        hovered={null}
        onHover={() => {}}
        ariaLabel="Ir a otro espacio"
      />
      <SpaceLabelLayer
        labels={spaceLabels}
        anchors={spaceAnchors}
        visible={inUnit && active && !in360}
        current={spaceId}
        hovered={hoveredSpace}
        onHover={setHoveredSpace}
      />
      <UnitOverlay data={data} visible={(stage.kind === 'explorar' || stage.kind === 'piso') && active} />
      <TourGuide step={guideStep} active={active} />
    </div>
  );
}
