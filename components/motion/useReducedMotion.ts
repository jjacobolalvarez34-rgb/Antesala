'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hook único para prefers-reduced-motion (DISENO.md §4, regla 7).
 * Sin dependencias para que sirva a GSAP (cámara) y a Motion (UI) por igual.
 * Las transiciones CSS se apagan además desde app/globals.css.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
