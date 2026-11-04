import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BookingBar, type BookingSummary } from '@/components/booking/BookingBar';
import { DemoBanner } from '@/components/hotel/DemoBanner';
import { HotelHeader } from '@/components/hotel/HotelHeader';
import { PoweredBy } from '@/components/hotel/PoweredBy';
import { getHotelBundle, listHotelSlugs } from '@/lib/content';
import { priceFrom, sortedLevels, unitPrice } from '@/lib/hotel';
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
    levels: sortedLevels(hotel).map(({ id, name }) => ({ id, name })),
    units: hotel.units.map((u) => ({
      id: u.id,
      name: u.name,
      levelId: u.levelId,
      price: unitPrice(u),
      spaces: u.spaces.map(({ id, name }) => ({ id, name })),
    })),
  };

  return (
    <div style={tokensToStyle(tokens)} className="flex min-h-dvh flex-col bg-background text-foreground">
      {hotel.isDemo ? <DemoBanner /> : null}
      <HotelHeader
        slug={hotel.slug}
        name={tokens.brand.name}
        place={[hotel.neighborhood, hotel.city].filter(Boolean).join(' · ')}
      />
      <div className="flex-1">{children}</div>
      <BookingBar data={summary} />
      <PoweredBy />
    </div>
  );
}
