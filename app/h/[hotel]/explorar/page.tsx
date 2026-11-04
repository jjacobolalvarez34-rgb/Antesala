import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Hand } from 'lucide-react';

import { LevelPicker } from '@/components/hotel/LevelPicker';
import { FacadePicker } from '@/components/scene/FacadePicker';
import { SceneStatus } from '@/components/scene/SceneStatus';
import { getHotelBundle } from '@/lib/content';
import { levelSummary, sortedLevels } from '@/lib/hotel';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Explorar el edificio' };

/**
 * Vista exterior. Con 3D: el edificio ocupa la pantalla y esta página aporta
 * las capas (título y selector de piso). Sin 3D: el mismo selector en lista.
 */
export default async function ExplorarPage({ params }: PageProps<'/h/[hotel]/explorar'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel } = bundle;
  const levels = sortedLevels(hotel).map((l) => ({
    id: l.id,
    name: l.name,
    order: l.order,
    summary: levelSummary(hotel, l.id),
  }));

  return (
    <main>
      {/* Sin escena (cargando o sin 3D) */}
      <div className="mx-auto max-w-2xl px-5 pt-8 scene:hidden md:px-10 md:pt-14">
        <p className="eyebrow">{hotel.name}</p>
        <h1 className="mt-3 font-display text-display md:text-6xl">Elige un piso</h1>
        <SceneStatus className="mt-4" />
        <LevelPicker slug={hotel.slug} levels={levels} variant="list" className="mt-8" />
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Prefieres ver todo junto?{' '}
          <Link href={routes.lista(hotel.slug)} className="font-medium text-foreground underline-offset-4 hover:underline">
            Ver la lista de habitaciones
          </Link>
        </p>
      </div>

      {/* Con escena: capas sobre el edificio */}
      <div className="pointer-events-none fixed inset-x-0 top-28 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.5rem)] hidden scene:block md:top-32">
        <div className="mx-auto flex h-full max-w-6xl items-start justify-between gap-4 px-4 md:px-10">
          <div className="glass-dark pointer-events-auto max-w-[15rem] animate-in rounded-2xl px-4 py-3 duration-500 fade-in slide-in-from-top-2 md:max-w-xs md:px-5 md:py-4">
            <h1 className="font-display text-subtitle md:text-title">Elige un piso</h1>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-pretty text-bone/75 md:text-sm">
              <Hand aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Toca un piso del edificio o usa la lista. Cambia de fachada abajo.
            </p>
          </div>
          <LevelPicker
            slug={hotel.slug}
            levels={levels}
            variant="scene"
            className="pointer-events-auto my-auto animate-in duration-500 fade-in slide-in-from-right-2"
          />
        </div>
      </div>
      {hotel.site.building ? (
        <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-20 hidden justify-center scene:flex">
          <FacadePicker
            building={hotel.site.building}
            className="pointer-events-auto w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-2 lg:max-w-none lg:w-auto"
          />
        </div>
      ) : null}
    </main>
  );
}
