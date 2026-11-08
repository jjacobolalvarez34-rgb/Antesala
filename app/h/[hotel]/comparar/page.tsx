import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Minus } from 'lucide-react';

import { PlanSvg } from '@/components/plan/PlanSvg';
import { getHotelBundle } from '@/lib/content';
import { formatArea, formatPrice, pluralize, unitPrice } from '@/lib/hotel';
import { routes } from '@/lib/routes';
import type { Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Comparar categorías' };

/**
 * Comparador de categorías (bloque 6): una columna por categoría con su plano,
 * datos comparables y las diferencias destacadas. Ayuda a vender la categoría
 * más alta mostrando qué se gana (PRODUCTO.md: gancho de Nico Aparta-Suites).
 */
export default async function CompararPage({ params }: PageProps<'/h/[hotel]/comparar'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel, plans } = bundle;

  const columns = hotel.categories.flatMap((c) => {
    const units = hotel.units.filter((u) => u.categoryId === c.id);
    if (!units.length) return [];
    const rep: Unit = units.find((u) => u.featured) ?? units[0]!;
    const prices = units.map(unitPrice).filter((p): p is number => p !== undefined);
    const areas = units.map((u) => u.areaM2);
    const outdoor = rep.spaces.find((s) => s.type === 'balcon' || s.type === 'terraza');
    return [
      {
        category: c,
        rep,
        from: prices.length ? Math.min(...prices) : undefined,
        area: Math.max(...areas),
        capacity: Math.max(...units.map((u) => u.capacity)),
        rooms: rep.spaces.filter((s) => s.type === 'dormitorio').length,
        outdoor,
        count: units.length,
      },
    ];
  });
  const maxArea = Math.max(...columns.map((c) => c.area));
  const maxCapacity = Math.max(...columns.map((c) => c.capacity));

  const rows: { label: string; value: (c: (typeof columns)[number]) => React.ReactNode; best?: (c: (typeof columns)[number]) => boolean }[] = [
    { label: 'Desde', value: (c) => (c.from !== undefined ? formatPrice(c.from, hotel.offer) : '—') },
    { label: 'Área', value: (c) => formatArea(c.area), best: (c) => c.area === maxArea },
    { label: 'Capacidad', value: (c) => pluralize(c.capacity, 'persona', 'personas'), best: (c) => c.capacity === maxCapacity },
    { label: 'Camas', value: (c) => c.rep.beds },
    { label: 'Dormitorio aparte', value: (c) => (c.rooms > 0 ? <Check aria-label="Sí" className="size-4 text-accent" /> : <Minus aria-label="No" className="size-4 opacity-40" />) },
    {
      label: 'Exterior propio',
      value: (c) =>
        c.outdoor ? (
          <span>
            {c.outdoor.name}
            {c.outdoor.areaM2 ? ` · ${formatArea(c.outdoor.areaM2)}` : ''}
          </span>
        ) : (
          <Minus aria-label="No" className="size-4 opacity-40" />
        ),
      best: (c) => Boolean(c.outdoor && c.outdoor.type === 'terraza'),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 md:px-10">
      <header className="pt-8 md:pt-14">
        <p className="eyebrow">{hotel.name}</p>
        <h1 className="mt-3 font-display text-display md:text-6xl">Compara las categorías</h1>
        <p className="mt-4 max-w-lg text-pretty text-muted-foreground">
          Lo mismo, lado a lado: espacio, capacidad y qué ganas en cada una.
        </p>
      </header>

      <div className="scrollbar-none -mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
        {columns.map((c) => {
          const geometry = plans[c.rep.plan];
          return (
            <article
              key={c.category.id}
              className="flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-border bg-card md:w-auto"
            >
              {geometry ? (
                <div className="bg-secondary p-6">
                  <PlanSvg
                    geometry={geometry}
                    spaces={c.rep.spaces.map((s) => ({
                      id: s.id,
                      name: s.name,
                      href: routes.espacio(hotel.slug, c.rep.id, s.id),
                      outdoor: s.type === 'balcon' || s.type === 'terraza',
                    }))}
                    variant="thumb"
                    title={`Plano de ${c.rep.name}`}
                    className="mx-auto max-w-[220px]"
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-title">{c.category.name}</h2>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{c.category.tagline}</p>
                <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
                  {rows.map((r) => (
                    <div key={r.label} className="flex min-h-11 items-center justify-between gap-3 py-2">
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className={cn('flex items-center gap-1.5 text-right font-medium', r.best?.(c) && 'text-accent')}>
                        {r.value(c)}
                        {r.best?.(c) ? <span className="sr-only">(la mejor en esto)</span> : null}
                      </dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {c.category.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href={routes.unidad(hotel.slug, c.rep.id)}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-bone transition-colors hover:bg-ink/88"
                >
                  Ver {c.rep.name} <ArrowRight aria-hidden className="size-4" />
                </Link>
                {c.count > 1 ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {c.count} unidades de esta categoría en el edificio
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
