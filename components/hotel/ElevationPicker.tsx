import Link from 'next/link';

import { formatCOP, sortedLevels, unitPrice } from '@/lib/hotel';
import { routesFor, t, type Lang } from '@/lib/i18n';
import type { Hotel } from '@/lib/types';

/**
 * El edificio en alzado, como la hoja de un plano (tema "bruma", Cénit 2026-11-27: "Niebla
 * combinado con Plano, manteniendo el lujo"): cada piso una franja, cada habitación una celda que
 * se toca, libre u ocupada; los lugares comunes en su piso. Sale todo del contenido del hotel.
 */
export function ElevationPicker({ hotel, lang }: { hotel: Hotel; lang: Lang }) {
  const tr = (es: string, vars?: Record<string, string | number>) => t(lang, es, vars);
  const routes = routesFor(lang);
  const levels = [...sortedLevels(hotel)].reverse();
  const cat = new Map(hotel.categories.map((c) => [c.id, c.name]));
  const free = hotel.units.filter((u) => !u.occupied).length;

  return (
    <section
      aria-labelledby="titulo-alzado"
      className="relative mt-24 border-y border-foreground/15 md:mt-40"
      style={{
        backgroundImage:
          'linear-gradient(color-mix(in oklab, var(--hotel-ink) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--hotel-ink) 6%, transparent) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-12 md:gap-14 md:px-10 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-accent uppercase">
            {tr('Alzado · {n} pisos', { n: levels.length })}
          </p>
          <h2 id="titulo-alzado" className="mt-4 font-display text-[2.5rem] leading-[1.02] text-balance md:text-[3.5rem]">
            {tr('Elige tu habitación en la torre')}
          </h2>
          <p className="mt-5 max-w-sm text-pretty text-foreground/75">
            {tr('Cada piso y cada habitación, con su disponibilidad. Toca una para verla por dentro.')}
          </p>
          <dl className="mt-8 grid grid-cols-2 border-t border-foreground/15 font-mono text-xs uppercase">
            <div className="border-b border-foreground/15 py-3">
              <dt className="text-foreground/55">{tr('Habitaciones')}</dt>
              <dd className="mt-1 text-lg text-foreground tabular-nums">{hotel.units.length}</dd>
            </div>
            <div className="border-b border-foreground/15 py-3">
              <dt className="text-foreground/55">{tr('Libres hoy')}</dt>
              <dd className="mt-1 text-lg text-foreground tabular-nums">{free}</dd>
            </div>
          </dl>
          <p className="mt-6 flex flex-wrap gap-4 font-mono text-[0.6875rem] text-foreground/65 uppercase">
            <span className="flex items-center gap-1.5">
              <i className="size-3 border border-[#3d6b47] bg-[#e5efe7]" />
              {tr('Libre')}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-3 border border-[#a14a33] bg-[#f4e3dd]" />
              {tr('Ocupada')}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-3 border border-accent bg-accent/15" />
              {tr('Lugar común')}
            </span>
          </p>
        </div>

        <ol className="border border-foreground/70 bg-background/80 p-2 md:col-span-8 md:p-3" aria-label={tr('Pisos del edificio')}>
          {levels.map((l) => {
            const units = hotel.units.filter((u) => u.levelId === l.id).sort((a, b) => a.id.localeCompare(b.id));
            const pois = hotel.site.pois.filter((p) => p.levelId === l.id);
            return (
              <li key={l.id} className="flex items-stretch gap-1.5 border-b border-foreground/10 py-1 last:border-b-0">
                <span className="grid w-9 shrink-0 place-items-center font-mono text-[0.6875rem] text-foreground/60 tabular-nums">P{l.order}</span>
                <div className="flex min-w-0 flex-1 gap-1.5">
                  {units.map((u) => {
                    const price = unitPrice(u);
                    return (
                      <Link
                        key={u.id}
                        href={routes.unidad(hotel.slug, u.id)}
                        title={`${cat.get(u.categoryId) ?? ''} ${u.id}${price !== undefined && !u.occupied ? ` · ${formatCOP(price)}` : ''}`}
                        className={`grid min-h-9 flex-1 place-items-center border font-mono text-[0.6875rem] tabular-nums transition-colors duration-200 hover:border-foreground hover:bg-foreground hover:text-background ${
                          u.occupied ? 'border-[#a14a33]/70 bg-[#f4e3dd] text-[#7a3624]' : 'border-[#3d6b47]/70 bg-[#e5efe7] text-[#2f5538]'
                        }`}
                      >
                        {u.id}
                      </Link>
                    );
                  })}
                  {pois.map((p) => (
                    <span
                      key={p.id}
                      className="grid min-h-9 flex-1 place-items-center border border-accent/60 bg-accent/12 px-1 text-center font-mono text-[0.625rem] text-foreground/80 uppercase"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
