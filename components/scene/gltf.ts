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
let ktx2: Promise<KTX2Loader> | null = null;
// los efectos de los hijos corren antes que los del padre: una planta podía pedir su GLB antes de
// que la escena registrara su renderer, y sin él no hay KTX2, el GLB no se lee y se veía la planta
// de código (unas veces sí y otras no). Ahora se espera al renderer.
let rendererReady: (gl: THREE.WebGLRenderer) => void = () => {};
const whenRenderer = new Promise<THREE.WebGLRenderer>((r) => (rendererReady = r));

export function setGltfRenderer(gl: THREE.WebGLRenderer) {
  renderer = gl;
  rendererReady(gl);
  // En producción no se revisan los errores de cada shader nuevo: esa revisión obliga a esperar
  // a que la compilación termine y congelaba la página al entrar a una habitación (D-089).
  // En desarrollo se deja, para ver los errores.
  if (process.env.NODE_ENV === 'production') gl.debug.checkShaderErrors = false;
}

/** Un solo KTX2Loader para toda la sesión, creado cuando ya hay renderer (antes se podían crear dos). */
function getKtx2() {
  ktx2 ??= (async () => {
    const [{ KTX2Loader }, gl] = await Promise.all([import('three/examples/jsm/loaders/KTX2Loader.js'), renderer ?? whenRenderer]);
    return new KTX2Loader().setTranscoderPath('/visor/basis/').detectSupport(gl);
  })();
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
