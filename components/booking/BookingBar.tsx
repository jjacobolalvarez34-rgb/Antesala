'use client';

import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { formatCOP, OFFER } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Offer } from '@/lib/types';
import type { WhatsAppContext } from '@/lib/whatsapp';

import { ReserveButton } from './ReserveSheet';

export interface BookingSummary {
  slug: string;
  name: string;
  whatsapp: string;
  priceFrom?: number;
  offer?: Offer;
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

function resolveStage(data: BookingSummary, segments: string[]): Stage {
  const base: WhatsAppContext = { phone: data.whatsapp, hotelName: data.name };
  const t = OFFER[data.offer ?? 'noche'];
  const from = data.priceFrom !== undefined ? `Desde ${formatCOP(data.priceFrom)}${t.suffix}` : undefined;
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
        backLabel: space ? `Volver a ${unit.name}` : `Volver a ${level?.name ?? 'el piso'}`,
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
      label: level?.name ?? 'Piso',
      detail: prices.length ? `Desde ${formatCOP(Math.min(...prices))}${t.suffix}` : from,
      back: routes.explorar(data.slug),
      backLabel: 'Volver al edificio',
      context: base,
    };
  }
  if (stage === 'explorar') {
    return {
      label: 'Explorar el edificio',
      detail: from,
      back: routes.hotel(data.slug),
      backLabel: 'Volver a la entrada',
      context: base,
    };
  }
  if (stage === 'comparar') {
    return {
      label: 'Comparar categorías',
      detail: from,
      back: routes.lista(data.slug),
      backLabel: 'Volver a pisos y unidades',
      context: base,
    };
  }
  if (stage === 'lista') {
    return {
      label: 'Pisos y unidades',
      detail: from,
      back: routes.hotel(data.slug),
      backLabel: 'Volver a la entrada',
      context: base,
    };
  }
  return { label: data.name, detail: from, context: base };
}

/** Barra inferior fija: etapa, atrás y Reservar siempre visible (DISENO.md §3). */
export function BookingBar({ data }: { data: BookingSummary }) {
  const segments = useSelectedLayoutSegments();
  const stage = resolveStage(data, segments);
  // el panel es para el gerente del hotel: sin barra de reserva
  if (segments[0] === 'panel') return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+var(--safe-bottom))] md:px-6">
      <nav
        aria-label="Reserva"
        className="glass pointer-events-auto mx-auto flex h-[var(--booking-bar-h)] max-w-3xl items-center gap-2 rounded-2xl border border-white/60 py-2 pr-2 pl-2 shadow-[0_8px_32px_-12px_rgb(28_27_25/0.28)]"
      >
        {stage.back ? (
          <Link
            href={stage.back}
            aria-label={stage.backLabel}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-ink/6"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </Link>
        ) : (
          <span aria-hidden className="w-2 shrink-0" />
        )}
        <div className="relative min-w-0 flex-1" aria-live="polite">
          <div key={stage.label} className="animate-in duration-300 ease-out fade-in slide-in-from-bottom-1">
              <p className="truncate text-sm font-medium text-ink">{stage.label}</p>
              {stage.detail ? <p className="truncate text-xs text-muted-foreground">{stage.detail}</p> : null}
          </div>
        </div>
        {stage.occupied ? (
          stage.occupied.href ? (
            <Link
              href={stage.occupied.href}
              className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-medium text-bone transition-colors hover:bg-ink/85"
            >
              <span className="hidden sm:inline">
                Ver {data.offer && data.offer !== 'noche' ? '' : 'la '}
                {stage.occupied.name}, {OFFER[data.offer ?? 'noche'].free}
              </span>
              <span className="sm:hidden">Ver {data.offer && data.offer !== 'noche' ? 'uno disponible' : 'una libre'}</span>
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : null
        ) : (
          <ReserveButton
            context={stage.context}
            price={stage.price}
            capacity={stage.capacity}
            offer={data.offer}
            className="shrink-0 rounded-xl"
          />
        )}
      </nav>
    </div>
  );
}
