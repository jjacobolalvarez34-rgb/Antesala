'use client';

import Link from 'next/link';
import { ArrowRight, CalendarX2 } from 'lucide-react';

import { findLevel, formatPrice, freeAlternative, offerOf, unitPrice } from '@/lib/hotel';
import type { Hotel, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLang, useRoutes } from '@/components/i18n/Lang';

/**
 * Aviso de unidad ocupada (D-054): se puede recorrer, pero no reservar en estas
 * fechas; propone la alternativa libre más parecida (misma columna, piso cercano).
 */
export function OccupiedNotice({
  hotel,
  unit,
  tone = 'light',
  compact = false,
  className,
}: {
  hotel: Hotel;
  unit: Unit;
  tone?: 'light' | 'dark';
  /** una sola línea (sobre el 3D): el aviso completo tapaba media pantalla en el celular (Jacobo, 2026-11-16) */
  compact?: boolean;
  className?: string;
}) {
  const routes = useRoutes();
  const lang = useLang();
  if (!unit.occupied) return null;
  const alt = freeAlternative(hotel, unit);
  const altPrice = alt ? unitPrice(alt) : undefined;
  const dark = tone === 'dark';
  const t = offerOf(hotel, lang);
  if (compact) {
    return (
      <p
        role="status"
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full px-3 py-1.5 text-[0.8125rem]',
          dark ? 'bg-bone/[0.08]' : 'bg-secondary',
          className,
        )}
      >
        <CalendarX2 aria-hidden className={cn('size-3.5 shrink-0', dark ? 'text-accent-on-dark' : 'text-accent')} />
        <span className="font-medium">{t.taken}</span>
        {alt ? (
          <Link
            href={routes.unidad(hotel.slug, alt.id)}
            className={cn('inline-flex min-h-8 items-center gap-1 font-medium underline-offset-4 hover:underline', dark ? 'text-accent-on-dark' : 'text-accent')}
          >
            Ver {alt.name}
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        ) : null}
      </p>
    );
  }
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
              {[findLevel(hotel, alt.levelId)?.name, altPrice !== undefined ? formatPrice(altPrice, hotel.offer, lang) : null]
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
