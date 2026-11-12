import s from './landing.module.css';

/**
 * Recorrido en modo ligero (D-063): el edificio como un alzado sobre papel,
 * con cotas y un rótulo de plano. Sin three.js. En cada paso los trazos se
 * vuelven a dibujar (pathLength + stroke-dashoffset en CSS): el piso elegido
 * se sombrea en champán, los de arriba suben y la unidad se rellena.
 */
export function PlanoLigero({
  floors,
  hlFloor,
  hlUnit,
  step,
  name,
  unitLabel,
  widthM,
  heightM,
}: {
  floors: number;
  hlFloor: number;
  hlUnit: number;
  step: number;
  name: string;
  unitLabel: string;
  widthM: number;
  heightM: number;
}) {
  const W = 300;
  const X0 = 60;
  const BASE = 360;
  const FH = 40;
  const LOBBY = 46;
  const floorsY: { n: number; y: number; h: number }[] = [];
  let y = BASE;
  for (let n = 1; n <= floors; n++) {
    const h = n === 1 ? LOBBY : FH;
    y -= h;
    floorsY.push({ n, y, h });
  }
  const top = y;
  const units = 4;
  const uw = W / units;
  const lifted = step >= 2 && step <= 3;
  const fmt = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <svg className={s.plano} viewBox="0 0 420 430" aria-hidden data-step={step}>
      <defs>
        <pattern id="pl-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke="currentColor" strokeOpacity=".07" strokeWidth=".5" />
        </pattern>
        <pattern id="pl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#957C55" strokeWidth="1.2" strokeOpacity=".55" />
        </pattern>
      </defs>
      <rect width="420" height="430" fill="url(#pl-grid)" />

      {/* terreno */}
      <path key={`g${step}`} className={s.trazo} pathLength={1} d={`M20 ${BASE}H400`} strokeWidth="1.2" />

      {/* pisos */}
      {floorsY.map((f) => {
        const isHl = f.n === hlFloor;
        const up = lifted && f.n > hlFloor ? -22 : 0;
        const dim = step >= 2 && step <= 3 && !isHl ? 0.25 : 1;
        const w = f.n === floors ? W * 0.62 : W;
        const x = f.n === floors ? X0 + (W - w) / 2 : X0;
        return (
          <g key={f.n} style={{ transform: `translateY(${up}px)`, opacity: dim }} className={s.planoPiso}>
            {isHl && step >= 2 ? <rect x={x} y={f.y} width={w} height={f.h} fill="url(#pl-hatch)" /> : null}
            {isHl && step >= 3 ? (
              <rect className={s.planoUnidad} x={x + hlUnit * uw + 2} y={f.y + 2} width={uw - 4} height={f.h - 4} />
            ) : null}
            <rect
              key={`r${step}`}
              className={s.trazo}
              pathLength={1}
              x={x}
              y={f.y}
              width={w}
              height={f.h}
              strokeWidth={isHl && step >= 2 ? 1.6 : 1}
              style={{ animationDelay: `${(f.n - 1) * 70}ms` }}
            />
            {f.n === 1 ? (
              <path key={`d${step}`} className={s.trazo} pathLength={1} d={`M${x + 130} ${f.y + f.h}V${f.y + 14}H${x + 170}V${f.y + f.h}`} />
            ) : (
              Array.from({ length: f.n === floors ? 3 : units }, (_, u) => {
                const cw = f.n === floors ? w / 3 : uw;
                const wx = x + u * cw + cw * 0.3;
                return (
                  <rect
                    key={`w${u}${step}`}
                    className={s.trazo}
                    pathLength={1}
                    x={wx}
                    y={f.y + 9}
                    width={cw * 0.4}
                    height={f.h - 18}
                    strokeWidth=".8"
                    style={{ animationDelay: `${300 + (f.n - 1) * 70 + u * 40}ms` }}
                  />
                );
              })
            )}
            <text x={x - 8} y={f.y + f.h / 2 + 3} textAnchor="end" className={s.planoTxt}>
              {f.n === 1 ? 'L' : f.n}
            </text>
          </g>
        );
      })}

      {/* cotas */}
      <g className={s.planoCota}>
        <path key={`cw${step}`} className={s.trazo} pathLength={1} d={`M${X0} ${BASE + 18}H${X0 + W}M${X0} ${BASE + 12}V${BASE + 24}M${X0 + W} ${BASE + 12}V${BASE + 24}`} />
        <text x={X0 + W / 2} y={BASE + 34} textAnchor="middle" className={s.planoTxt}>
          {fmt(widthM)} m
        </text>
        <path key={`ch${step}`} className={s.trazo} pathLength={1} d={`M${X0 + W + 22} ${BASE}V${top}M${X0 + W + 16} ${BASE}H${X0 + W + 28}M${X0 + W + 16} ${top}H${X0 + W + 28}`} />
        <text x={X0 + W + 36} y={(BASE + top) / 2} className={s.planoTxt} transform={`rotate(-90 ${X0 + W + 36} ${(BASE + top) / 2})`} textAnchor="middle">
          {fmt(heightM)} m
        </text>
      </g>

      {/* etiqueta de la unidad */}
      {step === 3 ? (
        <g className={s.planoEtiqueta}>
          {(() => {
            const f = floorsY[hlFloor - 1]!;
            const cx = X0 + hlUnit * uw + uw / 2;
            return (
              <>
                <path key={`l${step}`} className={s.trazo} pathLength={1} d={`M${cx} ${f.y - 22}V${f.y - 58}H${cx + 40}`} />
                <text x={cx + 44} y={f.y - 54} className={s.planoTxtFuerte}>
                  {unitLabel}
                </text>
              </>
            );
          })()}
        </g>
      ) : null}

      {/* rótulo del plano */}
      <g className={s.planoRotulo}>
        <rect x="250" y="396" width="160" height="28" />
        <text x="258" y="408" className={s.planoTxtFuerte}>
          {name.toUpperCase()}
        </text>
        <text x="258" y="419" className={s.planoTxt}>
          Alzado principal · ilustrativo
        </text>
      </g>
    </svg>
  );
}
