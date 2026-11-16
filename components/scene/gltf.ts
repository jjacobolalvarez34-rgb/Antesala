import type * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

/**
 * Cargador único de GLB para el 3D realista (D-087): Draco para la geometría y KTX2/Basis
 * para las texturas. Las texturas KTX2 quedan comprimidas dentro de la tarjeta de video (de
 * 4 a 8 veces menos memoria que WebP o JPG, que se descomprimen al subir). Los GLB viejos,
 * con WebP, siguen cargando igual.
 *
 * KTX2 necesita saber qué formatos acepta la tarjeta: la escena registra su renderer con
 * `setGltfRenderer` al montarse. Un solo KTX2Loader para toda la sesión (su transcodificador
 * vive en un worker y es caro de crear).
 */
let renderer: THREE.WebGLRenderer | null = null;
let ktx2: KTX2Loader | null = null;

export function setGltfRenderer(gl: THREE.WebGLRenderer) {
  renderer = gl;
}

async function getKtx2() {
  if (ktx2 || !renderer) return ktx2;
  const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
  ktx2 = new KTX2Loader().setTranscoderPath('/visor/basis/').detectSupport(renderer);
  return ktx2;
}

async function makeLoader() {
  const [{ GLTFLoader }, { DRACOLoader }, k] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    getKtx2(),
  ]);
  const draco = new DRACOLoader().setDecoderPath('/visor/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  if (k) loader.setKTX2Loader(k);
  return { loader, draco };
}

/** Baja y arma un GLB desde su URL (null si falla). */
export async function loadGltf(url: string): Promise<GLTF | null> {
  const { loader, draco } = await makeLoader();
  try {
    return await loader.loadAsync(url);
  } catch {
    return null;
  } finally {
    draco.dispose();
  }
}

/** Arma un GLB ya bajado (null si falla). */
export async function parseGltf(buf: ArrayBuffer): Promise<GLTF | null> {
  const { loader, draco } = await makeLoader();
  try {
    return await loader.parseAsync(buf, '');
  } catch {
    return null;
  } finally {
    draco.dispose();
  }
}
