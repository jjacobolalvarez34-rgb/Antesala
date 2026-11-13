'use client';

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { FURNITURE_COLORS } from '@/components/plan/furniture';
import { planToMesh } from '@/components/plan/planToMesh';
import { useTour } from '@/lib/store';
import type { PlanGeometry } from '@/lib/types';

import type { LightUniforms } from './windows';

const noHit = () => null;

/**
 * Planta del piso dentro del cajón (D-041): al sacar el piso, la fachada se
 * retira y queda la planta en corte (muros de 1,1 m) con el pasillo, el
 * núcleo y las unidades, con acabados de piso y muebles (D-044). Las
 * unidades de la demo se resaltan y se pueden tocar.
 */

export interface FloorPlanSpace {
  id: string;
  kind: 'unit' | 'poi' | 'other';
  name: string;
  /** solo unidades de la demo */
  unitId?: string;
  /** ocupada en las fechas de la demo: color apagado, pero se puede abrir (D-054) */
  occupied?: boolean;
}

const COLORS = {
  unit: '#b88d63',
  occupied: '#9d958b',
  unitHot: '#d7b07f',
  other: '#cdc7bc',
};

/** Color por acabado (data-finish del plano). */
const FINISH: Record<string, string> = {
  madera: '#bf9f7a',
  piedra: '#cfc7b9',
  baldosa: '#b98a68',
  alfombra: '#7b7268',
  concreto: '#a39b90',
  deck: '#8f7259',
};

const WARM = new THREE.Color('#ffb46b');
const WHITE = new THREE.Color('#ffffff');
const NIGHT_WARM = new THREE.Color('#b98a5e');
const GLOW = new THREE.Color('#ffc98a');

const colorFor = (s: FloorPlanSpace | undefined, finish: string | undefined) => {
  if (s?.kind === 'unit') return s.occupied ? COLORS.occupied : COLORS.unit;
  return (finish && FINISH[finish]) ?? COLORS.other;
};

