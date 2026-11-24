import type { Metadata } from 'next';
import { routesFor, t, type Lang } from '@/lib/i18n';

import type { DemoProps } from './types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LevelPicker } from '@/components/hotel/LevelPicker';
import { TerrainExplorar } from '@/components/hotel/TerrainExplorar';
import { FacadePicker } from '@/components/scene/FacadePicker';
import { SceneStatus } from '@/components/scene/SceneStatus';
import { getHotelBundle } from '@/lib/content';
import { levelSummary, sortedLevels } from '@/lib/hotel';

export async function generateMetadata({ params }: DemoProps<{ hotel: string }>, lang: Lang = 'es'): Promise<Metadata> {
  const bundle = await getHotelBundle((await params).hotel, lang);
  return {
    title: t(lang, bundle?.hotel.site.kind === 'terreno' ? 'Explorar el terreno' : 'Explorar el edificio'),
  };
}

/**
 * Vista exterior. Con 3D: el edificio ocupa la pantalla y esta página aporta
 * las capas (título y selector de piso). Sin 3D: el mismo selector en lista.
 */
export async function ExplorarPage({ params }: DemoProps<{ hotel: string }>, lang: Lang = 'es') {
  const tr = (es: string, vars?: Record<string, string | number>) => t(lang, es, vars);
  const routes = routesFor(lang);
  const bundle = await getHotelBundle((await params).hotel, lang);
  if (!bundle) notFound();
  const { hotel } = bundle;
  if (hotel.site.kind === 'terreno') return <TerrainExplorar hotel={hotel} aerial={false} />;
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
        <h1 className="mt-3 font-display text-display md:text-6xl">{tr('Elige un piso')}</h1>
        <SceneStatus className="mt-4" />
        <LevelPicker slug={hotel.slug} levels={levels} variant="list" className="mt-8" />
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Prefieres ver todo junto?{' '}
          <Link href={routes.lista(hotel.slug)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {tr('Ver la lista de habitaciones')}
          </Link>
        </p>
      </div>

      {/* Con escena: los pisos van pegados al costado del edificio (FloorTags, en la escena) */}
      {/* en escritorio va a la esquina izquierda, a la altura de la barra de reserva: el centro queda libre */}
      {hotel.site.building ? (
        <div className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--booking-bar-h)+var(--safe-bottom)+1.25rem)] z-20 hidden justify-center scene:flex viewpoint:hidden md:inset-x-auto md:bottom-[calc(0.75rem+var(--safe-bottom)+0.5rem)] md:left-6">
          <FacadePicker
            building={hotel.site.building}
            className="pointer-events-auto w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-2 md:w-auto md:max-w-none"
          />
        </div>
      ) : null}
    </main>
  );
}
