'use client';

import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { FURNITURE_COLORS } from '@/components/plan/furniture';
import { planToMesh, WALL_H } from '@/components/plan/planToMesh';
import { polygonLabelPoint } from '@/lib/plan';
import type { PlanGeometry, SpaceType } from '@/lib/types';

import { usePrecompile } from './FloorPlanModel';

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

/** Uniformes compartidos por todos los materiales de la maqueta. */
interface CutUniforms {
  cut: { value: number };
  /** rectángulo del espacio enfocado (minX, minZ, maxX, maxZ), en metros de la maqueta */
  focus: { value: THREE.Vector4 };
  /** 0 = todo a la vista; 1 = lo que queda fuera del espacio enfocado se hundió en el piso */
  sink: { value: number };
}

/**
 * Recorta en el GPU todo lo que pase de uCut (sin deformar: los vértices altos
 * bajan al corte) y, si se pide, pinta un acabado procedural.
 *
 * Espacio enfocado (pedido de Jacobo, 2026-11-12): al elegir un espacio, lo que
 * queda fuera de su rectángulo se corta cada vez más bajo hasta desaparecer en
 * el piso, como columnas que se hunden, y solo queda el espacio elegido.
 */
function cuttable<T extends THREE.Material>(mat: T, u: CutUniforms, surface?: Surface): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = u.cut;
    shader.uniforms.uFocus = u.focus;
    shader.uniforms.uSink = u.sink;
    shader.vertexShader = `uniform float uCut;
varying vec3 vSurfPos;
varying vec3 vSurfNormal;
${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
  transformed.y = min(transformed.y, uCut);
  vSurfPos = transformed;
  vSurfNormal = normal;`,
    );
    shader.fragmentShader = `uniform float uCut;
uniform vec4 uFocus;
uniform float uSink;
varying vec3 vSurfPos;
varying vec3 vSurfNormal;
${surface ? NOISE : ''}
${shader.fragmentShader}`.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
  if (uSink > 0.0) {
    bool outside = vSurfPos.x < uFocus.x || vSurfPos.z < uFocus.y || vSurfPos.x > uFocus.z || vSurfPos.z > uFocus.w;
    if (outside && vSurfPos.y > mix(uCut + 0.01, -0.02, uSink)) discard;
  }`,
    );
    if (surface) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
${SURFACE[surface]}`);
    }
  };
  mat.customProgramCacheKey = () => `unit-cut-${surface ?? 'plain'}`;
  return mat;
}

