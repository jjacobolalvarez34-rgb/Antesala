'use client';

import Link from 'next/link';
import { useSearchParams, useSelectedLayoutSegments } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { useLang } from '@/components/i18n/Lang';
import { formatCOP, offerTexts } from '@/lib/hotel';
import { routesFor, t as tr, type Lang } from '@/lib/i18n';
import type { routes } from '@/lib/routes';
import type { Offer } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { WhatsAppContext } from '@/lib/whatsapp';

import { ReserveButton } from './ReserveSheet';

export interface BookingSummary {
  slug: string;
  name: string;
  whatsapp: string;
  priceFrom?: number;
  offer?: Offer;
  /** glamping (D-083): "el terreno" en vez de "el edificio" */
  siteKind?: 'edificio' | 'terreno';
  levels: { id: string; name: string }[];
  units: {
    id: string;
    name: string;
    levelId: string;
    price?: number;
    capacity?: number;
    spaces: { id: string; name: string }[];
    /** ocupada en las fechas de la demo (D-054) */
    occupied?: boolean;
    /** id de la alternativa libre más parecida */
    alternative?: string;
  }[];
}

interface Stage {
  label: string;
  detail?: string;
  back?: ReturnType<typeof routes.hotel>;
  backLabel?: string;
  context: WhatsAppContext;
  price?: number;
  capacity?: number;
  /** unidad ocupada: en vez de reservar, ir a la alternativa libre */
  occupied?: { href?: ReturnType<typeof routes.unidad>; name?: string };
}

function resolveStage(data: BookingSummary, segments: string[], lang: Lang): Stage {
  const routes = routesFor(lang);
  const base: WhatsAppContext = { phone: data.whatsapp, hotelName: data.name };
  const t = offerTexts(data.offer, lang);
  const from = data.priceFrom !== undefined ? tr(lang, 'Desde {p}', { p: `${formatCOP(data.priceFrom)}${t.suffix}` }) : undefined;
  const [stage, a, b] = segments;

  if (stage === 'unidad' && a) {
    const unit = data.units.find((u) => u.id === a);
    if (unit) {
      const space = b ? unit.spaces.find((s) => s.id === b) : undefined;
      const level = data.levels.find((l) => l.id === unit.levelId);
      const alt = unit.occupied ? data.units.find((u) => u.id === unit.alternative) : undefined;
      return {
        occupied: unit.occupied ? { href: alt ? routes.unidad(data.slug, alt.id) : undefined, name: alt?.name } : undefined,
        label: space ? `${unit.name} · ${space.name}` : unit.name,
        detail: unit.occupied ? t.taken : unit.price !== undefined ? `${formatCOP(unit.price)}${t.suffix}` : undefined,
        back: space ? routes.unidad(data.slug, unit.id) : routes.piso(data.slug, unit.levelId),
        backLabel: tr(lang, 'Volver a {x}', { x: space ? unit.name : (level?.name ?? tr(lang, 'el piso')) }),
        context: { ...base, unitName: unit.name, spaceName: space?.name },
        price: unit.price,
        capacity: unit.capacity,
      };
    }
  }
  if (stage === 'piso' && a) {
    const level = data.levels.find((l) => l.id === a);
    const prices = data.units.filter((u) => u.levelId === a && u.price !== undefined).map((u) => u.price!);
    return {
      label: level?.name ?? tr(lang, 'Piso'),
      detail: prices.length ? tr(lang, 'Desde {p}', { p: `${formatCOP(Math.min(...prices))}${t.suffix}` }) : from,
      back: routes.explorar(data.slug),
      backLabel: tr(lang, data.siteKind === 'terreno' ? 'Volver al valle' : 'Volver al edificio'),
      context: base,
    };
  }
  if (stage === 'explorar') {
    return {
      label: tr(lang, data.siteKind === 'terreno' ? 'Explorar el terreno' : 'Explorar el edificio'),
      detail: from,
      back: routes.hotel(data.slug),
      backLabel: tr(lang, 'Volver a la entrada'),
      context: base,
    };
  }
  if (stage === 'comparar') {
    return {
      label: tr(lang, 'Comparar categorías'),
      detail: from,
      back: routes.lista(data.slug),
      backLabel: tr(lang, 'Volver a pisos y unidades'),
      context: base,
    };
  }
  if (stage === 'lista') {
    return {
      label: tr(lang, data.siteKind === 'terreno' ? 'Los refugios' : 'Pisos y unidades'),
      detail: from,
      back: routes.hotel(data.slug),
      backLabel: tr(lang, 'Volver a la entrada'),
      context: base,
    };
  }
  return { label: data.name, detail: from, context: base };
}

/**
 * Barra de reserva: etapa, atrás y Reservar siempre visible (DISENO.md §3).
 * En celular, franja sólida de borde a borde. En escritorio, sobre el 3D, una
 * tarjeta en la esquina (no tapa el edificio ni los clics); en las demás páginas
 * la reserva está en el encabezado fijo. Sin vidrio ni cápsula: "se veía muy IA"
 * (Jacobo, 2026-11-13).
 */
