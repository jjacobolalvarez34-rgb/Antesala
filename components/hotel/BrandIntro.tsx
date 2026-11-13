'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { can3d, useTour } from '@/lib/store';

/**
 * Entrada de marca como telón de carga del edificio (D-043, D-052, D-080): mientras
 * carga el 3D, sobre la foto de portada con viñeta y un marco fino, el nombre sube
 * desde una ranura, se dibuja un filete bronce y aparece el lema; cuando la escena
 * está lista, el telón se levanta y deja ver el edificio. Así nunca se ve
 * la lista de respaldo "a medio cargar".
 *
 * - Solo en etapas con 3D (edificio, piso, unidad) y si el 3D se va a mostrar:
 *   sin WebGL, con la lista elegida o mientras se pregunta "¿quieres 3D?", no tapa.
 * - Animada la primera vez de la sesión; después, el nombre quieto (el script en
 *   línea marca <html data-intro="seen"> antes de pintar).
 * - Dura al menos lo que la animación; como máximo 20 s aunque el 3D no llegue.
 * - Solo CSS (sin GSAP en el JS inicial). "Entrar" levanta el telón de inmediato.
 */
const KEY = 'antesala:intro';
const MIN_ANIMATED_MS = 2900;
const MIN_STATIC_MS = 300;
const MAX_MS = 20_000;
const LEAVE_MS = 1050;

export function BrandIntro({
  name,
  tagline,
  base,
  cover,
  place,
}: {
  name: string;
  tagline: string;
  base: string;
  cover?: string;
  /** "Chapinero Alto · Bogotá" */
  place?: string;
}) {
  const pathname = usePathname();
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  const stage3d = /^\/(explorar|piso\/[^/]+|unidad\/[^/]+)(\/[^/]+)?\/?$/.test(rest);
  const tour = useTour();
  const blocked = tour.quality !== null && !can3d(tour);
  const [phase, setPhase] = useState<'cover' | 'leaving' | 'done'>('cover');
  const show = stage3d && phase !== 'done' && !blocked;

  // cuándo empezó a verse y si se anima (primera vez de la sesión)
  const shownAt = useRef<number | null>(null);
  const animated = useRef(true);

  useEffect(() => {
    if (!show || phase !== 'cover') return;
    if (shownAt.current === null) {
      shownAt.current = performance.now();
      animated.current = document.documentElement.dataset.intro !== 'seen';
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {
        /* sin almacenamiento: se anima cada vez */
      }
    }
    const elapsed = performance.now() - shownAt.current;
    const min = animated.current ? MIN_ANIMATED_MS : MIN_STATIC_MS;
    const wait = tour.sceneReady ? Math.max(0, min - elapsed) : Math.max(0, MAX_MS - elapsed);
    const t = window.setTimeout(() => setPhase('leaving'), wait);
    return () => window.clearTimeout(t);
  }, [show, phase, tour.sceneReady]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = window.setTimeout(() => setPhase('done'), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!show) return null;

  return (
    <>
      <script
        // se ejecuta al parsear el HTML, antes de pintar
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${KEY}'))document.documentElement.dataset.intro='seen'}catch(e){}`,
        }}
      />
      <div
        role="status"
        aria-label={`${name}: preparando el edificio`}
        className={`brand-intro pointer-events-auto fixed inset-0 z-50 overflow-hidden bg-ink text-bone ${phase === 'leaving' ? 'brand-intro-leave' : ''}`}
      >
        {/* la foto de portada con un acercamiento lento y viñeta (solo transform: fluido aunque el 3D se esté armando) */}
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto ya cargada en la portada
          <img aria-hidden alt="" src={cover} className="brand-intro-cover absolute inset-0 size-full object-cover" />
        ) : null}
        <div aria-hidden className="brand-intro-vignette absolute inset-0" />
        <div aria-hidden className="brand-intro-fog" />

        {/* marco fino, como el de una tarjeta de hotel */}
        <div aria-hidden className="brand-intro-frame pointer-events-none absolute inset-4 md:inset-8" />

        <div className="relative flex h-full flex-col items-center justify-between px-6 py-12 text-center md:py-16">
          <p className="brand-intro-place text-[0.6875rem] tracking-[0.42em] text-bone/70 uppercase">{place}</p>
          <div>
            <p className="font-display text-[3.75rem] leading-[0.95] tracking-tight md:text-[8rem]" aria-hidden>
              <span className="brand-intro-mask">
                <span className="brand-intro-name">{name}</span>
              </span>
            </p>
            <span aria-hidden className="brand-intro-rule mx-auto mt-7 block h-px w-40 bg-accent-on-dark md:mt-9 md:w-56" />
            {tagline ? <p className="brand-intro-tagline mt-6 font-display text-xl text-bone/80 italic md:text-[1.75rem]">{tagline}</p> : null}
          </div>
          <div aria-hidden className="flex flex-col items-center gap-4">
            <span className="brand-intro-progress block h-px w-40 overflow-hidden bg-bone/15" />
            <span className="text-[0.625rem] tracking-[0.32em] text-bone/55 uppercase">Preparando el recorrido</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPhase('leaving')}
          className="brand-intro-enter absolute right-6 bottom-[calc(1.75rem+var(--safe-bottom))] inline-flex min-h-11 items-center gap-2 px-2 text-[0.6875rem] tracking-[0.28em] text-bone/75 uppercase transition-colors hover:text-bone md:right-12 md:bottom-12"
        >
          Entrar
          <span aria-hidden className="h-px w-6 bg-current" />
        </button>
      </div>
    </>
  );
}
