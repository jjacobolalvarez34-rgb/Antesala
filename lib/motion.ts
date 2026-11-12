/**
 * Movimiento (D-067). El sitio no apaga sus animaciones por la preferencia del
 * sistema (prefers-reduced-motion): en Windows con los efectos de animación
 * apagados todo se veía a saltos. Menos movimiento = el modo ligero de la web de
 * Antesala (sin 3D ni video), que elige la persona.
 */
export function lessMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('antesala:modo') === 'ligero';
  } catch {
    return false;
  }
}
