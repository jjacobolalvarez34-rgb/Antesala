import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Maquetas horneadas (D-074): los GLB se bajan una vez y se guardan en memoria, para
 * precargar las unidades del piso abierto. Al entrar a una habitación la horneada ya
 * está y entra sola, sin pasar por la maqueta por código.
 */
const buffers = new Map<string, Promise<ArrayBuffer | null>>();

function fetchBuffer(url: string) {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    buffers.set(url, p);
    // si falló, que el próximo intento lo vuelva a pedir
    void p.then((b) => {
      if (!b) buffers.delete(url);
    });
  }
  return p;
}

/** una copia ya decodificada, lista para el próximo que la pida */
const ready = new Map<string, Promise<GLTF | null>>();

/** Baja y decodifica el GLB por adelantado (con el piso abierto). */
export function prefetchBaked(url: string) {
  if (!ready.has(url)) ready.set(url, parse(url));
}

/** GLB listo para la escena (una copia nueva cada vez: cada uso cambia sus materiales). */
export function loadBaked(url: string): Promise<GLTF | null> {
  const pre = ready.get(url);
  if (pre) {
    ready.delete(url);
    return pre;
  }
  return parse(url);
}

async function parse(url: string): Promise<GLTF | null> {
  const [buf, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
    fetchBuffer(url),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
  ]);
  if (!buf) return null;
  const draco = new DRACOLoader().setDecoderPath('/visor/draco/');
  try {
    return await new GLTFLoader().setDRACOLoader(draco).parseAsync(buf.slice(0), '');
  } catch {
    return null;
  } finally {
    draco.dispose();
  }
}
