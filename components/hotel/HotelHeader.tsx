import Link from 'next/link';

import { routes } from '@/lib/routes';

export function HotelHeader({ slug, name, place }: { slug: string; name: string; place: string }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-4 md:px-10 md:pt-6">
      <Link href={routes.hotel(slug)} className="group flex min-h-11 flex-col justify-center">
        <span className="font-display text-[1.375rem] leading-none tracking-tight">{name}</span>
        <span className="mt-1 hidden text-xs tracking-[0.14em] text-muted-foreground uppercase sm:block">{place}</span>
      </Link>
      <Link
        href={routes.lista(slug)}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full border whitespace-nowrap border-border px-4 text-sm transition-colors hover:border-ink/40 hover:bg-card"
      >
        Pisos y unidades
      </Link>
    </header>
  );
}
