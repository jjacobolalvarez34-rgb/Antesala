'use client';

import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import { Move3d } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ReserveButton } from '@/components/booking/ReserveSheet';
import { routes } from '@/lib/routes';
import type { Offer } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { WhatsAppContext } from '@/lib/whatsapp';

/** Secciones de la portada del hotel (ids en app/h/[hotel]/page.tsx). */
const SECTIONS = [
  ['habitaciones', 'Habitaciones'],
  ['edificio', 'El edificio'],
  ['ubicacion', 'Ubicación'],
  ['preguntas', 'Preguntas'],
] as const;

/**
 * Encabezado del sitio del hotel (D-078): como la web de un hotel real, menú de
 * secciones, recorrido 3D y Reservar fijo. En la portada va transparente sobre la
 * foto y se vuelve sólido al bajar. En las vistas con 3D queda la marca en una
 * pastilla oscura, sin tapar la escena.
 */
export function HotelHeader({
  slug,
  name,
  place,
  booking,
  offer,
}: {
  slug: string;
  name: string;
  place: string;
  booking: WhatsAppContext;
  offer?: Offer;
}) {
  const segments = useSelectedLayoutSegments();
  const home = segments.length === 0;
  const inScene = segments[0] === 'explorar' || segments[0] === 'piso' || segments[0] === 'unidad';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!home) return;
    const on = () => setScrolled(window.scrollY > 48);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [home]);

  if (inScene) {
    // con el 3D encendido (data-scene) va en pastillas oscuras sobre la escena; sin 3D, normal
    return (
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-4 scene:pointer-events-auto scene:text-bone md:px-10 md:pt-6">
        <Link
          href={routes.hotel(slug)}
          className="group flex min-h-11 flex-col justify-center scene:glass-dark scene:rounded-2xl scene:px-4 scene:py-1.5"
        >
          <span className="font-display text-[1.375rem] leading-none tracking-tight">{name}</span>
          <span className="mt-1 hidden text-xs tracking-[0.14em] text-muted-foreground uppercase scene:text-bone/70 sm:block">{place}</span>
        </Link>
        <Link
          href={routes.lista(slug)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border whitespace-nowrap scene:max-md:hidden border-border px-4 text-sm transition-colors hover:border-ink/40 hover:bg-card scene:glass-dark scene:border-bone/20 scene:hover:bg-ink"
        >
          Pisos y unidades
        </Link>
      </header>
    );
  }

  // sobre la foto de la portada: claro y transparente; si no, sólido
  const over = home && !scrolled;
  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-[background-color,border-color,color] duration-300',
        over ? 'border-b border-transparent bg-transparent text-bone' : 'border-b border-border bg-background text-ink',
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-6 px-5 md:px-10">
        <Link href={routes.hotel(slug)} className="flex min-h-11 flex-col justify-center">
          <span className="font-display text-[1.5rem] leading-none tracking-tight">{name}</span>
          <span className={cn('mt-1 text-[0.625rem] tracking-[0.22em] uppercase', over ? 'text-bone/75' : 'text-muted-foreground')}>{place}</span>
        </Link>
        <nav aria-label="Secciones" className="ml-auto hidden items-center gap-7 text-[0.8125rem] lg:flex">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`${routes.hotel(slug)}#${id}`}
              className={cn('py-2 underline-offset-[6px] transition-colors hover:underline', over ? 'text-bone/90' : 'text-ink/80 hover:text-ink')}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <Link
            href={routes.explorar(slug)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 px-2 text-[0.8125rem] transition-colors',
              over ? 'text-bone hover:text-white' : 'text-ink hover:text-accent',
            )}
          >
            <Move3d aria-hidden className="size-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Recorrido 3D</span>
            <span className="sm:hidden">3D</span>
          </Link>
          <ReserveButton context={booking} offer={offer} tone={over ? 'bone' : 'ink'} className="max-md:hidden" />
        </div>
      </div>
    </header>
  );
}
