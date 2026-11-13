/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Bath,
  Car,
  Check,
  Coffee,
  ConciergeBell,
  CookingPot,
  Dumbbell,
  KeyRound,
  Laptop,
  type LucideIcon,
  MessageCircle,
  Move3d,
  PawPrint,
  Plus,
  Sparkles,
  Sunset,
  Tv,
  WashingMachine,
  Wifi,
} from 'lucide-react';

import { BookingWidget } from '@/components/booking/BookingWidget';
import { ReserveButton } from '@/components/booking/ReserveSheet';
import { type CoverHeroPoint, HeroNivel } from '@/components/hotel/CoverHero';
import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import { NivelImg, type NivelImgSrc } from '@/components/hotel/NivelImg';
import { getHotelBundle } from '@/lib/content';
import { findLevel, formatArea, formatCOP, offerOf, pluralize, priceFrom, unitPrice } from '@/lib/hotel';
import { assetUrl, mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';
import type { Media, Unit } from '@/lib/types';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

/** Ícono de un servicio por palabras clave (cualquier hotel); si no hay, un visto. */
const AMENITY_ICONS: [RegExp, LucideIcon][] = [
  [/wifi|internet/i, Wifi],
  [/cocina|cocineta/i, CookingPot],
  [/recepci/i, ConciergeBell],
  [/c[oó]digo|llave|acceso|24 horas/i, KeyRound],
  [/cowork|trabaj|escritorio/i, Laptop],
  [/terraza|azotea|balc/i, Sunset],
  [/lavander/i, WashingMachine],
  [/aseo|limpieza/i, Sparkles],
  [/parque|garaje/i, Car],
  [/mascota/i, PawPrint],
  [/caf[eé]|desayuno/i, Coffee],
  [/gimnas/i, Dumbbell],
  [/ba[ñn]era|spa|jacuzzi/i, Bath],
  [/tv|televis/i, Tv],
];
const amenityIcon = (a: string) => AMENITY_ICONS.find(([re]) => re.test(a))?.[1] ?? Check;

/** "573204871882" → "+57 320 487 1882" */
const formatPhone = (p: string) => (/^57\d{10}$/.test(p) ? `+57 ${p.slice(2, 5)} ${p.slice(5, 8)} ${p.slice(8)}` : `+${p}`);

/**
 * Portada del hotel (D-053, D-078): el sitio web completo para los hoteles que no
 * tienen página propia, con la forma de la web de un hotel real (portada a pantalla
 * completa, consulta de fechas, habitaciones, el edificio, ubicación, preguntas y
 * pie con contacto). Todo sale del contenido del hotel (hotel.json y tokens.json);
 * cada sección aparece solo si hay con qué llenarla.
 */
export default async function EntradaPage({ params }: PageProps<'/h/[hotel]'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel, tokens } = bundle;
  const info = hotel.info ?? {};
  const from = priceFrom(hotel);
  const offer = offerOf(hotel);
  const place = [hotel.neighborhood, hotel.city].filter(Boolean).join(', ');
  const floors = hotel.site.building?.floors ?? hotel.levels.length;
  const url = (m: Media) => mediaUrl(hotel.slug, m.src);
  const img = (m: Media | undefined): NivelImgSrc | undefined =>
    m ? { src: url(m), alt: m.alt, width: m.width, height: m.height } : undefined;
  /** la foto premium y la base de una lista de medios (D-075) */
  const pair = (media: Media[]) => {
    const photos = media.filter((m) => m.kind === 'photo');
    return { premium: img(photos.find((m) => m.tier === 'premium')), base: img(photos.find((m) => m.tier !== 'premium')), any: photos[0] };
  };

  const exterior = hotel.site.exterior.filter((m) => m.kind === 'photo');
  const unitPhotos = (u: Unit) => u.spaces.flatMap((s) => s.media);
  const hero = exterior[0] ?? unitPhotos(hotel.units.find((u) => u.featured) ?? hotel.units[0]!).find((m) => m.kind === 'photo');
  // puntos tocables de la portada (bloque 9): solo sobre una foto exterior
  const coverPoints: CoverHeroPoint[] =
    exterior[0] && hero === exterior[0]
      ? (hotel.site.cover ?? []).map((pt) => ({
          id: pt.id,
          label: pt.label,
          detail: pt.detail,
          x: pt.x,
          y: pt.y,
          href: 'level' in pt.to ? routes.piso(hotel.slug, pt.to.level) : 'unit' in pt.to ? routes.unidad(hotel.slug, pt.to.unit) : routes.explorar(hotel.slug),
          clip: pt.clip
            ? {
                sm: assetUrl(hotel.slug, pt.clip.sm),
                lg: pt.clip.lg ? assetUrl(hotel.slug, pt.clip.lg) : undefined,
                poster: pt.clip.poster ? assetUrl(hotel.slug, pt.clip.poster) : undefined,
              }
            : undefined,
        }))
      : [];
  const openFloor = exterior.find((m) => /piso/i.test(m.src));
  const night = pair(exterior.filter((m) => /noche/i.test(m.src)));

  // una fila por categoría: precio desde, área y capacidad, y la unidad que se muestra
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
      beds: show?.beds,
      show,
      photo: show ? pair(unitPhotos(show)) : undefined,
    };
  });

  const booking = { phone: hotel.contact.whatsapp, hotelName: tokens.brand.name };
  const whatsapp = buildWhatsAppUrl({ ...booking, visit: (hotel.offer ?? 'noche') !== 'noche' });
  const maxGuests = Math.max(...hotel.units.map((u) => u.capacity ?? 2));
  const facts = [
    { label: 'Pisos', value: String(floors) },
    { label: offer.units, value: String(hotel.units.length) },
    from !== undefined ? { label: 'Desde', value: formatCOP(from), hint: offer.fromHint } : null,
    info.checkIn ? { label: 'Llegada', value: info.checkIn, hint: info.checkOut ? `Salida ${info.checkOut}` : undefined } : null,
  ].filter((f) => f !== null);

  const eyebrow = 'text-[0.6875rem] font-medium tracking-[0.24em] uppercase';
  const h2 = 'font-display text-[2.5rem] leading-[1.02] tracking-tight text-balance md:text-[3.75rem]';

  return (
    <main className="-mt-[4.5rem]">
      {/* Portada a pantalla completa (el encabezado va encima, transparente) */}
      <section className="relative isolate flex min-h-[640px] flex-col justify-end overflow-hidden bg-ink text-bone h-[88svh] max-h-[940px]">
        {hero && coverPoints.length ? (
          // Premium: foto profesional con puntos; los otros niveles, la portada base (D-075)
          <HeroNivel
            premium={{ src: url(hero), alt: hero.alt, width: hero.width ?? 1600, height: hero.height ?? 1000, points: coverPoints }}
            base={(() => {
              const b = exterior.find((m) => m.tier !== 'premium');
              return b ? { src: url(b), alt: b.alt, width: b.width ?? 1600, height: b.height ?? 1000 } : undefined;
            })()}
          />
        ) : hero ? (
          <img src={url(hero)} alt={hero.alt} width={hero.width} height={hero.height} fetchPriority="high" className="absolute inset-0 -z-10 size-full object-cover" />
        ) : null}
        {/* arriba, para leer el menú; abajo, para el nombre */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-ink/70 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
        <div className="mx-auto w-full max-w-7xl px-5 pb-28 md:px-10 md:pb-36">
          <p className={`${eyebrow} text-bone/80`}>{place}</p>
          <h1 className="mt-4 font-display text-[4rem] leading-[0.88] tracking-tight text-balance md:text-[8.5rem]">{tokens.brand.name}</h1>
          {tokens.brand.tagline ? <p className="mt-5 max-w-xl font-display text-[1.375rem] text-bone/90 italic md:text-[2rem]">{tokens.brand.tagline}</p> : null}
        </div>
        {hero ? <FidelityBadge fidelity={hero.fidelity} className="absolute top-[8.75rem] right-4 md:top-auto md:right-10 md:bottom-28" /> : null}
      </section>

      {/* Consulta de fechas, montada sobre el borde de la portada */}
      <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-4 md:-mt-12 md:px-10">
        <BookingWidget context={booking} maxGuests={maxGuests} from={from} suffix={offer.suffix} />
      </div>

      <div className="mx-auto max-w-7xl px-5 md:px-10">
        {/* El hotel en pocas palabras */}
        <section className="grid gap-12 pt-20 md:grid-cols-12 md:gap-16 md:pt-32">
          <div className="md:col-span-7">
            <p className={`${eyebrow} text-accent`}>{hotel.neighborhood ?? hotel.city}</p>
            {hotel.intro ? <p className="mt-5 font-display text-[1.875rem] leading-[1.18] text-pretty md:text-[2.75rem]">{hotel.intro}</p> : null}
            <Link
              href={routes.explorar(hotel.slug)}
              className="group mt-8 inline-flex min-h-11 items-center gap-2 border-b border-ink pb-1 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              <Move3d aria-hidden className="size-4" strokeWidth={1.5} />
              Recorrer el edificio en 3D
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <dl className="self-end border-t border-border md:col-span-5">
            {facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-border py-4">
                <dt className={`${eyebrow} text-muted-foreground`}>{f.label}</dt>
                <dd className="text-right">
                  <span className="font-display text-[1.75rem] leading-none">{f.value}</span>
                  {f.hint ? <span className="block text-xs text-muted-foreground">{f.hint}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Habitaciones: una fila editorial por categoría */}
        <section id="habitaciones" aria-labelledby="titulo-habitaciones" className="mt-24 scroll-mt-24 md:mt-40">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
            <div>
              <p className={`${eyebrow} text-accent`}>{pluralize(hotel.units.length, offer.unit.toLowerCase(), offer.units.toLowerCase())}</p>
              <h2 id="titulo-habitaciones" className={`mt-3 ${h2}`}>
                {offer.units}
              </h2>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href={routes.comparar(hotel.slug)} className="inline-flex min-h-11 items-center gap-1.5 underline-offset-[6px] hover:underline">
                Comparar <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link href={routes.lista(hotel.slug)} className="inline-flex min-h-11 items-center gap-1.5 underline-offset-[6px] hover:underline">
                Todas por piso <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </div>
          <ul className="flex flex-col">
            {categories.map((c, i) => (
              <li key={c.id} className="border-b border-border py-12 md:py-20">
                <article className="grid items-center gap-8 md:grid-cols-12 md:gap-14">
                  <div className={`relative overflow-hidden rounded-[3px] md:col-span-7 ${i % 2 ? 'md:order-2' : ''}`}>
                    {c.show ? (
                      <Link href={routes.unidad(hotel.slug, c.show.id)} aria-label={`Ver ${c.name}`} className="group block">
                        <NivelImg
                          premium={c.photo?.premium}
                          base={c.photo?.base}
                          className="aspect-[4/3] w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                        />
                      </Link>
                    ) : null}
                    {c.photo?.any ? <FidelityBadge fidelity={c.photo.any.fidelity} className="absolute top-3 left-3" /> : null}
                  </div>
                  <div className="md:col-span-5">
                    <p className={`${eyebrow} text-muted-foreground`}>{String(i + 1).padStart(2, '0')}</p>
                    <h3 className="mt-3 font-display text-[2.5rem] leading-none md:text-[3.25rem]">{c.name}</h3>
                    {c.tagline ? <p className="mt-4 max-w-md text-[1.0625rem] text-pretty text-ink/75">{c.tagline}</p> : null}
                    <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/80">
                      {[c.area ? formatArea(c.area) : null, c.capacity ? pluralize(c.capacity, 'persona', 'personas') : null, c.beds, pluralize(c.count, 'unidad', 'unidades')]
                        .filter(Boolean)
                        .map((t, k) => (
                          <span key={k} className="whitespace-nowrap">
                            {k ? <span aria-hidden className="mr-4 text-border">|</span> : null}
                            {t}
                          </span>
                        ))}
                    </p>
                    {c.highlights.length ? (
                      <ul className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-sm">
                        {c.highlights.map((h) => (
                          <li key={h} className="flex items-center gap-3">
                            <span aria-hidden className="h-px w-4 bg-accent" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
                      {c.from !== undefined ? (
                        <p>
                          <span className={`${eyebrow} block text-muted-foreground`}>Desde</span>
                          <span className="font-display text-[2rem] leading-none whitespace-nowrap">{formatCOP(c.from)}</span>
                          <span className="text-sm text-muted-foreground">{offer.suffix}</span>
                        </p>
                      ) : null}
                      <div className="flex items-center gap-5">
                        {c.show ? (
                          <Link
                            href={routes.unidad(hotel.slug, c.show.id)}
                            className="inline-flex min-h-11 items-center border-b border-ink text-sm font-medium transition-colors hover:border-accent hover:text-accent"
                          >
                            Ver por dentro
                          </Link>
                        ) : null}
                        <ReserveButton context={{ ...booking, unitName: c.show?.name }} capacity={c.capacity} price={c.from} offer={hotel.offer} />
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Lo distinto de esta web: elegir la habitación viéndola */}
      <section aria-labelledby="recorrido" className="mt-24 bg-ink text-bone md:mt-36">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          {openFloor ? (
            <img src={url(openFloor)} alt={openFloor.alt} width={openFloor.width} height={openFloor.height} loading="lazy" className="aspect-[16/11] w-full object-cover md:aspect-auto md:h-full" />
          ) : null}
          <div className="px-6 py-14 md:px-16 md:py-24">
            <p className={`${eyebrow} text-accent-on-dark`}>Antes de reservar</p>
            <h2 id="recorrido" className={`mt-4 ${h2}`}>
              Elige tu habitación viéndola.
            </h2>
            <ol className="mt-10 flex flex-col border-t border-bone/15">
              {[
                ['Abre un piso', 'El piso sale del edificio y se ve la planta amoblada.'],
                ['Toca tu habitación', 'Con su precio, su vista y el piso en que queda.'],
                ['Mírala por dentro', 'Cada espacio, y la vista desde la ventana.'],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-5 border-b border-bone/15 py-5">
                  <span className="font-display text-2xl leading-none text-accent-on-dark">{i + 1}</span>
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="mt-1 block text-sm text-bone/65">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href={routes.explorar(hotel.slug)}
              className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-[3px] bg-bone px-7 text-[0.75rem] font-medium tracking-[0.16em] text-ink uppercase transition-colors hover:bg-white"
            >
              <Move3d aria-hidden className="size-4" strokeWidth={1.5} />
              Empezar el recorrido
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 md:px-10">
        {/* El edificio: zonas comunes con foto y servicios */}
        {hotel.site.pois.length || info.amenities?.length ? (
          <section id="edificio" aria-labelledby="titulo-edificio" className="mt-24 scroll-mt-24 md:mt-40">
            <p className={`${eyebrow} text-accent`}>El edificio</p>
            <h2 id="titulo-edificio" className={`mt-3 max-w-3xl ${h2}`}>
              Zonas comunes y servicios
            </h2>
            {hotel.site.pois.length ? (
              <ul className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
                {hotel.site.pois.map((p) => {
                  const ph = pair(p.media);
                  return (
                    <li key={p.id}>
                      <figure>
                        <div className="relative overflow-hidden rounded-[3px] bg-secondary">
                          <NivelImg premium={ph.premium} base={ph.base} className="aspect-[4/5] w-full object-cover" />
                          {ph.any ? <FidelityBadge fidelity={ph.any.fidelity} className="absolute top-3 left-3" /> : null}
                        </div>
                        <figcaption className="mt-5">
                          <span className="flex items-baseline justify-between gap-4">
                            <span className="font-display text-[1.75rem] leading-none">{p.name}</span>
                            {p.levelId ? <span className="text-xs text-muted-foreground">{findLevel(hotel, p.levelId)?.name}</span> : null}
                          </span>
                          {p.description ? <span className="mt-2 block text-sm text-pretty text-muted-foreground">{p.description}</span> : null}
                        </figcaption>
                      </figure>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {info.amenities?.length ? (
              <ul className="mt-16 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border md:grid-cols-4">
                {info.amenities.map((a) => {
                  const Icon = amenityIcon(a);
                  return (
                    <li key={a} className="flex flex-col gap-4 bg-background p-5 md:p-6">
                      <Icon aria-hidden className="size-5 text-accent" strokeWidth={1.4} />
                      <span className="text-sm text-pretty">{a}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* Ubicación y estadía */}
        {info.address || info.nearby?.length || info.policies?.length || info.checkIn ? (
          <section id="ubicacion" aria-labelledby="titulo-ubicacion" className="mt-24 grid scroll-mt-24 gap-14 md:mt-40 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-6">
              <p className={`${eyebrow} text-accent`}>Ubicación</p>
              <h2 id="titulo-ubicacion" className={`mt-3 ${h2}`}>
                {place}
              </h2>
              {info.address ? <p className="mt-5 max-w-md text-pretty text-ink/75">{info.address}</p> : null}
              {info.nearby?.length ? (
                <ul className="mt-10 border-t border-border">
                  {info.nearby.map((n) => (
                    <li key={n.name} className="flex items-baseline justify-between gap-4 border-b border-border py-4 text-[0.9375rem]">
                      <span>{n.name}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">{n.time}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="md:col-span-5 md:col-start-8">
              <p className={`${eyebrow} text-accent`}>Tu estadía</p>
              {info.checkIn || info.checkOut ? (
                <dl className="mt-6 grid grid-cols-2 border-y border-border">
                  {info.checkIn ? (
                    <div className="py-5 pr-4">
                      <dt className="text-sm text-muted-foreground">Llegada</dt>
                      <dd className="mt-1 font-display text-[2.25rem] leading-none">{info.checkIn}</dd>
                    </div>
                  ) : null}
                  {info.checkOut ? (
                    <div className="border-l border-border py-5 pl-6">
                      <dt className="text-sm text-muted-foreground">Salida</dt>
                      <dd className="mt-1 font-display text-[2.25rem] leading-none">{info.checkOut}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              {info.policies?.length ? (
                <ul className="mt-8 flex flex-col gap-4 text-[0.9375rem]">
                  {info.policies.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-accent" />
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
          <section id="preguntas" aria-labelledby="titulo-preguntas" className="mt-24 grid scroll-mt-24 gap-10 md:mt-40 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className={`${eyebrow} text-accent`}>Preguntas</p>
              <h2 id="titulo-preguntas" className={`mt-3 ${h2}`}>
                Antes de llegar
              </h2>
            </div>
            <div className="border-t border-border md:col-span-8">
              {info.faq.map((f) => (
                <details key={f.q} className="group border-b border-border">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-[1.0625rem] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus aria-hidden className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.4} />
                  </summary>
                  <p className="max-w-2xl pb-6 text-pretty text-ink/70">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Reserva directa: cierre con la fachada de noche */}
      <section className="relative isolate mt-24 overflow-hidden bg-ink text-bone md:mt-40">
        {night.premium || night.base ? (
          <NivelImg premium={night.premium} base={night.base} className="absolute inset-0 -z-10 size-full object-cover opacity-45" />
        ) : null}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-32">
          <p className={`${eyebrow} text-accent-on-dark`}>Reserva directa</p>
          <h2 className={`mt-4 max-w-2xl ${h2}`}>Escríbenos y separamos tu habitación.</h2>
          <p className="mt-5 max-w-md text-pretty text-bone/75">Te respondemos por WhatsApp con la disponibilidad y el valor total de tu estadía, sin intermediarios.</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ReserveButton context={booking} capacity={maxGuests} offer={hotel.offer} tone="bone" className="min-h-12 px-8" />
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 border-b border-bone/40 text-sm transition-colors hover:border-bone"
            >
              <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} />
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Pie del hotel */}
      <footer className="bg-[color-mix(in_oklab,var(--color-ink),black_18%)] text-bone/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-12 md:px-10">
          <div className="md:col-span-4">
            <p className="font-display text-[2rem] leading-none text-bone">{tokens.brand.name}</p>
            {tokens.brand.tagline ? <p className="mt-3 max-w-xs font-display text-lg text-bone/70 italic">{tokens.brand.tagline}</p> : null}
          </div>
          <div className="md:col-span-3">
            <p className={`${eyebrow} text-bone/50`}>Dónde</p>
            <p className="mt-4 text-sm leading-relaxed">
              {place}
              {info.address ? (
                <>
                  <br />
                  {info.address}
                </>
              ) : null}
            </p>
          </div>
          <div className="md:col-span-3">
            <p className={`${eyebrow} text-bone/50`}>Contacto</p>
            <p className="mt-4 text-sm leading-relaxed">
              WhatsApp {formatPhone(hotel.contact.whatsapp)}
              {info.checkIn ? (
                <>
                  <br />
                  Llegada {info.checkIn}
                  {info.checkOut ? ` · Salida ${info.checkOut}` : ''}
                </>
              ) : null}
            </p>
          </div>
          <nav aria-label="Pie" className="md:col-span-2">
            <p className={`${eyebrow} text-bone/50`}>Explorar</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              <li>
                <a href="#habitaciones" className="hover:text-bone">
                  {offer.units}
                </a>
              </li>
              <li>
                <Link href={routes.explorar(hotel.slug)} className="hover:text-bone">
                  Recorrido 3D
                </Link>
              </li>
              <li>
                <Link href={routes.lista(hotel.slug)} className="hover:text-bone">
                  Pisos y unidades
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </main>
  );
}
