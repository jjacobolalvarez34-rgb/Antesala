import Link from 'next/link';

import { routes } from '@/lib/routes';
import type { Space } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  return (
    <nav aria-label="Espacios de la unidad" className={className}>
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
