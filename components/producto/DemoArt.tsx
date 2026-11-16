/**
 * Ilustraciones de las tarjetas de demos (pedido de Jacobo, 2026-11-12: la
 * captura del 3D de Akuare y la caja vacía del glamping se veían mal). Dibujos
 * de plano, en la línea del modo ligero, hechos con los datos del contenido.
 */

const C = {
  papel: '#F2E8D6',
  noche: '#111B33',
  champ: '#D2B88C',
  bisel: '#957C55',
};

/**
 * Alzado esquemático de un edificio en venta: un piso por fila, una celda por
 * unidad, las vendidas rayadas. Con los datos reales del hotel.
 */
export function ElevationArt({
  name,
  heightM,
  levels,
  taken = 'Vendido',
  source = 'CATASTRO DE BOGOTÁ',
  id = 'art',
  tower = false,
}: {
  name: string;
  heightM: number;
  /** cómo se llaman las ocupadas: "Vendido" en finca raíz, "Ocupada" en un hotel */
  taken?: string;
  /** de dónde sale el alzado, al pie */
  source?: string;
  /** prefijo de los patrones SVG, por si hay dos alzados en la página */
  id?: string;
  /** torre: angosta y alta, para que se lea su proporción */
  tower?: boolean;
  /** de abajo hacia arriba; cada unidad con su estado */
  levels: { id: string; units: { id: string; sold: boolean }[] }[];
}) {
  const W = 480;
  const H = 300;
  const x0 = tower ? 175 : 70;
  const x1 = tower ? 305 : 410;
  const ground = 262;
  const rowH = Math.min(40, (tower ? 214 : 200) / Math.max(1, levels.length));
  const top = ground - rowH * levels.length;
  const total = levels.reduce((n, l) => n + l.units.length, 0);
  const sold = levels.reduce((n, l) => n + l.units.filter((u) => u.sold).length, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Alzado de ${name}: ${total} unidades, ${sold} ${taken.toLowerCase()}s`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`${id}-rayado`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke={C.bisel} strokeWidth="1.6" />
        </pattern>
        <pattern id={`${id}-cuadricula`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke={C.noche} strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={C.papel} />
      <rect width={W} height={H} fill={`url(#${id}-cuadricula)`} />
      {/* terreno */}
      <line x1="24" y1={ground} x2={W - 24} y2={ground} stroke={C.noche} strokeWidth="1.4" />
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1={30 + i * 18} y1={ground + 2} x2={22 + i * 18} y2={ground + 10} stroke={C.noche} strokeOpacity="0.35" />
      ))}
      {/* cubierta */}
      <rect x={x0 - 4} y={top - 7} width={x1 - x0 + 8} height="7" fill="none" stroke={C.noche} strokeWidth="1.2" />
      {/* pisos y unidades */}
      {levels.map((l, i) => {
        const y = ground - rowH * (i + 1);
        const n = Math.max(1, l.units.length);
        const cw = (x1 - x0) / n;
        return (
          <g key={l.id}>
            <rect x={x0} y={y} width={x1 - x0} height={rowH} fill="none" stroke={C.noche} strokeWidth="1.1" />
            {l.units.map((u, k) => {
              const cx = x0 + k * cw;
              return (
                <g key={u.id}>
                  {k > 0 ? <line x1={cx} y1={y} x2={cx} y2={y + rowH} stroke={C.noche} strokeOpacity="0.4" /> : null}
                  {u.sold ? <rect x={cx + 2.5} y={y + 2.5} width={cw - 5} height={rowH - 5} fill={`url(#${id}-rayado)`} /> : null}
                  {/* ventana */}
                  <rect
                    x={cx + cw * 0.3}
                    y={y + rowH * 0.22}
                    width={cw * 0.4}
                    height={rowH * 0.5}
                    fill={u.sold ? C.papel : 'none'}
                    stroke={C.noche}
                    strokeOpacity="0.7"
                  />
                </g>
              );
            })}
            <text x={x0 - 10} y={y + rowH / 2 + 3.5} textAnchor="end" fontSize="9" fill={C.noche} fillOpacity="0.55" fontFamily="var(--f-body)">
              P{l.id}
            </text>
          </g>
        );
      })}
      {/* cota de altura */}
      <g stroke={C.bisel} strokeWidth="0.9">
        <line x1={x1 + 22} y1={top} x2={x1 + 22} y2={ground} />
        <line x1={x1 + 17} y1={top} x2={x1 + 27} y2={top} />
        <line x1={x1 + 17} y1={ground} x2={x1 + 27} y2={ground} />
      </g>
      <text
        x={x1 + 34}
        y={(top + ground) / 2}
        fontSize="9"
        fill={C.bisel}
        fontFamily="var(--f-body)"
        transform={`rotate(90 ${x1 + 34} ${(top + ground) / 2})`}
        textAnchor="middle"
      >
        {heightM.toLocaleString('es-CO', { maximumFractionDigits: 1 })} m
      </text>
      {/* leyenda */}
      <g fontFamily="var(--f-body)" fontSize="9.5" fill={C.noche}>
        <rect x={x0} y={top - 34} width="10" height="10" fill="none" stroke={C.noche} strokeOpacity="0.7" />
        <text x={x0 + 15} y={top - 25.5}>
          Disponible · {total - sold}
        </text>
        <rect x={x0 + 108} y={top - 34} width="10" height="10" fill={`url(#${id}-rayado)`} stroke={C.noche} strokeOpacity="0.4" />
        <text x={x0 + 123} y={top - 25.5}>
          {taken} · {sold}
        </text>
      </g>
      <text x={W - 24} y={H - 12} textAnchor="end" fontSize="8.5" letterSpacing="2" fill={C.noche} fillOpacity="0.55" fontFamily="var(--f-body)">
        {name.toUpperCase()} · ALZADO · {source}
      </text>
    </svg>
  );
}

