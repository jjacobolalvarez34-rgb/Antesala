/**
 * Datos de Antesala como empresa (la página del producto, no la de un hotel).
 * Los hoteles tienen los suyos en content/hotels/<slug>/.
 */
export const ANTESALA = {
  /** WhatsApp de contacto comercial (Jacobo López) */
  whatsapp: '573204871882',
  /** hotel de demostración que se enlaza desde la página del producto */
  demoSlug: 'niebla-alta',
  city: 'Bogotá',
} as const;

export const antesalaWhatsApp = (text: string) =>
  `https://wa.me/${ANTESALA.whatsapp}?text=${encodeURIComponent(text)}`;
