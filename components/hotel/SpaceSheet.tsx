'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

import { Gallery, type GalleryItem } from '@/components/gallery/Gallery';
import { SpaceSheetFrame } from '@/components/scene/SpaceViewControls';
import { SplatButton } from '@/components/splat/SplatButton';
import { formatArea } from '@/lib/hotel';
import type { Space, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRoutes, useT } from '@/components/i18n/Lang';

/**
 * Ficha del espacio sobre la maqueta. Arriba, siempre a la vista, la fila de espacios de la
 * unidad (cambiar de espacio es lo que más se hace); debajo, 360° / Maqueta y "Fotos y
 * detalles", que despliega la galería, la descripción y la dotación (ver SpaceSheetFrame).
 * Solo se ve en modo escena.
 */
export function SpaceSheet({
  slug,
  unit,
  space,
  photos,
  splat,
}: {
  slug: string;
  unit: Unit;
  space: Space;
  photos: GalleryItem[];
  /** recorrido 3D fotográfico del espacio (D-082) */
  splat?: { url: string; exact: boolean };
}) {
  const tr = useT();
  const routes = useRoutes();
  const nav = (
    <nav aria-label={tr('Espacios de {x}', { x: unit.name })}>
      <p className="flex items-baseline justify-between gap-2 px-1 text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
        <Link href={routes.unidad(slug, unit.id)} className="truncate underline-offset-4 hover:underline">
          {unit.name}
        </Link>
        {space.areaM2 ? <span className="shrink-0 normal-case tracking-normal">{formatArea(space.areaM2)}</span> : null}
      </p>
      {/* una sola fila que se desliza: los espacios siempre a la vista, sin bajar */}
      <ul className="scrollbar-none -mx-3 mt-1.5 flex gap-1.5 overflow-x-auto px-3 pb-0.5">
        {unit.spaces.map((s) => (
          <li key={s.id} className="shrink-0">
            <Link
              href={routes.espacio(slug, unit.id, s.id)}
              aria-current={s.id === space.id ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors',
                s.id === space.id ? 'border-ink bg-ink font-medium text-bone' : 'border-border hover:border-ink/40',
              )}
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
  return (
    <section
      aria-label={space.name}
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-30 hidden max-h-[52dvh] animate-in flex-col overflow-hidden rounded-[var(--hotel-r-card,22px)] bg-card shadow-2xl duration-500 fade-in slide-in-from-bottom-4 scene:flex md:inset-x-auto md:top-32 md:right-6 md:bottom-auto md:max-h-[calc(100dvh-var(--booking-bar-h)-10rem)] md:w-[420px] md:slide-in-from-right-4"
    >
      <SpaceSheetFrame hasPano={space.media.some((m) => m.kind === 'pano360')} title={space.name} nav={nav}>
        <div className="p-3">
          <Gallery items={photos} title={space.name} className="[&>div:first-child]:rounded-2xl" />
          <div className="px-1">
            {space.description ? <p className="mt-3 text-sm text-pretty">{space.description}</p> : null}
            {splat ? <SplatButton url={splat.url} title={space.name} exact={splat.exact} className="mt-3" /> : null}
            {space.features.length ? (
              <ul className="mt-3 grid grid-cols-1 gap-1.5 pb-1 text-sm sm:grid-cols-2">
                {space.features.slice(0, 6).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </SpaceSheetFrame>
    </section>
  );
}
