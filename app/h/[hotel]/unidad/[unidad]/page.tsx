/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Eye } from 'lucide-react';

import { Breadcrumbs } from '@/components/hotel/Breadcrumbs';
import { UnitSheet } from '@/components/hotel/UnitSheet';
import { Facts } from '@/components/hotel/Facts';
import { WhatsAppButton } from '@/components/booking/WhatsAppButton';
import { PlanSvg } from '@/components/plan/PlanSvg';
import { getHotelBundle } from '@/lib/content';
import { findCategory, findLevel, findUnit, formatArea, formatCOP, pluralize, unitPrice } from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { hotel: string } }) {
  const bundle = await getHotelBundle(params.hotel);
  return bundle ? bundle.hotel.units.map((u) => ({ unidad: u.id })) : [];
}

export async function generateMetadata({ params }: PageProps<'/h/[hotel]/unidad/[unidad]'>): Promise<Metadata> {
  const { hotel, unidad } = await params;
  const bundle = await getHotelBundle(hotel);
  return { title: bundle ? findUnit(bundle.hotel, unidad)?.name : undefined };
}

export default async function UnidadPage({ params }: PageProps<'/h/[hotel]/unidad/[unidad]'>) {
  const { hotel: slug, unidad } = await params;
  const bundle = await getHotelBundle(slug);
  const unit = bundle ? findUnit(bundle.hotel, unidad) : undefined;
  if (!bundle || !unit) notFound();
  const { hotel, plans } = bundle;

  const category = findCategory(hotel, unit.categoryId);
  const level = findLevel(hotel, unit.levelId);
  const geometry = plans[unit.plan];
  const price = unitPrice(unit);

  return (
    <main>
      <UnitSheet slug={hotel.slug} unit={unit} category={category} level={level} />
      {/* Modo lista (sin escena) */}
      <div className="mx-auto max-w-6xl px-5 scene:hidden md:px-10">
      <div className="pt-6 md:pt-10">
        <Breadcrumbs
          items={[
            { label: 'Pisos', href: routes.lista(hotel.slug) },
            { label: level?.name ?? unit.levelId, href: routes.piso(hotel.slug, unit.levelId) },
            { label: unit.name },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <p className="eyebrow">{category?.name}</p>
          <h1 className="mt-2 font-display text-display md:text-6xl">{unit.name}</h1>
          {category ? <p className="mt-3 text-pretty text-muted-foreground md:text-lg">{category.tagline}</p> : null}

          {geometry ? (
            <section aria-labelledby="plano" className="mt-8">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="plano" className="font-display text-subtitle">
                  Plano
                </h2>
                <p className="text-sm text-muted-foreground">Toca un espacio para verlo</p>
              </div>
              <div className="mt-3 rounded-3xl border border-border bg-secondary p-4 sm:p-8">
                <PlanSvg
                  geometry={geometry}
                  spaces={unit.spaces.map((s) => ({
                    id: s.id,
                    name: s.name,
                    areaM2: s.areaM2,
                    href: routes.espacio(hotel.slug, unit.id, s.id),
                    outdoor: s.type === 'balcon' || s.type === 'terraza',
                  }))}
                  title={`Plano de ${unit.name}, ${formatArea(unit.areaM2)}`}
                  className="mx-auto max-w-xl"
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 md:col-span-5 md:pt-24">
          <Facts
            items={[
              { label: 'Área', value: formatArea(unit.areaM2) },
              { label: 'Capacidad', value: pluralize(unit.capacity, 'persona', 'personas') },
              { label: 'Camas', value: unit.beds },
              { label: 'Ubicación', value: level?.name ?? unit.levelId },
            ]}
          />

          {price !== undefined ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="eyebrow">Precio por noche</p>
              <p className="mt-2">
                <span className="font-display text-title">{formatCOP(price)}</span>
                <span className="text-sm text-muted-foreground"> · tarifa simulada</span>
              </p>
              {unit.viewPremiumCOP && unit.basePriceCOP !== undefined ? (
                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Tarifa base</dt>
                    <dd>{formatCOP(unit.basePriceCOP)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 font-medium text-accent">
                    <dt>Extra por vista y piso alto</dt>
                    <dd>+ {formatCOP(unit.viewPremiumCOP)}</dd>
                  </div>
                </dl>
              ) : null}
              {unit.view ? (
                <p className="mt-4 flex gap-2 text-sm text-pretty">
                  <Eye aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  {unit.view}
                </p>
              ) : null}
              <WhatsAppButton
                context={{ phone: hotel.contact.whatsapp, hotelName: hotel.name, unitName: unit.name }}
                label="Reservar esta unidad"
                className="mt-5 w-full"
              />
            </div>
          ) : null}

          {category?.highlights.length ? (
            <ul className="space-y-2">
              {category.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </div>

      <section aria-labelledby="espacios" className="mt-12 md:mt-16">
        <h2 id="espacios" className="font-display text-title md:text-4xl">
          Espacios
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-5">
          {unit.spaces.map((s) => {
            const photo = s.media.find((m) => m.kind === 'photo');
            return (
              <li key={s.id}>
                <Link
                  href={routes.espacio(hotel.slug, unit.id, s.id)}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-ink/25"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {photo ? (
                      <img
                        src={mediaUrl(hotel.slug, photo.src)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3 md:p-4">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      {s.areaM2 ? <span className="text-xs text-muted-foreground">{formatArea(s.areaM2)}</span> : null}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      </div>
    </main>
  );
}
