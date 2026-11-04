import Link from 'next/link';
import { Check } from 'lucide-react';

import { Gallery, type GalleryItem } from '@/components/gallery/Gallery';
import { SpaceSheetFrame } from '@/components/scene/SpaceViewControls';
import { formatArea } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Space, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Ficha del espacio sobre la maqueta (bloque 3): la cámara se acerca al
 * espacio y este panel trae su galería, descripción y dotación. En el
 * bloque 4 se suma el 360°. Solo se ve en modo escena.
 */
export function SpaceSheet({
  slug,
  unit,
  space,
  photos,
}: {
  slug: string;
  unit: Unit;
  space: Space;
  photos: GalleryItem[];
}) {
  return (
    <section
      aria-label={space.name}
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-30 hidden max-h-[52dvh] animate-in flex-col overflow-hidden rounded-3xl bg-card shadow-2xl duration-500 fade-in slide-in-from-bottom-4 scene:flex md:inset-x-auto md:top-28 md:right-6 md:bottom-auto md:max-h-[calc(100dvh-var(--booking-bar-h)-10rem)] md:w-[420px] md:slide-in-from-right-4"
    >
      <SpaceSheetFrame hasPano={space.media.some((m) => m.kind === 'pano360')} title={space.name}>
      <div className="scrollbar-none p-4">
        <Gallery items={photos} title={space.name} className="[&>div:first-child]:rounded-2xl" />
        <div className="px-1">
          <p className="eyebrow mt-4">
            <Link href={routes.unidad(slug, unit.id)} className="underline-offset-4 hover:underline">
              {unit.name}
            </Link>
            {space.areaM2 ? ` · ${formatArea(space.areaM2)}` : ''}
          </p>
          <h1 className="mt-1 font-display text-title leading-none">{space.name}</h1>
          {space.description ? <p className="mt-2 text-sm text-pretty">{space.description}</p> : null}
          {space.features.length ? (
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
              {space.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
          <nav aria-label="Otros espacios" className="mt-4 border-t border-border pt-3">
            <ul className="flex flex-wrap gap-1.5">
              {unit.spaces.map((s) => (
                <li key={s.id}>
                  <Link
                    href={routes.espacio(slug, unit.id, s.id)}
                    aria-current={s.id === space.id ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-10 items-center rounded-full border px-3 text-sm transition-colors',
                      s.id === space.id ? 'border-ink bg-ink text-bone' : 'border-border hover:border-ink/40',
                    )}
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      </SpaceSheetFrame>
    </section>
  );
}