export function FloorPlanModel({
  plan,
  spaces,
  position,
  visible,
  hovered,
  reduced,
  shadows,
  light,
  onHover,
  onSelect,
  name,
  realista,
  leaving = false,
}: {
  /** se va porque se entra a una habitación: se desvanece al ritmo del edificio, no de golpe */
  leaving?: boolean;
  /** nombre del grupo (lo usa el exportador del 3D realista: "planta-<piso>") */
  name?: string;
  /** planta horneada en Blender (nivel Premium, D-074): reemplaza muros, pisos y muebles */
  realista?: string;
  /** día/noche de la escena: de noche las habitaciones se encienden por dentro */
  light: LightUniforms;
  plan: PlanGeometry;
  spaces: FloorPlanSpace[];
  position: [number, number, number];
  visible: boolean;
  hovered: string | null;
  reduced: boolean;
  shadows: boolean;
  onHover: (unitId: string | null) => void;
  onSelect: (unitId: string) => void;
}) {
  const meshes = useMemo(() => planToMesh(plan, { wallHeight: 1.1 }), [plan]);
  useEffect(
    () => () => {
      meshes.walls?.dispose();
      meshes.doors?.dispose();
      meshes.floors.forEach((f) => f.geometry.dispose());
      meshes.furniture.forEach((f) => f.geometry.dispose());
    },
    [meshes],
  );
  const meta = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);
  const finishes = useMemo(() => new Map(plan.spaces.map((s) => [s.id, s.finish])), [plan]);
  const mats = useMemo(() => {
    const m = (name: string, color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ name, color, roughness: 0.85, transparent: true, opacity: 0, ...extra });
    // los nombres los lee Blender (amoblar.py) para poner el acabado de cada superficie
    const surface = (finish: string | undefined) =>
      finish === 'baldosa' || finish === 'piedra' ? 'tile' : finish === 'alfombra' ? 'alfombra' : finish === 'concreto' || finish === 'deck' ? 'concreto' : 'wood';
    return {
      // muros en corte oscuros (como el relleno de un plano): la planta se lee de día y de noche
      walls: m('muros', '#57504a', { roughness: 0.9 }),
      floors: Object.fromEntries(
        meshes.floors.map((f) => [
          f.id,
          m(`piso-${surface(finishes.get(f.id))}-${f.id}`, colorFor(meta.get(f.id), finishes.get(f.id)), { roughness: 0.75 }),
        ]),
      ),
      furniture: Object.fromEntries(
        meshes.furniture.map((f) => [
          f.material,
          f.material === 'glass'
            ? m('mueble-glass', FURNITURE_COLORS.glass, { roughness: 0.05, metalness: 0.2, depthWrite: false })
            : m(`mueble-${f.material}`, FURNITURE_COLORS[f.material], { roughness: f.material === 'metal' ? 0.45 : 0.85 }),
        ]),
      ) as Record<string, THREE.MeshStandardMaterial>,
    };
  }, [meshes, meta, finishes]);

  // planta horneada (Premium): se carga al montarse; mientras tanto se ve la de código
  const [baked, setBaked] = useState<{ obj: THREE.Object3D; mat: THREE.MeshBasicMaterial; all: THREE.MeshBasicMaterial[] } | null>(null);
  useEffect(() => {
    if (!realista) return;
    let alive = true;
    let loaded: { obj: THREE.Object3D; mat: THREE.MeshBasicMaterial; all: THREE.MeshBasicMaterial[] } | null = null;
    void (async () => {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
      ]);
      const draco = new DRACOLoader().setDecoderPath('/visor/draco/');
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(realista).catch(() => null);
      draco.dispose();
      if (!alive || !gltf) return;
      let mat: THREE.MeshBasicMaterial | null = null;
      const all: THREE.MeshBasicMaterial[] = [];
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const src = mesh.material as THREE.MeshStandardMaterial;
        const glass = src.name.startsWith('vidrio');
        // la luz ya viene en la textura: sin la curva de tono del visor (D-074)
        const next = new THREE.MeshBasicMaterial({
          map: glass ? null : src.map,
          color: glass ? '#dfe9ea' : '#ffffff',
          transparent: true,
          opacity: 0,
          depthWrite: !glass,
          toneMapped: false,
        });
        next.userData.base = glass ? 0.22 : 1;
        mesh.material = next;
        mesh.raycast = noHit;
        all.push(next);
        if (src.name.startsWith('horneado')) mat = next;
      });
      mat ??= all[0] ?? null;
      if (!mat) return;
      loaded = { obj: gltf.scene, mat, all };
      setBaked(loaded);
    })();
    return () => {
      alive = false;
      loaded?.all.forEach((m) => m.dispose());
    };
  }, [realista]);
  // con la horneada, la de código no se dibuja: los pisos de las unidades siguen
  // recibiendo el mouse y las ocupadas quedan con un velo gris
  useEffect(() => {
    const procedural = [mats.walls, ...Object.values(mats.furniture)];
    for (const m of procedural) m.visible = !baked;
    for (const f of meshes.floors) {
      const s = meta.get(f.id);
      const mat = mats.floors[f.id]!;
      mat.visible = !baked || (s?.kind === 'unit' && !!s.occupied);
    }
    return () => {
      for (const m of [...procedural, ...Object.values(mats.floors)]) m.visible = true;
    };
  }, [baked, mats, meshes, meta]);

  // de noche, luz interior cálida: pisos y muebles brillan un poco con su propio color
  const lit = useMemo(
    () => [...Object.values(mats.floors), ...Object.entries(mats.furniture).filter(([k]) => k !== 'glass').map(([, m]) => m)],
    [mats],
  );
  // brillo al tocar una habitación (D-052): su piso pulsa en cálido mientras se sostiene antes de entrar
  const chosen = useTour((s) => s.selectedUnit);
  const chosenMat = useMemo(() => {
    const sp = spaces.find((s) => s.kind === 'unit' && s.unitId === chosen);
    return sp ? (mats.floors[sp.id] ?? null) : null;
  }, [chosen, spaces, mats]);
  const pulse = useRef(0);
  useFrame((state, delta) => {
    if (baked) {
      // horneada de día: de noche se entibia y baja un poco, como con la luz de las lámparas
      const n = light.uNight.value;
      for (const m of baked.all) if (m.userData.base === 1) m.color.copy(WHITE).lerp(NIGHT_WARM, n * 0.55);
    }
    const k = light.uNight.value * 0.42;
    for (const m of lit) {
      m.emissiveIntensity = k;
      if (k > 0) m.emissive.copy(m.color).lerp(WARM, 0.25);
    }
    pulse.current = chosenMat ? Math.min(1, pulse.current + delta * 5) : 0;
    if (chosenMat && visible) {
      const wave = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 9);
      chosenMat.emissive.copy(GLOW);
      chosenMat.emissiveIntensity = Math.max(k, 1.3 * pulse.current * wave);
    }
  });

  // luz al pasar el mouse (pedido de Jacobo, 2026-11-12): un pozo de luz cálida con la
  // forma exacta de la habitación, que se enciende con un fundido y solo ilumina esa habitación
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        // tinte cálido normal (no aditivo): sobre los pisos claros de día el aditivo casi no se veía
        color: '#f4a63f',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  // la malla del brillo siempre está; al pasar el mouse toma la forma de la habitación
  const glowRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const f = hovered ? meshes.floors.find((x) => meta.get(x.id)?.unitId === hovered) : undefined;
    if (f) {
      if (glowRef.current) glowRef.current.geometry = f.geometry;
      gsap.fromTo(glowMat, { opacity: 0 }, { opacity: 0.42, duration: 0.35, ease: 'power2.out', overwrite: true });
    } else {
      gsap.to(glowMat, { opacity: 0, duration: 0.45, ease: 'power2.out', overwrite: true });
    }
  }, [hovered, meshes, meta, glowMat]);
  useEffect(() => () => glowMat.dispose(), [glowMat]);

  // entra cuando el cajón ya salió (la fachada se retira al mismo tiempo); cerrado, no se dibuja
  const group = useRef<THREE.Group>(null);
  usePrecompile(group);
  useLayoutEffect(() => {
    const g = group.current;
    if (visible && g) g.visible = true;
    const all: [THREE.Material, number][] = [
      [mats.walls, 1],
      ...Object.values(mats.floors).map((m) => [m, baked ? 0.5 : 1] as [THREE.Material, number]),
      ...(baked?.all ?? []).map((m) => [m, m.userData.base as number] as [THREE.Material, number]),
      ...Object.entries(mats.furniture).map(([k, m]) => [m, k === 'glass' ? 0.3 : 1] as [THREE.Material, number]),
    ];
    all.forEach(([mat, base], i) =>
      gsap.to(mat, {
        opacity: visible ? base : 0,
        // al entrar a una habitación sigue al edificio (Building: retardo 0,55 s y 1,08 s de fundido)
        duration: reduced ? 0 : visible ? 0.6 : leaving ? 1.08 : 0.25,
        delay: visible ? (reduced ? 0.45 : 1.15) : leaving && !reduced ? 0.55 : 0,
        ease: visible ? 'power2.out' : leaving ? 'power2.inOut' : 'power2.out',
        overwrite: true,
        onComplete: i === 0 && !visible ? () => g && (g.visible = false) : undefined,
      }),
    );
  }, [visible, mats, reduced, baked, leaving]);

  useEffect(() => {
    for (const f of meshes.floors) {
      const s = meta.get(f.id);
      if (s?.kind !== 'unit') continue;
      const c = new THREE.Color(s.unitId === hovered ? COLORS.unitHot : s.occupied ? COLORS.occupied : COLORS.unit);
      const mat = mats.floors[f.id]!;
      mat.color.copy(c);
    }
  }, [hovered, meshes, meta, mats]);

  return (
    <group ref={group} name={name} position={position} visible={false} userData={{ floorPlan: true }}>
      {baked ? <primitive object={baked.obj} /> : null}
      {meshes.walls ? (
        <mesh geometry={meshes.walls} material={mats.walls} castShadow={shadows && visible} receiveShadow={shadows} raycast={visible ? THREE.Mesh.prototype.raycast : noHit} />
      ) : null}
      {meshes.floors.map((f) => {
        const s = meta.get(f.id);
        const clickable = visible && s?.kind === 'unit' && s.unitId;
        return (
          <mesh
            key={f.id}
            geometry={f.geometry}
            material={mats.floors[f.id]}
            position-y={0.02}
            receiveShadow={shadows}
            // explícito: con `undefined` no siempre volvía el raycast por defecto y las habitaciones no se podían tocar
            raycast={visible ? THREE.Mesh.prototype.raycast : noHit}
            onPointerOver={
              clickable
                ? (e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation();
                    onHover(s.unitId!);
                    document.body.style.cursor = 'pointer';
                  }
                : undefined
            }
            onPointerOut={
              clickable
                ? () => {
                    onHover(null);
                    document.body.style.cursor = '';
                  }
                : undefined
            }
            onClick={
              clickable
                ? (e: ThreeEvent<MouseEvent>) => {
                    e.stopPropagation();
                    onSelect(s.unitId!);
                  }
                : undefined
            }
          />
        );
      })}
      <mesh ref={glowRef} material={glowMat} visible={visible} position-y={0.06} renderOrder={6} raycast={noHit} />
      {meshes.furniture.map((f) => (
        <mesh
          key={f.material}
          geometry={f.geometry}
          material={mats.furniture[f.material]}
          position-y={0.02}
          castShadow={shadows && visible && f.material !== 'glass'}
          receiveShadow={shadows}
          raycast={() => null}
        />
      ))}
    </group>
  );
}

/**
 * Compila los shaders de un grupo oculto cuando la escena está quieta: si no, el
 * celular los compilaba en plena animación (el cajón o la maqueta se trababan).
 */
export function usePrecompile(group: React.RefObject<THREE.Group | null>, delay = 1200) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const g = group.current;
      if (!g) return;
      const was = g.visible;
      g.visible = true;
      try {
        gl.compileAsync(g, camera, scene).catch(() => {});
      } finally {
        g.visible = was;
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [gl, camera, scene, group, delay]);
}
