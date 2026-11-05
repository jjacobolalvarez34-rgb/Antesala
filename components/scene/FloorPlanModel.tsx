'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FURNITURE_COLORS } from '@/components/plan/furniture';
import { planToMesh } from '@/components/plan/planToMesh';
import type { PlanGeometry } from '@/lib/types';

import type { LightUniforms } from './windows';

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
}

const COLORS = {
  unit: '#b88d63',
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

const colorFor = (s: FloorPlanSpace | undefined, finish: string | undefined) => {
  if (s?.kind === 'unit') return COLORS.unit;
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
}: {
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
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0, ...extra });
    return {
      // muros en corte oscuros (como el relleno de un plano): la planta se lee de día y de noche
      walls: m('#57504a', { roughness: 0.9 }),
      floors: Object.fromEntries(meshes.floors.map((f) => [f.id, m(colorFor(meta.get(f.id), finishes.get(f.id)), { roughness: 0.75 })])),
      furniture: Object.fromEntries(
        meshes.furniture.map((f) => [
          f.material,
          f.material === 'glass'
            ? m(FURNITURE_COLORS.glass, { roughness: 0.05, metalness: 0.2, depthWrite: false })
            : m(FURNITURE_COLORS[f.material], { roughness: f.material === 'metal' ? 0.45 : 0.85 }),
        ]),
      ) as Record<string, THREE.MeshStandardMaterial>,
    };
  }, [meshes, meta, finishes]);

  // de noche, luz interior cálida: pisos y muebles brillan un poco con su propio color
  const lit = useMemo(
    () => [...Object.values(mats.floors), ...Object.entries(mats.furniture).filter(([k]) => k !== 'glass').map(([, m]) => m)],
    [mats],
  );
  useFrame(() => {
    const k = light.uNight.value * 0.42;
    for (const m of lit) {
      m.emissiveIntensity = k;
      if (k > 0) m.emissive.copy(m.color).lerp(WARM, 0.25);
    }
  });

  // entra cuando el cajón ya salió (la fachada se retira al mismo tiempo); cerrado, no se dibuja
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = group.current;
    if (visible && g) g.visible = true;
    const all: [THREE.Material, number][] = [
      [mats.walls, 1],
      ...Object.values(mats.floors).map((m) => [m, 1] as [THREE.Material, number]),
      ...Object.entries(mats.furniture).map(([k, m]) => [m, k === 'glass' ? 0.3 : 1] as [THREE.Material, number]),
    ];
    all.forEach(([mat, base], i) =>
      gsap.to(mat, {
        opacity: visible ? base : 0,
        duration: reduced ? 0 : visible ? 0.6 : 0.25,
        delay: visible ? (reduced ? 0.45 : 1.15) : 0,
        ease: 'power2.out',
        overwrite: true,
        onComplete: i === 0 && !visible ? () => g && (g.visible = false) : undefined,
      }),
    );
  }, [visible, mats, reduced]);

  useEffect(() => {
    for (const f of meshes.floors) {
      const s = meta.get(f.id);
      if (s?.kind !== 'unit') continue;
      const c = new THREE.Color(s.unitId === hovered ? COLORS.unitHot : COLORS.unit);
      const mat = mats.floors[f.id]!;
      mat.color.copy(c);
    }
  }, [hovered, meshes, meta, mats]);

  return (
    <group ref={group} position={position} visible={false}>
      {meshes.walls ? (
        <mesh geometry={meshes.walls} material={mats.walls} castShadow={shadows && visible} receiveShadow={shadows} raycast={visible ? undefined : () => null} />
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
            raycast={visible ? undefined : () => null}
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
