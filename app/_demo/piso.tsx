/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import type { Metadata } from 'next';
import { routesFor, t, type Lang } from '@/lib/i18n';

import type { DemoProps } from './types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { Breadcrumbs } from '@/components/hotel/Breadcrumbs';
import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import { FloorSheet } from '@/components/hotel/FloorSheet';
import { TerrainOverlay } from '@/components/hotel/TerrainExplorar';
import { PlanSvg } from '@/components/plan/PlanSvg';
import { getHotelBundle } from '@/lib/content';
import {
  findCategory,
  findLevel,
  formatArea,
  formatCOP,
  offerOf,
  pluralize,
  poisOnLevel,
  sortedLevels,
  unitPrice,
  unitsOnLevel,
} from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { hotel: string } }) {
  const bundle = await getHotelBundle(params.hotel);
  return bundle ? bundle.hotel.levels.map((l) => ({ nivel: l.id })) : [];
}

export async function generateMetadata({ params }: DemoProps<{ hotel: string; nivel: string }>, lang: Lang = 'es'): Promise<Metadata> {
  const { hotel, nivel } = await params;
  const bundle = await getHotelBundle(hotel, lang);
  return { title: bundle ? findLevel(bundle.hotel, nivel)?.name : undefined };
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export async function PisoPage({ params }: DemoProps<{ hotel: string; nivel: string }>, lang: Lang = 'es') {
  const tr = (es: string, vars?: Record<string, string | number>) => t(lang, es, vars);
  const routes = routesFor(lang);
  const { hotel: slug, nivel } = await params;
  const bundle = await getHotelBundle(slug, lang);
  const level = bundle ? findLevel(bundle.hotel, nivel) : undefined;
  if (!bundle || !level) notFound();
  const { hotel, plans } = bundle;

  const levels = sortedLevels(hotel);
  const idx = levels.findIndex((l) => l.id === level.id);
  const above = levels[idx + 1];
  const below = levels[idx - 1];
  const units = unitsOnLevel(hotel, level.id);
  const pois = poisOnLevel(hotel, level.id);

  // glamping (D-083): el "piso" es el mapa del terreno; sobre el 3D, la vista aérea con su panel
  const terrain = hotel.site.kind === 'terreno';

  return (
    <main>
      {terrain ? <TerrainOverlay hotel={hotel} aerial /> : null}
      <FloorSheet
        hidden={terrain}
        offer={hotel.offer}
        slug={hotel.slug}
        level={level}
        total={levels.length}
        units={units}
        pois={pois}
        above={above}
        below={below}
        levels={levels.map(({ id, name, order }) => ({ id, name, order }))}
      />
      {/* Modo lista (sin escena) */}
      <div className="mx-auto max-w-6xl px-5 scene:hidden md:px-10">
        <div className="pt-6 md:pt-10">
          <Breadcrumbs
            items={[
              {
                label: terrain ? tr('Refugios') : tr('Pisos'),
                href: routes.lista(hotel.slug),
              },
              { label: level.name },
            ]}
          />
        </div>
        <header className="mt-4 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{terrain ? tr('Mapa del terreno') : tr('{x} de {n}', { x: level.name, n: levels.length })}</p>
            <h1 className="mt-2 font-display text-display md:text-6xl">{level.name}</h1>
            <p className="mt-3 text-muted-foreground">
              {[
                units.length ? pluralize(units.length, terrain ? 'refugio' : 'unidad', terrain ? 'refugios' : 'unidades') : null,
                pois.length ? (terrain ? pois.map((p) => p.name).join(', ') : pois.map((p) => p.name).join(' y ')) : null,
              ]
                .filter(Boolean)
                .join(' · ') || tr('Fuera del recorrido de la demo')}
            </p>
          </div>
          <nav aria-label={tr('Otros pisos')} className="flex shrink-0 gap-2">
            {above ? (
              <Link
                href={routes.piso(hotel.slug, above.id)}
                aria-label={tr('Subir a {x}', { x: above.name })}
                className="grid size-11 place-items-center rounded-full border border-border bg-card transition-colors hover:border-ink/40"
              >
                <ArrowUp aria-hidden className="size-4" />
              </Link>
            ) : null}
            {below ? (
              <Link
                href={routes.piso(hotel.slug, below.id)}
                aria-label={tr('Bajar a {x}', { x: below.name })}
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
              {terrain ? tr('Mapa del terreno · toca un refugio') : units.length ? tr('Planta del piso · toca una unidad') : tr('Planta del piso')}
            </h2>
            <PlanSvg
              geometry={plans[level.plan]!}
              spaces={units.map((u) => ({
                id: u.id,
                name: u.name,
                areaM2: u.areaM2,
                href: routes.unidad(hotel.slug, u.id),
                // disponibilidad sobre la planta (bloque 9): verde libre, terracota ocupada o vendida
                status: u.occupied ? ('ocupada' as const) : ('libre' as const),
                statusLabel: u.occupied ? offerOf(hotel, lang).takenShort : capitalize(offerOf(hotel, lang).free),
              }))}
              title={tr('Planta del {x}', { x: level.name })}
              className="mx-auto mt-4 max-w-2xl"
            />
            {units.length ? (
              <ul
                aria-label={tr('Leyenda')}
                className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
              >
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3 rounded-sm border border-ink/20 bg-[#dfe8d6]" />
                  {capitalize(offerOf(hotel, lang).freePlural)} · {units.filter((u) => !u.occupied).length}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-3 rounded-sm border border-ink/20 bg-[#efd9cf]" />
                  {offerOf(hotel, lang).takenShort} · {units.filter((u) => u.occupied).length}
                </li>
              </ul>
            ) : null}
          </section>
        ) : null}

        {units.length ? (
          <section aria-label={tr('Unidades')} className="mt-8 flex flex-col gap-5 md:mt-12">
            {units.map((u) => {
              const category = findCategory(hotel, u.categoryId);
              const geometry = plans[u.plan];
              const price = unitPrice(u);
              return (
                <article key={u.id} className="grid overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2">
                  {geometry ? (
                    <Link
                      href={routes.unidad(hotel.slug, u.id)}
                      aria-label={tr('Plano de {x}', { x: u.name })}
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
                        title={tr('Plano de {x}', { x: u.name })}
                        className="w-full max-w-sm"
                      />
                    </Link>
                  ) : null}
                  <div className="flex flex-col gap-4 p-5 md:p-8">
                    <p className="eyebrow">{category?.name}</p>
                    <h2 className="font-display text-title md:text-4xl">{u.name}</h2>
                    {category ? <p className="text-pretty text-muted-foreground">{category.tagline}</p> : null}
                    <p className="text-sm">
                      {formatArea(u.areaM2)} · {pluralize(u.capacity, tr('persona'), tr('personas'))} · {u.beds}
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
                          <span className="text-sm text-muted-foreground">{offerOf(hotel, lang).suffix}</span>
                          {u.viewPremiumCOP ? (
                            <span className="block text-xs font-medium text-accent">Incluye {formatCOP(u.viewPremiumCOP)} por vista</span>
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
              {tr('Zonas comunes')}
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
                      {p.description ? <p className="mt-1 text-sm text-pretty text-muted-foreground">{p.description}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {!units.length && !pois.length ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">{tr('Este piso no tiene unidades de muestra en la demo.')}</p>
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
