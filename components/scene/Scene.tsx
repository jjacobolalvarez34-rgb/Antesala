'use client';

import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, Vignette } from '@react-three/postprocessing';
import { useRouter } from 'next/navigation';
import { useMemo, useRef } from 'react';

import { buildingFrame, facadeDir, facadePose, facadesOf, floorPose } from '@/lib/building';
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

/** Cámara: fachada elegida en la vista exterior; el piso visto desde esa fachada. */
function Rig({ data, stage, reduced, intro }: Pick<Props, 'data' | 'stage' | 'reduced' | 'intro'>) {
  const frame = useMemo(() => buildingFrame(data.building), [data.building]);
  const facades = useMemo(() => facadesOf(data.building), [data.building]);
  const facadeIndex = useTour((s) => s.facade);
  const facade = facades[facadeIndex % facades.length]!;
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(size.height, 1);
  const wide = size.width >= 768;
  const floorOrder = stage.kind === 'piso' ? data.floors.find((f) => f.id === stage.levelId)?.order : undefined;
  const pose =
    floorOrder !== undefined
      ? floorPose(frame, floorOrder, facade, FOV, aspect, wide ? 'side' : 'sheet')
      : facadePose(frame, facade, FOV, aspect, wide);
  return (
    <CameraRig
      pose={pose}
      stageKey={stage.kind === 'piso' ? `piso-${stage.levelId}` : `explorar-${facade.index}`}
      depth={stage.kind === 'piso' ? 2 : 1}
      intro={intro}
      reduced={reduced}
      autoRotate={false}
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
  const shadows = quality !== 'bajo';
  const selectedId = stage.kind === 'piso' ? stage.levelId : null;
  const [cx, cz] = frame.center;
  const anchors = useRef(new Map<string, HTMLElement>());
  const showPois = stage.kind === 'explorar' && active;
  const facades = useMemo(() => facadesOf(data.building), [data.building]);
  const facadeIndex = useTour((s) => s.facade);
  const pullDir = facadeDir(facades[facadeIndex % facades.length]!);

  return (
    <div className="relative size-full">
    <Canvas
      frameloop={active ? 'always' : 'never'}
      shadows={shadows ? 'soft' : false}
      dpr={high ? [1, 2] : quality === 'medio' ? [1, 1.5] : 1}
      gl={{ antialias: !high, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.5, far: 3000, position: [cx + 60, 60, cz + 80] }}
      onPointerMissed={() => setHoveredLevel(null)}
    >
      {/* luz de tarde bogotana: sol cálido y bajo desde el occidente, cielo suave */}
      <fog attach="fog" args={['#d9dcda', 160, 820]} />
      <hemisphereLight args={['#dce6ee', '#6f665a', 0.75]} />
      <directionalLight
        position={[cx + 75, 62, cz + 58]}
        intensity={3.1}
        color="#ffe3c2"
        castShadow={shadows}
        shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={10}
        shadow-camera-far={260}
      />
      <Environment resolution={128} frames={1}>
        {/* cielo y sol para los reflejos del vidrio */}
        <Lightformer form="rect" intensity={1.1} color="#9fb9cf" position={[0, 60, 0]} rotation-x={Math.PI / 2} scale={[200, 200, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffe2bd" position={[60, 25, 45]} scale={[30, 14, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#dfe3e1" position={[-60, 12, 0]} rotation-y={Math.PI / 2} scale={[120, 20, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#dfe3e1" position={[0, 12, -60]} scale={[120, 20, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#7a7368" position={[0, -10, 0]} rotation-x={-Math.PI / 2} scale={[200, 200, 1]} />
      </Environment>

      <Context frame={frame} facades={facades} shadows={shadows} />
      <BuildingModel
        footprint={data.building.footprint}
        frame={frame}
        floors={data.floors}
        cladding={data.building.style?.cladding ?? 'estuco'}
        selectedId={selectedId}
        hoveredId={hoveredLevelId}
        pullDir={pullDir}
        colors={data.colors}
        reduced={reduced}
        interactive={active}
        shadows={shadows}
        onHover={setHoveredLevel}
        onSelect={(id) => router.push(routes.piso(data.slug, id))}
      />
      <PoiProjector pois={data.pois} anchors={anchors} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={260}
        minPolarAngle={0.3}
        maxPolarAngle={1.5}
        rotateSpeed={0.6}
      />
      <Rig data={data} stage={stage} reduced={reduced} intro={intro} />

      {!qualityLocked ? (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setQuality(lowerQuality(quality))}
          onIncline={() => setQuality(higherQuality(quality))}
          onFallback={() => setQuality('bajo')}
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
