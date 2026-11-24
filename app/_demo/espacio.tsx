import type { Metadata } from 'next';
import { routesFor, t, type Lang } from '@/lib/i18n';

import type { DemoProps } from './types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { Gallery } from '@/components/gallery/Gallery';
import { Breadcrumbs } from '@/components/hotel/Breadcrumbs';
import { SpaceSheet } from '@/components/hotel/SpaceSheet';
import { PanoButton } from '@/components/pano/PanoButton';
import { SplatButton } from '@/components/splat/SplatButton';
import { SpaceChips } from '@/components/hotel/SpaceChips';
import { PlanSvg } from '@/components/plan/PlanSvg';
import { getHotelBundle } from '@/lib/content';
import { findLevel, findUnit, formatArea } from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';

export const dynamicParams = false;

/** [unidad] no tiene layout, así que aquí se generan ambos segmentos. */
export async function generateStaticParams({ params }: { params: { hotel: string } }) {
  const bundle = await getHotelBundle(params.hotel);
  return bundle ? bundle.hotel.units.flatMap((u) => u.spaces.map((s) => ({ unidad: u.id, espacio: s.id }))) : [];
}

export async function generateMetadata(
  { params }: DemoProps<{ hotel: string; unidad: string; espacio: string }>,
  lang: Lang = 'es',
): Promise<Metadata> {
  const { hotel, unidad, espacio } = await params;
  const bundle = await getHotelBundle(hotel, lang);
  const unit = bundle ? findUnit(bundle.hotel, unidad) : undefined;
  const space = unit?.spaces.find((s) => s.id === espacio);
  return { title: unit && space ? `${space.name} · ${unit.name}` : undefined };
}

