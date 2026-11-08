import Link from 'next/link';
import { ArrowRight, CalendarX2 } from 'lucide-react';

import { findLevel, formatPrice, freeAlternative, offerOf, unitPrice } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Hotel, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Aviso de unidad ocupada (D-054): se puede recorrer, pero no reservar en estas
 * fechas; propone la alternativa libre más parecida (misma columna, piso cercano).
 */
export function OccupiedNotice({
  hotel,
  unit,
  tone = 'light',
  className,
}: {
  hotel: Hotel;
  unit: Unit;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  if (!unit.occupied) return null;
  const alt = freeAlternative(hotel, unit);
  const altPrice = alt ? unitPrice(alt) : undefined;
  const dark = tone === 'dark';
  const t = offerOf(hotel);
  return (
    <div
      role="status"
      className={cn('rounded-2xl border p-4 text-sm', dark ? 'border-bone/15 bg-bone/[0.06]' : 'border-border bg-secondary', className)}
    >
      <p className="flex items-center gap-2 font-medium">
        <CalendarX2 aria-hidden className={cn('size-4', dark ? 'text-accent-on-dark' : 'text-accent')} />
        {t.taken}
      </p>
      <p className={cn('mt-1 text-pretty', dark ? 'text-bone/70' : 'text-muted-foreground')}>
        {t.takenText}
      </p>
      {alt ? (
        <Link
          href={routes.unidad(hotel.slug, alt.id)}
          className={cn(
            'mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl px-3.5 py-2 transition-colors',
            dark ? 'bg-bone/10 hover:bg-bone/20' : 'bg-card hover:bg-background',
          )}
        >
          <span>
            <span className="block font-medium">{alt.name}</span>
            <span className={cn('text-xs', dark ? 'text-bone/60' : 'text-muted-foreground')}>
              {[findLevel(hotel, alt.levelId)?.name, altPrice !== undefined ? formatPrice(altPrice, hotel.offer) : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <ArrowRight aria-hidden className="size-4 shrink-0" />
        </Link>
      ) : null}
    </div>
  );
}
