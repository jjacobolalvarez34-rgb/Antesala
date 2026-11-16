/**
 * pnpm transicion <ruta> <texto del enlace> [nivel]
 * Mide la fluidez de una transición (p. ej. del piso a una habitación) en celular simulado:
 * CPU 4 veces más lenta. Toca el enlace y registra cada cuadro durante 4 s: cuadros por
 * segundo, el cuadro más largo y cuántos pasaron de 50 ms (un tirón visible). Ver docs/CARGA.md.
 */
import { chromium, devices } from '@playwright/test';
const [path, text, nivel = 'premium'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-CO' });
await ctx.addInitScript((n) => {
  try {
    for (const k of ['explorar', 'piso', 'unidad', 'espacio', 'mirar']) sessionStorage.setItem('antesala:guia:' + k, '1');
    sessionStorage.setItem('antesala:nivel', n);
  } catch {}
}, nivel);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.goto('http://localhost:3100' + path);
await page.waitForFunction(() => document.documentElement.dataset.scene === 'on', null, { timeout: 120000 });
await page.waitForTimeout(9000);
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  const loop = (t) => {
    window.__frames.push(t - last);
    last = t;
    if (window.__frames.length < 2000) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
const link = page.locator(`a:has-text("${text}")`).first();
// en táctil, el letrero de la unidad pide dos toques (el primero la abre)
await link.click({ force: true });
// entre el primer toque (abre el letrero y prepara la habitación) y el segundo, una persona tarda
// en leer el precio: PAUSA ms (por defecto 1500)
await page.waitForTimeout(Number(process.env.PAUSA ?? 1500));
if (!page.url().includes('/unidad/')) await link.click({ force: true });
await page.waitForTimeout(4000);
console.log('url', page.url().replace('http://localhost:3100', ''));
const f = await page.evaluate(() => window.__frames.slice(1));
const total = f.reduce((a, b) => a + b, 0);
const sorted = [...f].sort((a, b) => b - a);
console.log(`${path} → "${text}" (${nivel}): ${(f.length / (total / 1000)).toFixed(0)} fps · cuadro más largo ${sorted[0].toFixed(0)} ms · tirones >50 ms: ${f.filter((x) => x > 50).length} · peores: ${sorted.slice(0, 6).map((x) => x.toFixed(0)).join(', ')}`);
await browser.close();
