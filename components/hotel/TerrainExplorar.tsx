'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { SceneStatus } from '@/components/scene/SceneStatus';
import { findCategory, formatArea, formatCOP, offerOf, unitPrice } from '@/lib/hotel';
import type { Routes } from '@/lib/i18n';
import type { Hotel } from '@/lib/types';

import { TerrainPanel, type TerrainPanelCabin } from './TerrainPanel';
import { useLang, useRoutes, useT } from '@/components/i18n/Lang';

const cabinsOf = (hotel: Hotel, routes: Routes): TerrainPanelCabin[] =>
  hotel.units.map((u) => ({
    id: u.id,
    name: u.name,
    category: findCategory(hotel, u.categoryId)?.name,
    price: unitPrice(u),
    capacity: u.capacity,
    occupied: u.occupied === true,
    href: routes.unidad(hotel.slug, u.id),
  }));

/** Panel del glamping sobre el 3D (vista del valle o aérea), D-083. */
export function TerrainOverlay({ hotel, aerial }: { hotel: Hotel; aerial: boolean }) {
  const routes = useRoutes();
  const lang = useLang();
  const map = hotel.levels.find((l) => l.plan) ?? hotel.levels[0]!;
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1rem)] z-20 hidden scene:block md:inset-x-auto md:top-[8.5rem] md:bottom-auto md:left-6">
      <div className="pointer-events-auto animate-in duration-700 fade-in slide-in-from-bottom-2 md:slide-in-from-left-2">
        <TerrainPanel
          cabins={cabinsOf(hotel, routes)}
          valleHref={routes.explorar(hotel.slug)}
          aereaHref={routes.piso(hotel.slug, map.id)}
          aerial={aerial}
          offer={offerOf(hotel, lang).suffix.replace(/^ \/ /, '') || 'noche'}
        />
      </div>
    </div>
  );
}

/** "Explorar" del glamping: sin 3D, los refugios en lista y el mapa; con 3D, el panel. */
export function TerrainExplorar({ hotel, aerial }: { hotel: Hotel; aerial: boolean }) {
  const tr = useT();
  const routes = useRoutes();
  const lang = useLang();
  const map = hotel.levels.find((l) => l.plan) ?? hotel.levels[0]!;
  const offer = offerOf(hotel, lang);
  return (
    <main>
      <div className="mx-auto max-w-3xl px-5 pt-8 scene:hidden md:px-10 md:pt-14">
        <p className="eyebrow">{hotel.name}</p>
        <h1 className="mt-3 font-display text-display md:text-6xl">Elige tu refugio</h1>
        <SceneStatus className="mt-4" />
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {hotel.units.map((u) => {
            const price = unitPrice(u);
            return (
              <li key={u.id}>
                <Link href={routes.unidad(hotel.slug, u.id)} className="group flex items-center justify-between gap-4 py-5">
                  <span>
                    <span className="block font-display text-2xl">{u.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {findCategory(hotel, u.categoryId)?.name} · {formatArea(u.areaM2)} · {u.capacity} personas
                    </span>
                    {u.view ? <span className="mt-1 block text-sm text-pretty">{u.view}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-right">
                    {price ? (
                      <span>
                        <span className="block font-medium">{formatCOP(price)}</span>
                        <span className="text-xs text-muted-foreground">{offer.suffix}</span>
                      </span>
                    ) : null}
                    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Quieres ver dónde queda cada uno?{' '}
          <Link href={routes.piso(hotel.slug, map.id)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {tr('Ver el mapa del terreno')}
          </Link>
        </p>
      </div>
      <TerrainOverlay hotel={hotel} aerial={aerial} />
    </main>
  );
}