export async function EspacioPage({ params }: DemoProps<{ hotel: string; unidad: string; espacio: string }>, lang: Lang = 'es') {
  const tr = (es: string, vars?: Record<string, string | number>) => t(lang, es, vars);
  const routes = routesFor(lang);
  const { hotel: slug, unidad, espacio } = await params;
  const bundle = await getHotelBundle(slug, lang);
  const unit = bundle ? findUnit(bundle.hotel, unidad) : undefined;
  const index = unit ? unit.spaces.findIndex((s) => s.id === espacio) : -1;
  const space = unit?.spaces[index];
  if (!bundle || !unit || !space) notFound();
  const { hotel, plans } = bundle;

  const level = findLevel(hotel, unit.levelId);
  const geometry = plans[unit.plan];
  const prev = unit.spaces[index - 1];
  const next = unit.spaces[index + 1];
  const photos = space.media
    .filter((m) => m.kind === 'photo')
    .map((m) => ({
      id: m.id,
      url: mediaUrl(hotel.slug, m.src),
      alt: m.alt,
      fidelity: m.fidelity,
      width: m.width,
      height: m.height,
      tier: m.tier,
    }));

  // recorrido 3D fotográfico del espacio (Gaussian Splatting, D-082), si lo hay
  const splatMedia = space.media.find((m) => m.kind === 'splat');
  const splat = splatMedia
    ? {
        url: mediaUrl(hotel.slug, splatMedia.src),
        exact: splatMedia.fidelity === 'exacta',
      }
    : undefined;
  // 360° renderizado desde un punto fijo (D-084): en el modo sin 3D (y en Esencial) se mira aquí
  const panoMedia = space.media.find((m) => m.kind === 'pano360' && !m.src.endsWith('.svg'));
  const pano360 = panoMedia ? { url: mediaUrl(hotel.slug, panoMedia.src), yaw: panoMedia.yaw } : undefined;

  return (
    <main>
      <SpaceSheet slug={hotel.slug} unit={unit} space={space} photos={photos} splat={splat} />
      {/* Modo lista (sin escena) */}
      <div className="mx-auto max-w-6xl px-5 scene:hidden md:px-10">
        <div className="pt-6 md:pt-10">
          <Breadcrumbs
            items={[
              {
                label: level?.name ?? unit.levelId,
                href: routes.piso(hotel.slug, unit.levelId),
              },
              { label: unit.name, href: routes.unidad(hotel.slug, unit.id) },
              { label: space.name },
            ]}
          />
        </div>

        <div className="mt-4 grid gap-8 md:grid-cols-12 md:gap-12">
          <Gallery items={photos} title={space.name} className="-mx-5 min-w-0 sm:mx-0 md:col-span-7" />

          <div className="md:col-span-5">
            <p className="eyebrow">
              {unit.name}
              {space.areaM2 ? ` · ${formatArea(space.areaM2)}` : ''}
            </p>
            <h1 className="mt-2 font-display text-display md:text-6xl">{space.name}</h1>
            {space.description ? <p className="mt-4 text-pretty md:text-lg">{space.description}</p> : null}
            {splat || pano360 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {pano360 ? <PanoButton url={pano360.url} title={space.name} yaw={pano360.yaw} /> : null}
                {splat ? <SplatButton url={splat.url} title={space.name} exact={splat.exact} /> : null}
              </div>
            ) : null}

            {space.features.length ? (
              <section aria-labelledby="dotacion" className="mt-8">
                <h2 id="dotacion" className="eyebrow">
                  {tr('Dotación')}
                </h2>
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {space.features.map((f) => (
                    <li key={f} className="flex min-h-11 items-center gap-3 py-2 text-[0.9375rem]">
                      <Check aria-hidden className="size-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {geometry ? (
              <section aria-labelledby="ubicacion" className="mt-8">
                <h2 id="ubicacion" className="eyebrow">
                  {tr('Ubicación en la unidad')}
                </h2>
                <div className="mt-3 rounded-2xl border border-border bg-secondary p-4">
                  <PlanSvg
                    geometry={geometry}
                    spaces={unit.spaces.map((s) => ({
                      id: s.id,
                      name: s.name,
                      href: routes.espacio(hotel.slug, unit.id, s.id),
                      outdoor: s.type === 'balcon' || s.type === 'terraza',
                    }))}
                    selectedId={space.id}
                    title={tr('Plano de {x} con {y} resaltado', { x: unit.name, y: space.name })}
                    className="mx-auto max-w-sm"
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <section aria-labelledby="otros" className="mt-12 border-t border-border pt-8">
          <h2 id="otros" className="font-display text-subtitle">
            {tr('Otros espacios de esta unidad')}
          </h2>
          <SpaceChips hotel={hotel.slug} unitId={unit.id} spaces={unit.spaces} currentId={space.id} className="mt-4" />
          <nav aria-label={tr('Espacio anterior y siguiente')} className="mt-8 grid grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={routes.espacio(hotel.slug, unit.id, prev.id)}
                className="group flex min-h-16 flex-col justify-center rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-ink/25"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeft aria-hidden className="size-3.5" /> Anterior
                </span>
                <span className="truncate text-sm font-medium">{prev.name}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={routes.espacio(hotel.slug, unit.id, next.id)}
                className="group flex min-h-16 flex-col items-end justify-center rounded-2xl border border-border bg-card px-4 py-3 text-right transition-colors hover:border-ink/25"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  Siguiente <ArrowRight aria-hidden className="size-3.5" />
                </span>
                <span className="truncate text-sm font-medium">{next.name}</span>
              </Link>
            ) : (
              <Link
                href={routes.unidad(hotel.slug, unit.id)}
                className="flex min-h-16 flex-col items-end justify-center rounded-2xl border border-border bg-card px-4 py-3 text-right transition-colors hover:border-ink/25"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  Volver <ArrowRight aria-hidden className="size-3.5" />
                </span>
                <span className="truncate text-sm font-medium">{tr('Resumen de la unidad')}</span>
              </Link>
            )}
          </nav>
        </section>
      </div>
    </main>
  );
}
