/**
 * Resuelve la URL pública de un medio según el entorno.
 * - Sin NEXT_PUBLIC_ASSETS_BASE_URL (dev y demo): /demo-assets/<hotel>/<src>,
 *   servido desde content/hotels por app/demo-assets.
 * - Con la variable (producción con R2): <base>/<hotel>/<src>.
 */
const BASE = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? '/demo-assets').replace(/\/$/, '');

export function mediaUrl(hotelSlug: string, src: string): string {
  return `${BASE}/${hotelSlug}/${src.replace(/^\//, '')}`;
}
