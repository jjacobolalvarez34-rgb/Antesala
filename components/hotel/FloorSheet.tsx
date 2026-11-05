import Link from 'next/link';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { formatCOP, pluralize, unitPrice } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Level, Poi, Unit } from '@/lib/types';

/**
 * Panel del piso sobre la escena 3D (DISENO.md §3): bottom sheet en móvil,
 * panel lateral en escritorio. Solo se ve en modo escena. Las habitaciones se
 * eligen tocándolas en la planta (no hay lista): aquí solo el resumen.
 */
export function FloorSheet({
  slug,
  level,
  total,
  units,
  pois,
  above,
  below,
}: {
  slug: string;
  level: Level;
  total: number;
  units: Unit[];
  pois: Poi[];
  above?: Level;
  below?: Level;
}) {
  const prices = units.map(unitPrice).filter((p): p is number => p !== undefined);
  const from = prices.length ? Math.min(...prices) : undefined;
  return (
    <section
      aria-label={`Unidades del ${level.name}`}
      className="glass-dark pointer-events-auto fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-30 hidden max-h-[36dvh] animate-in flex-col overflow-hidden rounded-3xl shadow-2xl duration-500 fade-in slide-in-from-bottom-4 scene:flex md:inset-x-auto md:top-32 md:right-6 md:bottom-auto md:max-h-[calc(100dvh-var(--booking-bar-h)-11rem)] md:w-[400px] md:slide-in-from-right-4"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <p className="text-xs tracking-[0.14em] text-bone/65 uppercase">
            {level.name} de {total}
          </p>
          <h1 className="font-display text-title leading-none">{level.name}</h1>
        </div>
        <nav aria-label="Otros pisos" className="flex gap-2">
          {above ? (
            <Link
              href={routes.piso(slug, above.id)}
              aria-label={`Subir a ${above.name}`}
              className="grid size-11 place-items-center rounded-full bg-bone/10 transition-colors hover:bg-bone/20"
            >
              <ArrowUp aria-hidden className="size-4" />
            </Link>
          ) : null}
          {below ? (
            <Link
              href={routes.piso(slug, below.id)}
              aria-label={`Bajar a ${below.name}`}
              className="grid size-11 place-items-center rounded-full bg-bone/10 transition-colors hover:bg-bone/20"
            >
              <ArrowDown aria-hidden className="size-4" />
            </Link>
          ) : null}
        </nav>
      </header>

      <div className="scrollbar-none overflow-y-auto px-5 pb-4">
        {units.length ? (
          <p className="text-sm text-bone/80">
            {pluralize(units.length, 'habitación', 'habitaciones')}
            {from !== undefined ? (
              <>
                {' · desde '}
                <span className="font-semibold text-bone">{formatCOP(from)}</span>
                <span className="text-bone/65"> / noche</span>
              </>
            ) : null}
          </p>
        ) : null}
        {pois.length ? (
          <ul className={units.length ? 'mt-3 flex flex-col gap-2 border-t border-bone/10 pt-3' : 'flex flex-col gap-2'}>
            {pois.map((p) => (
              <li key={p.id} className="text-sm">
                <p className="font-medium">{p.name}</p>
                {p.description ? <p className="mt-0.5 hidden text-pretty text-bone/70 md:block">{p.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
