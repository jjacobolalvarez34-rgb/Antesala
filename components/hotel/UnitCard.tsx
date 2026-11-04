/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { FidelityBadge } from '@/components/hotel/FidelityBadge';
import { formatArea, formatCOP, pluralize, unitPrice } from '@/lib/hotel';
import { mediaUrl } from '@/lib/media';
import { routes } from '@/lib/routes';
import type { Category, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';

export function unitCover(unit: Unit) {
  return unit.spaces.flatMap((s) => s.media).find((m) => m.kind === 'photo');
}

/** Tarjeta de unidad: categoría, área, capacidad, precio y extra por vista (DISENO.md §5). */
export function UnitCard({
  hotel,
  unit,
  category,
  levelName,
  variant = 'row',
  className,
}: {
  hotel: string;
  unit: Unit;
  category?: Category;
  levelName?: string;
  variant?: 'row' | 'feature';
  className?: string;
}) {
  const cover = unitCover(unit);
  const price = unitPrice(unit);
  const feature = variant === 'feature';

  return (
    <Link
      href={routes.unidad(hotel, unit.id)}
      className={cn(
        'group relative flex overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] duration-300 hover:border-ink/25 hover:shadow-[0_12px_40px_-20px_rgb(28_27_25/0.35)]',
        feature ? 'flex-col' : 'items-stretch',
        className,
      )}
    >
      <div className={cn('relative shrink-0 overflow-hidden bg-muted', feature ? 'aspect-[3/2] w-full' : 'w-28 sm:w-36')}>
        {cover ? (
          <img
            src={mediaUrl(hotel, cover.src)}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
        {feature && cover ? <FidelityBadge fidelity={cover.fidelity} className="absolute top-3 left-3" /> : null}
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col', feature ? 'gap-3 p-5' : 'gap-1 p-4')}>
        <p className="eyebrow">{[category?.name, levelName].filter(Boolean).join(' · ')}</p>
        <h3 className={cn('font-display leading-tight', feature ? 'text-title' : 'text-subtitle')}>{unit.name}</h3>
        {feature && category ? <p className="text-pretty text-muted-foreground">{category.tagline}</p> : null}
        <p className="text-sm text-muted-foreground">
          {formatArea(unit.areaM2)} · {pluralize(unit.capacity, 'persona', 'personas')}
        </p>
        <div className={cn('mt-auto flex items-end justify-between gap-3', feature ? 'pt-2' : 'pt-1')}>
          {price !== undefined ? (
            <p className="text-sm">
              <span className="font-semibold text-foreground">{formatCOP(price)}</span>
              <span className="text-muted-foreground"> / noche</span>
              {unit.viewPremiumCOP ? (
                <span className="mt-0.5 block text-xs font-medium text-accent">
                  Incluye {formatCOP(unit.viewPremiumCOP)} por vista
                </span>
              ) : null}
            </p>
          ) : (
            <span />
          )}
          <ArrowRight
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground"
          />
        </div>
      </div>
    </Link>
  );
}
