import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { t, type Lang } from '@/lib/i18n';
import { GuidedView } from '@/components/guided/GuidedView';
import { getHotelBundle } from '@/lib/content';
import { fileVersion, loadGuided } from '@/lib/guided';
import type { GuidedData, GuidedSpace } from '@/lib/guided-types';
import { findCategory, sortedLevels, unitPrice } from '@/lib/hotel';
import { assetUrl, mediaUrl } from '@/lib/media';

import type { DemoProps } from './types';

export async function generateMetadata(_props: DemoProps<{ hotel: string }>, lang: Lang = 'es'): Promise<Metadata> {
  return { title: t(lang, 'Vista guiada') };
}

/**
 * Vista guiada (D-095): el recorrido "como un video" de las inmobiliarias, sin 3D en vivo.
 * Llegada en video → la torre con sus pisos → solo el piso → la unidad (plano, fotos, 360°).
 * Todo sale de imágenes prerenderizadas de nuestra escena (pipeline/guiada.spec.ts).
 */
export async function GuiadaPage({ params }: DemoProps<{ hotel: string }>, lang: Lang = 'es') {
  const { hotel: slug } = await params;
  const [bundle, manifest] = await Promise.all([getHotelBundle(slug, lang), loadGuided(slug)]);
  if (!bundle || !manifest) notFound();
  const { hotel, plans, tokens } = bundle;

  // cada imagen con su versión: al recapturar cambia la URL y no se ve la vieja de la caché
  const versions = new Map<string, string>();
  const srcs = Object.values(manifest.orients).flatMap((o) => [
    o?.video,
    o?.pisos,
    o?.night?.video,
    o?.night?.pisos,
    ...Object.values(o?.levels ?? {}).flatMap((l) => [l.img, l.night]),
  ]);
  await Promise.all(srcs.filter((s): s is string => !!s).map(async (s) => versions.set(s, await fileVersion(hotel.slug, s))));
  const url = (src?: string) => (src ? `${assetUrl(hotel.slug, src)}?v=${versions.get(src) ?? '0'}` : undefined);
  const orients: GuidedData['orients'] = {};
  for (const [k, o] of Object.entries(manifest.orients)) {
    if (!o?.pisos || !o.floors) continue;
    orients[k as 'h' | 'v'] = {
      ...o,
      video: url(o.video),
      pisos: url(o.pisos),
      night: o.night ? { video: url(o.night.video), pisos: url(o.night.pisos) } : undefined,
      levels: Object.fromEntries(Object.entries(o.levels ?? {}).map(([id, l]) => [id, { ...l, img: url(l.img)!, night: url(l.night) }])),
    };
  }

  // un plano por tipo de unidad (las copias lo comparten, como en el 3D: D-058)
  const planData: GuidedData['plans'] = {};
  for (const u of hotel.units) {
    const geometry = plans[u.plan];
    if (!geometry || planData[u.plan]) continue;
    const spaces: GuidedSpace[] = u.spaces.map((s) => {
      const pano = s.media.find((m) => m.kind === 'pano360' && !m.src.endsWith('.svg'));
      return {
        id: s.id,
        name: s.name,
        areaM2: s.areaM2,
        outdoor: s.type === 'balcon' || s.type === 'terraza',
        photos: s.media
          .filter((m) => m.kind === 'photo')
          .map((m) => ({
            id: m.id,
            url: mediaUrl(hotel.slug, m.src),
            alt: m.alt,
            fidelity: m.fidelity,
            width: m.width,
            height: m.height,
            tier: m.tier,
          })),
        pano: pano ? { url: mediaUrl(hotel.slug, pano.src), yaw: pano.yaw } : undefined,
      };
    });
    planData[u.plan] = { geometry, spaces };
  }

  const data: GuidedData = {
    slug: hotel.slug,
    name: tokens.brand.name,
    place: [hotel.neighborhood, hotel.city].filter(Boolean).join(' · '),
    upper: tokens.look?.title === 'mayusculas',
    note: t(lang, hotel.isDemo ? (hotel.demoNote ?? 'Hotel ficticio · imágenes ilustrativas') : 'Imágenes ilustrativas'),
    background: manifest.background ?? '#eae6dd',
    sky: manifest.sky ?? '#dfe3df',
    backgroundNight: manifest.backgroundNight ?? '#1f1e1c',
    skyNight: manifest.skyNight ?? '#1a1d24',
    orients,
    levels: sortedLevels(hotel)
      .reverse()
      .map((l) => ({
        id: l.id,
        name: l.name,
        order: l.order,
        units: hotel.units.filter((u) => u.levelId === l.id).map((u) => u.id),
        pois: hotel.site.pois.filter((p) => p.levelId === l.id).map((p) => ({ id: p.id, name: p.name, description: p.description })),
      })),
    units: Object.fromEntries(
      hotel.units.map((u) => [
        u.id,
        {
          id: u.id,
          name: u.name,
          category: findCategory(hotel, u.categoryId)?.name,
          levelId: u.levelId,
          price: unitPrice(u),
          occupied: u.occupied === true,
          capacity: u.capacity,
          beds: u.beds,
          areaM2: u.areaM2,
          view: u.view,
          plan: planData[u.plan] ? u.plan : undefined,
        },
      ]),
    ),
    plans: planData,
  };

  return (
    <main>
      {/* el estado (piso y unidad) vive en la URL: el atrás del celular funciona solo */}
      <Suspense fallback={<div className="fixed inset-0" style={{ background: data.sky }} />}>
        <GuidedView data={data} offer={hotel.offer} />
      </Suspense>
    </main>
  );
}
