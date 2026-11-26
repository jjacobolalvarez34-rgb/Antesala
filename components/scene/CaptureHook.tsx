'use client';

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type V3 = [number, number, number];

declare global {
  interface Window {
    /**
     * Solo con ?captura=1 (D-095): el pipeline de la vista guiada pone la cámara exacta y mide
     * dónde cae cada piso y cada unidad en la imagen. Lo usa pipeline/guiada.spec.ts.
     */
    __antesalaCaptura?: {
      setCamera: (c: { position: V3; target: V3; fov: number }) => Promise<void>;
      /** la cámara tal como la dejó el visor (para saber hacia dónde mira la fachada principal) */
      getCamera: () => { position: V3; target: V3; fov: number };
      /** puntos del mundo → [x, y] en la imagen, de 0 a 1 (y hacia abajo) */
      project: (points: V3[]) => [number, number][];
      /** pisos: el contorno del edificio abajo y arriba de cada piso, en el mundo */
      floors: () => { id: string; order: number; points: V3[] }[];
      /** unidades y lugares del piso abierto, en el mundo */
      spaces: () => { id: string; kind: 'unit' | 'poi'; points: V3[] }[];
      /** deja a la vista solo la planta de un piso, sobre un fondo liso (D-095: "que se vea solo el piso") */
      isolateFloor: (levelId: string, background: string) => Promise<boolean>;
      /** la planta horneada (Premium) ya llegó y terminó su fundido: si no, la toma sale con la de código */
      planReady: (levelId: string) => boolean;
      /** diagnóstico: mallas visibles y altas (material, si corta, alto) */
      meshes: () => string[];
      programs: () => string[];
      forceCut: (v: number) => number;
      /** diagnóstico: qué materiales tiene la planta de un piso */
      planInfo: (levelId: string) => { found: boolean; visible: boolean; mats: string[]; names: string[] };
    };
  }
}

/**
 * Puente al pipeline de la vista guiada (D-095). Sin ?captura no hace nada: no cambia la escena.
 */
