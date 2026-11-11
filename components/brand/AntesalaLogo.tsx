/**
 * Logo de Antesala, "ranura de luz" (D-062): dos pilares que forman el vano de una
 * puerta y una línea de luz al centro. El símbolo va en SVG en línea y el nombre en
 * HTML con Cinzel (así usa la fuente cargada; un <img> de SVG no la tendría).
 *
 * Versiones del manual:
 * - "oscuro": sobre azul noche (pilares champán con su cara lateral, ranura luz).
 * - "claro": sobre marfil (pilares azul noche, ranura champán).
 * - "tinta": una tinta, sin ranura, en currentColor.
 * - small: sin los pilares exteriores (por debajo de 40 px).
 * Nunca brillos, degradados, sombras, estirar ni rotar.
 */

const NOCHE = '#111B33';
const CHAMPAN = '#D2B88C';
const BISEL = '#957C55';
const LUZ = '#F2E8D6';

export type LogoTone = 'oscuro' | 'claro' | 'tinta';

export function AntesalaSymbol({
  tone = 'oscuro',
  small = false,
  className,
  title,
}: {
  tone?: LogoTone;
  small?: boolean;
  className?: string;
  /** texto accesible; sin él el símbolo es decorativo */
  title?: string;
}) {
  const pillar = tone === 'oscuro' ? CHAMPAN : tone === 'claro' ? NOCHE : 'currentColor';
  return (
    <svg
      viewBox="14 8 92 136"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d="M30 140V44L44 16V140Z" fill={pillar} />
      <path d="M90 140V44L76 16V140Z" fill={pillar} />
      {tone === 'oscuro' ? (
        <>
          <path d="M44 16L48 22V137L44 140Z" fill={BISEL} />
          <path d="M76 16L72 22V137L76 140Z" fill={BISEL} />
        </>
      ) : null}
      {small ? null : (
        <>
          <path d="M20 140V64L24 57V140Z" fill={pillar} />
          <path d="M100 140V64L96 57V140Z" fill={pillar} />
        </>
      )}
      {tone === 'tinta' ? null : <rect x="58.6" y="30" width="2.8" height="110" fill={tone === 'oscuro' ? LUZ : CHAMPAN} />}
    </svg>
  );
}

/** Logo horizontal: símbolo + ANTESALA en Cinzel con el tracking del manual (0,42 em). */
export function AntesalaLogo({
  tone = 'oscuro',
  className = '',
  symbolClassName = 'h-9 w-auto',
  wordClassName = 'text-lg',
}: {
  tone?: Exclude<LogoTone, 'tinta'>;
  className?: string;
  symbolClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <AntesalaSymbol tone={tone} className={symbolClassName} />
      <span
        className={`font-[family-name:var(--font-cinzel)] leading-none font-medium tracking-[0.42em] ${wordClassName}`}
        style={{ color: tone === 'oscuro' ? '#ECE5D6' : NOCHE, marginRight: '-0.42em' }}
      >
        ANTESALA
      </span>
    </span>
  );
}
