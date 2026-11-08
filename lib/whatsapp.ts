/**
 * Armado del enlace de WhatsApp con mensaje prellenado: unidad, fechas,
 * noches y huéspedes (bloque 6). Los textos no adivinan el género del nombre
 * de la unidad ("la unidad Penthouse 601", D-017).
 */

export interface WhatsAppContext {
  phone: string;
  hotelName: string;
  unitName?: string;
  spaceName?: string;
  /** fechas ya formateadas ("12 de noviembre") */
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests?: number;
  /** venta o arriendo: el mensaje pide una visita en vez de fechas (D-057) */
  visit?: boolean;
}

export function buildWhatsAppMessage(ctx: WhatsAppContext): string {
  if (ctx.visit) {
    const what = ctx.unitName ? `el apartamento ${ctx.unitName} de ${ctx.hotelName}` : ctx.hotelName;
    return `Hola, me interesa ${what}.${ctx.spaceName && ctx.unitName ? ` Estuve mirando: ${ctx.spaceName}.` : ''} ¿Podemos agendar una visita?`;
  }
  let first = ctx.unitName
    ? `Hola, me interesa reservar la unidad ${ctx.unitName} de ${ctx.hotelName}`
    : `Hola, quiero reservar en ${ctx.hotelName}`;
  if (ctx.checkIn && ctx.checkOut) first += ` del ${ctx.checkIn} al ${ctx.checkOut}`;
  const extras = [
    ctx.nights ? `${ctx.nights} ${ctx.nights === 1 ? 'noche' : 'noches'}` : null,
    ctx.guests ? `${ctx.guests} ${ctx.guests === 1 ? 'huésped' : 'huéspedes'}` : null,
  ].filter(Boolean);
  if (extras.length && ctx.checkIn) first += ` (${extras.join(', ')})`;
  const parts = [`${first}.`];
  if (ctx.spaceName && ctx.unitName) parts.push(`Estuve mirando: ${ctx.spaceName}.`);
  parts.push(ctx.checkIn ? '¿Está disponible?' : '¿Qué fechas tienen disponibles?');
  return parts.join(' ');
}

export function buildWhatsAppUrl(ctx: WhatsAppContext): string {
  const phone = ctx.phone.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(ctx))}`;
}
