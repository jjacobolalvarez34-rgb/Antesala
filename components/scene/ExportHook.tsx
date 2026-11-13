'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type * as THREE from 'three';

declare global {
  interface Window {
    /** solo con ?export=1: exporta un grupo de la escena a GLB (base64) para Blender (D-074) */
    __antesalaExport?: (name: string) => Promise<string>;
  }
}

/**
 * Puente al pipeline del 3D realista: con ?export=1 deja en window una función
 * que exporta un objeto de la escena (por nombre) a GLB. Lo usa
 * pipeline/realista/exportar.spec.ts. Sin el parámetro no hace nada.
 */
export function ExportHook() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('export')) return;
    window.__antesalaExport = async (name: string) => {
      const obj = scene.getObjectByName(name) as THREE.Object3D | undefined;
      if (!obj) throw new Error(`no existe ${name}`);
      // con opacidad completa y visible, sin la animación de entrada
      obj.traverse((o) => {
        o.visible = true;
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
          mat.opacity = 1;
          mat.transparent = mat.name === 'vidrio' || mat.name === 'mueble-glass';
        }
      });
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      // en el origen: así las coordenadas del GLB son las del plano (metros, centrado) y Blender
      // puede ubicar cada mueble con el SVG
      const prev = obj.position.clone();
      obj.position.set(0, 0, 0);
      obj.updateMatrixWorld(true);
      const buf = (await new GLTFExporter().parseAsync(obj, { binary: true, onlyVisible: true })) as ArrayBuffer;
      obj.position.copy(prev);
      obj.updateMatrixWorld(true);
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    };
    return () => {
      delete window.__antesalaExport;
    };
  }, [scene]);
  return null;
}
