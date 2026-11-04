import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

import { ASSETS, visorUrl } from './prefetch';

export { ASSETS, prefetch, visorUrl } from './prefetch';

/**
 * Assets genéricos del visor (public/visor) con carga escalonada (D-029):
 * - precarga: desde la entrada, en tiempo ocioso, se calienta la caché HTTP
 *   con lo del día (HDRI y texturas), sin decodificar nada;
 * - carga: la escena arranca con texturas procedurales y cambia a las reales
 *   cuando llegan;
 * - poscarga: lo de noche se pide después de que el día está listo.
 * Las promesas se cachean: cada asset se pide una sola vez.
 */

const textures = new Map<string, Promise<THREE.Texture>>();

export function loadTexture(path: string, srgb: boolean): Promise<THREE.Texture> {
  const key = `${path}|${srgb}`;
  let p = textures.get(key);
  if (!p) {
    p = new THREE.TextureLoader().loadAsync(visorUrl(path)).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8;
      return t;
    });
    p.catch(() => textures.delete(key));
    textures.set(key, p);
  }
  return p;
}

const envs = new Map<string, Promise<THREE.Texture>>();

/** HDRI equirectangular → textura de entorno (PMREM la genera three al asignarla). */
export function loadEnvironment(path: string): Promise<THREE.Texture> {
  let p = envs.get(path);
  if (!p) {
    p = new HDRLoader().loadAsync(visorUrl(path)).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      return t;
    });
    p.catch(() => envs.delete(path));
    envs.set(path, p);
  }
  return p;
}

export interface CladdingMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  arm: THREE.Texture;
}

export async function loadBrick(): Promise<CladdingMaps> {
  const [map, normalMap, arm] = await Promise.all([
    loadTexture(ASSETS.ladrillo.color, true),
    loadTexture(ASSETS.ladrillo.normal, false),
    loadTexture(ASSETS.ladrillo.arm, false),
  ]);
  return { map, normalMap, arm };
}

export async function loadLinen() {
  const [map, normalMap] = await Promise.all([loadTexture(ASSETS.lino.color, true), loadTexture(ASSETS.lino.normal, false)]);
  return { map, normalMap };
}
