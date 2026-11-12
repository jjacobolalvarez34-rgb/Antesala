'use client';

/**
 * Hook único de movimiento reducido para GSAP (cámara) y Motion (UI).
 *
 * D-067: ya no sigue a prefers-reduced-motion. En Windows con los efectos de
 * animación apagados (muy común) la cámara saltaba sin transición y el
 * recorrido se veía cortado. Se deja el hook para tener un solo punto si más
 * adelante se agrega un interruptor propio de "menos movimiento".
 */
export function useReducedMotion(): boolean {
  return false;
}
