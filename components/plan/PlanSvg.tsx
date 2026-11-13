'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { formatArea } from '@/lib/hotel';
import { polygonLabelPoint } from '@/lib/plan';
import type { PlanGeometry } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface PlanSpaceMeta {
  id: string;
  name: string;
  areaM2?: number;
  href: Route;
  outdoor?: boolean;
  /** disponibilidad en la planta del piso (bloque 9): verde libre, terracota ocupada o vendida */
  status?: 'libre' | 'ocupada';
  /** texto corto del estado ("Vendido", "Ocupada") */
  statusLabel?: string;
}

interface Props {
  geometry: PlanGeometry;
  spaces: PlanSpaceMeta[];
  /** espacio resaltado (página de espacio) */
  selectedId?: string;
  /** thumb: miniatura sin etiquetas ni interacción */
  variant?: 'interactive' | 'thumb';
  title: string;
  className?: string;
  /** abrir los espacios en otra pestaña (desde la página de Antesala hacia la demo) */
  newTab?: boolean;
}

/**
 * Plano 2D interactivo desde la geometría del SVG (CONTENIDO.md §4).
 * Los polígonos reaccionan al puntero; las etiquetas son enlaces HTML
 * superpuestos (accesibles por teclado y lectores de pantalla).
 */
export function PlanSvg({ geometry, spaces, selectedId, variant = 'interactive', title, className, newTab = false }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const interactive = variant === 'interactive';
  const meta = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);
  const { width, height } = geometry;

  const labels = useMemo(
    () =>
      geometry.spaces.map((s) => {
        const [x, y] = polygonLabelPoint(s.points);
        return { id: s.id, left: (x / width) * 100, top: (y / height) * 100 };
      }),
    [geometry.spaces, width, height],
  );

  return (
    <figure className={cn('relative', className)}>
      <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label={title}
        >
          <g>
            {geometry.spaces.map((s) => {
              const info = meta.get(s.id);
              const active = s.id === selectedId;
              const hot = interactive && s.id === hovered;
              return (
                <polygon
                  key={s.id}
                  points={s.points.map((p) => p.join(',')).join(' ')}
                  className={cn(
                    'transition-[fill] duration-200',
                    info?.status === 'libre'
                      ? 'fill-[#dfe8d6]'
                      : info?.status === 'ocupada'
                        ? 'fill-[#efd9cf]'
                        : info?.outdoor
                          ? 'fill-stone/45'
                          : 'fill-card',
                    hot && 'fill-accent/16',
                    active && 'fill-accent/18',
                    interactive && 'cursor-pointer',
                  )}
                  onPointerEnter={interactive ? () => setHovered(s.id) : undefined}
                  onPointerLeave={interactive ? () => setHovered(null) : undefined}
                  onClick={interactive && info ? () => (newTab ? window.open(info.href, '_blank', 'noopener') : router.push(info.href)) : undefined}
                />
              );
            })}
          </g>
          <g className="pointer-events-none" aria-hidden>
            {geometry.spaces
              .filter((s) => s.id === selectedId || (interactive && s.id === hovered))
              .map((s) => (
                <polygon
                  key={s.id}
                  points={s.points.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  className="stroke-accent"
                  strokeWidth={Math.max(3, width / 220)}
                  strokeDasharray={s.id === selectedId ? undefined : '10 8'}
                />
              ))}
            {geometry.furniture.map((f, i) => {
              const sw = Math.max(1.5, width / 520);
              if (f.item === 'stairs') {
                // escalera: huellas perpendiculares al sentido de subida
                const vertical = f.height >= f.width;
                const n = 12;
                return (
                  <g key={i} className="stroke-ink/30" strokeWidth={sw}>
                    <rect x={f.x} y={f.y} width={f.width} height={f.height} className="fill-ink/[0.035]" />
                    {Array.from({ length: n - 1 }, (_, k) =>
                      vertical ? (
                        <line key={k} x1={f.x} x2={f.x + f.width} y1={f.y + ((k + 1) * f.height) / n} y2={f.y + ((k + 1) * f.height) / n} />
                      ) : (
                        <line key={k} y1={f.y} y2={f.y + f.height} x1={f.x + ((k + 1) * f.width) / n} x2={f.x + ((k + 1) * f.width) / n} />
                      ),
                    )}
                  </g>
                );
              }
              return (
                <rect
                  key={i}
                  x={f.x + 3}
                  y={f.y + 3}
                  width={Math.max(f.width - 6, 1)}
                  height={Math.max(f.height - 6, 1)}
                  rx={f.item === 'plant' || f.item === 'stool' || f.item === 'lamp' ? Math.min(f.width, f.height) / 2 : Math.min(8, f.width / 6, f.height / 6)}
                  className={f.item === 'rug' ? 'fill-accent/[0.05] stroke-ink/20' : 'fill-ink/[0.035] stroke-ink/30'}
                  strokeDasharray={f.item === 'rug' ? `${sw * 4} ${sw * 3}` : undefined}
                  strokeWidth={sw}
                />
              );
            })}
            {geometry.walls.map((w, i) => (
              <rect key={i} {...w} className="fill-ink" />
            ))}
            {geometry.openings.map((o, i) => {
              const horizontal = o.width >= o.height;
              return (
                <g key={i}>
                  <rect {...o} className="fill-background" />
                  {o.type === 'window' ? (
                    horizontal ? (
                      <line
                        x1={o.x}
                        x2={o.x + o.width}
                        y1={o.y + o.height / 2}
                        y2={o.y + o.height / 2}
                        className="stroke-ink/70"
                        strokeWidth={2}
                      />
                    ) : (
                      <line
                        x1={o.x + o.width / 2}
                        x2={o.x + o.width / 2}
                        y1={o.y}
                        y2={o.y + o.height}
                        className="stroke-ink/70"
                        strokeWidth={2}
                      />
                    )
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>

        {interactive ? (
          <ul className="absolute inset-0">
            {labels.map((l) => {
              const info = meta.get(l.id);
              if (!info) return null;
              const active = l.id === selectedId;
              return (
                <li
                  key={l.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${l.left}%`, top: `${l.top}%` }}
                >
                  <Link
                    href={info.href}
                    target={newTab ? '_blank' : undefined}
                    rel={newTab ? 'noopener' : undefined}
                    aria-current={active ? 'page' : undefined}
                    onPointerEnter={() => setHovered(l.id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(l.id)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      'flex min-h-8 flex-col items-center rounded-lg px-2 py-1 text-center leading-tight whitespace-nowrap shadow-sm transition-colors duration-200',
                      'before:absolute before:-inset-2 before:content-[""]',
                      active || hovered === l.id ? 'bg-accent text-accent-foreground' : 'glass text-ink',
                    )}
                  >
                    <span className="text-[0.75rem] font-medium">{info.name}</span>
                    {info.areaM2 ? (
                      <span
                        className={cn(
                          'text-[0.75rem]',
                          active || hovered === l.id ? 'text-accent-foreground/85' : 'text-muted-foreground',
                        )}
                      >
                        {formatArea(info.areaM2)}
                      </span>
                    ) : null}
                    {info.statusLabel ? (
                      <span
                        className={cn(
                          'mt-0.5 text-[0.6875rem] font-medium tracking-wide uppercase',
                          active || hovered === l.id ? 'text-accent-foreground/85' : info.status === 'ocupada' ? 'text-[#9a4a33]' : 'text-[#4d6b3c]',
                        )}
                      >
                        {info.statusLabel}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </figure>
  );
}
