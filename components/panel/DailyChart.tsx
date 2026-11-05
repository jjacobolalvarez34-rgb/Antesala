'use client';

import { useId, useState } from 'react';

/**
 * Serie diaria (una sola serie, un solo eje): línea de 2 px con área suave,
 * cruz y tooltip al pasar, y tabla equivalente para lectores de pantalla.
 */
export function DailyChart({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const W = 640;
  const H = 180;
  const pad = { l: 36, r: 8, t: 10, b: 22 };
  const max = Math.max(...points.map((p) => p.value)) * 1.12;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ticks = [0, Math.round(max / 2 / 10) * 10, Math.round((max * 0.9) / 10) * 10];
  const h = hover !== null ? points[hover] : null;
  const fmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

  return (
    <figure>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-labelledby={`${id}-t`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
            setHover(Math.max(0, Math.min(points.length - 1, i)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <title id={`${id}-t`}>{label}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {t}
              </text>
            </g>
          ))}
          <path d={area} className="fill-accent/10" />
          <path d={line} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" />
          {h && hover !== null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="stroke-ink/30" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(h.value)} r={4.5} className="fill-accent stroke-card" strokeWidth={2} />
            </g>
          ) : null}
          {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[10px]">
              {fmt.format(new Date(points[i]!.date))}
            </text>
          ))}
        </svg>
        {h && hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <span className="font-semibold">{h.value}</span>
            <span className="text-muted-foreground"> · {fmt.format(new Date(h.date))}</span>
          </div>
        ) : null}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr>
              <th className="py-1 font-medium">Día</th>
              <th className="py-1 text-right font-medium">Visitas</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-t border-border">
                <td className="py-1">{fmt.format(new Date(p.date))}</td>
                <td className="py-1 text-right tabular-nums">{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
