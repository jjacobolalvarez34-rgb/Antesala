import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { getHotelBundle, listHotelSlugs } from '@/lib/content';
import { routes } from '@/lib/routes';

/** Raíz de Antesala: por ahora solo enlaza a las demos disponibles. */
export default async function Home() {
  const slugs = await listHotelSlugs();
  const bundles = (await Promise.all(slugs.map(getHotelBundle))).filter((b) => b !== null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-between px-6 py-12 md:py-20">
      <div>
        <p className="eyebrow">Antesala</p>
        <h1 className="mt-6 font-display text-display text-balance md:text-7xl">Explora el hotel antes de llegar.</h1>
        <p className="mt-6 max-w-md text-pretty text-muted-foreground">
          Recorridos del edificio, las unidades y cada espacio, desde el celular y antes de reservar.
        </p>
      </div>
      <section aria-labelledby="demos" className="mt-16">
        <h2 id="demos" className="eyebrow">
          Demos
        </h2>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {bundles.map(({ hotel }) => (
            <li key={hotel.slug}>
              <Link
                href={routes.hotel(hotel.slug)}
                className="group flex min-h-16 items-center justify-between gap-4 py-4 transition-colors hover:text-accent"
              >
                <span>
                  <span className="block font-display text-subtitle">{hotel.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {[hotel.neighborhood, hotel.city].filter(Boolean).join(', ')}
                    {hotel.isDemo ? ' · hotel ficticio' : ''}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href={routes.panel(hotel.slug)}
                className="-mt-2 mb-3 inline-flex min-h-9 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Panel del hotel (métricas simuladas)
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