/** Rectángulo de un espacio en metros de la maqueta, con margen para que queden sus muros. */
function focusRect(plan: PlanGeometry, spaceId: string, margin = 0.2): THREE.Vector4 | null {
  const sp = plan.spaces.find((x) => x.id === spaceId);
  if (!sp || !sp.points.length) return null;
  const xs = sp.points.map((p) => p[0] * 0.01 - (plan.width * 0.01) / 2);
  const zs = sp.points.map((p) => p[1] * 0.01 - (plan.height * 0.01) / 2);
  return new THREE.Vector4(Math.min(...xs) - margin, Math.min(...zs) - margin, Math.max(...xs) + margin, Math.max(...zs) + margin);
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
  focus = null,
  realista,
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
  /** espacio enfocado: el resto de la maqueta se hunde y desaparece */
  focus?: string | null;
  /** GLB horneado en Blender (D-074): reemplaza la maqueta por código cuando carga */
  realista?: string;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  usePrecompile(group, 0);
  const meshes = useMemo(() => planToMesh(plan), [plan]);
  const railing = useMemo(() => railingFor(plan, spaces), [plan, spaces]);
  useEffect(
    () => () => {
      railing.solid?.dispose();
      railing.glass?.dispose();
      meshes.walls?.dispose();
      meshes.glass?.dispose();
      meshes.doors?.dispose();
      meshes.floors.forEach((f) => f.geometry.dispose());
      meshes.furniture.forEach((f) => f.geometry.dispose());
    },
    [meshes, railing],
  );

  const uni = useMemo<CutUniforms>(() => ({ cut: { value: FULL_CUT }, focus: { value: new THREE.Vector4() }, sink: { value: 0 } }), []);
  const cutU = uni.cut;
  // enfocar: hundir lo de afuera; al cambiar de espacio, primero vuelve todo y luego se hunde otra vez
  useEffect(() => {
    const rect = focus ? focusRect(plan, focus) : null;
    const tl = gsap.timeline();
    const d = reduced ? 0 : 1;
    if (!rect) {
      tl.to(uni.sink, { value: 0, duration: 0.6 * d, ease: 'power2.out' });
    } else {
      if (uni.sink.value > 0.01) tl.to(uni.sink, { value: 0, duration: 0.35 * d, ease: 'power2.in' });
      tl.call(() => {
        uni.focus.value.copy(rect);
      });
      tl.to(uni.sink, { value: 1, duration: 1.1 * d, delay: reduced ? 0 : 0.25, ease: 'power2.inOut' });
    }
    return () => {
      tl.kill();
    };
  }, [focus, plan, reduced, uni]);
  useEffect(() => {
    const t = gsap.to(cutU, { value: cut ? SPACE_CUT : FULL_CUT, duration: reduced ? 0 : 0.9, delay: reduced ? 0.45 : 0.2, ease: 'power2.inOut', overwrite: true });
    return () => {
      t.kill();
    };
  }, [cut, reduced, cutU]);
  const depthMat = useMemo(() => cuttable(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uni), [uni]);

  const mats = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}, surface?: Surface) =>
      cuttable(new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true, opacity: 0, ...extra }), uni, surface);
    const named = <T extends THREE.Material>(name: string, mat: T) => ((mat.name = name), mat);
    return {
      walls: named('muros', m('#e3dacb', { roughness: 0.92 }, 'plaster')),
      door: named('puertas', m(FURNITURE_COLORS.wood, { roughness: 0.6 })),
      rail: named('baranda', m('#3b3733', { roughness: 0.5, metalness: 0.3 })),
      // cielo raso: solo se ve desde abajo (recorrido por dentro); desde arriba no estorba
      ceiling: named('techo', new THREE.MeshStandardMaterial({
        color: '#f4f1ea',
        roughness: 0.95,
        side: THREE.BackSide,
        shadowSide: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      })),
      glass: named('vidrio', m('#bcd3d6', { roughness: 0.05, metalness: 0.2, depthWrite: false })),
      floors: Object.fromEntries(
        spaces.map((s) => [s.id, named(`piso-${surfaceFor(s.type)}-${s.id}`, m(FLOOR_COLOR[s.type] ?? WOOD, { roughness: 0.7 }, surfaceFor(s.type)))]),
      ) as Record<string, THREE.MeshStandardMaterial>,
      furniture: Object.fromEntries(
        meshes.furniture.map((f) => [
          f.material,
          named(
            `mueble-${f.material}`,
            f.material === 'glass'
              ? m(FURNITURE_COLORS.glass, { roughness: 0.05, metalness: 0.2, depthWrite: false })
              : m(FURNITURE_COLORS[f.material], { roughness: f.material === 'metal' ? 0.45 : 0.85 }),
          ),
        ]),
      ) as Record<string, THREE.MeshStandardMaterial>,
    };
  }, [spaces, meshes, uni]);

  // maqueta realista (D-074): se carga aparte y, cuando llega, la maqueta por código se desvanece.
  // Muros y muebles horneados se ven sin iluminar (la luz ya viene en la textura); los pisos por
  // código quedan invisibles pero reciben el mouse y se encienden en cálido sobre la habitación.
  const [real, setReal] = useState<{ scene: THREE.Group; mats: THREE.Material[] } | null>(null);
  useEffect(() => {
    if (!realista) return;
    let alive = true;
    void (async () => {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/loaders/DRACOLoader.js'),
      ]);
      const draco = new DRACOLoader().setDecoderPath('/visor/draco/');
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(realista).catch(() => null);
      draco.dispose();
      if (!alive || !gltf) return;
      const out: THREE.Material[] = [];
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.raycast = () => null;
        const src = mesh.material as THREE.MeshStandardMaterial;
        // la luz ya viene horneada con la curva de Blender (AgX): sin la curva del visor encima (se veía más oscuro)
        const baked = src.name === 'horneado';
        const mat = baked
          ? cuttable(new THREE.MeshBasicMaterial({ map: src.map, transparent: true, opacity: 0, toneMapped: false }), uni)
          : cuttable(Object.assign(src, { transparent: true, opacity: 0 }), uni);
        mat.userData.base = src.name === 'vidrio' ? 0.35 : 1;
        mesh.material = mat;
        out.push(mat);
      });
      setReal({ scene: gltf.scene, mats: out });
    })();
    return () => {
      alive = false;
    };
  }, [realista, uni]);

  // aparece y desaparece con fundido
  useLayoutEffect(() => {
    const g = group.current;
    if (visible && g) g.visible = true;
    const on = real ? 0 : 1; // con la maqueta realista, la de código se apaga
    // y del todo: invisibles igual escribían profundidad y tapaban lo horneado (manchas oscuras)
    for (const m of [mats.walls, mats.door, mats.rail, mats.glass, ...Object.values(mats.furniture)]) m.visible = !real;
    const all: [THREE.Material, number][] = [
      [mats.walls, on],
      [mats.door, on],
      [mats.rail, on],
      [mats.ceiling, 1],
      [mats.glass, 0.35 * on],
      ...Object.values(mats.floors).map((m) => [m, on] as [THREE.Material, number]),
      ...Object.entries(mats.furniture).map(([k, m]) => [m, (k === 'glass' ? 0.3 : 1) * on] as [THREE.Material, number]),
      ...(real?.mats ?? []).map((m) => [m, m.userData.base as number] as [THREE.Material, number]),
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
  }, [visible, mats, reduced, real]);

  // resaltado del espacio (hover o seleccionado)
  useEffect(() => {
    for (const s of spaces) {
      const mat = mats.floors[s.id];
      if (!mat) continue;
      const base = new THREE.Color(FLOOR_COLOR[s.type] ?? WOOD);
      const active = s.id === selectedSpace;
      const hot = s.id === hoveredSpace;
      if (real) {
        // sobre la maqueta realista: un velo cálido solo en la habitación bajo el mouse o elegida
        mat.color.set('#f4a63f');
        mat.emissive.set('#000000');
        // invisibles pero encima del piso horneado: sin escribir profundidad (si no, lo tapaban y se veía negro)
        mat.depthWrite = false;
        gsap.to(mat, { opacity: active ? 0.28 : hot ? 0.36 : 0, duration: 0.3, overwrite: true });
        continue;
      }
      const target = active ? base.clone().lerp(new THREE.Color('#d8b98a'), 0.55) : hot ? base.clone().lerp(new THREE.Color('#ffffff'), 0.25) : base;
      gsap.to(mat.color, { r: target.r, g: target.g, b: target.b, duration: 0.25, overwrite: true });
      mat.emissive.set(active ? '#5a3f1c' : '#000000');
    }
  }, [selectedSpace, hoveredSpace, spaces, mats, real]);

  return (
    <group ref={group} position={position} visible={false} name="unidad-maqueta">
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
      {railing.solid ? (
        <mesh geometry={railing.solid} material={mats.rail} castShadow={shadows} receiveShadow={shadows} raycast={() => null} />
      ) : null}
      {railing.glass ? <mesh geometry={railing.glass} material={mats.glass} raycast={() => null} /> : null}
      {meshes.floors.map((f) => {
        // con un espacio enfocado, los pisos hundidos no se pueden tocar
        const live = visible && (!focus || f.id === focus);
        return (
        <mesh
          key={f.id}
          geometry={f.geometry}
          material={mats.floors[f.id]}
          position-y={0.01}
          receiveShadow={shadows}
          raycast={live ? THREE.Mesh.prototype.raycast : () => null}
          onPointerOver={
            live
              ? (e: ThreeEvent<PointerEvent>) => {
                  e.stopPropagation();
                  onHover(f.id);
                  document.body.style.cursor = 'pointer';
                }
              : undefined
          }
          onPointerOut={
            live
              ? () => {
                  onHover(null);
                  document.body.style.cursor = '';
                }
              : undefined
          }
          onClick={
            live
              ? (e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  onSelect(f.id);
                }
              : undefined
          }
        />
        );
      })}
      {real ? <primitive object={real.scene} /> : null}
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

/**
 * Baranda de balcones y terrazas (D-052): en cada borde del polígono que no da
 * contra un muro, sardinel de 12 cm, vidrio hasta 1 m y pasamanos. Sin ella, por
 * dentro se veía el vacío al borde de la terraza.
 */
function railingFor(plan: PlanGeometry, spaces: UnitSpaceMeta[]) {
  const outdoor = new Set(spaces.filter((s) => s.type === 'balcon' || s.type === 'terraza').map((s) => s.id));
  const ox = plan.width / 2;
  const oz = plan.height / 2;
  const solid: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const nearWall = (x: number, y: number) =>
    plan.walls.some((w) => x >= w.x - 20 && x <= w.x + w.width + 20 && y >= w.y - 20 && y <= w.y + w.height + 20);
  const strip = (x0: number, y0: number, x1: number, y1: number, t: number, h0: number, h1: number, out: THREE.BufferGeometry[]) => {
    const len = Math.hypot(x1 - x0, y1 - y0) * 0.01;
    const g = new THREE.BoxGeometry(len, h1 - h0, t);
    g.rotateY(-Math.atan2(y1 - y0, x1 - x0));
    g.translate(((x0 + x1) / 2 - ox) * 0.01, (h0 + h1) / 2, ((y0 + y1) / 2 - oz) * 0.01);
    out.push(g);
  };
  for (const s of plan.spaces) {
    if (!outdoor.has(s.id)) continue;
    const pts = s.points;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]!;
      const [bx, by] = pts[(i + 1) % pts.length]!;
      // un borde contra la fachada (muro) no lleva baranda
      if (nearWall((ax + bx) / 2, (ay + by) / 2)) continue;
      strip(ax, ay, bx, by, 0.1, 0, 0.12, solid);
      strip(ax, ay, bx, by, 0.02, 0.12, 1.0, glass);
      strip(ax, ay, bx, by, 0.06, 1.0, 1.05, solid);
    }
  }
  const merge = (list: THREE.BufferGeometry[]) => {
    if (!list.length) return null;
    const g = mergeGeometries(list, false);
    list.forEach((x) => x.dispose());
    return g;
  };
  return { solid: merge(solid), glass: merge(glass) };
}
