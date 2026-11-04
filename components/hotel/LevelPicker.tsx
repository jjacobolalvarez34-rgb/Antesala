'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { routes } from '@/lib/routes';
import { useTour } from '@/lib/store';
import { cn } from '@/lib/utils';

export interface PickerLevel {
  id: string;
  name: string;
  order: number;
  /** "Suite 402 · Suite 502", "Lobby y cowork"… */
  summary: string;
}

/**
 * Lista vertical de pisos sincronizada con el 3D (DISENO.md §5): al pasar por
 * un piso se resalta en el edificio y viceversa. Variante "scene" sobre la
 * escena oscura; variante "list" para el modo sin 3D.
 */
export function LevelPicker({
  slug,
  levels,
  currentId,
  variant,
  className,
}: {
  slug: string;
  levels: PickerLevel[];
  currentId?: string;
  variant: 'scene' | 'list';
  className?: string;
}) {
  const hovered = useTour((s) => s.hoveredLevelId);
  const setHovered = useTour((s) => s.setHoveredLevel);
  const sorted = [...levels].sort((a, b) => b.order - a.order);

  if (variant === 'list') {
    return (
      <ol className={cn('divide-y divide-border border-y border-border', className)}>
        {sorted.map((l) => (
          <li key={l.id}>
            <Link
              href={routes.piso(slug, l.id)}
              className="group flex min-h-16 items-center justify-between gap-4 py-3 transition-colors hover:text-accent"
            >
              <span className="flex items-baseline gap-4">
                <span className="w-8 font-display text-title tabular-nums">{l.order}</span>
                <span>
                  <span className="block font-medium">{l.name}</span>
                  <span className="text-sm text-muted-foreground">{l.summary}</span>
                </span>
              </span>
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <nav aria-label="Pisos del edificio" className={className}>
      <ol className="glass-dark flex flex-col gap-1 rounded-3xl p-1.5 shadow-2xl">
        {sorted.map((l) => {
          const active = l.id === currentId;
          const hot = l.id === hovered;
          return (
            <li key={l.id}>
              <Link
                href={routes.piso(slug, l.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={`${l.name}: ${l.summary}`}
                onPointerEnter={() => setHovered(l.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(l.id)}
                onBlur={() => setHovered(null)}
                className={cn(
                  'flex min-h-11 min-w-11 items-center gap-3 rounded-2xl px-3 transition-colors duration-200',
                  active ? 'bg-accent-on-dark text-ink' : hot ? 'bg-bone/16' : 'hover:bg-bone/10',
                )}
              >
                <span className="w-5 text-center font-display text-xl tabular-nums">{l.order}</span>
                <span className="hidden min-w-0 pr-1 md:block">
                  <span className="block text-sm font-medium">{l.name}</span>
                  <span className={cn('block max-w-44 truncate text-xs', active ? 'text-ink/75' : 'text-bone/65')}>
                    {l.summary}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
