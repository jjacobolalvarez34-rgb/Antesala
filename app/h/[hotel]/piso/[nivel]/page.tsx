/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { Breadcrumbs } from '@/components/hotel/Breadcrumbs';
import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import { FloorSheet } from '@/components/hotel/FloorSheet';
import { PlanSvg } from '@/components/plan/PlanSvg';
import { getHotelBundle } from '@/lib/content';
import {
  findCategory,
  findLevel,
  formatArea,
  formatCOP,
  pluralize,
  poisOnLevel,
  sortedLevels,
  unitPrice,
  unitsOnLevel,
} from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { hotel: string } }) {
  const bundle = await getHotelBundle(params.hotel);
  return bundle ? bundle.hotel.levels.map((l) => ({ nivel: l.id })) : [];
}

export async function generateMetadata({ params }: PageProps<'/h/[hotel]/piso/[nivel]'>): Promise<Metadata> {
  const { hotel, nivel } = await params;
  const bundle = await getHotelBundle(hotel);
  return { title: bundle ? findLevel(bundle.hotel, nivel)?.name : undefined };
}

export default async function PisoPage({ params }: PageProps<'/h/[hotel]/piso/[nivel]'>) {
  const { hotel: slug, nivel } = await params;
  const bundle = await getHotelBundle(slug);
  const level = bundle ? findLevel(bundle.hotel, nivel) : undefined;
  if (!bundle || !level) notFound();
  const { hotel, plans } = bundle;

  const levels = sortedLevels(hotel);
  const idx = levels.findIndex((l) => l.id === level.id);
  const above = levels[idx + 1];
  const below = levels[idx - 1];
  const units = unitsOnLevel(hotel, level.id);
  const pois = poisOnLevel(hotel, level.id);

  return (
    <main>
      <FloorSheet
        slug={hotel.slug}
        level={level}
        total={levels.length}
        units={units}
        categories={hotel.categories}
        pois={pois}
        above={above}
        below={below}
      />
      {/* Modo lista (sin escena) */}
      <div className="mx-auto max-w-6xl px-5 scene:hidden md:px-10">
      <div className="pt-6 md:pt-10">
        <Breadcrumbs items={[{ label: 'Pisos', href: routes.lista(hotel.slug) }, { label: level.name }]} />
      </div>
      <header className="mt-4 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">
            {level.name} de {levels.length}
          </p>
          <h1 className="mt-2 font-display text-display md:text-6xl">{level.name}</h1>
          <p className="mt-3 text-muted-foreground">
            {[
              units.length ? pluralize(units.length, 'unidad', 'unidades') : null,
              pois.length ? pois.map((p) => p.name).join(' y ') : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Fuera del recorrido de la demo'}
          </p>
        </div>
        <nav aria-label="Otros pisos" className="flex shrink-0 gap-2">
          {above ? (
            <Link
              href={routes.piso(hotel.slug, above.id)}
              aria-label={`Subir a ${above.name}`}
              className="grid size-11 place-items-center rounded-full border border-border bg-card transition-colors hover:border-ink/40"
            >
              <ArrowUp aria-hidden className="size-4" />
            </Link>
          ) : null}
          {below ? (
            <Link
              href={routes.piso(hotel.slug, below.id)}
              aria-label={`Bajar a ${below.name}`}
              className="grid size-11 place-items-center rounded-full border border-border bg-card transition-colors hover:border-ink/40"
            >
              <ArrowDown aria-hidden className="size-4" />
            </Link>
          ) : null}
        </nav>
      </header>

      {level.plan && plans[level.plan] ? (
        <section aria-labelledby="planta" className="mt-8 rounded-3xl border border-border bg-secondary p-4 sm:p-8 md:mt-12">
          <h2 id="planta" className="eyebrow">
            {units.length ? 'Planta del piso · toca una unidad' : 'Planta del piso'}
          </h2>
          <PlanSvg
            geometry={plans[level.plan]!}
            spaces={units.map((u) => ({
              id: u.id,
              name: u.name,
              areaM2: u.areaM2,
              href: routes.unidad(hotel.slug, u.id),
            }))}
            title={`Planta del ${level.name}`}
            className="mx-auto mt-4 max-w-2xl"
          />
        </section>
      ) : null}

      {units.length ? (
        <section aria-label="Unidades" className="mt-8 flex flex-col gap-5 md:mt-12">
          {units.map((u) => {
            const category = findCategory(hotel, u.categoryId);
            const geometry = plans[u.plan];
            const price = unitPrice(u);
            return (
              <article
                key={u.id}
                className="grid overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2"
              >
                {geometry ? (
                  <Link
                    href={routes.unidad(hotel.slug, u.id)}
                    aria-label={`Plano de ${u.name}`}
                    className="flex items-center justify-center bg-secondary p-6 md:p-10"
                  >
                    <PlanSvg
                      geometry={geometry}
                      spaces={u.spaces.map((s) => ({
                        id: s.id,
                        name: s.name,
                        href: routes.espacio(hotel.slug, u.id, s.id),
                        outdoor: s.type === 'balcon' || s.type === 'terraza',
                      }))}
                      variant="thumb"
                      title={`Plano de ${u.name}`}
                      className="w-full max-w-sm"
                    />
                  </Link>
                ) : null}
                <div className="flex flex-col gap-4 p-5 md:p-8">
                  <p className="eyebrow">{category?.name}</p>
                  <h2 className="font-display text-title md:text-4xl">{u.name}</h2>
                  {category ? <p className="text-pretty text-muted-foreground">{category.tagline}</p> : null}
                  <p className="text-sm">
                    {formatArea(u.areaM2)} · {pluralize(u.capacity, 'persona', 'personas')} · {u.beds}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {u.spaces.map((s) => (
                      <li key={s.id} className="rounded-full bg-secondary px-3 py-1 text-xs">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
                    {price !== undefined ? (
                      <p>
                        <span className="text-lg font-semibold">{formatCOP(price)}</span>
                        <span className="text-sm text-muted-foreground"> / noche</span>
                        {u.viewPremiumCOP ? (
                          <span className="block text-xs font-medium text-accent">
                            Incluye {formatCOP(u.viewPremiumCOP)} por vista
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={routes.unidad(hotel.slug, u.id)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-bone transition-colors hover:bg-ink/88"
                    >
                      Ver unidad <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {pois.length ? (
        <section aria-labelledby="comunes" className="mt-10 md:mt-14">
          <h2 id="comunes" className="font-display text-title">
            Zonas comunes
          </h2>
          <ul className="mt-5 grid gap-5 md:grid-cols-2">
            {pois.map((p) => {
              const photo = p.media.find((m) => m.kind === 'photo');
              return (
                <li key={p.id} className="overflow-hidden rounded-3xl border border-border bg-card">
                  {photo ? (
                    <div className="relative aspect-[3/2] bg-muted">
                      <img
                        src={mediaUrl(hotel.slug, photo.src)}
                        alt={photo.alt}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 size-full object-cover"
                      />
                      <FidelityBadge fidelity={photo.fidelity} className="absolute top-3 left-3" />
                    </div>
                  ) : null}
                  <div className="p-5">
                    <h3 className="font-display text-subtitle">{p.name}</h3>
                    {p.description ? (
                      <p className="mt-1 text-sm text-pretty text-muted-foreground">{p.description}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!units.length && !pois.length ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Este piso no tiene unidades de muestra en la demo.</p>
          <Link
            href={routes.lista(hotel.slug)}
            className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Ver todos los pisos <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      ) : null}
      </div>
    </main>
  );
}