/**
 * Mapa del terreno del glamping (D-083): curvas de nivel y cada refugio en su lugar del mapa
 * real (x, y de 0 a 1), con su nombre. Sin datos, cuatro refugios de ejemplo.
 */
export function TerrainArt({ refugios }: { refugios?: { name: string; x: number; y: number }[] } = {}) {
  const W = 480;
  const H = 300;
  const hill = (cx: number, cy: number, rx: number, ry: number, rot: number, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const k = 1 - i / n;
      return (
        <ellipse
          key={`${cx}-${i}`}
          cx={cx + i * 3}
          cy={cy - i * 2}
          rx={rx * k}
          ry={ry * k}
          transform={`rotate(${rot + i * 4} ${cx} ${cy})`}
          fill="none"
          stroke={C.champ}
          strokeOpacity={0.16 + i * 0.05}
        />
      );
    });
  const pts = (refugios ?? [
    { name: 'Refugio 1', x: 0.27, y: 0.55 },
    { name: 'Refugio 2', x: 0.43, y: 0.3 },
    { name: 'Refugio 3', x: 0.7, y: 0.36 },
    { name: 'Refugio 4', x: 0.64, y: 0.7 },
  ]).map((r) => ({ ...r, px: 30 + r.x * (W - 60), py: 24 + r.y * (H - 64) }));
  const start = { px: W * 0.5, py: H - 30 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mapa del terreno con ${pts.length} refugios (ilustración)`} preserveAspectRatio="xMidYMid slice">
      <rect width={W} height={H} fill={C.noche} />
      {hill(170, 150, 210, 120, -12, 8)}
      {hill(360, 120, 150, 95, 18, 6)}
      {/* senderos desde la recepción */}
      {pts.map((p, i) => (
        <path
          key={`s${i}`}
          d={`M${start.px} ${start.py} Q ${(start.px + p.px) / 2 + (i % 2 ? 24 : -24)} ${(start.py + p.py) / 2}, ${p.px} ${p.py + 8}`}
          fill="none"
          stroke={C.papel}
          strokeOpacity="0.4"
          strokeDasharray="3 5"
        />
      ))}
      <rect x={start.px - 7} y={start.py - 4} width="14" height="8" fill={C.champ} fillOpacity="0.7" />
      {pts.map((p, i) => (
        <g key={i}>
          {/* refugio con techo a dos aguas */}
          <path d={`M${p.px - 10} ${p.py + 6} V${p.py - 2} L${p.px} ${p.py - 10} L${p.px + 10} ${p.py - 2} V${p.py + 6} Z`} fill={C.noche} stroke={C.champ} strokeWidth="1.3" />
          <text x={p.px} y={p.py + 19} textAnchor="middle" fontSize="8.5" fill={C.papel} fillOpacity="0.75" fontFamily="var(--f-body)">
            {p.name}
          </text>
        </g>
      ))}
      {/* norte */}
      <g transform="translate(436 40)" stroke={C.champ} fill="none">
        <circle r="13" strokeOpacity="0.5" />
        <path d="M0 -9 L4 5 L0 2 L-4 5 Z" fill={C.champ} stroke="none" />
      </g>
      <text x="24" y={H - 12} fontSize="8.5" letterSpacing="2" fill={C.papel} fillOpacity="0.5" fontFamily="var(--f-body)">
        MAPA DEL TERRENO · ILUSTRATIVO
      </text>
    </svg>
  );
}
