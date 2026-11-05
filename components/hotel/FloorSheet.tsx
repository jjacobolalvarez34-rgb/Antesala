import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { formatArea, formatCOP, pluralize, unitPrice } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Category, Level, Poi, Unit } from '@/lib/types';

/**
 * Panel de unidades del piso sobre la escena 3D (DISENO.md §3):
 * bottom sheet en móvil, panel lateral en escritorio. Solo se ve en modo escena.
 */
export function FloorSheet({
  slug,
  level,
  total,
  units,
  categories,
  pois,
  above,
  below,
}: {
  slug: string;
  level: Level;
  total: number;
  units: Unit[];
  categories: Category[];
  pois: Poi[];
  above?: Level;
  below?: Level;
}) {
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

      <div className="scrollbar-none overflow-y-auto px-3 pb-3">
        {units.length ? (
          <ul className="flex flex-col gap-2">
            {units.map((u) => {
              const price = unitPrice(u);
              const category = categories.find((c) => c.id === u.categoryId);
              return (
                <li key={u.id}>
                  <Link
                    href={routes.unidad(slug, u.id)}
                    className="group flex items-center gap-3 rounded-2xl bg-bone/[0.07] p-4 transition-colors hover:bg-bone/[0.13]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs tracking-[0.12em] text-bone/60 uppercase">{category?.name}</p>
                      <p className="mt-0.5 font-display text-subtitle">{u.name}</p>
                      <p className="mt-1 text-sm text-bone/75">
                        {formatArea(u.areaM2)} · {pluralize(u.capacity, 'persona', 'personas')}
                      </p>
                      {price !== undefined ? (
                        <p className="mt-2 text-sm">
                          <span className="font-semibold">{formatCOP(price)}</span>
                          <span className="text-bone/65"> / noche</span>
                          {u.viewPremiumCOP ? (
                            <span className="mt-0.5 block text-xs font-medium text-accent-on-dark">
                              Incluye {formatCOP(u.viewPremiumCOP)} por vista
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight
                      aria-hidden
                      className="size-5 shrink-0 text-bone/60 transition-transform group-hover:translate-x-1 group-hover:text-bone"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        {pois.length ? (
          <ul className={units.length ? 'mt-3 flex flex-col gap-2' : 'flex flex-col gap-2'}>
            {pois.map((p) => (
              <li key={p.id} className="rounded-2xl bg-bone/[0.07] p-4">
                <p className="font-medium">{p.name}</p>
                {p.description ? <p className="mt-1 text-sm text-pretty text-bone/75">{p.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {!units.length && !pois.length ? (
          <p className="px-2 pb-2 text-sm text-bone/75">Este piso no tiene unidades de muestra en la demo.</p>
        ) : null}
      </div>
    </section>
  );
}
