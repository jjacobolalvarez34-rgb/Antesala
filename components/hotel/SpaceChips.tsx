'use client';

import Link from 'next/link';

import type { Space } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRoutes, useT } from '@/components/i18n/Lang';

/** Acceso rápido a los espacios de la unidad. */
export function SpaceChips({
  hotel,
  unitId,
  spaces,
  currentId,
  className,
}: {
  hotel: string;
  unitId: string;
  spaces: Pick<Space, 'id' | 'name'>[];
  currentId?: string;
  className?: string;
}) {
  const tr = useT();
  const routes = useRoutes();
  return (
    <nav aria-label={tr('Espacios de la unidad')} className={className}>
      <ul className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {spaces.map((s) => {
          const active = s.id === currentId;
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={routes.espacio(hotel, unitId, s.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors duration-200',
                  active
                    ? 'border-ink bg-ink text-bone'
                    : 'border-border bg-card hover:border-ink/40',
                )}
              >
                {s.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
