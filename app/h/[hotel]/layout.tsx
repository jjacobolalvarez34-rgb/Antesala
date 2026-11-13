import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookingBar, type BookingSummary } from '@/components/booking/BookingBar';
import { BrandIntro } from '@/components/hotel/BrandIntro';
import { DemoBanner } from '@/components/hotel/DemoBanner';
import { HotelHeader } from '@/components/hotel/HotelHeader';
import { PoweredBy } from '@/components/hotel/PoweredBy';
import type { SceneDataWire } from '@/components/scene/Scene';
import { SceneLayer } from '@/components/scene/SceneLayer';
import { getHotelBundle, listHotelSlugs } from '@/lib/content';
import { findCategory, findLevel, priceFrom, sortedLevels, unitPrice, freeAlternative } from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';
import { tokensToStyle } from '@/lib/tokens';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listHotelSlugs()).map((hotel) => ({ hotel }));
}

export async function generateMetadata({ params }: LayoutProps<'/h/[hotel]'>): Promise<Metadata> {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) return {};
  const { hotel, tokens } = bundle;
  return {
    title: { default: `${hotel.name} · ${hotel.city}`, template: `%s · ${hotel.name}` },
    description: hotel.intro ?? tokens.brand.tagline,
    robots: hotel.isDemo ? { index: false } : undefined,
  };
}

/**
 * Layout persistente del recorrido. En el bloque 2 aquí vive el Canvas 3D;
 * por ahora monta la capa de UI que funciona sin 3D (regla 3 de CLAUDE.md).
 */
export default async function HotelLayout({ children, params }: LayoutProps<'/h/[hotel]'>) {
  const bundle = await getHotelBundle((await params).hotel);
  if (!bundle) notFound();
  const { hotel, tokens } = bundle;

  const summary: BookingSummary = {
    slug: hotel.slug,
    name: hotel.name,
    whatsapp: hotel.contact.whatsapp,
    priceFrom: priceFrom(hotel),
    offer: hotel.offer,
    levels: sortedLevels(hotel).map(({ id, name }) => ({ id, name })),
    units: hotel.units.map((u) => ({
      id: u.id,
      name: u.name,
      levelId: u.levelId,
      price: unitPrice(u),
      capacity: u.capacity,
      spaces: u.spaces.map(({ id, name }) => ({ id, name })),
      occupied: u.occupied === true,
      alternative: u.occupied ? freeAlternative(hotel, u)?.id : undefined,
    })),
  };

  const building = hotel.site.kind === 'edificio' ? hotel.site.building : undefined;
  const scene: SceneDataWire | null = building
    ? {
        slug: hotel.slug,
        building,
        floors: sortedLevels(hotel).map((l) => ({ id: l.id, order: l.order, name: l.name })),
        pois: hotel.site.pois.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          position: p.position,
          levelName: p.levelId ? findLevel(hotel, p.levelId)?.name : undefined,
          href: p.levelId ? routes.piso(hotel.slug, p.levelId) : undefined,
          viewpoints: p.viewpoints,
        })),
        colors: { accent: tokens.color.accentOnDark ?? tokens.color.accent },
        brandName: tokens.brand.name,
        offer: hotel.offer,
        contextUrl: hotel.site.context ? mediaUrl(hotel.slug, hotel.site.context) : undefined,
        liveInterior: hotel.isDemo === true,
        units: hotel.units.map((u) => ({
          id: u.id,
          name: u.name,
          category: findCategory(hotel, u.categoryId)?.name,
          levelId: u.levelId,
          levelName: findLevel(hotel, u.levelId)?.name,
          price: unitPrice(u),
          viewPremium: u.viewPremiumCOP,
          view: u.view,
          href: routes.unidad(hotel.slug, u.id),
          exterior: u.exterior ?? [],
          balcony: u.spaces.some((s) => s.type === 'balcon'),
          occupied: u.occupied === true,
        })),
        // las plantas de piso (pesadas, con muebles) se piden aparte desde la escena (D-058)
        levelPlanSources: Object.fromEntries(
          hotel.levels.flatMap((l) => {
            const plan = l.plan ? bundle.plans[l.plan] : undefined;
            if (!plan || !l.plan) return [];
            const spaces = plan.spaces.map((s) => {
              const unit = hotel.units.find((u) => u.id === s.id && u.levelId === l.id);
              const poi = hotel.site.pois.find((p) => p.id === s.id);
              return {
                id: s.id,
                kind: unit ? ('unit' as const) : poi ? ('poi' as const) : ('other' as const),
                name: unit?.name ?? poi?.name ?? s.label ?? s.id,
                unitId: unit?.id,
                occupied: unit?.occupied === true,
              };
            });
            return [[l.id, { url: mediaUrl(hotel.slug, l.plan), spaces }]];
          }),
        ),
        // cada plano viaja una vez (D-058): las copias de una unidad tipo lo comparten
        unitPlanOf: Object.fromEntries(hotel.units.filter((u) => bundle.plans[u.plan]).map((u) => [u.id, u.plan])),
        unitPlanTypes: Object.fromEntries(
          [...new Map(hotel.units.map((u) => [u.plan, u])).values()].flatMap((u) => {
            const plan = bundle.plans[u.plan];
            if (!plan) return [];
            const spaces = u.spaces.map(({ id, name, type, media }) => {
              const pano = media.find((m) => m.kind === 'pano360');
              return {
                id,
                name,
                type,
                pano: pano
                  ? {
                      url: mediaUrl(hotel.slug, pano.src),
                      yaw: pano.yaw ?? 0,
                      hotspots: (pano.hotspots ?? []).map(({ yaw, pitch, label, target }) => ({ yaw, pitch, label, target })),
                    }
                  : undefined,
              };
            });
            return [[u.plan, { plan, spaces, realista: u.realista ? mediaUrl(hotel.slug, u.realista) : undefined }]];
          }),
        ),
      }
    : null;

  return (
    <div
      style={tokensToStyle(tokens)}
      className="relative flex min-h-dvh flex-col bg-background text-foreground scene:pointer-events-none scene:bg-transparent"
    >
      {scene ? <SceneLayer data={scene} /> : null}
      {hotel.isDemo ? (
        <DemoBanner
          note={hotel.demoNote}
          base={`/h/${hotel.slug}`}
          niveles={hotel.units.some((u) => u.realista) || JSON.stringify(hotel).includes('"tier":"premium"')}
        />
      ) : null}
      <HotelHeader
        slug={hotel.slug}
        name={tokens.brand.name}
        place={[hotel.neighborhood, hotel.city].filter(Boolean).join(' · ')}
      />
      <div className="relative z-10 flex-1">{children}</div>
      <BookingBar data={summary} />
      <BrandIntro
        name={tokens.brand.name}
        tagline={tokens.brand.tagline}
        base={`/h/${hotel.slug}`}
        cover={(() => {
          const m = hotel.site.exterior.find((x) => x.kind === 'photo');
          return m ? mediaUrl(hotel.slug, m.src) : undefined;
        })()}
      />
      <PoweredBy />
    </div>
  );
}
