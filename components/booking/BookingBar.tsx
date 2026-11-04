'use client';

import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { formatCOP } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { WhatsAppContext } from '@/lib/whatsapp';

import { WhatsAppButton } from './WhatsAppButton';

export interface BookingSummary {
  slug: string;
  name: string;
  whatsapp: string;
  priceFrom?: number;
  levels: { id: string; name: string }[];
  units: { id: string; name: string; levelId: string; price?: number; spaces: { id: string; name: string }[] }[];
}

interface Stage {
  label: string;
  detail?: string;
  back?: ReturnType<typeof routes.hotel>;
  backLabel?: string;
  context: WhatsAppContext;
}

function resolveStage(data: BookingSummary, segments: string[]): Stage {
  const base: WhatsAppContext = { phone: data.whatsapp, hotelName: data.name };
  const from = data.priceFrom !== undefined ? `Desde ${formatCOP(data.priceFrom)} / noche` : undefined;
  const [stage, a, b] = segments;

  if (stage === 'unidad' && a) {
    const unit = data.units.find((u) => u.id === a);
    if (unit) {
      const space = b ? unit.spaces.find((s) => s.id === b) : undefined;
      const level = data.levels.find((l) => l.id === unit.levelId);
      return {
        label: space ? `${unit.name} · ${space.name}` : unit.name,
        detail: unit.price !== undefined ? `${formatCOP(unit.price)} / noche` : undefined,
        back: space ? routes.unidad(data.slug, unit.id) : routes.piso(data.slug, unit.levelId),
        backLabel: space ? `Volver a ${unit.name}` : `Volver a ${level?.name ?? 'el piso'}`,
        context: { ...base, unitName: unit.name, spaceName: space?.name },
      };
    }
  }
  if (stage === 'piso' && a) {
    const level = data.levels.find((l) => l.id === a);
    const prices = data.units.filter((u) => u.levelId === a && u.price !== undefined).map((u) => u.price!);
    return {
      label: level?.name ?? 'Piso',
      detail: prices.length ? `Desde ${formatCOP(Math.min(...prices))} / noche en este piso` : from,
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
        <WhatsAppButton context={stage.context} className="shrink-0 rounded-xl" />
      </nav>
    </div>
  );
}
