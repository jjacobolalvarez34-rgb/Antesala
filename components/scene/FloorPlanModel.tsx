'use client';

import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';

import { planToMesh } from '@/components/plan/planToMesh';
import type { PlanGeometry } from '@/lib/types';

/**
 * Planta del piso dentro del cajón (D-041): al sacar el piso, la fachada se
 * retira y queda la planta en corte (muros de 1,1 m) con el pasillo, el
 * núcleo y las unidades. Las de la demo se resaltan y se pueden tocar.
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
  poi: '#c9a77c',
  pasillo: '#e6e2da',
  nucleo: '#9a938a',
  deck: '#8f7259',
};

const colorFor = (s: FloorPlanSpace | undefined, id: string) => {
  if (s?.kind === 'unit') return COLORS.unit;
  if (s?.kind === 'poi') return COLORS.poi;
  if (id === 'pasillo') return COLORS.pasillo;
  if (id === 'nucleo') return COLORS.nucleo;
  if (id.startsWith('terraza')) return COLORS.deck;
  return COLORS.other;
};

export function FloorPlanModel({
  plan,
  spaces,
  position,
  visible,
  hovered,
  reduced,
  shadows,
  onHover,
  onSelect,
}: {
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
      meshes.floors.forEach((f) => f.geometry.dispose());
    },
    [meshes],
  );
  const meta = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);
  const mats = useMemo(() => {
    const m = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0 });
    return {
      walls: m('#f1ece3'),
      floors: Object.fromEntries(meshes.floors.map((f) => [f.id, m(colorFor(meta.get(f.id), f.id))])),
    };
  }, [meshes, meta]);

  // entra cuando el cajón ya salió (la fachada se retira al mismo tiempo)
  useLayoutEffect(() => {
    const all = [mats.walls, ...Object.values(mats.floors)];
    all.forEach((mat) =>
      gsap.to(mat, {
        opacity: visible ? 1 : 0,
        duration: reduced ? 0 : visible ? 0.6 : 0.25,
        delay: visible ? (reduced ? 0.45 : 1.15) : 0,
        ease: 'power2.out',
        overwrite: true,
      }),
    );
  }, [visible, mats, reduced]);

  useEffect(() => {
    for (const f of meshes.floors) {
      const s = meta.get(f.id);
      if (s?.kind !== 'unit') continue;
      const c = new THREE.Color(s.unitId === hovered ? COLORS.unitHot : COLORS.unit);
      const mat = mats.floors[f.id]!;
      gsap.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: 0.2, overwrite: true });
      mat.emissive.set(s.unitId === hovered ? '#3a2410' : '#000000');
    }
  }, [hovered, meshes, meta, mats]);

  return (
    <group position={position}>
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
    </group>
  );
}
