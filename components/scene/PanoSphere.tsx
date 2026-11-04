'use client';

import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

/**
 * Panorama 360° dentro de la misma escena (bloque 4, D-036): una esfera con
 * la imagen equirectangular alrededor del punto de vista del espacio. Se
 * funde al entrar; la maqueta queda detrás. Convención: la columna u mira en
 * (x, z) = (cos 2πu, sin 2πu), igual que pipeline/panos.mjs.
 */

const RADIUS = 9;

const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture>>();
function loadPano(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** Dirección en el mundo para un yaw/pitch del panorama. */
export function panoDirection(yaw: number, pitch: number): [number, number, number] {
  return [Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)];
}

export function PanoSphere({
  url,
  position,
  visible,
  reduced,
  onReady,
}: {
  url: string;
  position: [number, number, number];
  visible: boolean;
  reduced: boolean;
  onReady?: () => void;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    loadPano(url).then(
      (t) => {
        if (!alive) return;
        setTexture(t);
        onReady?.();
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [url, onReady]);

  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(RADIUS, 64, 32);
    g.scale(-1, 1, 1); // se ve desde adentro sin espejo
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => {
    material.map = texture;
    material.needsUpdate = true;
  }, [texture, material]);

  useLayoutEffect(() => {
    gsap.to(material, {
      opacity: visible && texture ? 1 : 0,
      duration: reduced ? 0 : visible ? 0.7 : 0.35,
      delay: visible && !reduced ? 0.25 : 0,
      ease: 'power2.out',
      overwrite: true,
    });
  }, [visible, texture, material, reduced]);

  return <mesh geometry={geometry} material={material} position={position} renderOrder={10} raycast={() => null} />;
}
