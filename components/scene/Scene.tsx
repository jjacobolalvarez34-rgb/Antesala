'use client';

import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, Vignette } from '@react-three/postprocessing';
import { useRouter } from 'next/navigation';
import { useMemo, useRef } from 'react';

import { buildingFrame, explorePose, floorPose } from '@/lib/building';
import { lowerQuality, higherQuality, type Quality } from '@/lib/capabilities';
import { routes } from '@/lib/routes';
import { useTour } from '@/lib/store';
import type { Building } from '@/lib/types';

import { BuildingModel, type BuildingColors, type SceneFloor } from './Building';
import { CameraRig } from './CameraRig';
import { Context } from './Context';
import { PoiLayer, PoiProjector, type ScenePoi } from './Pois';

export interface SceneData {
  slug: string;
  building: Building;
  floors: SceneFloor[];
  pois: ScenePoi[];
  colors: BuildingColors;
}

export type SceneStage = { kind: 'explorar' } | { kind: 'piso'; levelId: string };

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

function ReadySignal() {
  const frames = useRef(0);
  const setSceneReady = useTour((s) => s.setSceneReady);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) setSceneReady(true);
  });
  return null;
}

function Rig({ data, stage, reduced, intro }: Pick<Props, 'data' | 'stage' | 'reduced' | 'intro'>) {
  const frame = useMemo(() => buildingFrame(data.building), [data.building]);
  const floorOrder = stage.kind === 'piso' ? data.floors.find((f) => f.id === stage.levelId)?.order : undefined;
  return (
    <CameraAdapter
      frame={frame}
      floorOrder={floorOrder}
      stageKey={stage.kind === 'piso' ? `piso-${stage.levelId}` : 'explorar'}
      depth={stage.kind === 'piso' ? 2 : 1}
      reduced={reduced}
      intro={intro}
    />
  );
}

function CameraAdapter({
  frame,
  floorOrder,
  stageKey,
  depth,
  reduced,
  intro,
}: {
  frame: ReturnType<typeof buildingFrame>;
  floorOrder?: number;
  stageKey: string;
  depth: number;
  reduced: boolean;
  intro: boolean;
}) {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(size.height, 1);
  const wide = size.width >= 768;
  const pose =
    floorOrder !== undefined
      ? floorPose(frame, floorOrder, FOV, aspect, wide ? 'side' : 'sheet')
      : explorePose(frame, FOV, aspect, wide);
  return (
    <CameraRig
      pose={pose}
      stageKey={stageKey}
      depth={depth}
      intro={intro}
      reduced={reduced}
      autoRotate={floorOrder === undefined}
    />
  );
}

export default function Scene({ data, stage, active, quality, qualityLocked, reduced, intro }: Props) {
  const router = useRouter();
  const frame = useMemo(() => buildingFrame(data.building), [data.building]);
  const hoveredLevelId = useTour((s) => s.hoveredLevelId);
  const setHoveredLevel = useTour((s) => s.setHoveredLevel);
  const setQuality = useTour((s) => s.setQuality);
  const high = quality === 'alto';
  const selectedId = stage.kind === 'piso' ? stage.levelId : null;
  const [cx, cz] = frame.center;
  const anchors = useRef(new Map<string, HTMLElement>());
  const showPois = stage.kind === 'explorar' && active;

  return (
    <div className="relative size-full">
    <Canvas
      frameloop={active ? 'always' : 'never'}
      shadows={high}
      dpr={high ? [1, 2] : [1, 1.5]}
      gl={{ antialias: !high, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.5, far: 2000, position: [cx + 60, 60, cz + 80] }}
      onPointerMissed={() => setHoveredLevel(null)}
    >
      <fog attach="fog" args={['#2a2420', 140, 560]} />
      <hemisphereLight args={['#ebe6de', '#1a1917', 0.9]} />
      <directionalLight
        position={[cx + 70, 55, cz + 60]}
        intensity={2.3}
        color="#ffe4c4"
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={10}
        shadow-camera-far={220}
      />
      <directionalLight position={[cx - 50, 30, cz - 40]} intensity={0.35} color="#9fb3c8" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#ffd9b0" position={[30, 12, 30]} scale={[40, 10, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#a9bcd0" position={[-30, 20, -20]} scale={[30, 20, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 40, 0]} scale={10} />
      </Environment>

      <Context frame={frame} />
      <BuildingModel
        footprint={data.building.footprint}
        frame={frame}
        floors={data.floors}
        selectedId={selectedId}
        hoveredId={hoveredLevelId}
        colors={data.colors}
        reduced={reduced}
        interactive={active}
        onHover={setHoveredLevel}
        onSelect={(id) => router.push(routes.piso(data.slug, id))}
      />
      <PoiProjector pois={data.pois} anchors={anchors} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={25}
        maxDistance={220}
        minPolarAngle={0.35}
        maxPolarAngle={1.42}
        rotateSpeed={0.6}
      />
      <Rig data={data} stage={stage} reduced={reduced} intro={intro} />

      {!qualityLocked ? (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setQuality(lowerQuality(quality))}
          onIncline={() => setQuality(higherQuality(quality))}
          onFallback={() => setQuality('lista')}
        />
      ) : null}

      {high ? (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.2} quality="medium" />
          <Vignette offset={0.25} darkness={0.55} />
        </EffectComposer>
      ) : null}
      <ReadySignal />
    </Canvas>
    <PoiLayer pois={data.pois} anchors={anchors} visible={showPois} />
    </div>
  );
}
