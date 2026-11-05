/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import { UnitCard, unitCover } from '@/components/hotel/UnitCard';
import { getHotelBundle } from '@/lib/content';
import { findCategory, findLevel, formatCOP, priceFrom, pluralize } from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';

/**
 * Entrada de marca (versión sin 3D). En el bloque 7 se suma la animación
 * de entrada y en el bloque 2 "Explorar" lleva a la vista exterior.
 */
export default async function EntradaPage({ params }: PageProps<'/h/[hotel]'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel, tokens } = bundle;
  const from = priceFrom(hotel);
  const featured = hotel.units.find((u) => u.featured) ?? hotel.units[0];
  const hero = featured ? unitCover(featured) : undefined;
  const floors = hotel.site.building?.floors ?? hotel.levels.length;
  // una unidad por categoría (la destacada si la hay)
  const showcase = hotel.categories
    .map((c) => hotel.units.find((u) => u.categoryId === c.id && u.featured) ?? hotel.units.find((u) => u.categoryId === c.id))
    .filter((u) => u !== undefined);

  return (
    <main className="mx-auto max-w-6xl px-5 md:px-10">
      <section className="grid gap-8 pt-8 md:grid-cols-12 md:items-end md:gap-10 md:pt-16">
        <div className="md:col-span-6">
          <p className="eyebrow">{[hotel.neighborhood, hotel.city].filter(Boolean).join(', ')}</p>
          <h1 className="mt-4 font-display text-[3.5rem] leading-[0.95] tracking-tight text-balance md:text-[5.5rem]">
            {tokens.brand.name}
          </h1>
          <p className="mt-4 font-display text-subtitle text-muted-foreground italic md:text-2xl">{tokens.brand.tagline}</p>
          {hotel.intro ? <p className="mt-6 max-w-md text-pretty">{hotel.intro}</p> : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={routes.explorar(hotel.slug)}
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-ink px-6 text-sm font-medium text-bone transition-[background-color,transform] duration-200 hover:bg-ink/88 active:scale-[0.98]"
            >
              Explorar el hotel
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              href={routes.lista(hotel.slug)}
              className="inline-flex min-h-12 items-center rounded-md px-4 text-sm font-medium underline-offset-4 hover:underline"
            >
              Ver lista de habitaciones
            </Link>
          </div>
        </div>
        {hero ? (
          <figure className="relative -mx-5 overflow-hidden md:col-span-6 md:mx-0 md:rounded-3xl">
            <img
              src={mediaUrl(hotel.slug, hero.src)}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover md:aspect-[4/5]"
            />
            <FidelityBadge fidelity={hero.fidelity} className="absolute top-3 left-5 md:left-4" />
          </figure>
        ) : null}
      </section>

      <dl className="mt-10 grid grid-cols-3 border-y border-border py-5 text-center md:mt-16">
        <div>
          <dt className="eyebrow">Pisos</dt>
          <dd className="mt-1 font-display text-title">{floors}</dd>
        </div>
        <div className="border-x border-border">
          <dt className="eyebrow">Categorías</dt>
          <dd className="mt-1 font-display text-title">{hotel.categories.length}</dd>
        </div>
        <div>
          <dt className="eyebrow">Desde</dt>
          <dd className="mt-1 font-display text-title">{from !== undefined ? formatCOP(from) : '—'}</dd>
        </div>
      </dl>

      <section aria-labelledby="unidades" className="mt-12 md:mt-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{pluralize(hotel.categories.length, 'categoría', 'categorías')}</p>
            <h2 id="unidades" className="mt-2 font-display text-title md:text-4xl">
              Elige cómo quedarte
            </h2>
          </div>
          <Link
            href={routes.lista(hotel.slug)}
            className="hidden min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline md:inline-flex"
          >
            Ver por pisos <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link
            href={routes.comparar(hotel.slug)}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Comparar <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
          {showcase.map((u) => (
            <li key={u.id}>
              <UnitCard
                hotel={hotel.slug}
                unit={u}
                category={findCategory(hotel, u.categoryId)}
                levelName={findLevel(hotel, u.levelId)?.name}
                variant="feature"
                className="h-full"
              />
            </li>
          ))}
        </ul>
      </section>

      {hotel.site.pois.length ? (
        <section aria-labelledby="comunes" className="mt-12 md:mt-20">
          <p className="eyebrow">En el edificio</p>
          <h2 id="comunes" className="mt-2 font-display text-title md:text-4xl">
            Zonas comunes
          </h2>
          <ul className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-3">
            {hotel.site.pois.map((p) => (
              <li key={p.id} className="border-t border-border pt-4">
                <h3 className="font-medium">
                  {p.name}
                  {p.levelId ? (
                    <span className="font-normal text-muted-foreground"> · {findLevel(hotel, p.levelId)?.name}</span>
                  ) : null}
                </h3>
                {p.description ? <p className="mt-1 text-sm text-pretty text-muted-foreground">{p.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
