'use client';

import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FURNITURE_COLORS } from '@/components/plan/furniture';
import { planToMesh } from '@/components/plan/planToMesh';
import { polygonLabelPoint } from '@/lib/plan';
import type { PlanGeometry, SpaceType } from '@/lib/types';

/**
 * Maqueta de la unidad (bloque 3, D-034): el plano SVG extruido, sin techo,
 * a escala real y ubicado dentro del edificio a la altura de su piso. Cada
 * espacio tiene su propio piso (madera, baldosa o deck) que se resalta al
 * pasar y lleva a su detalle al tocarlo.
 */

export interface UnitSpaceMeta {
  id: string;
  name: string;
  type: SpaceType;
  /** panorama 360° del espacio (bloque 4) */
  pano?: { url: string; yaw: number; hotspots: { yaw: number; pitch: number; label: string; target?: string }[] };
}

const FLOOR_COLOR: Partial<Record<SpaceType, string>> = {
  bano: '#d9d6d0',
  cocina: '#cfcac1',
  balcon: '#8f7259',
  terraza: '#8f7259',
};
const WOOD = '#a57f5c';


export function UnitModel({
  plan,
  spaces,
  position,
  visible,
  selectedSpace,
  hoveredSpace,
  reduced,
  shadows,
  onHover,
  onSelect,
}: {
  plan: PlanGeometry;
  spaces: UnitSpaceMeta[];
  position: [number, number, number];
  visible: boolean;
  selectedSpace: string | null;
  hoveredSpace: string | null;
  reduced: boolean;
  shadows: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const meshes = useMemo(() => planToMesh(plan), [plan]);
  useEffect(
    () => () => {
      meshes.walls?.dispose();
      meshes.glass?.dispose();
      meshes.floors.forEach((f) => f.geometry.dispose());
      meshes.furniture.forEach((f) => f.geometry.dispose());
    },
    [meshes],
  );

  const mats = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0, ...extra });
    return {
      walls: m('#efe9df', { roughness: 0.92 }),
      glass: m('#bcd3d6', { roughness: 0.05, metalness: 0.2, depthWrite: false }),
      floors: Object.fromEntries(
        spaces.map((s) => [s.id, m(FLOOR_COLOR[s.type] ?? WOOD, { roughness: 0.7 })]),
      ) as Record<string, THREE.MeshStandardMaterial>,
      furniture: Object.fromEntries(
        meshes.furniture.map((f) => [
          f.material,
          f.material === 'glass'
            ? m(FURNITURE_COLORS.glass, { roughness: 0.05, metalness: 0.2, depthWrite: false })
            : m(FURNITURE_COLORS[f.material], { roughness: f.material === 'metal' ? 0.45 : 0.85 }),
        ]),
      ) as Record<string, THREE.MeshStandardMaterial>,
    };
  }, [spaces, meshes]);

  // aparece y desaparece con fundido
  useLayoutEffect(() => {
    const g = group.current;
    if (visible && g) g.visible = true;
    const all: [THREE.Material, number][] = [
      [mats.walls, 1],
      [mats.glass, 0.35],
      ...Object.values(mats.floors).map((m) => [m, 1] as [THREE.Material, number]),
      ...Object.entries(mats.furniture).map(([k, m]) => [m, k === 'glass' ? 0.3 : 1] as [THREE.Material, number]),
    ];
    const d = reduced ? 0 : 0.9;
    all.forEach(([m, base], i) =>
      gsap.to(m, {
        opacity: visible ? base : 0,
        duration: d,
        delay: reduced ? 0.45 : visible ? 0.9 : 0,
        ease: 'power2.out',
        overwrite: true,
        onComplete: i === 0 && !visible ? () => g && (g.visible = false) : undefined,
      }),
    );
  }, [visible, mats, reduced]);

  // resaltado del espacio (hover o seleccionado)
  useEffect(() => {
    for (const s of spaces) {
      const mat = mats.floors[s.id];
      if (!mat) continue;
      const base = new THREE.Color(FLOOR_COLOR[s.type] ?? WOOD);
      const active = s.id === selectedSpace;
      const hot = s.id === hoveredSpace;
      const target = active ? base.clone().lerp(new THREE.Color('#d8b98a'), 0.55) : hot ? base.clone().lerp(new THREE.Color('#ffffff'), 0.25) : base;
      gsap.to(mat.color, { r: target.r, g: target.g, b: target.b, duration: 0.25, overwrite: true });
      mat.emissive.set(active ? '#5a3f1c' : '#000000');
    }
  }, [selectedSpace, hoveredSpace, spaces, mats]);

  return (
    <group ref={group} position={position} visible={false}>
      <hemisphereLight args={['#fff8ee', '#8a8070', 0.55]} />
      {shadows ? (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.005} receiveShadow raycast={() => null}>
          <planeGeometry args={[meshes.size[0] + 4, meshes.size[1] + 4]} />
          <shadowMaterial transparent opacity={visible ? 0.22 : 0} />
        </mesh>
      ) : null}
      {meshes.walls ? <mesh geometry={meshes.walls} material={mats.walls} castShadow={shadows} receiveShadow={shadows} /> : null}
      {meshes.glass ? <mesh geometry={meshes.glass} material={mats.glass} raycast={() => null} /> : null}
      {meshes.floors.map((f) => (
        <mesh
          key={f.id}
          geometry={f.geometry}
          material={mats.floors[f.id]}
          position-y={0.01}
          receiveShadow={shadows}
          onPointerOver={
            visible
              ? (e: ThreeEvent<PointerEvent>) => {
                  e.stopPropagation();
                  onHover(f.id);
                  document.body.style.cursor = 'pointer';
                }
              : undefined
          }
          onPointerOut={
            visible
              ? () => {
                  onHover(null);
                  document.body.style.cursor = '';
                }
              : undefined
          }
          onClick={
            visible
              ? (e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  onSelect(f.id);
                }
              : undefined
          }
        />
      ))}
      {meshes.furniture.map((f) => (
        <mesh
          key={f.material}
          geometry={f.geometry}
          material={mats.furniture[f.material]}
          castShadow={shadows && f.material !== 'glass'}
          receiveShadow={shadows}
          raycast={() => null}
        />
      ))}
    </group>
  );
}

/** Punto representativo de un espacio en coordenadas de la maqueta (m), dentro del polígono. */
export function spaceCenter(plan: PlanGeometry, spaceId: string): [number, number] | null {
  const s = plan.spaces.find((x) => x.id === spaceId);
  if (!s) return null;
  const [cx, cy] = polygonLabelPoint(s.points);
  return [cx * 0.01 - (plan.width * 0.01) / 2, cy * 0.01 - (plan.height * 0.01) / 2];
}
