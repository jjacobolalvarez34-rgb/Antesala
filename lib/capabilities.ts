/**
 * Decide la calidad gráfica del dispositivo (ARQUITECTURA.md §6):
 * - alto: postproceso, sombras, DPR hasta 2.
 * - medio: sin postproceso, DPR 1,5.
 * - lista: sin WebGL2, render por software o FPS bajo sostenido → modo lista.
 *
 * Se puede forzar con ?calidad=alto|medio|lista (queda en sessionStorage);
 * útil para pruebas y para la demo en un equipo concreto.
 */
export type Quality = 'alto' | 'medio' | 'lista';

const KEY = 'antesala:calidad';
const QUALITIES: Quality[] = ['alto', 'medio', 'lista'];

export function qualityOverride(): Quality | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('calidad');
  if (param && (QUALITIES as string[]).includes(param)) {
    sessionStorage.setItem(KEY, param);
    return param as Quality;
  }
  const stored = sessionStorage.getItem(KEY);
  return stored && (QUALITIES as string[]).includes(stored) ? (stored as Quality) : null;
}

export function detectQuality(): Quality {
  const forced = qualityOverride();
  if (forced) return forced;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return 'lista';

  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  if (/swiftshader|llvmpipe|software/i.test(renderer)) return 'lista';

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  if (memory < 2 || cores < 2) return 'lista';

  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch || memory <= 4 || cores <= 4) return 'medio';
  return 'alto';
}

export const lowerQuality = (q: Quality): Quality => (q === 'alto' ? 'medio' : 'lista');
export const higherQuality = (q: Quality): Quality => (q === 'medio' ? 'alto' : q);
