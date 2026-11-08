/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Clock, MapPin, MessageCircle, Move3d, Plus } from 'lucide-react';

import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import { unitCover } from '@/components/hotel/UnitCard';
import { getHotelBundle } from '@/lib/content';
import { findLevel, formatArea, formatCOP, pluralize, priceFrom, unitPrice } from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';
import type { Media, Unit } from '@/lib/types';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

/**
 * Portada del hotel (D-053): sirve de sitio web completo para los hoteles que
 * no tienen página propia. Todo sale del contenido del hotel (hotel.json y
 * tokens.json); cada sección aparece solo si hay con qué llenarla.
 */
export default async function EntradaPage({ params }: PageProps<'/h/[hotel]'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel, tokens } = bundle;
  const info = hotel.info ?? {};
  const from = priceFrom(hotel);
  const place = [hotel.neighborhood, hotel.city].filter(Boolean).join(', ');
  const floors = hotel.site.building?.floors ?? hotel.levels.length;
  const photo = (m: Media | undefined) => (m ? mediaUrl(hotel.slug, m.src) : undefined);

  const exterior = hotel.site.exterior.filter((m) => m.kind === 'photo');
  const hero = exterior[0] ?? unitCover(hotel.units.find((u) => u.featured) ?? hotel.units[0]!);
  const night = exterior.find((m) => /noche/i.test(m.src));
  const openFloor = exterior.find((m) => /piso/i.test(m.src));

  // una tarjeta por categoría: precio desde, área y capacidad, y la unidad que se muestra
  const categories = hotel.categories.map((c) => {
    const units = hotel.units.filter((u) => u.categoryId === c.id);
    const prices = units.map(unitPrice).filter((p): p is number => p !== undefined);
    const show: Unit | undefined = units.find((u) => u.featured) ?? units.find((u) => !('sameAs' in u)) ?? units[0];
    return {
      ...c,
      count: units.length,
      from: prices.length ? Math.min(...prices) : undefined,
      area: show?.areaM2,
      capacity: show?.capacity,
      show,
      cover: show ? unitCover(show) : undefined,
    };
  });

  const whatsapp = buildWhatsAppUrl({ phone: hotel.contact.whatsapp, hotelName: tokens.brand.name });
  const facts = [
    { label: 'Pisos', value: String(floors) },
    { label: 'Habitaciones', value: String(hotel.units.length) },
    { label: 'Desde', value: from !== undefined ? formatCOP(from) : '—', hint: 'por noche' },
    info.checkIn ? { label: 'Llegada', value: info.checkIn } : null,
  ].filter((f) => f !== null);

  return (
    <main>
      {/* Portada: el edificio a pantalla completa */}
      <section className="px-3 md:px-6">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-ink text-bone md:rounded-[2.25rem]">
          {hero ? (
            <img
              src={photo(hero)}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              fetchPriority="high"
              className="absolute inset-0 -z-10 size-full object-cover"
            />
          ) : null}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/45 to-ink/5" />
          {hero ? <FidelityBadge fidelity={hero.fidelity} className="absolute top-4 left-4 md:top-6 md:left-6" /> : null}
          <div className="flex min-h-[74svh] flex-col justify-end px-6 pt-24 pb-8 md:min-h-[82svh] md:px-14 md:pb-14">
            <p className="text-xs tracking-[0.2em] text-bone/75 uppercase">{place}</p>
            <h1 className="mt-3 font-display text-[3.75rem] leading-[0.9] tracking-tight text-balance md:text-[7.5rem]">
              {tokens.brand.name}
            </h1>
            <p className="mt-4 max-w-lg font-display text-xl text-bone/85 italic md:text-3xl">{tokens.brand.tagline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={routes.explorar(hotel.slug)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-bone px-6 text-sm font-medium text-ink transition-[background-color,transform] duration-200 hover:bg-bone/90 active:scale-[0.98]"
              >
                <Move3d aria-hidden className="size-4" />
                Recorrer el edificio en 3D
              </Link>
              <a
                href="#habitaciones"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-bone/35 px-6 text-sm font-medium transition-colors hover:bg-bone/10"
              >
                Ver habitaciones
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-10">
        {/* Presentación y datos clave */}
        <section className="grid gap-10 pt-14 md:grid-cols-12 md:gap-12 md:pt-24">
          {hotel.intro ? (
            <p className="font-display text-[1.75rem] leading-[1.2] text-balance md:col-span-7 md:text-[2.5rem]">{hotel.intro}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-3xl border border-border bg-border md:col-span-5">
            {facts.map((f) => (
              <div key={f.label} className="bg-background p-5">
                <dt className="eyebrow">{f.label}</dt>
                <dd className="mt-2 font-display text-[1.75rem] leading-none">{f.value}</dd>
                {f.hint ? <dd className="mt-1 text-xs text-muted-foreground">{f.hint}</dd> : null}
              </div>
            ))}
          </dl>
        </section>

        {/* El recorrido: lo que hace distinta esta página */}
        <section aria-labelledby="recorrido" className="mt-16 overflow-hidden rounded-[1.75rem] bg-ink text-bone md:mt-28 md:grid md:grid-cols-2">
          {openFloor ? (
            <img
              src={photo(openFloor)}
              alt={openFloor.alt}
              width={openFloor.width}
              height={openFloor.height}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover md:aspect-auto md:h-full"
            />
          ) : null}
          <div className="p-7 md:p-12">
            <p className="text-xs tracking-[0.2em] text-bone/60 uppercase">Antes de reservar</p>
            <h2 id="recorrido" className="mt-3 font-display text-[2.25rem] leading-[1.05] md:text-5xl">
              Elige tu habitación viéndola.
            </h2>
            <ol className="mt-8 flex flex-col gap-5">
              {[
                ['Abre un piso', 'El piso sale del edificio y se ve la planta amoblada.'],
                ['Toca tu habitación', 'Con su precio, su vista y el piso en que queda.'],
                ['Mírala por dentro', 'Cada espacio, y la vista real desde la ventana.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-bone/25 font-display text-lg">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="mt-0.5 block text-sm text-bone/70">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href={routes.explorar(hotel.slug)}
              className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent-on-dark px-6 text-sm font-medium text-ink transition-colors hover:bg-bone"
            >
              Empezar el recorrido
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </section>

        {/* Habitaciones */}
        <section id="habitaciones" aria-labelledby="titulo-habitaciones" className="mt-20 scroll-mt-24 md:mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{pluralize(hotel.units.length, 'habitación', 'habitaciones')}</p>
              <h2 id="titulo-habitaciones" className="mt-2 font-display text-[2.25rem] leading-[1.05] md:text-5xl">
                Elige cómo quedarte
              </h2>
            </div>
            <div className="flex gap-5 text-sm font-medium">
              <Link href={routes.comparar(hotel.slug)} className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline">
                Comparar <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link href={routes.lista(hotel.slug)} className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline">
                Todas por piso <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card">
                  <div className="relative overflow-hidden">
                    {c.cover ? (
                      <img
                        src={photo(c.cover)}
                        alt={c.cover.alt}
                        width={c.cover.width}
                        height={c.cover.height}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : null}
                    {c.cover ? <FidelityBadge fidelity={c.cover.fidelity} className="absolute top-3 left-3" /> : null}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-[1.75rem] leading-none">{c.name}</h3>
                    <p className="mt-2 text-sm text-pretty text-muted-foreground">{c.tagline}</p>
                    <p className="mt-4 text-sm">
                      {[c.area ? formatArea(c.area) : null, c.capacity ? pluralize(c.capacity, 'persona', 'personas') : null, pluralize(c.count, 'unidad', 'unidades')]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                      {c.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-4 pt-6">
                      {c.from !== undefined ? (
                        <p>
                          <span className="block text-xs text-muted-foreground">Desde</span>
                          <span className="font-display text-[1.75rem] whitespace-nowrap">{formatCOP(c.from)}</span>
                          <span className="text-xs text-muted-foreground"> / noche</span>
                        </p>
                      ) : null}
                      {c.show ? (
                        <Link
                          href={routes.unidad(hotel.slug, c.show.id)}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bone transition-colors hover:bg-ink/85"
                        >
                          Ver por dentro <ArrowRight aria-hidden className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* El edificio: zonas comunes y servicios */}
        {hotel.site.pois.length || info.amenities?.length ? (
          <section aria-labelledby="edificio" className="mt-20 grid gap-10 md:mt-28 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5">
              <p className="eyebrow">El edificio</p>
              <h2 id="edificio" className="mt-2 font-display text-[2.25rem] leading-[1.05] md:text-5xl">
                Zonas comunes y servicios
              </h2>
              {night ? (
                <figure className="relative mt-8 overflow-hidden rounded-[1.5rem]">
                  <img
                    src={photo(night)}
                    alt={night.alt}
                    width={night.width}
                    height={night.height}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <FidelityBadge fidelity={night.fidelity} className="absolute top-3 left-3" />
                </figure>
              ) : null}
            </div>
            <div className="md:col-span-7">
              {hotel.site.pois.length ? (
                <ul className="divide-y divide-border border-y border-border">
                  {hotel.site.pois.map((p) => (
                    <li key={p.id} className="py-5">
                      <h3 className="flex items-baseline justify-between gap-4">
                        <span className="font-display text-2xl">{p.name}</span>
                        {p.levelId ? <span className="text-xs text-muted-foreground">{findLevel(hotel, p.levelId)?.name}</span> : null}
                      </h3>
                      {p.description ? <p className="mt-1 text-sm text-pretty text-muted-foreground">{p.description}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {info.amenities?.length ? (
                <>
                  <h3 className="eyebrow mt-10">Servicios</h3>
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {info.amenities.map((a) => (
                      <li key={a} className="flex items-start gap-2.5 text-sm">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Ubicación y políticas */}
        {info.address || info.nearby?.length || info.policies?.length || info.checkIn ? (
          <section aria-labelledby="ubicacion" className="mt-20 grid gap-6 md:mt-28 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-secondary p-7 md:p-10">
              <p className="eyebrow flex items-center gap-2">
                <MapPin aria-hidden className="size-3.5" /> Ubicación
              </p>
              <h2 id="ubicacion" className="mt-3 font-display text-[2rem] leading-[1.1] md:text-4xl">
                {place}
              </h2>
              {info.address ? <p className="mt-2 text-sm text-muted-foreground">{info.address}</p> : null}
              {info.nearby?.length ? (
                <ul className="mt-6 divide-y divide-border border-y border-border">
                  {info.nearby.map((n) => (
                    <li key={n.name} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                      <span>{n.name}</span>
                      <span className="shrink-0 text-muted-foreground">{n.time}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="rounded-[1.5rem] border border-border p-7 md:p-10">
              <p className="eyebrow flex items-center gap-2">
                <Clock aria-hidden className="size-3.5" /> Tu estadía
              </p>
              {info.checkIn || info.checkOut ? (
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  {info.checkIn ? (
                    <div>
                      <dt className="text-sm text-muted-foreground">Llegada</dt>
                      <dd className="font-display text-3xl">{info.checkIn}</dd>
                    </div>
                  ) : null}
                  {info.checkOut ? (
                    <div>
                      <dt className="text-sm text-muted-foreground">Salida</dt>
                      <dd className="font-display text-3xl">{info.checkOut}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              {info.policies?.length ? (
                <ul className="mt-6 flex flex-col gap-3 border-t border-border pt-6 text-sm">
                  {info.policies.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Preguntas */}
        {info.faq?.length ? (
          <section aria-labelledby="preguntas" className="mt-20 grid gap-8 md:mt-28 md:grid-cols-12">
            <h2 id="preguntas" className="font-display text-[2.25rem] leading-[1.05] md:col-span-4 md:text-5xl">
              Preguntas frecuentes
            </h2>
            <div className="divide-y divide-border border-y border-border md:col-span-8">
              {info.faq.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus aria-hidden className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45" />
                  </summary>
                  <p className="pb-5 text-pretty text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* Reserva directa */}
        <section className="mt-20 rounded-[1.75rem] bg-ink px-7 py-12 text-center text-bone md:mt-28 md:py-20">
          <p className="text-xs tracking-[0.2em] text-bone/60 uppercase">Reserva directa</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-[2.5rem] leading-[1.05] text-balance md:text-6xl">
            Escríbenos y separamos tu habitación.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-pretty text-bone/70">
            Respondemos por WhatsApp con la disponibilidad y el valor total de tu estadía.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent-on-dark px-6 text-sm font-medium text-ink transition-colors hover:bg-bone"
            >
              <MessageCircle aria-hidden className="size-4" />
              Escribir por WhatsApp
            </a>
            <Link
              href={routes.explorar(hotel.slug)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-bone/30 px-6 text-sm font-medium transition-colors hover:bg-bone/10"
            >
              Antes, ver el edificio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
