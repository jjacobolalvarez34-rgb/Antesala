/**
 * Armado del enlace de WhatsApp con mensaje prellenado.
 * Las fechas llegan en el bloque 6; la firma ya las acepta.
 */

export interface WhatsAppContext {
  phone: string;
  hotelName: string;
  unitName?: string;
  spaceName?: string;
  checkIn?: string;
  checkOut?: string;
}

export function buildWhatsAppMessage(ctx: WhatsAppContext): string {
  const parts: string[] = [];
  if (ctx.unitName) {
    // "la unidad" evita adivinar el género del nombre (el Estudio, la Suite)
    parts.push(`Hola, me interesa reservar la unidad ${ctx.unitName} de ${ctx.hotelName}`);
  } else {
    parts.push(`Hola, quiero reservar en ${ctx.hotelName}`);
  }
  if (ctx.checkIn && ctx.checkOut) parts[0] += ` del ${ctx.checkIn} al ${ctx.checkOut}`;
  parts[0] += '.';
  if (ctx.spaceName && ctx.unitName) parts.push(`Estuve mirando: ${ctx.spaceName}.`);
  parts.push(ctx.checkIn ? '¿Está disponible?' : '¿Qué fechas tienen disponibles?');
  return parts.join(' ');
}

export function buildWhatsAppUrl(ctx: WhatsAppContext): string {
  const phone = ctx.phone.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(ctx))}`;
}
