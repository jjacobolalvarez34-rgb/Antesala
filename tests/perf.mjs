/**
 * pnpm perf <ruta> [etiqueta]  (con `pnpm build` hecho y `pnpm exec next start -p 3100` corriendo)
 *
 * Mide una página como en un celular de gama media (Pixel 7, CPU 4 veces más lenta, red 4G):
 * segundos hasta que la escena 3D se ve, MB bajados, cuadros por segundo con la escena quieta
 * y tareas largas del hilo principal. Lista los 8 archivos más pesados. Ver docs/CARGA.md.
 */
import { chromium, devices } from '@playwright/test';
const [path, label] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-CO' });
await ctx.addInitScript(() => {
  try { for (const k of ['explorar','piso','unidad','espacio','mirar']) sessionStorage.setItem('antesala:guia:' + k, '1'); } catch {}
  window.__long = 0; window.__longMs = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__long++; window.__longMs += e.duration; } }).observe({ type: 'longtask', buffered: true });
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 1.6e6, uploadThroughput: 0.75e6 });
const bytes = {};
cdp.on('Network.loadingFinished', (e) => { bytes[e.requestId] = e.encodedDataLength; });
const urls = {};
cdp.on('Network.responseReceived', (e) => { urls[e.requestId] = e.response.url; });
const t0 = Date.now();
await page.goto('http://localhost:3100' + path);
await page.waitForFunction(() => document.documentElement.dataset.scene === 'on', null, { timeout: 120000 }).catch(() => {});
const tScene = Date.now() - t0;
await page.waitForTimeout(8000);
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
const lt = await page.evaluate(() => [window.__long, Math.round(window.__longMs)]);
const total = Object.values(bytes).reduce((a, b) => a + b, 0);
const big = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, b]) => `${(b / 1024).toFixed(0)}KB ${String(urls[id] || '').replace('http://localhost:3100', '').slice(0, 70)}`);
console.log(`${label}: escena ${(tScene / 1000).toFixed(1)}s · ${(total / 1048576).toFixed(1)} MB · fps ${fps.toFixed(0)} · tareas largas ${lt[0]} (${lt[1]} ms)`);
for (const b of big) console.log('   ', b);
await browser.close();
