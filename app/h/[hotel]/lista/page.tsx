import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';

import { UnitCard } from '@/components/hotel/UnitCard';
import { NoSceneNotice } from '@/components/scene/NoSceneNotice';
import { getHotelBundle } from '@/lib/content';
import { findCategory, poisOnLevel, sortedLevels, unitsOnLevel } from '@/lib/hotel';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Pisos y unidades' };

/**
 * Modo lista: el recorrido completo sin 3D. Es el fallback real
 * (sin WebGL2 o con FPS bajo) y también se muestra al cliente.
 */
export default async function ListaPage({ params }: PageProps<'/h/[hotel]/lista'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel } = bundle;
  const levels = sortedLevels(hotel).reverse();

  return (
    <main className="mx-auto max-w-6xl px-5 md:px-10">
      <header className="pt-8 md:pt-14">
        <p className="eyebrow">{hotel.name}</p>
        <h1 className="mt-3 font-display text-display md:text-6xl">Pisos y unidades</h1>
        <p className="mt-4 max-w-lg text-pretty text-muted-foreground">
          El edificio de arriba hacia abajo. Toca una unidad para ver su plano y recorrer cada espacio.
        </p>
        <Link
          href={routes.comparar(hotel.slug)}
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          Comparar las categorías <ArrowRight aria-hidden className="size-4" />
        </Link>
        <Suspense>
          <NoSceneNotice slug={hotel.slug} />
        </Suspense>
      </header>

      <ol className="mt-10 md:mt-14">
        {levels.map((level) => {
          const units = unitsOnLevel(hotel, level.id);
          const pois = poisOnLevel(hotel, level.id);
          const empty = !units.length && !pois.length;
          return (
            <li
              key={level.id}
              className="grid gap-4 border-t border-border py-6 md:grid-cols-12 md:gap-10 md:py-8"
              aria-labelledby={`nivel-${level.id}`}
            >
              <div className="flex items-baseline justify-between gap-4 md:col-span-3 md:block">
                <h2 id={`nivel-${level.id}`} className="font-display text-title md:text-4xl">
                  {empty ? (
                    <span className="text-muted-foreground">{level.name}</span>
                  ) : (
                    <Link href={routes.piso(hotel.slug, level.id)} className="underline-offset-6 hover:underline">
                      {level.name}
                    </Link>
                  )}
                </h2>
                {!empty ? (
                  <Link
                    href={routes.piso(hotel.slug, level.id)}
                    className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:mt-2"
                  >
                    Ver piso <ArrowRight aria-hidden className="size-4" />
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 md:col-span-9">
                {units.map((u) => (
                  <UnitCard key={u.id} hotel={hotel.slug} unit={u} category={findCategory(hotel, u.categoryId)} />
                ))}
                {pois.length ? (
                  <ul className="flex flex-wrap gap-2" aria-label={`Zonas comunes del ${level.name}`}>
                    {pois.map((p) => (
                      <li key={p.id} className="inline-flex min-h-9 items-center rounded-full bg-secondary px-3.5 text-sm">
                        {p.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {empty ? <p className="text-sm text-muted-foreground">Sin unidades de muestra en esta demo.</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