export function BookingBar({ data }: { data: BookingSummary }) {
  const segments = useSelectedLayoutSegments();
  const lang = useLang();
  // el panel es para el gerente del hotel: sin barra de reserva
  if (segments[0] === 'panel') return null;
  // vista guiada (D-095): el piso y la unidad van en la URL (?piso=&u=). La reserva aparece solo
  // con una habitación abierta (Jacobo, 2026-11-25: "antes ensucia la experiencia"; D-096)
  if (segments[0] === 'guiada') {
    return (
      <Suspense fallback={null}>
        <GuidedBar data={data} />
      </Suspense>
    );
  }
  // en las páginas sin 3D, en escritorio, la reserva va en el encabezado fijo (HotelHeader)
  const inScene = segments[0] === 'explorar' || segments[0] === 'piso' || segments[0] === 'unidad';
  return <Bar data={data} stage={resolveStage(data, segments, lang)} inScene={inScene} />;
}

function GuidedBar({ data }: { data: BookingSummary }) {
  const q = useSearchParams();
  const lang = useLang();
  const u = q.get('u');
  const unit = u ? data.units.find((x) => x.id === u) : undefined;
  const piso = q.get('piso') ?? unit?.levelId ?? null;
  if (!unit || unit.levelId !== piso) return null;
  return <Bar key="guiada" data={data} stage={guidedStage(data, piso, unit.id, lang)} inScene enter />;
}

/** En la vista guiada, la barra sigue a lo que se ve; volver sube un paso dentro de la misma vista. */
function guidedStage(data: BookingSummary, piso: string | null, u: string | null, lang: Lang): Stage {
  const routes = routesFor(lang);
  const base = routes.guiada(data.slug);
  const unit = u ? data.units.find((x) => x.id === u && x.levelId === piso) : undefined;
  const level = piso ? data.levels.find((l) => l.id === piso) : undefined;
  if (unit && level) {
    const s = resolveStage(data, ['unidad', unit.id], lang);
    const alt = unit.occupied ? data.units.find((x) => x.id === unit.alternative) : undefined;
    return {
      ...s,
      occupied: s.occupied
        ? { href: alt ? (`${base}?piso=${alt.levelId}&u=${alt.id}` as typeof base) : undefined, name: alt?.name }
        : undefined,
      back: `${base}?piso=${level.id}` as typeof base,
      backLabel: tr(lang, 'Volver a {x}', { x: level.name }),
    };
  }
  if (level) return { ...resolveStage(data, ['piso', level.id], lang), back: base, backLabel: tr(lang, 'Volver al edificio') };
  return {
    ...resolveStage(data, [], lang),
    label: tr(lang, 'Vista guiada'),
    back: routes.hotel(data.slug),
    backLabel: tr(lang, 'Volver a la entrada'),
  };
}

function Bar({ data, stage, inScene, enter = false }: { data: BookingSummary; stage: Stage; inScene: boolean; enter?: boolean }) {
  const lang = useLang();
  const o = offerTexts(data.offer, lang);
  const venta = data.offer && data.offer !== 'noche';
  return (
    <div
      data-booking-bar
      className={cn(
        // pointer-events-auto: con la escena activa la capa de la página deja pasar los toques al 3D; sin
        // esto la flecha de volver no respondía (el toque se iba al canvas; reporte de Jacobo, 2026-11-16)
        'pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[var(--safe-bottom)]',
        'md:inset-x-auto md:right-6 md:bottom-6 md:w-[26rem] md:rounded-[var(--hotel-r-card,6px)] md:border md:pb-0 md:shadow-[0_18px_40px_-24px_rgb(28_27_25/0.45)]',
        !inScene && 'md:hidden',
        enter && 'animate-in duration-300 ease-out fade-in slide-in-from-bottom-3',
      )}
    >
      <nav aria-label={tr(lang, 'Reserva')} className="mx-auto flex h-[var(--booking-bar-h)] max-w-3xl items-center gap-3 px-3 md:px-3">
        {stage.back ? (
          <Link
            href={stage.back}
            aria-label={stage.backLabel}
            className="grid size-11 shrink-0 place-items-center text-ink transition-colors hover:text-accent"
          >
            <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </Link>
        ) : (
          <span aria-hidden className="w-1 shrink-0" />
        )}
        <div className="relative min-w-0 flex-1" aria-live="polite">
          <div key={stage.label} className="animate-in duration-300 ease-out fade-in slide-in-from-bottom-1">
            <p className="truncate font-display text-lg leading-tight text-ink">{stage.label}</p>
            {stage.detail ? <p className="truncate text-xs text-muted-foreground">{stage.detail}</p> : null}
          </div>
        </div>
        {stage.occupied ? (
          stage.occupied.href ? (
            <Link
              href={stage.occupied.href}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--hotel-r-btn,3px)] bg-ink px-4 text-[0.75rem] font-medium tracking-[0.12em] text-bone uppercase transition-colors hover:bg-accent"
            >
              <span className="hidden sm:inline">
                {tr(lang, venta ? 'Ver {x}, {libre}' : 'Ver la {x}, {libre}', { x: stage.occupied.name ?? '', libre: o.free })}
              </span>
              <span className="sm:hidden">{tr(lang, venta ? 'Ver uno disponible' : 'Ver una libre')}</span>
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : null
        ) : (
          <ReserveButton context={stage.context} price={stage.price} capacity={stage.capacity} offer={data.offer} className="shrink-0" />
        )}
      </nav>
    </div>
  );
}
