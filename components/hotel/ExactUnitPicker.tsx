import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { findLevel, formatCOP, sortedLevels, unitPrice } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Hotel, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * "Elige tu unidad exacta" (bloque 6): la misma unidad en los otros pisos (la
 * misma columna del edificio: mismas ventanas, misma vista, otra altura), con
 * un alzado esquemático, la diferencia de precio y la vista. Es el argumento
 * del extra por vista. Las del mismo tipo en otras fachadas se cuentan aparte.
 */

/** Misma columna: ocupa las mismas ventanas en la fachada (en otro piso). */
const columnKey = (u: Unit) => JSON.stringify(u.exterior ?? []);
export function ExactUnitPicker({
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
  const sameType = hotel.units.filter((u) => u.categoryId === unit.categoryId);
  const siblings = sameType
    .filter((u) => columnKey(u) === columnKey(unit))
    .sort((a, b) => (findLevel(hotel, b.levelId)?.order ?? 0) - (findLevel(hotel, a.levelId)?.order ?? 0));
  const others = sameType.length - siblings.length;
  if (siblings.length < 2) return null;
  const base = unitPrice(unit) ?? 0;
  const levels = sortedLevels(hotel).reverse();
  const dark = tone === 'dark';

  return (
    <section aria-labelledby={`exacta-${unit.id}`} className={className}>
      <h2 id={`exacta-${unit.id}`} className={dark ? 'text-xs tracking-[0.12em] text-bone/60 uppercase' : 'eyebrow'}>
        Elige tu unidad exacta
      </h2>
      <div className="mt-3 flex gap-4">
        {/* alzado esquemático: un rectángulo por piso; se marcan las unidades de la categoría */}
        <svg
          viewBox={`0 0 40 ${levels.length * 12 + 4}`}
          className="w-10 shrink-0"
          role="img"
          aria-label={`Ubicación en el edificio de las unidades ${siblings.map((s) => s.name).join(', ')}`}
        >
          {levels.map((l, i) => {
            const here = siblings.find((s) => s.levelId === l.id);
            const current = here?.id === unit.id;
            return (
              <rect
                key={l.id}
                x={2}
                y={2 + i * 12}
                width={36}
                height={10}
                rx={1.5}
                className={cn(
                  current ? 'fill-accent' : here ? (dark ? 'fill-bone/45' : 'fill-ink/35') : dark ? 'fill-bone/10' : 'fill-ink/8',
                )}
              />
            );
          })}
        </svg>
        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {siblings.map((s) => {
            const price = unitPrice(s);
            const diff = price !== undefined ? price - base : 0;
            const current = s.id === unit.id;
            return (
              <li key={s.id}>
                <Link
                  href={routes.unidad(hotel.slug, s.id)}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors',
                    dark
                      ? current
                        ? 'border-accent-on-dark bg-bone/10'
                        : 'border-bone/15 hover:bg-bone/10'
                      : current
                        ? 'border-accent bg-card'
                        : 'border-border bg-card hover:border-ink/30',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {s.name}
                      <span className={dark ? 'font-normal text-bone/60' : 'font-normal text-muted-foreground'}>
                        {' · '}
                        {findLevel(hotel, s.levelId)?.name}
                      </span>
                    </span>
                    {s.view ? (
                      <span className={cn('block truncate text-xs', dark ? 'text-bone/65' : 'text-muted-foreground')}>
                        {s.view}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    {price !== undefined ? <span className="block font-semibold">{formatCOP(price)}</span> : null}
                    {current ? (
                      <span className={cn('text-xs', dark ? 'text-bone/60' : 'text-muted-foreground')}>la que ves</span>
                    ) : s.occupied ? (
                      <span className={cn('text-xs', dark ? 'text-bone/60' : 'text-muted-foreground')}>ocupada</span>
                    ) : diff !== 0 ? (
                      <span className={cn('text-xs font-medium', dark ? 'text-accent-on-dark' : 'text-accent')}>
                        {diff > 0 ? '+' : '−'}
                        {formatCOP(Math.abs(diff))}
                        {s.viewPremiumCOP ? ' por vista' : ''}
                      </span>
                    ) : (
                      <span className={cn('text-xs', dark ? 'text-bone/60' : 'text-muted-foreground')}>mismo precio</span>
                    )}
                  </span>
                  {current ? null : (
                    <ArrowRight aria-hidden className="size-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {others > 0 ? (
        <p className={cn('mt-3 text-xs', dark ? 'text-bone/60' : 'text-muted-foreground')}>
          Y {others} más de este tipo hacia otras fachadas.{' '}
          <Link href={routes.lista(hotel.slug)} className={cn('font-medium underline-offset-4 hover:underline', dark ? 'text-accent-on-dark' : 'text-accent')}>
            Ver todas
          </Link>
        </p>
      ) : null}
    </section>
  );
}
