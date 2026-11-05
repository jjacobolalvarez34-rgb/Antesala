'use client';

import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { FURNITURE_COLORS } from '@/components/plan/furniture';
import { planToMesh, WALL_H } from '@/components/plan/planToMesh';
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


/** Altura de corte de muros y muebles (m): completa, o maqueta abierta al ver un espacio. */
const FULL_CUT = 3;
const SPACE_CUT = 1.15;

/** Acabado procedural de la superficie (sin texturas que descargar). */
type Surface = 'plaster' | 'wood' | 'tile';

const NOISE = `
float uHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float uNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(uHash(i), uHash(i + vec3(1,0,0)), f.x), mix(uHash(i + vec3(0,1,0)), uHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(uHash(i + vec3(0,0,1)), uHash(i + vec3(1,0,1)), f.x), mix(uHash(i + vec3(0,1,1)), uHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

const SURFACE: Record<Surface, string> = {
  // pañete pintado con manchas suaves, zócalo abajo y la cara de corte oscura (como una maqueta)
  plaster: `
    float pn = uNoise(vSurfPos * 0.9) * 0.35 + uNoise(vSurfPos * 3.1) * 0.4 + uNoise(vSurfPos * 11.0) * 0.25;
    diffuseColor.rgb *= 0.8 + 0.28 * pn;
    if (vSurfNormal.y < 0.5 && vSurfPos.y < 0.09) diffuseColor.rgb *= vec3(0.78, 0.74, 0.7);
    if (vSurfNormal.y > 0.5) diffuseColor.rgb = vec3(0.34, 0.31, 0.28);`,
  // tablas de 19 cm con largos alternados, juntas y veta
  wood: `
    float row = floor(vSurfPos.x / 0.19);
    float along = (vSurfPos.z + uHash(vec3(row, 1.0, 3.0)) * 1.4) / 1.4;
    float plank = floor(along);
    float tint = 0.88 + 0.16 * uHash(vec3(row, plank, 7.0));
    float grain = 0.94 + 0.06 * uNoise(vec3(vSurfPos.x * 40.0, 0.0, vSurfPos.z * 2.5));
    float seam = step(0.035, fract(vSurfPos.x / 0.19)) * step(0.006, fract(along));
    diffuseColor.rgb *= tint * grain * mix(0.72, 1.0, seam);`,
  // baldosa de 60 cm con junta clara
  tile: `
    vec2 t = fract(vSurfPos.xz / 0.6);
    float joint = step(0.012, t.x) * step(0.012, t.y);
    diffuseColor.rgb *= mix(1.1, 0.96 + 0.06 * uNoise(vSurfPos * 3.0), joint);`,
};

/**
 * Recorta en el GPU todo lo que pase de uCut (sin deformar: los vértices altos
 * bajan al corte) y, si se pide, pinta un acabado procedural.
 */
function cuttable<T extends THREE.Material>(mat: T, cut: { value: number }, surface?: Surface): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = cut;
    shader.vertexShader = `uniform float uCut;\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNormal;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  transformed.y = min(transformed.y, uCut);\n  vSurfPos = transformed;\n  vSurfNormal = normal;',
    );
    if (surface) {
      shader.fragmentShader = `varying vec3 vSurfPos;\nvarying vec3 vSurfNormal;\n${NOISE}\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${SURFACE[surface]}`,
      );
    }
  };
  mat.customProgramCacheKey = () => `unit-cut-${surface ?? 'plain'}`;
  return mat;
}

const surfaceFor = (type: SpaceType): Surface => (type === 'bano' || type === 'cocina' ? 'tile' : 'wood');

export function UnitModel({
  plan,
  spaces,
  position,
  visible,
  selectedSpace,
  hoveredSpace,
  reduced,
  shadows,
  cut,
  interior = false,
  onHover,
  onSelect,
}: {
  /** recorrido por dentro (360° en vivo): el cielo raso hace sombra y la luz entra por las ventanas */
  interior?: boolean;
  plan: PlanGeometry;
  spaces: UnitSpaceMeta[];
  position: [number, number, number];
  visible: boolean;
  selectedSpace: string | null;
  hoveredSpace: string | null;
  reduced: boolean;
  shadows: boolean;
  /** maqueta abierta (muros bajos) para ver un espacio desde arriba sin que estorben */
  cut: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const meshes = useMemo(() => planToMesh(plan), [plan]);
  useEffect(
    () => () => {
      meshes.walls?.dispose();
      meshes.glass?.dispose();
      meshes.doors?.dispose();
      meshes.floors.forEach((f) => f.geometry.dispose());
      meshes.furniture.forEach((f) => f.geometry.dispose());
    },
    [meshes],
  );

  const cutU = useMemo(() => ({ value: FULL_CUT }), []);
  useEffect(() => {
    const t = gsap.to(cutU, { value: cut ? SPACE_CUT : FULL_CUT, duration: reduced ? 0 : 0.9, delay: reduced ? 0.45 : 0.2, ease: 'power2.inOut', overwrite: true });
    return () => {
      t.kill();
    };
  }, [cut, reduced, cutU]);
  const depthMat = useMemo(() => cuttable(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), cutU), [cutU]);

  const mats = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}, surface?: Surface) =>
      cuttable(new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0, ...extra }), cutU, surface);
    return {
      walls: m('#e3dacb', { roughness: 0.92 }, 'plaster'),
      door: m(FURNITURE_COLORS.wood, { roughness: 0.6 }),
      // cielo raso: solo se ve desde abajo (recorrido por dentro); desde arriba no estorba
      ceiling: new THREE.MeshStandardMaterial({
        color: '#f4f1ea',
        roughness: 0.95,
        side: THREE.BackSide,
        shadowSide: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      }),
      glass: m('#bcd3d6', { roughness: 0.05, metalness: 0.2, depthWrite: false }),
      floors: Object.fromEntries(
        spaces.map((s) => [s.id, m(FLOOR_COLOR[s.type] ?? WOOD, { roughness: 0.7 }, surfaceFor(s.type))]),
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
  }, [spaces, meshes, cutU]);

  // aparece y desaparece con fundido
  useLayoutEffect(() => {
    const g = group.current;
    if (visible && g) g.visible = true;
    const all: [THREE.Material, number][] = [
      [mats.walls, 1],
      [mats.door, 1],
      [mats.ceiling, 1],
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
      {/* relleno de estudio para la maqueta; por dentro casi nada (la luz entra por las ventanas) */}
      <hemisphereLight args={['#fff8ee', '#8a8070', interior ? 0.15 : 0.55]} />
      {shadows ? (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.005} receiveShadow raycast={() => null}>
          <planeGeometry args={[meshes.size[0] + 4, meshes.size[1] + 4]} />
          <shadowMaterial transparent opacity={visible ? 0.22 : 0} />
        </mesh>
      ) : null}
      {meshes.walls ? (
        <mesh geometry={meshes.walls} material={mats.walls} customDepthMaterial={depthMat} castShadow={shadows} receiveShadow={shadows} />
      ) : null}
      {meshes.doors ? (
        <mesh geometry={meshes.doors} material={mats.door} customDepthMaterial={depthMat} castShadow={shadows} receiveShadow={shadows} raycast={() => null} />
      ) : null}
      {meshes.floors.map((f) => (
        <mesh
          key={`techo-${f.id}`}
          geometry={f.geometry}
          material={mats.ceiling}
          position-y={WALL_H}
          castShadow={shadows && interior}
          raycast={() => null}
        />
      ))}
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
          customDepthMaterial={depthMat}
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
