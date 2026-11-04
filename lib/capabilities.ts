/**
 * Decide la calidad gráfica del dispositivo (ARQUITECTURA.md §6):
 * - alto: postproceso, sombras, DPR hasta 2.
 * - medio: sin postproceso, DPR 1,5.
 * - bajo: DPR 1, sin sombras ni postproceso (equipos justos o render por software).
 * - lista: solo sin WebGL2 (o si la persona elige la lista).
 *
 * Si el equipo parece justo, no se decide por la persona: se le pregunta si
 * quiere la experiencia 3D (D-025). Durante el recorrido la calidad baja sola,
 * pero nunca saca a nadie del 3D.
 *
 * Se puede forzar con ?calidad=alto|medio|bajo|lista (queda en sessionStorage).
 */
export type Quality = 'alto' | 'medio' | 'bajo' | 'lista';

export interface Capability {
  quality: Quality;
  /** el equipo parece justo: preguntar antes de cargar el 3D */
  ask: boolean;
}

const KEY = 'antesala:calidad';
const QUALITIES: Quality[] = ['alto', 'medio', 'bajo', 'lista'];

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

export function detectCapability(): Capability {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return { quality: 'lista', ask: false };

  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;

  if (/swiftshader|llvmpipe|software/i.test(renderer) || memory < 2 || cores < 2) {
    return { quality: 'bajo', ask: true };
  }
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch || memory <= 4 || cores <= 4) return { quality: 'medio', ask: false };
  return { quality: 'alto', ask: false };
}

/** Nunca baja a lista: el peor caso del 3D es "bajo". */
export const lowerQuality = (q: Quality): Quality => (q === 'alto' ? 'medio' : q === 'medio' ? 'bajo' : q);
export const higherQuality = (q: Quality): Quality => (q === 'bajo' ? 'medio' : q === 'medio' ? 'alto' : q);
