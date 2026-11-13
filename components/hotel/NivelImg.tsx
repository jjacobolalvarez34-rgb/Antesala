'use client';

/* eslint-disable @next/next/no-img-element -- ver components/gallery/Gallery.tsx */
import { useNivel } from './Nivel';

export interface NivelImgSrc {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

/**
 * Imagen según el nivel de la demo (D-075): la foto premium solo en Premium; en los
 * demás niveles, la base (render del 3D). Si falta una, se usa la otra.
 */
export function NivelImg({
  premium,
  base,
  className,
  loading = 'lazy',
}: {
  premium?: NivelImgSrc;
  base?: NivelImgSrc;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const nivel = useNivel();
  const m = (nivel === 'premium' ? (premium ?? base) : (base ?? premium))!;
  if (!m) return null;
  return <img src={m.src} alt={m.alt} width={m.width} height={m.height} loading={loading} className={className} />;
}