export function CaptureHook({
  footprint,
  floorHeight,
  floors,
  spaces,
}: {
  footprint: [number, number][];
  floorHeight: number;
  floors: { id: string; order: number }[];
  spaces: { id: string; kind: 'unit' | 'poi'; points: V3[] }[];
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean; target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const spacesRef = useRef(spaces);
  useEffect(() => {
    spacesRef.current = spaces;
  });
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('captura')) return;
    const frames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    // el visor corre la vista para dejar sitio a los paneles (CameraRig) y lo vuelve a poner en
    // cada cuadro: en la toma la planta salía corrida y cortada. Mientras se captura, no hace nada.
    const setViewOffset = camera.setViewOffset;
    camera.setViewOffset = () => camera;
    camera.clearViewOffset();
    window.__antesalaCaptura = {
      setCamera: async ({ position, target, fov }) => {
        if (controls) {
          controls.enabled = false;
          // sin los límites del visor (distancia e inclinación): si no, corrigen la cámara de la toma
          const c = controls as unknown as Record<string, number>;
          c.minDistance = 0;
          c.maxDistance = Infinity;
          c.minPolarAngle = 0;
          c.maxPolarAngle = Math.PI;
          controls.target.set(...target);
        }
        camera.clearViewOffset();
        camera.fov = fov;
        camera.position.set(...position);
        camera.lookAt(...target);
        camera.updateProjectionMatrix();
        controls?.update();
        camera.lookAt(...target);
        invalidate();
        await frames();
        await frames();
      },
      getCamera: () => ({
        position: camera.position.toArray() as V3,
        target: (controls?.target.toArray() ?? [0, 0, 0]) as V3,
        fov: camera.fov,
      }),
      project: (points) =>
        points.map(([x, y, z]) => {
          const v = new THREE.Vector3(x, y, z).project(camera);
          return [(v.x + 1) / 2, (1 - v.y) / 2];
        }),
      floors: () =>
        floors.map((f) => ({
          id: f.id,
          order: f.order,
          points: [
            ...footprint.map(([x, z]) => [x, (f.order - 1) * floorHeight, z] as V3),
            ...footprint.map(([x, z]) => [x, f.order * floorHeight, z] as V3),
          ],
        })),
      spaces: () => spacesRef.current,
      planInfo: (levelId) => {
        const plan = scene.getObjectByName(`planta-${levelId}`);
        const mats: string[] = [];
        plan?.traverse((o) => {
          const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (mat) mats.push(`${mat.type}:${mat.name}:${mat.opacity.toFixed(2)}:${mat.userData?.base ?? '-'}:${o.visible}`);
        });
        const names: string[] = [];
        scene.traverse((o) => {
          if (/planta|piso|plan/i.test(o.name) || o.userData?.floorPlan) names.push(`${o.name || '(sin nombre)'}${o.userData?.floorPlan ? '*' : ''}`);
        });
        return { found: !!plan, visible: plan?.visible ?? false, mats: [...new Set(mats)].slice(0, 30), names: names.slice(0, 40) };
      },
      meshes: () => {
        const out: string[] = [];
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible) return;
          let vis = true;
          for (let q: THREE.Object3D | null = m; q; q = q.parent) if (!q.visible) vis = false;
          if (!vis) return;
          const mat = m.material as THREE.Material;
          if (!mat || mat.opacity < 0.05) return;
          m.geometry.computeBoundingBox();
          const bb = m.geometry.boundingBox!;
          if (bb.max.y - bb.min.y < 1.5) return;
          const props = gl.properties.get(mat) as { uniforms?: Record<string, { value: unknown }> };
          const u = props.uniforms;
          const extra = u ? ` cut=${JSON.stringify(u.uCut?.value)} sink=${JSON.stringify(u.uSink?.value)}` : ' sin-programa';
          out.push(`${m.name || '-'} |${extra} | ${mat.type}:${mat.name} | ${mat.onBeforeCompile.toString().includes('uCut') ? 'corta' : 'no-corta'} | y ${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)} | key ${mat.customProgramCacheKey?.() ?? ''}`);
        });
        return out;
      },
      programs: () => {
        const ctx = gl.getContext();
        return (gl.info.programs ?? [])
          .filter((pr) => /unit-cut|basic|MeshBasic/i.test(String((pr as unknown as { cacheKey: string }).cacheKey) + (pr as unknown as { name: string }).name))
          .map((pr) => {
            const p = pr as unknown as { name: string; cacheKey: string; vertexShader: WebGLShader };
            const src = ctx.getShaderSource(p.vertexShader) ?? '';
            return `${p.name} | ${p.cacheKey.slice(0, 60) + ' … ' + p.cacheKey.slice(-40)} | clamp=${src.includes('min(transformed.y, uCut)')}`;
          });
      },
      forceCut: (v: number) => {
        let n = 0;
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const u = (gl.properties.get(m.material as THREE.Material) as { uniforms?: Record<string, { value: number }> }).uniforms;
          if (u?.uCut) {
            u.uCut.value = v;
            n++;
          }
        });
        invalidate();
        return n;
      },
      planReady: (levelId) => {
        const plan = scene.getObjectByName(`planta-${levelId}`);
        let ready = false;
        plan?.traverse((o) => {
          const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
          const base = mat?.userData?.base as number | undefined;
          if (base !== undefined && mat!.opacity >= base * 0.98) ready = true;
        });
        return ready;
      },
      isolateFloor: async (levelId, background) => {
        const plan = scene.getObjectByName(`planta-${levelId}`);
        if (!plan) return false;
        // lo que queda: la planta, sus padres (para su posición) y las luces
        const keep = new Set<THREE.Object3D>();
        plan.traverse((o) => keep.add(o));
        for (let p = plan.parent; p; p = p.parent) keep.add(p);
        scene.traverse((o) => {
          if (keep.has(o) || (o as THREE.Light).isLight) return;
          if ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine || (o as THREE.Sprite).isSprite)
            o.visible = false;
        });
        plan.visible = true;
        scene.background = new THREE.Color(background);
        scene.fog = null;
        invalidate();
        await frames();
        await frames();
        return true;
      },
    };
    return () => {
      camera.setViewOffset = setViewOffset;
      delete window.__antesalaCaptura;
    };
  }, [camera, controls, invalidate, scene, gl, footprint, floorHeight, floors]);
  return null;
}
